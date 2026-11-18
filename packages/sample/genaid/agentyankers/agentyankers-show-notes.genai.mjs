script({
    title: "AgentYankers show notes",
    description:
        "Draft agentyankers/v1 show notes from a call transcript. Use --model foundry, copilot, or openwebui.",
    model: "foundry",
    group: "AgentYankers",
    accept: ".json",
})

import { runWritingScript } from "./run-task.mjs"

export default async function () {
    await runWritingScript("show-notes")
}
