/**
 * Jupyter notebook support for GenAID
 * Enables reading, parsing, and executing Jupyter notebook files (.ipynb)
 */

export interface JupyterNotebook {
    cells: JupyterCell[]
    metadata: JupyterMetadata
    nbformat: number
    nbformat_minor: number
}

export interface JupyterCell {
    cell_type: "code" | "markdown" | "raw"
    execution_count?: number | null
    metadata: Record<string, any>
    outputs?: JupyterOutput[]
    source: string | string[]
}

export interface JupyterOutput {
    output_type: "stream" | "display_data" | "execute_result" | "error"
    name?: string
    text?: string | string[]
    data?: Record<string, any>
    execution_count?: number
    ename?: string
    evalue?: string
    traceback?: string[]
}

export interface JupyterMetadata {
    kernelspec?: {
        display_name: string
        language: string
        name: string
    }
    language_info?: {
        name: string
        version?: string
        file_extension?: string
    }
    [key: string]: any
}

/**
 * Parses a Jupyter notebook from JSON string
 */
export function parseNotebook(json: string): JupyterNotebook {
    return JSON.parse(json) as JupyterNotebook
}

/**
 * Converts a Jupyter notebook to JSON string
 */
export function notebookToJSON(
    notebook: JupyterNotebook,
    pretty: boolean = true
): string {
    return JSON.stringify(notebook, null, pretty ? 2 : 0)
}

/**
 * Creates a new empty Jupyter notebook
 */
export function createNotebook(
    language: string = "python",
    displayName: string = "Python 3"
): JupyterNotebook {
    return {
        cells: [],
        metadata: {
            kernelspec: {
                display_name: displayName,
                language: language,
                name: language,
            },
            language_info: {
                name: language,
            },
        },
        nbformat: 4,
        nbformat_minor: 5,
    }
}

/**
 * Adds a code cell to a notebook
 */
export function addCodeCell(
    notebook: JupyterNotebook,
    source: string | string[],
    outputs: JupyterOutput[] = []
): JupyterNotebook {
    notebook.cells.push({
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs,
        source: Array.isArray(source) ? source : [source],
    })
    return notebook
}

/**
 * Adds a markdown cell to a notebook
 */
export function addMarkdownCell(
    notebook: JupyterNotebook,
    source: string | string[]
): JupyterNotebook {
    notebook.cells.push({
        cell_type: "markdown",
        metadata: {},
        source: Array.isArray(source) ? source : [source],
    })
    return notebook
}

/**
 * Extracts all code from a notebook
 */
export function extractCode(notebook: JupyterNotebook): string {
    return notebook.cells
        .filter((cell) => cell.cell_type === "code")
        .map((cell) =>
            Array.isArray(cell.source) ? cell.source.join("") : cell.source
        )
        .join("\n\n")
}

/**
 * Extracts all markdown from a notebook
 */
export function extractMarkdown(notebook: JupyterNotebook): string {
    return notebook.cells
        .filter((cell) => cell.cell_type === "markdown")
        .map((cell) =>
            Array.isArray(cell.source) ? cell.source.join("") : cell.source
        )
        .join("\n\n")
}

/**
 * Converts notebook to GenAID script format
 */
export function notebookToGenAIDScript(notebook: JupyterNotebook): string {
    const parts: string[] = []

    // Add metadata as frontmatter
    if (notebook.metadata.kernelspec) {
        parts.push("---")
        parts.push(`language: ${notebook.metadata.kernelspec.language}`)
        parts.push(`kernel: ${notebook.metadata.kernelspec.display_name}`)
        parts.push("---\n")
    }

    // Process cells
    for (const cell of notebook.cells) {
        const source = Array.isArray(cell.source)
            ? cell.source.join("")
            : cell.source

        if (cell.cell_type === "markdown") {
            parts.push(source)
            parts.push("")
        } else if (cell.cell_type === "code") {
            parts.push("```" + (notebook.metadata.kernelspec?.language || ""))
            parts.push(source)
            parts.push("```")
            parts.push("")

            // Add outputs as comments
            if (cell.outputs && cell.outputs.length > 0) {
                parts.push("<!-- Output:")
                for (const output of cell.outputs) {
                    if (output.output_type === "stream" && output.text) {
                        const text = Array.isArray(output.text)
                            ? output.text.join("")
                            : output.text
                        parts.push(text)
                    } else if (
                        output.output_type === "execute_result" &&
                        output.data
                    ) {
                        const data = output.data["text/plain"]
                        if (data) {
                            parts.push(
                                Array.isArray(data) ? data.join("") : data
                            )
                        }
                    }
                }
                parts.push("-->")
                parts.push("")
            }
        }
    }

    return parts.join("\n")
}

/**
 * Converts GenAID markdown script to notebook format
 */
export function genAIDScriptToNotebook(
    content: string,
    language: string = "python"
): JupyterNotebook {
    const notebook = createNotebook(language)
    const lines = content.split("\n")
    let i = 0

    // Skip frontmatter if present
    if (lines[0] === "---") {
        i = lines.findIndex((line, idx) => idx > 0 && line === "---") + 1
    }

    let currentBlock: string[] = []
    let inCodeBlock = false
    let blockType: "code" | "markdown" = "markdown"

    while (i < lines.length) {
        const line = lines[i]

        if (line.startsWith("```")) {
            if (!inCodeBlock) {
                // Starting code block
                if (currentBlock.length > 0) {
                    addMarkdownCell(notebook, currentBlock.join("\n"))
                    currentBlock = []
                }
                inCodeBlock = true
                blockType = "code"
            } else {
                // Ending code block
                addCodeCell(notebook, currentBlock.join("\n"))
                currentBlock = []
                inCodeBlock = false
                blockType = "markdown"
            }
        } else {
            currentBlock.push(line)
        }

        i++
    }

    // Add any remaining content
    if (currentBlock.length > 0) {
        if (blockType === "code") {
            addCodeCell(notebook, currentBlock.join("\n"))
        } else {
            addMarkdownCell(notebook, currentBlock.join("\n"))
        }
    }

    return notebook
}

/**
 * Filters cells by type
 */
export function filterCells(
    notebook: JupyterNotebook,
    cellType: "code" | "markdown" | "raw"
): JupyterCell[] {
    return notebook.cells.filter((cell) => cell.cell_type === cellType)
}

/**
 * Gets cell by index
 */
export function getCell(
    notebook: JupyterNotebook,
    index: number
): JupyterCell | undefined {
    return notebook.cells[index]
}

/**
 * Validates notebook structure
 */
export function validateNotebook(notebook: JupyterNotebook): {
    valid: boolean
    errors: string[]
} {
    const errors: string[] = []

    if (!notebook.nbformat || notebook.nbformat < 4) {
        errors.push("Notebook format must be version 4 or higher")
    }

    if (!Array.isArray(notebook.cells)) {
        errors.push("Cells must be an array")
    }

    if (!notebook.metadata) {
        errors.push("Metadata is required")
    }

    return {
        valid: errors.length === 0,
        errors,
    }
}
