/**
 * Dashboard workflow visualization support
 * Creates Mermaid diagrams for agent workflows and execution flows
 */

export interface WorkflowNode {
    id: string
    label: string
    type: "start" | "end" | "process" | "decision" | "agent" | "tool"
    metadata?: Record<string, any>
}

export interface WorkflowEdge {
    from: string
    to: string
    label?: string
    condition?: string
}

export interface Workflow {
    name: string
    description?: string
    nodes: WorkflowNode[]
    edges: WorkflowEdge[]
}

/**
 * Creates a new workflow
 */
export function createWorkflow(
    name: string,
    description?: string
): Workflow {
    return {
        name,
        description,
        nodes: [],
        edges: [],
    }
}

/**
 * Adds a node to the workflow
 */
export function addNode(
    workflow: Workflow,
    id: string,
    label: string,
    type: WorkflowNode["type"],
    metadata?: Record<string, any>
): Workflow {
    workflow.nodes.push({ id, label, type, metadata })
    return workflow
}

/**
 * Adds an edge to the workflow
 */
export function addEdge(
    workflow: Workflow,
    from: string,
    to: string,
    label?: string,
    condition?: string
): Workflow {
    workflow.edges.push({ from, to, label, condition })
    return workflow
}

/**
 * Converts workflow to Mermaid flowchart syntax
 */
export function workflowToMermaid(workflow: Workflow): string {
    const lines: string[] = []
    
    lines.push("```mermaid")
    lines.push("flowchart TD")
    
    if (workflow.description) {
        lines.push(`    %% ${workflow.description}`)
    }
    
    // Add nodes with appropriate shapes
    for (const node of workflow.nodes) {
        let nodeDefinition: string
        
        switch (node.type) {
            case "start":
                nodeDefinition = `${node.id}([${node.label}])`
                break
            case "end":
                nodeDefinition = `${node.id}([${node.label}])`
                break
            case "decision":
                nodeDefinition = `${node.id}{${node.label}}`
                break
            case "agent":
                nodeDefinition = `${node.id}[🤖 ${node.label}]`
                break
            case "tool":
                nodeDefinition = `${node.id}[🔧 ${node.label}]`
                break
            case "process":
            default:
                nodeDefinition = `${node.id}[${node.label}]`
                break
        }
        
        lines.push(`    ${nodeDefinition}`)
    }
    
    // Add edges
    for (const edge of workflow.edges) {
        const label = edge.label || edge.condition || ""
        const edgeStr = label
            ? `${edge.from} -->|${label}| ${edge.to}`
            : `${edge.from} --> ${edge.to}`
        lines.push(`    ${edgeStr}`)
    }
    
    lines.push("```")
    return lines.join("\n")
}

/**
 * Converts workflow to Mermaid state diagram syntax
 */
export function workflowToStateDiagram(workflow: Workflow): string {
    const lines: string[] = []
    
    lines.push("```mermaid")
    lines.push("stateDiagram-v2")
    
    if (workflow.description) {
        lines.push(`    note right of [*]: ${workflow.description}`)
    }
    
    // Find start and end nodes
    const startNode = workflow.nodes.find(n => n.type === "start")
    const endNode = workflow.nodes.find(n => n.type === "end")
    
    if (startNode) {
        lines.push(`    [*] --> ${startNode.id}`)
    }
    
    // Add states
    for (const node of workflow.nodes) {
        if (node.type !== "start" && node.type !== "end") {
            lines.push(`    ${node.id}: ${node.label}`)
        }
    }
    
    // Add transitions
    for (const edge of workflow.edges) {
        const label = edge.label || edge.condition || ""
        const edgeStr = label
            ? `${edge.from} --> ${edge.to}: ${label}`
            : `${edge.from} --> ${edge.to}`
        lines.push(`    ${edgeStr}`)
    }
    
    if (endNode) {
        lines.push(`    ${endNode.id} --> [*]`)
    }
    
    lines.push("```")
    return lines.join("\n")
}

/**
 * Creates a sequence diagram for agent interactions
 */
export function createSequenceDiagram(
    interactions: Array<{
        from: string
        to: string
        message: string
        response?: string
    }>
): string {
    const lines: string[] = []
    
    lines.push("```mermaid")
    lines.push("sequenceDiagram")
    
    for (const interaction of interactions) {
        lines.push(`    ${interaction.from}->>${interaction.to}: ${interaction.message}`)
        if (interaction.response) {
            lines.push(`    ${interaction.to}-->>${interaction.from}: ${interaction.response}`)
        }
    }
    
    lines.push("```")
    return lines.join("\n")
}

/**
 * Creates a Gantt chart for agent execution timeline
 */
export function createGanttChart(
    tasks: Array<{
        name: string
        startDate: string
        duration: string
        status?: "done" | "active" | "crit"
    }>
): string {
    const lines: string[] = []
    
    lines.push("```mermaid")
    lines.push("gantt")
    lines.push("    title Agent Execution Timeline")
    lines.push("    dateFormat YYYY-MM-DD HH:mm:ss")
    lines.push("    section Tasks")
    
    for (const task of tasks) {
        const status = task.status ? `, ${task.status}` : ""
        lines.push(`    ${task.name} :${status}, ${task.startDate}, ${task.duration}`)
    }
    
    lines.push("```")
    return lines.join("\n")
}

/**
 * Creates an agent swarm coordination diagram
 */
export function createSwarmDiagram(
    coordinator: string,
    agents: Array<{ id: string; name: string; specialization: string }>,
    tasks: Array<{ agent: string; task: string }>
): string {
    const workflow = createWorkflow("Agent Swarm Coordination")
    
    // Add coordinator
    addNode(workflow, coordinator, coordinator, "agent")
    
    // Add agents
    for (const agent of agents) {
        addNode(workflow, agent.id, `${agent.name}\\n(${agent.specialization})`, "agent")
        addEdge(workflow, coordinator, agent.id, "assign")
    }
    
    // Add task assignments
    for (const task of tasks) {
        const taskId = `task_${task.task.replace(/\s+/g, "_")}`
        addNode(workflow, taskId, task.task, "process")
        addEdge(workflow, task.agent, taskId, "execute")
        addEdge(workflow, taskId, coordinator, "report")
    }
    
    return workflowToMermaid(workflow)
}

/**
 * Validates workflow structure
 */
export function validateWorkflow(workflow: Workflow): {
    valid: boolean
    errors: string[]
} {
    const errors: string[] = []
    
    if (!workflow.name) {
        errors.push("Workflow name is required")
    }
    
    if (!workflow.nodes || workflow.nodes.length === 0) {
        errors.push("Workflow must have at least one node")
    }
    
    // Check that all edge references exist
    const nodeIds = new Set(workflow.nodes.map(n => n.id))
    for (const edge of workflow.edges) {
        if (!nodeIds.has(edge.from)) {
            errors.push(`Edge references non-existent node: ${edge.from}`)
        }
        if (!nodeIds.has(edge.to)) {
            errors.push(`Edge references non-existent node: ${edge.to}`)
        }
    }
    
    return {
        valid: errors.length === 0,
        errors,
    }
}
