/**
 * Jekyll wiki integration for GenAID
 * Generates Jekyll-compatible markdown files for documentation wikis
 */

export interface JekyllFrontMatter {
    title: string
    layout?: string
    permalink?: string
    date?: string
    categories?: string[]
    tags?: string[]
    author?: string
    description?: string
    [key: string]: any
}

export interface JekyllPage {
    frontmatter: JekyllFrontMatter
    content: string
}

export interface JekyllSite {
    pages: JekyllPage[]
    config: JekyllConfig
}

export interface JekyllConfig {
    title: string
    description?: string
    baseurl?: string
    url?: string
    theme?: string
    markdown?: string
    plugins?: string[]
    [key: string]: any
}

/**
 * Creates a Jekyll page with frontmatter
 */
export function createJekyllPage(
    title: string,
    content: string,
    options: Partial<JekyllFrontMatter> = {}
): JekyllPage {
    return {
        frontmatter: {
            title,
            layout: options.layout || "default",
            date: options.date || new Date().toISOString(),
            ...options,
        },
        content,
    }
}

/**
 * Converts frontmatter to YAML string
 */
export function frontmatterToYAML(frontmatter: JekyllFrontMatter): string {
    const lines: string[] = []
    
    for (const [key, value] of Object.entries(frontmatter)) {
        if (value === undefined || value === null) continue
        
        if (Array.isArray(value)) {
            lines.push(`${key}:`)
            for (const item of value) {
                lines.push(`  - ${item}`)
            }
        } else if (typeof value === "object") {
            lines.push(`${key}:`)
            for (const [subKey, subValue] of Object.entries(value)) {
                lines.push(`  ${subKey}: ${subValue}`)
            }
        } else {
            lines.push(`${key}: ${value}`)
        }
    }
    
    return lines.join("\n")
}

/**
 * Converts Jekyll page to markdown string with frontmatter
 */
export function pageToMarkdown(page: JekyllPage): string {
    const frontmatter = frontmatterToYAML(page.frontmatter)
    return `---\n${frontmatter}\n---\n\n${page.content}`
}

/**
 * Parses a Jekyll page from markdown string
 */
export function parseJekyllPage(markdown: string): JekyllPage {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
    const match = markdown.match(frontmatterRegex)
    
    if (!match) {
        return {
            frontmatter: { title: "Untitled" },
            content: markdown,
        }
    }
    
    const [, frontmatterStr, content] = match
    const frontmatter: JekyllFrontMatter = { title: "Untitled" }
    
    // Simple YAML parsing
    const lines = frontmatterStr.split("\n")
    let currentKey: string | null = null
    
    for (const line of lines) {
        const colonIndex = line.indexOf(":")
        if (colonIndex > 0 && !line.startsWith(" ")) {
            currentKey = line.substring(0, colonIndex).trim()
            const value = line.substring(colonIndex + 1).trim()
            
            if (value) {
                frontmatter[currentKey] = value
            } else {
                frontmatter[currentKey] = []
            }
        } else if (currentKey && line.trim().startsWith("-")) {
            const value = line.trim().substring(1).trim()
            if (Array.isArray(frontmatter[currentKey])) {
                (frontmatter[currentKey] as string[]).push(value)
            }
        }
    }
    
    return { frontmatter, content: content.trim() }
}

/**
 * Creates a Jekyll config file
 */
export function createJekyllConfig(
    title: string,
    options: Partial<JekyllConfig> = {}
): JekyllConfig {
    return {
        title,
        description: options.description || `${title} Documentation`,
        baseurl: options.baseurl || "",
        url: options.url || "",
        theme: options.theme || "jekyll-theme-cayman",
        markdown: options.markdown || "kramdown",
        plugins: options.plugins || ["jekyll-feed", "jekyll-seo-tag"],
        ...options,
    }
}

/**
 * Converts Jekyll config to YAML string
 */
export function configToYAML(config: JekyllConfig): string {
    const lines: string[] = []
    
    for (const [key, value] of Object.entries(config)) {
        if (value === undefined || value === null) continue
        
        if (Array.isArray(value)) {
            lines.push(`${key}:`)
            for (const item of value) {
                lines.push(`  - ${item}`)
            }
        } else {
            lines.push(`${key}: ${value}`)
        }
    }
    
    return lines.join("\n")
}

/**
 * Creates a Jekyll site structure
 */
export function createJekyllSite(
    title: string,
    description?: string
): JekyllSite {
    return {
        pages: [],
        config: createJekyllConfig(title, { description }),
    }
}

/**
 * Adds a page to Jekyll site
 */
export function addPage(site: JekyllSite, page: JekyllPage): JekyllSite {
    site.pages.push(page)
    return site
}

/**
 * Creates an index page for the wiki
 */
export function createIndexPage(
    title: string,
    pages: JekyllPage[],
    options: { layout?: string; description?: string } = {}
): JekyllPage {
    const content = [
        `# ${title}`,
        "",
        options.description || "Welcome to the documentation.",
        "",
        "## Contents",
        "",
    ]
    
    // Group pages by category
    const byCategory: Record<string, JekyllPage[]> = {}
    
    for (const page of pages) {
        const categories = page.frontmatter.categories || ["General"]
        for (const category of categories) {
            if (!byCategory[category]) {
                byCategory[category] = []
            }
            byCategory[category].push(page)
        }
    }
    
    // Generate table of contents
    for (const [category, categoryPages] of Object.entries(byCategory)) {
        content.push(`### ${category}`)
        content.push("")
        for (const page of categoryPages) {
            const link = page.frontmatter.permalink || `/${page.frontmatter.title.toLowerCase().replace(/\s+/g, "-")}`
            content.push(`- [${page.frontmatter.title}](${link})`)
        }
        content.push("")
    }
    
    return createJekyllPage(title, content.join("\n"), {
        layout: options.layout || "home",
        permalink: "/",
    })
}

/**
 * Creates a navigation structure for Jekyll
 */
export function createNavigation(
    pages: JekyllPage[]
): Array<{ title: string; url: string; children?: Array<{ title: string; url: string }> }> {
    const nav: Array<{ title: string; url: string; children?: Array<{ title: string; url: string }> }> = []
    
    // Group by categories
    const byCategory: Record<string, Array<{ title: string; url: string }>> = {}
    
    for (const page of pages) {
        const categories = page.frontmatter.categories || ["General"]
        const url = page.frontmatter.permalink || `/${page.frontmatter.title.toLowerCase().replace(/\s+/g, "-")}`
        
        for (const category of categories) {
            if (!byCategory[category]) {
                byCategory[category] = []
            }
            byCategory[category].push({ title: page.frontmatter.title, url })
        }
    }
    
    for (const [category, items] of Object.entries(byCategory)) {
        nav.push({
            title: category,
            url: `#${category.toLowerCase().replace(/\s+/g, "-")}`,
            children: items,
        })
    }
    
    return nav
}

/**
 * Generates a _config.yml file content
 */
export function generateConfigYML(site: JekyllSite): string {
    return configToYAML(site.config)
}

/**
 * Validates Jekyll page structure
 */
export function validateJekyllPage(page: JekyllPage): {
    valid: boolean
    errors: string[]
} {
    const errors: string[] = []
    
    if (!page.frontmatter.title) {
        errors.push("Page title is required")
    }
    
    if (!page.content) {
        errors.push("Page content is required")
    }
    
    return {
        valid: errors.length === 0,
        errors,
    }
}
