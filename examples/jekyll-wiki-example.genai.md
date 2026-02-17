---
title: Jekyll Wiki Generator Example
description: Generate Jekyll-based documentation wikis from GenAID
---

# Jekyll Wiki Generator Example

Create complete Jekyll-based documentation wikis with automated page generation,
navigation, and configuration.

```js
import {
    createJekyllSite,
    createJekyllPage,
    addPage,
    createIndexPage,
    generateConfigYML,
    pageToMarkdown
} from "genaid/core"

// Example 1: Create a Jekyll site for repository documentation
const site = createJekyllSite(
    "GenAID Documentation",
    "Comprehensive guide for GenAID framework"
)

// Create documentation pages
const gettingStarted = createJekyllPage(
    "Getting Started",
    `
# Getting Started with GenAID

GenAID is a powerful framework for building AI-powered applications.

## Installation

\`\`\`bash
npm install genaid
\`\`\`

## Quick Start

\`\`\`javascript
import { script } from "genaid"

script({ model: "github:gpt-4o" })
$\`Write a hello world program\`
\`\`\`
`,
    {
        layout: "page",
        categories: ["Getting Started"],
        permalink: "/getting-started/",
        tags: ["installation", "quickstart"]
    }
)

const agentsGuide = createJekyllPage(
    "Working with Agents",
    `
# Working with Agents

Agents are specialized tools that can perform specific tasks.

## Available Agents

- **Git Agent**: Repository operations
- **FS Agent**: File system operations
- **Docs Agent**: Documentation generation
- **Web Agent**: Web search and scraping

## Usage

\`\`\`javascript
script({
    tools: ["agent_git", "agent_fs"]
})

$\`Analyze the repository structure\`
\`\`\`
`,
    {
        layout: "page",
        categories: ["Guides"],
        permalink: "/guides/agents/",
        tags: ["agents", "tools"]
    }
)

const apiReference = createJekyllPage(
    "API Reference",
    `
# API Reference

Complete API documentation for GenAID.

## Core Functions

### script(options)

Configure script execution.

**Parameters:**
- \`model\`: LLM model to use
- \`tools\`: Array of tools to enable
- \`temperature\`: Sampling temperature

**Example:**
\`\`\`javascript
script({
    model: "github:gpt-4o",
    temperature: 0.7
})
\`\`\`

### $\\\`prompt\\\`

Execute a prompt template.

**Example:**
\`\`\`javascript
$\`Analyze this code\`
\`\`\`
`,
    {
        layout: "page",
        categories: ["Reference"],
        permalink: "/api/",
        tags: ["api", "reference"]
    }
)

// Add pages to site
addPage(site, gettingStarted)
addPage(site, agentsGuide)
addPage(site, apiReference)

// Create index page
const indexPage = createIndexPage("GenAID Documentation", site.pages, {
    description: "Welcome to GenAID documentation. Get started building AI-powered applications."
})
addPage(site, indexPage)

// Generate _config.yml
const configYml = generateConfigYML(site)

// Save all files
await workspace.writeText("_config.yml", configYml)
await workspace.writeText("index.md", pageToMarkdown(indexPage))
await workspace.writeText("getting-started.md", pageToMarkdown(gettingStarted))
await workspace.writeText("guides/agents.md", pageToMarkdown(agentsGuide))
await workspace.writeText("api.md", pageToMarkdown(apiReference))

console.log("Jekyll site generated successfully!")
```

## Example 2: Auto-generate Documentation from Code

```js
script({
    model: "github:gpt-4o",
    tools: ["agent_fs", "agent_docs"]
})

import { createJekyllSite, createJekyllPage, addPage, pageToMarkdown } from "genaid/core"

// Initialize site
const site = createJekyllSite("API Documentation", "Auto-generated API docs")

// Get all source files
const sourceFiles = await workspace.grep(/\.(ts|js)$/, { globs: "packages/core/src/**" })

for (const file of sourceFiles.files) {
    def("FILE", await workspace.readText(file))
    def("FILENAME", file)
    
    $`Generate Jekyll documentation for this file:
    
    File: ${file}
    
    Include:
    - Brief overview
    - Exported functions/classes
    - Parameters and return types
    - Usage examples
    - Related functions
    
    Format as markdown suitable for Jekyll.`
    
    // Create page from response
    const page = createJekyllPage(
        file.split("/").pop().replace(/\.(ts|js)$/, ""),
        response.text,
        {
            layout: "page",
            categories: ["API Reference"],
            permalink: \`/api/\${file.split("/").pop().replace(/\.(ts|js)$/, "")}/\`
        }
    )
    
    addPage(site, page)
}

// Save documentation
for (const page of site.pages) {
    const filename = \`docs/\${page.frontmatter.permalink.replace(/\//g, "-")}.md\`
    await workspace.writeText(filename, pageToMarkdown(page))
}
```

## Example 3: Generate Troubleshooting Wiki

```js
import { createJekyllSite, createJekyllPage, addPage } from "genaid/core"

script({
    model: "github:gpt-4o",
    tools: ["agent_git", "agent_web"]
})

$`Analyze the repository issues and create troubleshooting documentation.

For each common issue:
1. Problem description
2. Symptoms
3. Root cause
4. Solution steps
5. Prevention tips

Format as Jekyll pages with proper frontmatter.`

const site = createJekyllSite("Troubleshooting Guide")

// Parse issues and create pages
const issues = await parseIssuesFromResponse(response.text)

for (const issue of issues) {
    const page = createJekyllPage(
        issue.title,
        issue.content,
        {
            layout: "page",
            categories: ["Troubleshooting"],
            tags: issue.tags,
            permalink: \`/troubleshooting/\${slugify(issue.title)}/\`
        }
    )
    
    addPage(site, page)
}
```

## Example 4: Knowledge Base from Discussions

```js
import { createJekyllSite, createJekyllPage, addPage, createIndexPage } from "genaid/core"

script({
    model: "github:gpt-4o"
})

// Get repository discussions or documentation
def("DISCUSSIONS", await fetchDiscussions())

$`Convert these discussions into a structured knowledge base.

Create categories:
- Frequently Asked Questions
- Best Practices
- Common Patterns
- Advanced Topics

For each topic, create a well-structured Jekyll page with:
- Clear title
- Problem statement
- Detailed explanation
- Code examples
- Related topics

Format with proper Jekyll frontmatter.`

const site = createJekyllSite("Knowledge Base")

// Process generated content
const topics = parseTopicsFromResponse(response.text)

for (const topic of topics) {
    const page = createJekyllPage(
        topic.title,
        topic.content,
        {
            layout: "page",
            categories: [topic.category],
            tags: topic.tags,
            author: "GenAID Bot",
            permalink: \`/kb/\${slugify(topic.title)}/\`
        }
    )
    
    addPage(site, page)
}

// Create category index pages
const categories = ["FAQ", "Best Practices", "Common Patterns", "Advanced Topics"]

for (const category of categories) {
    const categoryPages = site.pages.filter(p => 
        p.frontmatter.categories?.includes(category)
    )
    
    const indexPage = createIndexPage(
        category,
        categoryPages,
        { description: \`${category} documentation\` }
    )
    
    addPage(site, indexPage)
}
```

## Example 5: Interactive Wiki Generation

```js
import { createJekyllSite, createJekyllPage, addPage, generateConfigYML } from "genaid/core"

script({
    model: "github:gpt-4o",
    tools: ["agent_fs", "agent_docs", "agent_git"]
})

$`Create a comprehensive documentation wiki for this project:

Structure:
1. README → Home page
2. CONTRIBUTING → Contributors guide
3. Architecture docs → Technical overview
4. API reference → Generated from code
5. Examples → Usage examples
6. Changelog → From git history

Generate complete Jekyll site with:
- Proper navigation
- Search functionality
- Responsive design
- SEO optimization

Return a file structure with all pages.`

// Parse and create site
const site = createJekyllSite("Project Documentation")
const pages = parseResponsePages(response.text)

for (const pageData of pages) {
    const page = createJekyllPage(
        pageData.title,
        pageData.content,
        pageData.frontmatter
    )
    
    addPage(site, page)
}

// Customize config
site.config.theme = "jekyll-theme-architect"
site.config.plugins = [
    "jekyll-feed",
    "jekyll-seo-tag",
    "jekyll-sitemap",
    "jekyll-relative-links"
]
site.config.markdown = "kramdown"

// Generate all files
await workspace.writeText("_config.yml", generateConfigYML(site))

for (const page of site.pages) {
    const path = \`\${page.frontmatter.permalink || slugify(page.frontmatter.title)}.md\`
    await workspace.writeText(path, pageToMarkdown(page))
}

console.log(\`Generated Jekyll wiki with \${site.pages.length} pages\`)
```

## Example 6: Multi-Language Documentation

```js
import { createJekyllSite, createJekyllPage, addPage } from "genaid/core"

const languages = ["en", "es", "fr", "de"]

for (const lang of languages) {
    const site = createJekyllSite(\`Documentation (\${lang})\`)
    
    script({ model: "github:gpt-4o" })
    
    $\`Translate the documentation to \${lang} and create Jekyll pages.
    
    Maintain structure and formatting.
    Use appropriate language for code comments.
    Keep code examples but translate descriptions.\`
    
    // Generate translated pages
    const pages = parseTranslatedPages(response.text, lang)
    
    for (const pageData of pages) {
        const page = createJekyllPage(
            pageData.title,
            pageData.content,
            {
                ...pageData.frontmatter,
                lang: lang,
                permalink: \`/\${lang}\${pageData.frontmatter.permalink}\`
            }
        )
        
        addPage(site, page)
    }
    
    // Save language-specific documentation
    await workspace.writeText(\`docs/\${lang}/_config.yml\`, generateConfigYML(site))
}
```

## Deployment

Once generated, deploy your Jekyll wiki:

```bash
# Local preview
jekyll serve

# Deploy to GitHub Pages
git add docs/
git commit -m "Update documentation"
git push origin main

# Or use GitHub Actions for automatic deployment
```

The Jekyll integration enables:
- Automatic documentation generation
- Version-controlled wikis
- SEO-friendly pages
- GitHub Pages deployment
- Custom themes and plugins
- Multi-language support
