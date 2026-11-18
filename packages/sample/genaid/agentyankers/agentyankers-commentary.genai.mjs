script({
    title: "AgentYankers host commentary",
    description:
        "Draft agentyankers/v1 host commentary from a call transcript. Use --model foundry, copilot, or openwebui.",
    model: "foundry",
    group: "AgentYankers",
    accept: ".json",
})

import { runWritingScript } from "./run-task.mjs"

export default async function () {
    await runWritingScript("commentary")
}
