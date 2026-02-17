---
title: Agent Swarm Example
description: Demonstrates coordinating multiple agents to solve complex tasks
---

# Agent Swarm Coordination Example

This example shows how to use the agent swarm coordinator to orchestrate
multiple specialized agents working together on a complex task.

```js
script({
    model: "reasoning",
    tools: [
        "agent_git",
        "agent_fs", 
        "agent_docs",
        "agent_web"
    ]
})

// Define the complex task
const task = `
Analyze this repository and create comprehensive documentation:
1. Generate API documentation from code
2. Create a user guide with examples
3. Build a troubleshooting guide
4. Generate a changelog from git history
`

// Use the swarm coordinator
def("TASK", task)

$`You are the swarm coordinator. Analyze the TASK and orchestrate the available agents
to complete it efficiently.

Available agents:
- agent_git: Query repository history and commits
- agent_fs: Read and analyze files
- agent_docs: Generate documentation
- agent_web: Search for external references

Your coordination strategy should be:
1. Break down the task into subtasks
2. Assign each subtask to the most appropriate agent
3. Determine execution order (parallel vs sequential)
4. Coordinate data flow between agents
5. Synthesize results into final output

Provide a detailed execution plan first, then execute it.`
```

## Expected Output

The swarm coordinator will:
1. Analyze the task requirements
2. Create a task breakdown
3. Assign tasks to agents:
   - git agent → Generate changelog from history
   - fs + docs agents → Generate API documentation
   - docs agent → Create user guide
   - web + docs agents → Build troubleshooting guide
4. Execute tasks in optimal order
5. Combine all outputs into comprehensive documentation

## Advanced Usage

### Parallel Execution

```js
// Configure swarm for parallel execution
script({
    model: "reasoning",
    tools: ["agent_git", "agent_fs", "agent_docs"],
    vars: {
        "system.agent_swarm.strategy": "parallel",
        "system.agent_swarm.agents": ["git", "fs", "docs"]
    }
})

$`Swarm: Analyze code quality across the repository
Task 1: Git agent - find files with most changes
Task 2: FS agent - analyze code complexity
Task 3: Docs agent - check documentation coverage
Execute all tasks in parallel and synthesize results.`
```

### Sequential Execution

```js
// Configure swarm for sequential execution with data passing
script({
    model: "reasoning",
    tools: ["agent_web", "agent_docs", "agent_fs"],
    vars: {
        "system.agent_swarm.strategy": "sequential"
    }
})

$`Swarm: Research and implement a feature
Step 1: Web agent - research best practices for JWT authentication
Step 2: Docs agent - create implementation specification based on research
Step 3: FS agent - analyze existing auth code
Execute sequentially, passing results between agents.`
```

### Adaptive Strategy

```js
// Let the swarm choose the best strategy
script({
    model: "reasoning",
    tools: ["agent_git", "agent_fs", "agent_docs", "agent_web"],
    vars: {
        "system.agent_swarm.strategy": "adaptive"
    }
})

$`Swarm: Comprehensive security audit
- Find security vulnerabilities in code
- Check for outdated dependencies
- Review git history for leaked credentials
- Research recent CVEs for used libraries
Choose optimal execution strategy (parallel/sequential/hybrid).`
```
