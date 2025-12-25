import * as vscode from "vscode"
import { ExtensionState } from "./state"
import { scriptsToQuickPickItems } from "./scriptquickpick"
import { registerCommand } from "./commands"
import { createScript } from "../../core/src/scripts"
import { copyPrompt } from "../../core/src/copy"

export function activatePromptCommands(state: ExtensionState) {
    const { context, host } = state
    const { subscriptions } = context

    async function showPrompt(fn: string) {
        vscode.window.showTextDocument(host.toUri(fn))
    }

    subscriptions.push(
        registerCommand("genaid.newfile.script", () =>
            vscode.commands.executeCommand("genaid.prompt.create")
        ),
        registerCommand("genaid.prompt.refresh", async () => {
            await state.parseWorkspace()
        }),
        registerCommand(
            "genaid.prompt.create",
            async (template?: PromptScript) => {
                const name = await vscode.window.showInputBox({
                    title: "Pick a file name for the new GenAID.",
                })
                if (name === undefined) return
                const t = createScript(name, { template })
                const pr = await copyPrompt(t, { fork: false, name })
                await state.parseWorkspace()
                await showPrompt(pr)
            }
        ),
        registerCommand(
            "genaid.prompt.fork",
            async (template: PromptScript | string) => {
                if (!template) {
                    if (!state.project) await state.parseWorkspace()
                    const templates = state.project?.scripts
                    if (!templates?.length) return
                    const picked = await vscode.window.showQuickPick(
                        scriptsToQuickPickItems(templates),
                        {
                            title: `Pick a GenAID to fork`,
                        }
                    )
                    if (picked === undefined) return
                    template = picked.template
                } else if (typeof template === "string") {
                    if (!state.project) await state.parseWorkspace()
                    template = state.project?.scripts.find(
                        (t) => t.id === template
                    )
                }
                const newPrompt = await copyPrompt(template, {
                    fork: true,
                    name: template.id,
                })
                await state.parseWorkspace()
                await showPrompt(newPrompt)
            }
        ),
        registerCommand(
            "genaid.prompt.navigate",
            async (prompt: PromptScript) => {
                const uri = host.toUri(prompt.filename)
                await vscode.window.showTextDocument(uri)
            }
        )
    )
}

export function commandButtons(state: ExtensionState) {
    const request = state.aiRequest
    const { computing } = request || {}
    const abort = "Abort"
    const view = "View"
    const output = "Output"
    const trace = "Trace"
    const show = "Show"
    const start = "Start"
    const stop = "Stop"
    const cmds: { label: string; description?: string; cmd: string }[] = []
    if (computing) cmds.push({ label: abort, cmd: "genaid.request.abort" })
    cmds.push({
        label: view,
        description: "View GenAID request.",
        cmd: "genaid.request.open.view",
    })
    cmds.push({
        label: output,
        description: "Preview AI response.",
        cmd: "genaid.request.open.output",
    })
    cmds.push({
        label: trace,
        description: "Inspect script execution and LLM response.",
        cmd: "genaid.request.open.trace",
    })
    if (state.host.server.status !== "stopped") {
        cmds.push({
            label: show,
            description: "Show GenAID server terminal",
            cmd: "genaid.server.show",
        })
        cmds.push({
            label: stop,
            description: "Stop GenAID server",
            cmd: "genaid.server.stop",
        })
    } else {
        cmds.push({
            label: start,
            description: "Start GenAID server",
            cmd: "genaid.server.start",
        })
    }

    return cmds
}

export function commandButtonsMarkdown(state: ExtensionState, sep = " | ") {
    const res = commandButtons(state)
        .map(({ label, description, cmd }) => `[${label}](command:${cmd})`)
        .join(sep)
    return res
}
