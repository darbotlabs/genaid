---
title: Pull Request Reviewer
description: Review the current files or changes
sidebar:
  order: 5
cover:
  alt: A minimalist 2D pixel-art illustration showing a GitHub pull request review
    automation process. It includes a file comparison icon linked by an arrow to
    a gear icon, symbolizing the script's execution. Nearby is a notification
    bubble icon, indicating feedback. The sequence ends with a cloud icon,
    representing GitHub Actions. The design uses geometric shapes, five
    corporate colors, and an 8-bit style for clarity without text or people.
  image: ./prr.png
tags:
  - GenAID
  - Pull Request Review Script
  - GitHub Actions Automation
  - Content Safety Measures
  - Script with File System Integration
excerpt: Take your pull request reviews to the next level with automation. This
  guide walks you through creating a script that analyzes code changes,
  identifies errors (not warnings), and provides actionable suggestions directly
  in GitHub. Learn how to integrate this process locally for refinement,
  leverage built-in agents for deeper file analysis, and ultimately automate it
  using GitHub Actions. From metadata configurations to safety measures, you'll
  implement a workflow that's comprehensive, efficient, and secure.

---

The following sample shows a script that analyzes the changes in a pull request and posts the comments in GitHub.
We will develop the script locally and then create a GitHub Action to run it automatically.

## Add the script

- Open your GitHub repository and start a new pull request.
- Add the following script to your repository as `genaid/prr.genai.mts`.

```ts title="genaid/prr.genai.mts" wrap
script({
    title: "Pull Request Reviewer",
    description: "Review the current pull request",
    systemSafety: true,
    parameters: {
        base: "",
    },
})
const { dbg, vars } = env
const base = vars.base || (await git.defaultBranch())
const changes = await git.diff({
    base,
    llmify: true,
})
if (!changes) cancel("No changes found in the pull request")
dbg(`changes: %s`, changes)
const gitDiff = def("GIT_DIFF", changes, {
    language: "diff",
    maxTokens: 14000,
    detectPromptInjection: "available",
})
$`Report errors in ${gitDiff} using the annotation format.

- Use best practices of the programming language of each file.
- If available, provide a URL to the official documentation for the best practice. do NOT invent URLs.
- Analyze ALL the code. Do not be lazy. This is IMPORTANT.
- Use tools to read the entire file content to get more context
- Do not report warnings, only errors.
- Add suggestions if possible, skip if you are not sure about a fix.
`
```

- run the [GenAID cli](/genaid/reference/cli/) to add the type definition files and fix the syntax errors in the editor (optional).

```bash
npx --yes genaid script fix
```

The script starts with a metadata section (`script({ ... })`) that defines the title, description, and system safety options.
The script then uses the `git` tool to get the diff of the pull request and stores it in the `GIT_DIFF` variable.

The script then uses the `$` template literal to generate a report based on the diff. The report includes best practices for the programming language of each file, and it is important to analyze all the code.
The script also includes a note to use tools to read the entire file content to get more context and to avoid reporting warnings.

## Run the script locally

Since you are already in a pull request, you can run with the script and tune the prompting to your needs.
You can use the GenAID Visual Studio Code extension or use the cli.

```sh
npx --yes genaid run prr
```

You will see an output similar to the following. In the output, you will find links to the run reports (markdown files),
information about the model, preview of the messages and the token usage.

Open the `trace` or `output` reports in your favorite Markdown viewer to inspect the results. This part of the development
is fully local so it's your opportunity to refine the prompting.

```text wrap
┌─💬 github:gpt-4.1 ✉ 2 ~↑1.4kt
┌─📙 system
│## Safety: Jailbreak
│... (85 lines)
│- **Do NOT use function names starting with 'functions.'.
│- **Do NOT respond with multi_tool_use**.
┌─👤 user
│<GIT_DIFF lang="diff">
│--- /dev/null
│+++ .github/workflows/genaid-pr-review.yml
│@@ -0,0 +1,22 @@
│--- /dev/null
│[1] +++ genaid/.gitignore
│... (3 lines)
│Report errors in <GIT_DIFF> using the annotation format.
│- Use best practices of the programming language of each file.
│- If available, provide a URL to the official documentation for the best practice. do NOT invent URLs.
│- Analyze ALL the code. Do not be lazy. This is IMPORTANT.
│- Use tools to read the entire file content to get more context
│- Do not report warnings, only errors.


::error file=.github/workflows/genaid-pr-review.yml,line=1,endLine=22,code=missing_workflow_content::The workflow file is empty or missing mandatory workflow keys like `name`, `on`, and `jobs`. Every GitHub Actions workflow file must specify at least these top-level keys to define triggers and jobs. See official docs: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions

└─🏁  github:gpt-4.1 ✉ 2 3446ms ⇅ 1.9kt ↑1.6kt ↓223t 0.505¢
genaid: success
> 3446ms ↑1.6kt ↓223t 538.62t/s 0.505¢
  github:gpt-4.1-2025-04-14> 3446ms ↑1.6kt ↓223t 538.62t/s 0.505¢
   trace: ...
  output: ...
```

## Make it Agentic

GenAID provides various builtin agents, including a file system and git agent.
This can be useful for the LLM to read the files in the pull request and analyze them.

There are basically two level of agentic-ness you can achieve with GenAID:

- add the [fs_read_file](/genaid/reference/scripts/system/#systemfs_read_file) to read files to the script.

```ts title="genaid/prr.genai.mts" wrap 'tools: ["fs_read"]'
script({
    ...,
    tools: ["fs_read_file"],
})
```

- add the [file system agent](/genaid/reference/scripts/system/#systemagent_fs) that can respond to more complex queries at the cost of additional tokens.

```ts title="genaid/prr.genai.mts" wrap 'tools: ["agent_fs"]'
script({
    ...,
    tools: ["agent_fs"],
})
```

## Automate with GitHub Actions

Using [GitHub Actions](https://docs.github.com/en/actions) and [GitHub Models](https://docs.github.com/en/github-models),
you can automate the execution of the script and creation of the comments.

- Add the following workflow in your GitHub repository.

```yaml title=".github/workflows/genaid-pr-review.yml" wrap
name: genaid pull request review
on:
    pull_request:
        types: [ready_for_review, review_requested]
concurrency:
    group: genaid-pr-review-${{ github.workflow }}-${{ github.ref }}
    cancel-in-progress: true
permissions:
    contents: read # permission to read the repository
    pull-requests: write # permission to write a comment
    models: read # permission to use github models
jobs:
    review:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-node@v4
              with:
                  node-version: "22"
            - name: fetch base branch
              run: git fetch origin ${{ github.event.pull_request.base.ref }}
            - name: genaid prr
              run: npx --yes genaid run prr --vars base=origin/${{ github.event.pull_request.base.ref }} --pull-request-reviews --pull-request-comment --out-trace $GITHUB_STEP_SUMMARY
              env:
                  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

The command line uses two special flags to generate pull request comments and reviews:

- `--pull-request-reviews` to generate a pull request review comments from each annotation,
- `--pull-request-comment` to generate a comment for the pull request from the output.

- Commit the changes, and create a new pull request and start testing the workflow by requesting a review or toggling the `ready_for_review` event.

## Content Safety

The following measures are taken to ensure the safety of the generated content.

- This script includes system prompts to prevent prompt injection and harmful content generation.
    - [system.safety_jailbreak](/genaid/reference/scripts/system#systemsafety_jailbreak)
    - [system.safety_harmful_content](/genaid/reference/scripts/system#systemsafety_harmful_content)

Additional measures to further enhance safety would be to run [a model with a safety filter](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/content-filter?tabs=warning%2Cuser-prompt%2Cpython-new)
or validate the message with a [content safety service](/genaid/reference/scripts/content-safety).

Refer to the [Transparency Note](/genaid/reference/transparency-note/) for more information on content safety.
