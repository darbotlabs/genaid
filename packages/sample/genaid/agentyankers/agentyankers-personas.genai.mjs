script({
    title: "AgentYankers personas",
    description:
        "Draft an agentyankers/v1 host and caller cast. Use --model foundry, copilot, or openwebui.",
    model: "foundry",
    group: "AgentYankers",
    accept: ".json,.md,.txt",
})

import { runWritingScript } from "./run-task.mjs"

export default async function () {
    await runWritingScript("personas")
}
