import assert from "node:assert/strict"
import test from "node:test"
import { client, methods, type SessionUpdate } from "@agentclientprotocol/sdk"
import { createAcpAgent, type AcpRuntime } from "./acp"

function testRuntime(): AcpRuntime {
    return {
        async prompt({ prompt, emit, signal }) {
            await emit({
                sessionUpdate: "agent_message_chunk",
                content: { type: "text", text: prompt },
            })
            return { stopReason: signal.aborted ? "cancelled" : "end_turn" }
        },
    }
}

test("ACP v1 negotiates and owns a session lifecycle", async () => {
    const updates: SessionUpdate[] = []
    const agent = createAcpAgent({ runtime: testRuntime() })
    const clientApp = client({ name: "test-client" }).onNotification(
        methods.client.session.update,
        ({ params }) => {
            updates.push(params.update)
        }
    )

    await clientApp.connectWith(agent, async (ctx) => {
        const initialized = await ctx.request(methods.agent.initialize, {
            protocolVersion: 1,
            clientInfo: { name: "test-client", version: "1" },
        })
        assert.equal(initialized.protocolVersion, 1)

        const session = await ctx.request(methods.agent.session.new, {
            cwd: process.cwd(),
            mcpServers: [],
        })
        assert.ok(session.sessionId)

        const prompt = await ctx.request(methods.agent.session.prompt, {
            sessionId: session.sessionId,
            prompt: [{ type: "text", text: "hello" }],
        })
        assert.equal(prompt.stopReason, "end_turn")

        const listed = await ctx.request(methods.agent.session.list, {})
        assert.equal(listed.sessions.length, 1)
        assert.ok(
            updates.some(
                (update) => update.sessionUpdate === "agent_message_chunk"
            )
        )

        const beforeLoad = updates.length
        await ctx.request(methods.agent.session.load, {
            sessionId: session.sessionId,
            cwd: process.cwd(),
            mcpServers: [],
        })
        assert.ok(updates.length >= beforeLoad + 2)

        await ctx.request(methods.agent.session.close, {
            sessionId: session.sessionId,
        })
        const afterClose = await ctx.request(methods.agent.session.list, {})
        assert.equal(afterClose.sessions.length, 0)
    })
})

test("ACP session cancellation aborts the active prompt", async () => {
    const agent = createAcpAgent({
        runtime: {
            prompt: ({ signal }) =>
                new Promise((resolve) => {
                    signal.addEventListener(
                        "abort",
                        () => resolve({ stopReason: "cancelled" }),
                        { once: true }
                    )
                }),
        },
    })
    const clientApp = client({ name: "test-client" })

    await clientApp.connectWith(agent, async (ctx) => {
        await ctx.request(methods.agent.initialize, {
            protocolVersion: 1,
        })
        const session = await ctx.request(methods.agent.session.new, {
            cwd: process.cwd(),
            mcpServers: [],
        })
        const prompt = ctx.request(methods.agent.session.prompt, {
            sessionId: session.sessionId,
            prompt: [{ type: "text", text: "wait" }],
        })
        setTimeout(
            () =>
                void ctx.notify(methods.agent.session.cancel, {
                    sessionId: session.sessionId,
                }),
            10
        )
        const response = await prompt
        assert.equal(response.stopReason, "cancelled")
    })
})

test("ACP rejects unsupported prompt content", async () => {
    const agent = createAcpAgent({
        runtime: {
            prompt: async () => ({ stopReason: "end_turn" }),
        },
    })
    const clientApp = client({ name: "test-client" })

    await clientApp.connectWith(agent, async (ctx) => {
        await ctx.request(methods.agent.initialize, {
            protocolVersion: 1,
        })
        const session = await ctx.request(methods.agent.session.new, {
            cwd: process.cwd(),
            mcpServers: [],
        })
        await assert.rejects(
            ctx.request(methods.agent.session.prompt, {
                sessionId: session.sessionId,
                prompt: [
                    {
                        type: "image",
                        data: "not-supported",
                        mimeType: "image/png",
                    },
                ],
            })
        )
    })
})

test("ACP rejects concurrent prompts for one session", async () => {
    let releasePrompt: (() => void) | undefined
    const agent = createAcpAgent({
        runtime: {
            prompt: () =>
                new Promise((resolve) => {
                    releasePrompt = () => resolve({ stopReason: "end_turn" })
                }),
        },
    })
    const clientApp = client({ name: "test-client" })

    await clientApp.connectWith(agent, async (ctx) => {
        await ctx.request(methods.agent.initialize, {
            protocolVersion: 1,
        })
        const session = await ctx.request(methods.agent.session.new, {
            cwd: process.cwd(),
            mcpServers: [],
        })
        const firstPrompt = ctx.request(methods.agent.session.prompt, {
            sessionId: session.sessionId,
            prompt: [{ type: "text", text: "first" }],
        })
        await new Promise((resolve) => setTimeout(resolve, 10))
        await assert.rejects(
            ctx.request(methods.agent.session.prompt, {
                sessionId: session.sessionId,
                prompt: [{ type: "text", text: "second" }],
            })
        )
        releasePrompt?.()
        await firstPrompt
    })
})
