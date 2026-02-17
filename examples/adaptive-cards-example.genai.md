---
title: Adaptive Cards Example
description: Generate rich, interactive adaptive cards for structured data display
---

# Adaptive Cards Example

Generate Microsoft Adaptive Cards for displaying structured data in a rich, interactive format.

```js
import {
    createAdaptiveCard,
    addTextBlock,
    addImage,
    addFactSet,
    addAction,
    createCardFromData,
    cardToJSON
} from "genaid/core"

// Example 1: Create a status report card
const statusCard = createAdaptiveCard("1.5")

addTextBlock(statusCard, "Daily Status Report", { 
    size: "large", 
    weight: "bolder" 
})

addTextBlock(statusCard, new Date().toLocaleDateString(), { 
    color: "accent",
    size: "medium"
})

addFactSet(statusCard, [
    { title: "Tasks Completed", value: "12" },
    { title: "Tasks In Progress", value: "5" },
    { title: "Blocked", value: "2" },
    { title: "Team Velocity", value: "85%" }
])

addAction(statusCard, "View Details", "Action.OpenUrl", {
    url: "https://dashboard.example.com/status"
})

console.log(cardToJSON(statusCard))

// Example 2: Generate card from LLM response
$`Analyze the repository and provide key metrics:
- Total files
- Lines of code
- Test coverage
- Recent commit activity
- Top contributors

Return as JSON object.`

// After getting response, convert to adaptive card
const data = {
    "Total Files": 234,
    "Lines of Code": 45678,
    "Test Coverage": "87%",
    "Recent Commits": 156,
    "Top Contributor": "alice@example.com"
}

const metricsCard = createCardFromData(data, {
    title: "Repository Metrics",
    subtitle: "Last updated: " + new Date().toLocaleString(),
    imageUrl: "https://example.com/repo-icon.png"
})

def("CARD", cardToJSON(metricsCard))

$`Present this adaptive card to the user: ${JSON.stringify(metricsCard)}`
```

## Example 3: Dynamic Card Generation

```js
script({
    model: "github:gpt-4o"
})

def("FILES", env.files)

$`Analyze the FILES and create an adaptive card with:

1. Title: "File Analysis Report"
2. Summary section with:
   - Total files analyzed
   - Total size
   - File type breakdown
3. Top 5 largest files as a fact set
4. Actions:
   - Button to view full report
   - Button to download CSV

Return the adaptive card as JSON following this structure:
\`\`\`json
{
    "type": "AdaptiveCard",
    "version": "1.5",
    "body": [
        {
            "type": "TextBlock",
            "text": "File Analysis Report",
            "size": "large",
            "weight": "bolder"
        },
        // ... more elements
    ],
    "actions": [
        {
            "type": "Action.OpenUrl",
            "title": "View Full Report",
            "url": "https://..."
        }
    ]
}
\`\`\`

Make the card informative and visually appealing.`
```

## Example 4: Multi-Column Layout

```js
import { createAdaptiveCard, addColumnSet, addTextBlock } from "genaid/core"

const dashboardCard = createAdaptiveCard("1.5")

addTextBlock(dashboardCard, "System Dashboard", { 
    size: "extraLarge", 
    weight: "bolder" 
})

// Add three-column layout
addColumnSet(dashboardCard, [
    {
        width: "auto",
        items: [
            { type: "TextBlock", text: "CPU", weight: "bolder" },
            { type: "TextBlock", text: "45%", size: "large", color: "good" }
        ]
    },
    {
        width: "auto",
        items: [
            { type: "TextBlock", text: "Memory", weight: "bolder" },
            { type: "TextBlock", text: "78%", size: "large", color: "warning" }
        ]
    },
    {
        width: "auto",
        items: [
            { type: "TextBlock", text: "Disk", weight: "bolder" },
            { type: "TextBlock", text: "92%", size: "large", color: "attention" }
        ]
    }
])

console.log(cardToJSON(dashboardCard, true))
```

## Integration with Agents

```js
script({
    model: "github:gpt-4o",
    tools: ["agent_git", "agent_fs"]
})

$`Use the agents to gather repository information and create an adaptive card showing:
- Repository overview (name, description, language)
- Recent activity (commits, contributors)
- Code statistics (files, lines, languages)
- Health indicators (test coverage, issues, PRs)

Format as an Adaptive Card JSON that can be rendered in Microsoft Teams, 
Outlook, or other platforms supporting Adaptive Cards.`
```

## Output Format

The generated adaptive cards can be:
- Displayed in Teams/Outlook/Bot Framework
- Rendered as HTML using the Adaptive Cards renderer
- Stored for later use
- Sent via webhooks to integrated systems
