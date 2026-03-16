system({
    title: "Agent swarm coordinator for orchestrating multiple agents",
    parameters: {
        agents: {
            type: "array",
            description: "List of agent names to coordinate",
            required: false,
        },
        strategy: {
            type: "string",
            description: "Coordination strategy: sequential, parallel, or adaptive",
            required: false,
        },
    },
})

export default async function defAgentSwarm(ctx: PromptContext) {
    const { env, defAgent } = ctx
    const { vars } = env
    const agents = vars["system.agent_swarm.agents"] || []
    const strategy = vars["system.agent_swarm.strategy"] || "adaptive"

    defAgent(
        "swarm",
        "coordinate multiple agents to solve complex tasks through orchestration",
        `You are a swarm coordinator that orchestrates multiple agents to solve complex tasks.
        
Your capabilities:
- Decompose complex tasks into subtasks
- Assign subtasks to specialized agents
- Coordinate agent communication and data flow
- Aggregate results from multiple agents
- Handle agent failures and retries
- Optimize task parallelization

Available coordination strategies:
- sequential: Execute agents one after another
- parallel: Execute agents concurrently when possible
- adaptive: Dynamically choose strategy based on task dependencies

When given a task:
1. Analyze task complexity and dependencies
2. Identify which agents are best suited for subtasks
3. Create an execution plan with clear agent assignments
4. Coordinate agent execution according to strategy
5. Collect and synthesize agent outputs
6. Provide unified results

Available agents: ${agents.join(", ") || "all registered agents"}
Strategy: ${strategy}

Respond with:
- Task breakdown
- Agent assignments
- Execution order
- Expected outputs`,
        {
            system: [
                "system.assistant",
                "system.agent_planner",
                "system.safety_jailbreak",
                "system.safety_harmful_content",
            ],
            model: "reasoning",
        }
    )
}
