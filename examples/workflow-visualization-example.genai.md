---
title: Workflow Visualization Example
description: Create Mermaid diagrams for agent workflows and execution flows
---

# Workflow Visualization Example

Generate visual workflow diagrams using Mermaid for documenting agent processes, 
task flows, and system architectures.

```js
import {
    createWorkflow,
    addNode,
    addEdge,
    workflowToMermaid,
    createSequenceDiagram,
    createGanttChart,
    createSwarmDiagram
} from "genaid/core"

// Example 1: Simple workflow diagram
const workflow = createWorkflow(
    "Code Review Process",
    "Automated code review and approval workflow"
)

// Add nodes
addNode(workflow, "start", "PR Created", "start")
addNode(workflow, "lint", "Run Linter", "process")
addNode(workflow, "test", "Run Tests", "process")
addNode(workflow, "review", "Code Review", "decision")
addNode(workflow, "approve", "Approve", "process")
addNode(workflow, "merge", "Merge PR", "process")
addNode(workflow, "end", "Complete", "end")

// Add edges
addEdge(workflow, "start", "lint")
addEdge(workflow, "lint", "test")
addEdge(workflow, "test", "review")
addEdge(workflow, "review", "approve", "approved")
addEdge(workflow, "review", "lint", "changes requested")
addEdge(workflow, "approve", "merge")
addEdge(workflow, "merge", "end")

// Generate Mermaid diagram
const diagram = workflowToMermaid(workflow)
console.log(diagram)

// Save to file
await workspace.writeText("workflow.md", diagram)
```

## Example 2: Agent Swarm Visualization

```js
// Visualize agent swarm coordination
const swarmDiagram = createSwarmDiagram(
    "coordinator",
    [
        { id: "git_agent", name: "Git Agent", specialization: "Repository Analysis" },
        { id: "fs_agent", name: "FS Agent", specialization: "File Operations" },
        { id: "docs_agent", name: "Docs Agent", specialization: "Documentation" },
        { id: "web_agent", name: "Web Agent", specialization: "Web Search" }
    ],
    [
        { agent: "git_agent", task: "Analyze commit history" },
        { agent: "fs_agent", task: "Read source files" },
        { agent: "docs_agent", task: "Generate API docs" },
        { agent: "web_agent", task: "Find best practices" }
    ]
)

console.log(swarmDiagram)
await workspace.writeText("agent-swarm-diagram.md", swarmDiagram)
```

## Example 3: Sequence Diagram for Agent Interactions

```js
const interactions = [
    {
        from: "User",
        to: "Coordinator",
        message: "Analyze repository",
        response: "Task decomposed"
    },
    {
        from: "Coordinator",
        to: "Git Agent",
        message: "Get commit history",
        response: "Commits: 1234"
    },
    {
        from: "Coordinator",
        to: "FS Agent",
        message: "Read files",
        response: "Files analyzed"
    },
    {
        from: "Coordinator",
        to: "Docs Agent",
        message: "Generate docs",
        response: "Documentation created"
    },
    {
        from: "Coordinator",
        to: "User",
        message: "Analysis complete"
    }
]

const sequenceDiagram = createSequenceDiagram(interactions)
console.log(sequenceDiagram)
```

## Example 4: Gantt Chart for Task Timeline

```js
const tasks = [
    {
        name: "Repository Clone",
        startDate: "2024-01-15 10:00:00",
        duration: "5m",
        status: "done"
    },
    {
        name: "Code Analysis",
        startDate: "2024-01-15 10:05:00",
        duration: "15m",
        status: "done"
    },
    {
        name: "Documentation Generation",
        startDate: "2024-01-15 10:20:00",
        duration: "10m",
        status: "active"
    },
    {
        name: "Report Creation",
        startDate: "2024-01-15 10:30:00",
        duration: "5m",
        status: "crit"
    }
]

const ganttChart = createGanttChart(tasks)
console.log(ganttChart)
```

## Example 5: Dynamic Workflow Generation

```js
script({
    model: "github:gpt-4o"
})

def("TASK", "Build and deploy a web application")

$`Create a detailed workflow diagram for the following task: "${env.vars.TASK}"

Include nodes for:
- Start/end points
- Major process steps
- Decision points
- Tools/agents involved
- Quality gates

Return the workflow as a Mermaid flowchart.`

// Parse the response and render
await workspace.writeText("generated-workflow.md", response.text)
```

## Example 6: Multi-Stage Pipeline

```js
const deploymentWorkflow = createWorkflow(
    "CI/CD Pipeline",
    "Continuous Integration and Deployment"
)

// Development stage
addNode(deploymentWorkflow, "commit", "Code Commit", "start")
addNode(deploymentWorkflow, "build", "Build", "process")
addNode(deploymentWorkflow, "unit_test", "Unit Tests", "process")

// Testing stage
addNode(deploymentWorkflow, "integration_test", "Integration Tests", "process")
addNode(deploymentWorkflow, "e2e_test", "E2E Tests", "process")

// Quality gates
addNode(deploymentWorkflow, "quality_gate", "Quality Gate", "decision")

// Deployment stages
addNode(deploymentWorkflow, "deploy_staging", "Deploy to Staging", "process")
addNode(deploymentWorkflow, "smoke_test", "Smoke Tests", "process")
addNode(deploymentWorkflow, "approval", "Manual Approval", "decision")
addNode(deploymentWorkflow, "deploy_prod", "Deploy to Production", "process")
addNode(deploymentWorkflow, "complete", "Complete", "end")

// Connect the flow
addEdge(deploymentWorkflow, "commit", "build")
addEdge(deploymentWorkflow, "build", "unit_test")
addEdge(deploymentWorkflow, "unit_test", "integration_test")
addEdge(deploymentWorkflow, "integration_test", "e2e_test")
addEdge(deploymentWorkflow, "e2e_test", "quality_gate")
addEdge(deploymentWorkflow, "quality_gate", "deploy_staging", "pass")
addEdge(deploymentWorkflow, "quality_gate", "commit", "fail")
addEdge(deploymentWorkflow, "deploy_staging", "smoke_test")
addEdge(deploymentWorkflow, "smoke_test", "approval")
addEdge(deploymentWorkflow, "approval", "deploy_prod", "approved")
addEdge(deploymentWorkflow, "approval", "commit", "rejected")
addEdge(deploymentWorkflow, "deploy_prod", "complete")

const diagram = workflowToMermaid(deploymentWorkflow)
await workspace.writeText("cicd-pipeline.md", diagram)
```

## Example 7: Agent Decision Tree

```js
const decisionWorkflow = createWorkflow(
    "Agent Task Router",
    "Routes tasks to appropriate agents"
)

addNode(decisionWorkflow, "start", "New Task", "start")
addNode(decisionWorkflow, "classify", "Classify Task Type", "decision")

// Different agent paths
addNode(decisionWorkflow, "code_agent", "Code Agent", "agent")
addNode(decisionWorkflow, "data_agent", "Data Agent", "agent")
addNode(decisionWorkflow, "doc_agent", "Documentation Agent", "agent")
addNode(decisionWorkflow, "research_agent", "Research Agent", "agent")

// Completion
addNode(decisionWorkflow, "aggregate", "Aggregate Results", "process")
addNode(decisionWorkflow, "end", "Complete", "end")

// Routing logic
addEdge(decisionWorkflow, "start", "classify")
addEdge(decisionWorkflow, "classify", "code_agent", "code-related")
addEdge(decisionWorkflow, "classify", "data_agent", "data-related")
addEdge(decisionWorkflow, "classify", "doc_agent", "documentation")
addEdge(decisionWorkflow, "classify", "research_agent", "research")

// All paths lead to aggregation
addEdge(decisionWorkflow, "code_agent", "aggregate")
addEdge(decisionWorkflow, "data_agent", "aggregate")
addEdge(decisionWorkflow, "doc_agent", "aggregate")
addEdge(decisionWorkflow, "research_agent", "aggregate")
addEdge(decisionWorkflow, "aggregate", "end")

const diagram = workflowToMermaid(decisionWorkflow)
console.log(diagram)
```

## Integration with Documentation

```js
script({
    model: "github:gpt-4o",
    tools: ["agent_docs"]
})

$`Generate comprehensive documentation with workflow diagrams for:
- Agent coordination patterns
- Task execution flows
- Error handling procedures
- Retry and fallback strategies

Include Mermaid diagrams to visualize each workflow.
Save as workflow-documentation.md`
```

These workflow visualizations can be:
- Embedded in documentation
- Displayed in dashboards
- Used for system design
- Shared in presentations
- Generated dynamically from execution traces
