import {
    createNotebook,
    addCodeCell,
    addMarkdownCell,
    extractCode,
    extractMarkdown,
    validateNotebook,
    notebookToJSON,
    parseNotebook,
} from "./jupyter"
import { describe, test } from "node:test"
import assert from "node:assert/strict"

describe("Jupyter Notebooks", () => {
    describe("createNotebook", () => {
        test("should create a basic notebook", () => {
            const notebook = createNotebook("python", "Python 3")
            assert.equal(notebook.nbformat, 4)
            assert.ok(Array.isArray(notebook.cells))
            assert.equal(notebook.metadata.kernelspec?.language, "python")
        })
    })

    describe("addCodeCell", () => {
        test("should add a code cell to notebook", () => {
            const notebook = createNotebook()
            addCodeCell(notebook, "print('hello')")
            assert.equal(notebook.cells.length, 1)
            assert.equal(notebook.cells[0].cell_type, "code")
            assert.deepEqual(notebook.cells[0].source, ["print('hello')"])
        })
    })

    describe("addMarkdownCell", () => {
        test("should add a markdown cell to notebook", () => {
            const notebook = createNotebook()
            addMarkdownCell(notebook, "# Title")
            assert.equal(notebook.cells.length, 1)
            assert.equal(notebook.cells[0].cell_type, "markdown")
            assert.deepEqual(notebook.cells[0].source, ["# Title"])
        })
    })

    describe("extractCode", () => {
        test("should extract code from notebook", () => {
            const notebook = createNotebook()
            addCodeCell(notebook, "x = 1")
            addMarkdownCell(notebook, "# Comment")
            addCodeCell(notebook, "y = 2")
            const code = extractCode(notebook)
            assert.ok(code.includes("x = 1"))
            assert.ok(code.includes("y = 2"))
            assert.ok(!code.includes("# Comment"))
        })
    })

    describe("extractMarkdown", () => {
        test("should extract markdown from notebook", () => {
            const notebook = createNotebook()
            addCodeCell(notebook, "x = 1")
            addMarkdownCell(notebook, "# Title")
            addMarkdownCell(notebook, "Description")
            const markdown = extractMarkdown(notebook)
            assert.ok(markdown.includes("# Title"))
            assert.ok(markdown.includes("Description"))
            assert.ok(!markdown.includes("x = 1"))
        })
    })

    describe("validateNotebook", () => {
        test("should validate a correct notebook", () => {
            const notebook = createNotebook()
            const result = validateNotebook(notebook)
            assert.equal(result.valid, true)
            assert.equal(result.errors.length, 0)
        })

        test("should detect invalid notebook format", () => {
            const notebook = { nbformat: 3, cells: [], metadata: {} }
            const result = validateNotebook(notebook as any)
            assert.equal(result.valid, false)
            assert.ok(result.errors.length > 0)
        })
    })

    describe("notebookToJSON and parseNotebook", () => {
        test("should convert notebook to JSON and back", () => {
            const notebook = createNotebook()
            addCodeCell(notebook, "print('test')")
            addMarkdownCell(notebook, "# Test")
            const json = notebookToJSON(notebook)
            const parsed = parseNotebook(json)
            assert.deepEqual(parsed, notebook)
        })
    })
})
