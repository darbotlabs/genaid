/**
 * GenAID entry for the AgentYankers writing room.
 * Model calls go through runPrompt. Keys stay in the environment.
 */

import { writeTask } from "../../src/agentyankers/index.mjs"

const OUTPUTS = {
    premise: "agentyankers/premise.json",
    personas: "agentyankers/personas.json",
    commentary: "agentyankers/commentary.json",
    "show-notes": "agentyankers/show-notes.json",
}

export async function runWritingScript(task) {
    const input = await readInput()
    const offline = env.vars.offline === true || env.vars.offline === "true"
    const written = await writeTask(task, input, {
        provider: env.vars.provider || undefined,
        offline,
        useCore: true,
        complete: offline ? undefined : completeWithModel,
    })
    const output = env.vars.output || OUTPUTS[task]
    await workspace.writeText(
        output,
        JSON.stringify(written.json, null, 2) + "\n"
    )
    if (written.markdown) {
        await workspace.writeText(
            output.replace(/\.json$/i, ".md"),
            written.markdown
        )
    }
    console.log(`AgentYankers ${task} -> ${output}`)
    return written
}

async function readInput() {
    const fromVar = env.vars.brief || env.vars.transcript || ""
    let fromFile = env.files?.[0]?.content || ""
    if (!fromFile && env.files?.[0]?.filename)
        fromFile = await workspace.readText(env.files[0].filename)
    const text = String(fromVar || fromFile || "").trim()
    if (!text) {
        throw new Error(
            "Pass a brief or transcript with --vars brief=... or by selecting a JSON file."
        )
    }
    if (text.startsWith("{") || text.startsWith("[")) return JSON.parse(text)
    return { idea: text }
}

async function completeWithModel(request) {
    const options = {
        responseType: "json_schema",
        responseSchema: request.schema,
        label: `agentyankers-${request.task}`,
    }
    if (env.vars.provider) options.model = request.provider.model
    const result = await runPrompt(request.prompt, options)
    if (result?.error) {
        const message = result.error.message || result.error
        throw new Error(
            typeof message === "string" ? message : "writing room model failed"
        )
    }
    if (result?.json) return result.json
    return JSON.parse(result.text)
}
