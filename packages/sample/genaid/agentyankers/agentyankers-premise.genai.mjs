script({
    title: "AgentYankers premise outline",
    description:
        "Draft an agentyankers/v1 premise outline. Use --model foundry, copilot, or openwebui.",
    model: "foundry",
    group: "AgentYankers",
    accept: ".json,.md,.txt",
})

import { runWritingScript } from "./run-task.mjs"

export default async function () {
    await runWritingScript("premise")
}
