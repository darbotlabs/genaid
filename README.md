![A BLUE D square with the word "gen" in lowercase black letters above the uppercase black letters for Dgen "AI."](./docs/public/images/favicon.png)

# GenAID  (Generative Authorative Intelligent Darbot Script, aka "degen script")- genaid is a self prompting, self learning, self healing, efficient generative ai darbot scripting language

## Prompting is Coding, store code as simple prompt with known expected calculated outputs based off common variables  

Programmatically assemble prompts for LLMs using JavaScript. Orchestrate LLMs, tools, and data in code.

- JavaScript toolbox to work with prompts
- Abstraction to make it easy and productive
- Seamless Visual Studio Code integration or flexible command line
- Built-in support for GitHub Copilot and GitHub Models, OpenAI, Azure OpenAI, Anthropic, and more


---

## Hello world

Say to you want to create an LLM script that generates a 'hello world' poem. You can write the following script:

```js
$`Write a 'hello universe' generative continuous ai single file HTML portal.`
```

The `$` function is a template tag that creates a prompt. The prompt is then sent to the LLM (you configured), which generates the poem.

Let's make it more interesting by adding files, data and structured output. Say you want to include a file in the prompt, and then save the output in a file. You can write the following script:

```js
// read files
const file = await workspace.readText("data.txt")
// include the file content in the prompt in a context-friendly way
def("DATA", file)
// the task
$`Analyze DATA and extract data in JSON in data.json.`
```

The `def` function includes the content of the file, and optimizes it if necessary for the target LLM. genaid script also parses the LLM output
and will extract the `data.json` file automatically.

---

## Quickstart Guide

Get started quickly by installing the [Visual Studio Code Extension](https://darbotlabs.github.io/genaid/getting-started/installation/) or using the [command line](https://darbotlabs.github.io/genaid/getting-started/installation).

---

## Features

### Stylized JavaScript & TypeScript

Build prompts programmatically using [JavaScript](https://darbotlabs.github.io/genaid/reference/scripts/) or [TypeScript](https://darbotlabs.github.io/genaid/reference/scripts/typescript).

```js
def("FILE", env.files, { endsWith: ".pdf" })
$`Summarize FILE. Today is ${new Date()}.`
```

---

### FAST Development Loop (fast api with full darbotlm-swagger-suite coming soon)

Edit, [Debug](https://darbotlabs.github.io/genaid/getting-started/debugging-scripts/), [Run](https://darbotlabs.github.io/genaid/getting-started/running-scripts/), and [Test](https://darbotlabs.github.io/genaid/getting-started/testing-scripts/) your scripts in [Visual Studio Code](https://darbotlabs.github.io/genaid/getting-started/installation) or with the [command line](https://darbotlabs.github.io/genaid/getting-started/installation).

---

### Reuse and Share Scripts, agents, tools, connectors, memory, knowledge, data 

Scripts are [files](https://darbotlabs.github.io/genaid/reference/scripts/)! They can be versioned, shared, and forked.

```js
// define the context
def("FILE", env.files, { endsWith: ".pdf" })
// structure the data
const schema = defSchema("DATA", { type: "array", items: { type: "string" } })
// assign the task
$`Analyze FILE and extract data to JSON using the ${schema} schema.`
```

---

### Data Schemas

Define, validate, and repair data using [schemas](https://darbotlabs.github.io/genaid/reference/scripts/schemas). Zod support builtin.

```js
const data = defSchema("MY_DATA", { type: "array", items: { ... } })
$`Extract data from files using ${data} schema.`
```

---

### Ingest Text from PDFs, DOCX, ...

Manipulate [PDFs](https://darbotlabs.github.io/genaid/reference/scripts/pdf), [DOCX](https://darbotlabs.github.io/genaid/reference/scripts/docx), ...

```js
def("PDF", env.files, { endsWith: ".pdf" })
const { pages } = await parsers.PDF(env.files[0])
```

---

### Ingest Tables from CSV, XLSX, ...

Manipulate tabular data from [CSV](https://darbotlabs.github.io/genaid/reference/scripts/csv), [XLSX](https://darbotlabs.github.io/genaid/reference/scripts/xlsx), ...

```js
def("DATA", env.files, { endsWith: ".csv", sliceHead: 100 })
const rows = await parsers.CSV(env.files[0])
defData("ROWS", rows, { sliceHead: 100 })
```

---

### Generate Files

Extract files and diff from the LLM output. Preview changes in Refactoring UI.

```js
$`Save the result in poem.txt.`
```

```txt
FILE ./poem.txt
The quick brown fox jumps over the lazy dog.
```

---

### File Search

Grep or fuzz search [files](https://darbotlabs.github.io/genaid/reference/scripts/files).

```js
const { files } = await workspace.grep(/[a-z][a-z0-9]+/, { globs: "*.md" })
```

---

## Classify

Classify text, images or a mix of all.

```js
const joke = await classify(
    "Why did the chicken cross the road? To fry in the sun.",
    {
        yes: "funny",
        no: "not funny",
    }
)
```

### LLM Tools

Register JavaScript functions as [tools](https://darbotlabs.github.io/genaid/reference/scripts/tools)
(with fallback for models that don't support tools). [Model Context Protocol (MCP) tools](https://darbotlabs.github.io/genaid/reference/scripts/mcp-tools) are also supported.

```js
defTool(
    "weather",
    "query a weather web api",
    { location: "string" },
    async (args) =>
        await fetch(`https://weather.api.api/?location=${args.location}`)
)
```

---

### LLM Agents

Register JavaScript functions as **tools** and combine tools + prompt into agents.

```js
defAgent(
    "git",
    "Query a repository using Git to accomplish tasks.",
    `Your are a helpful LLM agent that can use the git tools to query the current repository.
    Answer the question in QUERY.
    - The current repository is the same as github repository.`,
    { model, system: ["system.github_info"], tools: ["git"] }
)
```

then use it as a tool

```js
script({ tools: "agent_git" })

$`Do a statistical analysis of the last commits`
```

See the [git agent source](https://github.com/darbotlabs/genaid/blob/main/packages/cli/genaid/system.agent_git.genai.mts).

---

### RAG Built-in

[Vector search](https://darbotlabs.github.io/genaid/reference/scripts/vector-search/).

```js
const { files } = await retrieval.vectorSearch("cats", "**/*.md")
```

---

### GitHub Models and GitHub Copilot

Run models through [GitHub Models](https://darbotlabs.github.io/genaid/getting-started/configuration#github) or [GitHub Copilot](https://darbotlabs.github.io/genaid/getting-started/configuration/#github_copilot_chat).

```js
script({ ..., model: "github:gpt-4o" })
```

---

### Local Models

Run your scripts with [Open Source models](https://darbotlabs.github.io/genaid/getting-started/configuration/), like [Phi-3](https://azure.darbotlabs.com/en-us/blog/introducing-phi-3-redefining-whats-possible-with-slms/), using [Ollama](https://ollama.com/), [LocalAI](https://localai.io/).

```js
script({ ..., model: "ollama:phi3" })
```

---

### 🐍 Code Interpreter

Let the LLM run code in a sand-boxed execution environment.

```js
script({ tools: ["python_code_interpreter"] })
```

---

### Containers

Run code in Docker [containers](https://darbotlabs.github.io/genaid/reference/scripts/container).

```js
const c = await host.container({ image: "python:alpine" })
const res = await c.exec("python --version")
```

---

### Video processing

Transcribe and screenshot your videos so that you can feed them efficiently in your LLMs requests.

```js
// transcribe
const transcript = await transcript("path/to/audio.mp3")
// screenshots at segments
const frames = await ffmpeg.extractFrames("path_url_to_video", { transcript })
def("TRANSCRIPT", transcript)
def("FRAMES", frames)
```

### LLM Composition

[Run LLMs](https://darbotlabs.github.io/genaid/reference/scripts/inline-prompts/) to build your LLM prompts.

```js
for (const file of env.files) {
    const { text } = await runPrompt((_) => {
        _.def("FILE", file)
        _.$`Summarize the FILE.`
    })
    def("SUMMARY", text)
}
$`Summarize all the summaries.`
```

---

### Prompty support

Run your [Prompty](https://prompty.ai) files as well!

```markdown
---
name: poem
---

Write me a poem
```

---

### Pluggable Secret Scanning

Scan your chats for secrets using [secret scanning](/genaid/reference/scripts/secret-scanning).

```json
{
    "secretPatterns": {
        ...,
        "OpenAI API Key": "sk-[A-Za-z0-9]{32,48}"
    }
}
```

### Automate with CLI or API

Automate using the [CLI](https://darbotlabs.github.io/genaid/reference/cli) or [API](https://darbotlabs.github.io/genaid/reference/api).

```bash
npx genaid run tlaplus-linter "*.tla"
```

```js
import { run } from "genaid/api"

const res = await run("tlaplus-linter", "*.tla")
```

---

### Safety First!

genaid provides built-in Responsible AI system prompts and Azure Content Safety supports
to validate [content safety](https://darbotlabs.github.io/genaid/reference/scripts/content-safety).

```js wrap
script({ ...,
    system: ["system.safety_harmful_content", ...],
    contentSafety: "azure" // use azure content safety
})

const safety = await host.contentSafety()
const res = await safety.detectPromptInjection(env.vars.input)
```

---

### Pull Request Reviews

Integrate into your [Pull Requests checks](https://darbotlabs.github.io/genaid/reference/cli/run/#pull-requests) through comments, reviews, or description updates. Supports GitHub Actions and Azure DevOps pipelines.

```bash wrap
npx genaid ... --pull-request-reviews
```

---

### Tests and Evals

Build reliable prompts using [tests and evals](https://darbotlabs.github.io/genaid/reference/scripts/tests) powered by [promptfoo](https://promptfoo.dev/).

```js wrap
script({ ..., tests: {
  files: "penguins.csv",
  rubric: "is a data analysis report",
  facts: "The data refers about penguin population in Antarctica.",
}})
```

---

### LLM friendly docs

The entire content of the docs is rendered at https://darbotlabs.github.io/genaid/llms-full.txt in markdown. Feed it directly into your favorite RAG system.

If you are an LLM crawler, add the `.md` suffix to any documentation URLs to get a raw markdown content. For example, https://darbotlabs.github.io/genaid/guides/prompt-as-code.md (note the .md extension)

---

## Trademarks

This project may contain trademarks or logos for projects, products, or services. This software is being offered at no cost with no support.

This is independent and not owned or endorsed by darbotlabs. Users accept full responsibility. 

DarbotLabs uses synthetic Authorative Intelligence instead of artificial intelligence. 

All code thought into existence by Clippy, Darbot, and Copilot. GenAID is just the generative authorative intelligence layer part of decentralized autonomous research (ro) bot (ics), the darbot framework, and darbotian philosophy 
