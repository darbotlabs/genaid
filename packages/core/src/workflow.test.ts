import {
    createWorkflow,
    addNode,
    addEdge,
    workflowToMermaid,
    validateWorkflow,
} from "./workflow"
import { describe, test } from "node:test"
import assert from "node:assert/strict"

describe("Workflow Visualization", () => {
    describe("createWorkflow", () => {
        test("should create a basic workflow", () => {
            const workflow = createWorkflow("Test Workflow", "A test")
            assert.equal(workflow.name, "Test Workflow")
            assert.equal(workflow.description, "A test")
            assert.ok(Array.isArray(workflow.nodes))
            assert.ok(Array.isArray(workflow.edges))
        })
    })

    describe("addNode", () => {
        test("should add a node to workflow", () => {
            const workflow = createWorkflow("Test")
            addNode(workflow, "node1", "Start", "start")
            assert.equal(workflow.nodes.length, 1)
            assert.equal(workflow.nodes[0].id, "node1")
            assert.equal(workflow.nodes[0].label, "Start")
            assert.equal(workflow.nodes[0].type, "start")
        })
    })

    describe("addEdge", () => {
        test("should add an edge to workflow", () => {
            const workflow = createWorkflow("Test")
            addNode(workflow, "node1", "Start", "start")
            addNode(workflow, "node2", "End", "end")
            addEdge(workflow, "node1", "node2", "connect")
            assert.equal(workflow.edges.length, 1)
            assert.equal(workflow.edges[0].from, "node1")
            assert.equal(workflow.edges[0].to, "node2")
            assert.equal(workflow.edges[0].label, "connect")
        })
    })

    describe("workflowToMermaid", () => {
        test("should convert workflow to Mermaid syntax", () => {
            const workflow = createWorkflow("Test Workflow")
            addNode(workflow, "start", "Begin", "start")
            addNode(workflow, "process", "Process", "process")
            addNode(workflow, "end", "Complete", "end")
            addEdge(workflow, "start", "process")
            addEdge(workflow, "process", "end")

            const mermaid = workflowToMermaid(workflow)
            assert.ok(mermaid.includes("```mermaid"))
            assert.ok(mermaid.includes("flowchart TD"))
            assert.ok(mermaid.includes("start([Begin])"))
            assert.ok(mermaid.includes("process[Process]"))
            assert.ok(mermaid.includes("start --> process"))
        })
    })

    describe("validateWorkflow", () => {
        test("should validate a correct workflow", () => {
            const workflow = createWorkflow("Test")
            addNode(workflow, "n1", "Node 1", "process")
            const result = validateWorkflow(workflow)
            assert.equal(result.valid, true)
            assert.equal(result.errors.length, 0)
        })

        test("should detect workflow without name", () => {
            const workflow = { name: "", nodes: [], edges: [] }
            const result = validateWorkflow(workflow as any)
            assert.equal(result.valid, false)
            assert.ok(result.errors.length > 0)
        })

        test("should detect invalid edge references", () => {
            const workflow = createWorkflow("Test")
            addNode(workflow, "n1", "Node 1", "process")
            addEdge(workflow, "n1", "n2")
            const result = validateWorkflow(workflow)
            assert.equal(result.valid, false)
            assert.ok(result.errors.some((e) => e.includes("n2")))
        })
    })
})
