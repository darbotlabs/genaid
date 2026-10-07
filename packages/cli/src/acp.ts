import {
    agent,
    methods,
    ndJsonStream,
    type AgentApp,
    type ContentBlock,
    type InitializeResponse,
    type NewSessionRequest,
    type NewSessionResponse,
    type SessionConfigOption,
    type SessionModeState,
    type SessionNotification,
    type SessionUpdate,
    type StopReason,
} from "@agentclientprotocol/sdk"
import { randomUUID } from "node:crypto"
import { isAbsolute, resolve } from "node:path"
import { Readable } from "node:stream"
import type { PromptScriptRunOptions } from "./main"
import type { ChatCompletionsProgressReport } from "../../core/src/chattypes"

const ACP_PROTOCOL_VERSION = 1
const DEFAULT_MODE_ID = "default"

export interface AcpPromptRequest {
    sessionId: string
    cwd: string
    additionalDirectories: string[]
    prompt: string
    signal: AbortSignal
    emit: (update: SessionUpdate) => Promise<void>
}

export interface AcpPromptResult {
    stopReason?: StopReason
    text?: string
}

export interface AcpRuntime {
    prompt(request: AcpPromptRequest): Promise<AcpPromptResult>
}

interface AcpSession {
    sessionId: string
    cwd: string
    additionalDirectories: string[]
    mcpServers: NewSessionRequest["mcpServers"]
    createdAt: string
    updatedAt: string
    modeId: string
    configOptions: SessionConfigOption[]
    history: SessionUpdate[]
    promptController?: AbortController
    closed: boolean
}

export interface AcpServerOptions {
    name?: string
    version?: string
    runtime: AcpRuntime
}

function requireAbsolutePath(path: string, field: string) {
    if (!isAbsolute(path)) {
        throw new Error(`${field} must be an absolute path`)
    }
    return resolve(path)
}

function normalizeAdditionalDirectories(
    directories: string[] | undefined
): string[] {
    return (directories || []).map((path) =>
        requireAbsolutePath(path, "additionalDirectories")
    )
}

function rejectMcpServers(mcpServers: NewSessionRequest["mcpServers"]) {
    if (mcpServers.length > 0) {
        throw new Error(
            "MCP server attachment is not enabled for this ACP agent"
        )
    }
}

function sessionModes(currentModeId = DEFAULT_MODE_ID): SessionModeState {
    return {
        currentModeId,
        availableModes: [
            {
                id: DEFAULT_MODE_ID,
                name: "GenAID",
                description: "Run GenAID prompts and scripts.",
            },
        ],
    }
}

function contentToText(prompt: ContentBlock[]) {
    const parts: string[] = []
    for (const block of prompt) {
        if (block.type === "text") {
            parts.push(block.text)
        } else if (block.type === "resource_link") {
            parts.push(block.uri)
        } else {
            throw new Error(
                `unsupported ACP prompt content type: ${block.type}`
            )
        }
    }
    return parts.join("")
}

function combineSignals(
    first: AbortSignal,
    second: AbortSignal
): { signal: AbortSignal; dispose: () => void } {
    const controller = new AbortController()
    const abort = (event: Event) =>
        controller.abort((event.target as AbortSignal).reason)
    if (first.aborted || second.aborted) {
        controller.abort(first.reason ?? second.reason)
        return { signal: controller.signal, dispose: () => undefined }
    }
    first.addEventListener("abort", abort)
    second.addEventListener("abort", abort)
    return {
        signal: controller.signal,
        dispose: () => {
            first.removeEventListener("abort", abort)
            second.removeEventListener("abort", abort)
        },
    }
}

export function createAcpAgent(options: AcpServerOptions): AgentApp {
    const sessions = new Map<string, AcpSession>()
    const app = agent({ name: options.name || "genaid" })

    const getSession = (sessionId: string) => {
        const session = sessions.get(sessionId)
        if (!session || session.closed) {
            throw new Error(`ACP session not found: ${sessionId}`)
        }
        return session
    }

    const sessionResponse = (session: AcpSession): NewSessionResponse => ({
        sessionId: session.sessionId,
        modes: sessionModes(session.modeId),
        configOptions: session.configOptions,
    })

    app.onRequest(
        methods.agent.initialize,
        ({ params }): InitializeResponse => {
            if (params.protocolVersion < ACP_PROTOCOL_VERSION) {
                throw new Error(
                    `unsupported ACP protocol version: ${params.protocolVersion}`
                )
            }
            return {
                protocolVersion: ACP_PROTOCOL_VERSION,
                agentInfo: {
                    name: options.name || "genaid",
                    version: options.version || "development",
                },
                agentCapabilities: {
                    loadSession: true,
                    promptCapabilities: {
                        image: false,
                        audio: false,
                        embeddedContext: false,
                    },
                    sessionCapabilities: {
                        list: {},
                        delete: {},
                        additionalDirectories: {},
                        resume: {},
                        close: {},
                    },
                },
            }
        }
    )

    app.onRequest(methods.agent.session.new, ({ params }) => {
        const cwd = requireAbsolutePath(params.cwd, "cwd")
        const additionalDirectories = normalizeAdditionalDirectories(
            params.additionalDirectories
        )
        rejectMcpServers(params.mcpServers)
        const now = new Date().toISOString()
        const session: AcpSession = {
            sessionId: randomUUID(),
            cwd,
            additionalDirectories,
            mcpServers: params.mcpServers,
            createdAt: now,
            updatedAt: now,
            modeId: DEFAULT_MODE_ID,
            configOptions: [],
            history: [],
            closed: false,
        }
        sessions.set(session.sessionId, session)
        return sessionResponse(session)
    })

    app.onRequest(methods.agent.session.load, async ({ params, client }) => {
        const session = getSession(params.sessionId)
        const cwd = requireAbsolutePath(params.cwd, "cwd")
        if (cwd !== session.cwd) {
            throw new Error("session load cwd does not match the original cwd")
        }
        rejectMcpServers(params.mcpServers)
        session.mcpServers = params.mcpServers
        session.additionalDirectories = normalizeAdditionalDirectories(
            params.additionalDirectories
        )
        session.updatedAt = new Date().toISOString()
        for (const update of session.history) {
            await client.notify(methods.client.session.update, {
                sessionId: session.sessionId,
                update,
            })
        }
        return sessionResponse(session)
    })

    app.onRequest(methods.agent.session.list, ({ params }) => {
        if (params.cursor) {
            throw new Error("ACP session list pagination is not supported")
        }
        const cwd = params.cwd
            ? requireAbsolutePath(params.cwd, "cwd")
            : undefined
        return {
            sessions: [...sessions.values()]
                .filter((session) => !session.closed)
                .filter((session) => !cwd || session.cwd === cwd)
                .map((session) => ({
                    sessionId: session.sessionId,
                    cwd: session.cwd,
                    additionalDirectories: session.additionalDirectories,
                    title: "GenAID session",
                    updatedAt: session.updatedAt,
                })),
        }
    })

    app.onRequest(methods.agent.session.delete, ({ params }) => {
        const session = getSession(params.sessionId)
        session.promptController?.abort("session deleted")
        session.closed = true
        sessions.delete(session.sessionId)
        return {}
    })

    app.onRequest(methods.agent.session.resume, ({ params }) => {
        const session = getSession(params.sessionId)
        const cwd = requireAbsolutePath(params.cwd, "cwd")
        if (cwd !== session.cwd) {
            throw new Error(
                "session resume cwd does not match the original cwd"
            )
        }
        if (params.additionalDirectories !== undefined) {
            session.additionalDirectories = normalizeAdditionalDirectories(
                params.additionalDirectories
            )
        }
        if (params.mcpServers !== undefined) {
            rejectMcpServers(params.mcpServers)
            session.mcpServers = params.mcpServers
        }
        session.updatedAt = new Date().toISOString()
        return {
            modes: sessionModes(session.modeId),
            configOptions: session.configOptions,
        }
    })

    app.onRequest(methods.agent.session.close, ({ params }) => {
        const session = getSession(params.sessionId)
        session.promptController?.abort("session closed")
        session.closed = true
        sessions.delete(session.sessionId)
        return {}
    })

    app.onRequest(methods.agent.session.setMode, ({ params }) => {
        const session = getSession(params.sessionId)
        if (params.modeId !== DEFAULT_MODE_ID) {
            throw new Error(`unsupported ACP session mode: ${params.modeId}`)
        }
        session.modeId = params.modeId
        session.updatedAt = new Date().toISOString()
        return {}
    })

    app.onRequest(methods.agent.session.setConfigOption, ({ params }) => {
        const session = getSession(params.sessionId)
        if (
            session.configOptions.every(
                (option) => option.id !== params.configId
            )
        ) {
            throw new Error(`unsupported ACP config option: ${params.configId}`)
        }
        return { configOptions: session.configOptions }
    })

    app.onNotification(methods.agent.session.cancel, ({ params }) => {
        getSession(params.sessionId).promptController?.abort("prompt cancelled")
    })

    app.onRequest(
        methods.agent.session.prompt,
        async ({ params, signal, client }) => {
            const session = getSession(params.sessionId)
            if (session.promptController) {
                throw new Error(
                    "an ACP prompt is already active for this session"
                )
            }
            const prompt = contentToText(params.prompt)
            const controller = new AbortController()
            session.promptController = controller
            const combined = combineSignals(signal, controller.signal)
            const emit = async (update: SessionUpdate) => {
                session.history.push(update)
                const notification: SessionNotification = {
                    sessionId: session.sessionId,
                    update,
                }
                await client.notify(methods.client.session.update, notification)
            }
            try {
                for (const block of params.prompt) {
                    await emit({
                        sessionUpdate: "user_message_chunk",
                        content: block,
                    })
                }
                const result = await options.runtime.prompt({
                    sessionId: session.sessionId,
                    cwd: session.cwd,
                    additionalDirectories: session.additionalDirectories,
                    prompt,
                    signal: combined.signal,
                    emit,
                })
                session.updatedAt = new Date().toISOString()
                return {
                    stopReason:
                        result.stopReason ||
                        (combined.signal.aborted ? "cancelled" : "end_turn"),
                }
            } finally {
                combined.dispose()
                session.promptController = undefined
            }
        }
    )

    app.onRequest(methods.agent.authenticate, () => {
        throw new Error("ACP authentication is not configured")
    })
    app.onRequest(methods.agent.logout, () => {
        throw new Error("ACP authentication is not configured")
    })

    return app
}

export function createScriptAcpRuntime(
    scriptId: string,
    options: Partial<PromptScriptRunOptions> = {}
): AcpRuntime {
    if (!scriptId) throw new Error("scriptId is required for the ACP runtime")
    return {
        async prompt(request) {
            const { runScriptInternal } = await import("./run")
            let emitted = Promise.resolve()
            const response = await runScriptInternal(scriptId, [], {
                ...options,
                vars: {
                    ...(typeof options.vars === "object" ? options.vars : {}),
                    prompt: request.prompt,
                },
                json: true,
                yaml: false,
                cli: false,
                runTrace: false,
                outputTrace: false,
                cancellationToken: {
                    get isCancellationRequested() {
                        return request.signal.aborted
                    },
                },
                partialCb: (progress: ChatCompletionsProgressReport) => {
                    if (progress.reasoningChunk) {
                        emitted = emitted.then(() =>
                            request.emit({
                                sessionUpdate: "agent_thought_chunk",
                                content: {
                                    type: "text",
                                    text: progress.reasoningChunk,
                                },
                            })
                        )
                    }
                    if (progress.responseChunk) {
                        emitted = emitted.then(() =>
                            request.emit({
                                sessionUpdate: "agent_message_chunk",
                                content: {
                                    type: "text",
                                    text: progress.responseChunk,
                                },
                            })
                        )
                    }
                },
            })
            await emitted
            if (
                request.signal.aborted ||
                response.result?.status === "cancelled"
            ) {
                return { stopReason: "cancelled" }
            }
            if (!response.result || response.exitCode !== 0) {
                const message =
                    response.result?.error?.message ||
                    `GenAID script failed with exit code ${response.exitCode}`
                await request.emit({
                    sessionUpdate: "agent_message_chunk",
                    content: { type: "text", text: message },
                })
                return { stopReason: "refusal", text: message }
            }
            return {
                stopReason: "end_turn",
                text: response.result.text,
            }
        },
    }
}

export async function startAcpServer(
    options: AcpServerOptions & {
        input?: NodeJS.ReadableStream
        output?: NodeJS.WritableStream
    }
) {
    const input = options.input || process.stdin
    const output = options.output || process.stdout
    const stream = ndJsonStream(
        WritableStreamFromNode(output),
        ReadableStreamFromNode(input)
    )
    const connection = createAcpAgent(options).connect(stream)
    await connection.closed
}

function ReadableStreamFromNode(input: NodeJS.ReadableStream) {
    return Readable.toWeb(input as Readable) as ReadableStream<Uint8Array>
}

function WritableStreamFromNode(output: NodeJS.WritableStream) {
    return new WritableStream<Uint8Array>({
        write(chunk) {
            return new Promise<void>((resolveWrite, rejectWrite) => {
                output.write(Buffer.from(chunk), (error?: Error | null) =>
                    error ? rejectWrite(error) : resolveWrite()
                )
            })
        },
    })
}
