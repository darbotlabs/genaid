---
title: Multi-Provider Example
description: Using multiple LLM providers in one workflow
---

# Multi-Provider Workflow

This example shows how to use different providers for different tasks.

## Use Azure for Analysis

```javascript
// Use Azure Foundry for complex analysis
script({ model: "azure:gpt-4o", credentialsType: "cli" })

def("DATA", await workspace.readText("data.json"))

const analysis = await runPrompt((_) => {
    _.def("DATA", DATA)
    _.$`Analyze this data and provide detailed insights: ${DATA}`
})
```

## Use GitHub Copilot for Code Generation

```javascript
// Switch to GitHub for code generation
script({ model: "github:gpt-4o-mini" })

const code = await runPrompt((_) => {
    _.$`Generate Python code to implement these insights:
    
    ${analysis}
    
    Include:
    - Data processing
    - Visualization
    - Error handling`
})

// Save generated code
defOutput("analysis_script.py", code)
```

## Use Local Model for Quick Tasks

```javascript
// Use Ollama for quick, privacy-sensitive tasks
script({ model: "ollama:phi3" })

$`Summarize the above in 3 bullet points`
```

## Benefits
- Use best model for each task
- Optimize costs
- Balance performance and privacy
- Fallback options
