---
title: GitHub Copilot Example
description: Using GitHub Models API
model: github:gpt-4o
---

# GitHub Copilot / Models Example

This example uses GitHub's Models API which provides access to various LLMs.

## Prerequisites
- GitHub Personal Access Token with appropriate scopes
- GITHUB_TOKEN configured in .env

## Code Review Example

```javascript
def("CODE", env.files, { endsWith: ".js" })

$`Review this code for:
1. Security vulnerabilities
2. Performance issues
3. Best practices
4. Potential bugs

CODE: ${CODE}

Provide specific recommendations for improvements.`
```

## Data Analysis Example

```javascript
const data = defData("SALES_DATA", [
    { month: "Jan", sales: 1000 },
    { month: "Feb", sales: 1500 },
    { month: "Mar", sales: 1200 }
])

$`Analyze this sales data and provide insights:
${data}

Include:
- Trends
- Anomalies
- Recommendations`
```
