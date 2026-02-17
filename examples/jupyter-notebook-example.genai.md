---
title: Jupyter Notebook Integration
description: Work with Jupyter notebooks in GenAID scripts
---

# Jupyter Notebook Integration Example

Convert between Jupyter notebooks and GenAID scripts, execute notebooks, and generate new notebooks.

```js
import {
    parseNotebook,
    createNotebook,
    addCodeCell,
    addMarkdownCell,
    extractCode,
    notebookToGenAIDScript,
    genAIDScriptToNotebook,
    notebookToJSON
} from "genaid/core"

// Example 1: Parse and analyze existing notebook
const notebookFile = await workspace.readText("analysis.ipynb")
const notebook = parseNotebook(notebookFile)

console.log(`Notebook has ${notebook.cells.length} cells`)
console.log(`Language: ${notebook.metadata.kernelspec?.language}`)

// Extract all code for analysis
const code = extractCode(notebook)
def("CODE", code)

$`Analyze this Python notebook code and suggest improvements:
- Code quality issues
- Performance optimizations
- Best practices violations
- Missing error handling

CODE:
${code}`

// Example 2: Create a new notebook programmatically
const newNotebook = createNotebook("python", "Python 3")

addMarkdownCell(newNotebook, "# Data Analysis Report")
addMarkdownCell(newNotebook, "This notebook performs exploratory data analysis.")

addCodeCell(newNotebook, [
    "import pandas as pd\n",
    "import matplotlib.pyplot as plt\n",
    "\n",
    "# Load data\n",
    "df = pd.read_csv('data.csv')\n",
    "df.head()"
])

addMarkdownCell(newNotebook, "## Summary Statistics")

addCodeCell(newNotebook, "df.describe()")

// Save notebook
const notebookJson = notebookToJSON(newNotebook, true)
await workspace.writeText("generated_analysis.ipynb", notebookJson)
```

## Example 3: Convert GenAID Script to Notebook

```js
// Read a GenAID markdown script
const genaidScript = await workspace.readText("my-script.genai.md")

// Convert to Jupyter notebook
const notebook = genAIDScriptToNotebook(genaidScript, "python")

// Save as .ipynb
await workspace.writeText(
    "my-script.ipynb", 
    notebookToJSON(notebook, true)
)

$`Converted GenAID script to Jupyter notebook format.
The notebook is now available at my-script.ipynb`
```

## Example 4: Generate Notebook from Data

```js
script({
    model: "github:gpt-4o"
})

def("DATA", env.files, { endsWith: ".csv" })

$`Create a Jupyter notebook that:
1. Loads the CSV data
2. Performs exploratory data analysis
3. Creates visualizations
4. Generates insights

Return Python code for each cell, formatted as:

CELL 1 (markdown):
# Title

CELL 2 (code):
import pandas as pd
...

Continue for all necessary cells.`

// Parse the response and create notebook
const cells = parseCellsFromResponse(response.text)
const notebook = createNotebook("python")

for (const cell of cells) {
    if (cell.type === "markdown") {
        addMarkdownCell(notebook, cell.content)
    } else {
        addCodeCell(notebook, cell.content)
    }
}

await workspace.writeText("analysis.ipynb", notebookToJSON(notebook, true))
```

## Example 5: Notebook-based Agent

```js
script({
    model: "github:gpt-4o",
    tools: ["python_code_interpreter"]
})

// Create a notebook for interactive data exploration
const notebook = createNotebook("python", "Python 3 (GenAID)")

addMarkdownCell(notebook, `# Interactive Data Exploration
Generated: ${new Date().toLocaleString()}`)

def("DATASET", await workspace.readText("sales.csv"))

$`Create a complete data analysis notebook with these sections:

1. **Data Loading**: Load the sales dataset
2. **Data Cleaning**: Handle missing values, outliers
3. **Exploratory Analysis**: Basic statistics and distributions
4. **Visualizations**: Charts showing key insights
5. **Conclusions**: Summary of findings

Generate the complete notebook structure with markdown explanations 
and Python code cells. Execute the code to verify it works.`

// The agent will generate and execute the notebook
```

## Example 6: Notebook Documentation Generator

```js
import { parseNotebook, extractCode, extractMarkdown } from "genaid/core"

// Read notebooks from a directory
const notebookFiles = await workspace.grep(/\.ipynb$/, { globs: "**/*.ipynb" })

for (const file of notebookFiles.files) {
    const content = await workspace.readText(file)
    const notebook = parseNotebook(content)
    
    // Extract documentation
    const markdown = extractMarkdown(notebook)
    const code = extractCode(notebook)
    
    def("NOTEBOOK_TITLE", file)
    def("MARKDOWN", markdown)
    def("CODE_SUMMARY", code.slice(0, 1000))
    
    $`Create a markdown documentation page for this notebook:
    
    Notebook: ${file}
    
    Include:
    - Purpose and overview
    - Required dependencies
    - Usage instructions
    - Key functions and their descriptions
    - Expected outputs
    
    Base the documentation on the notebook content.`
}
```

## Advanced: Notebook Execution Results

```js
import { parseNotebook, notebookToJSON } from "genaid/core"

script({
    tools: ["python_code_interpreter"]
})

// Load notebook
const notebook = parseNotebook(await workspace.readText("experiment.ipynb"))

// Extract and execute code cells
const cells = notebook.cells.filter(c => c.cell_type === "code")

for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]
    const code = Array.isArray(cell.source) 
        ? cell.source.join("") 
        : cell.source
    
    $`Execute this Python code and return the output:
    
    \`\`\`python
    ${code}
    \`\`\`
    `
    
    // Store results back in notebook
    cell.outputs = [{
        output_type: "execute_result",
        execution_count: i + 1,
        data: {
            "text/plain": response.text
        }
    }]
}

// Save notebook with results
await workspace.writeText(
    "experiment_executed.ipynb",
    notebookToJSON(notebook, true)
)
```

## Integration with Agent Swarm

```js
script({
    model: "reasoning",
    tools: ["agent_fs", "agent_docs", "agent_interpreter"]
})

$`Agent Swarm Task: Create a comprehensive data science notebook

Coordination:
1. FS Agent: Find and read all CSV files in the project
2. Interpreter Agent: Create Python code for analysis
3. Docs Agent: Write explanatory markdown content

Generate a complete Jupyter notebook with:
- Data loading and preprocessing
- Statistical analysis
- Machine learning models
- Visualizations
- Conclusions

Save as data_science_analysis.ipynb`
```

The Jupyter integration enables:
- Converting scripts to notebooks for interactive execution
- Extracting code from notebooks for analysis
- Generating new notebooks programmatically
- Executing notebooks via agents
- Creating documentation from notebooks
