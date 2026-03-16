import {
    createJekyllPage,
    createJekyllSite,
    addPage,
    pageToMarkdown,
    parseJekyllPage,
    validateJekyllPage,
} from "./jekyll"
import { describe, test } from "node:test"
import assert from "node:assert/strict"

describe("Jekyll Wiki Integration", () => {
    describe("createJekyllPage", () => {
        test("should create a basic Jekyll page", () => {
            const page = createJekyllPage("Test Page", "# Content")
            assert.equal(page.frontmatter.title, "Test Page")
            assert.equal(page.content, "# Content")
            assert.ok(page.frontmatter.date)
        })

        test("should accept custom frontmatter options", () => {
            const page = createJekyllPage("Test", "Content", {
                layout: "custom",
                tags: ["tag1", "tag2"],
            })
            assert.equal(page.frontmatter.layout, "custom")
            assert.deepEqual(page.frontmatter.tags, ["tag1", "tag2"])
        })
    })

    describe("createJekyllSite", () => {
        test("should create a Jekyll site", () => {
            const site = createJekyllSite("My Site", "Description")
            assert.equal(site.config.title, "My Site")
            assert.equal(site.config.description, "Description")
            assert.ok(Array.isArray(site.pages))
        })
    })

    describe("addPage", () => {
        test("should add a page to site", () => {
            const site = createJekyllSite("Site")
            const page = createJekyllPage("Page 1", "Content")
            addPage(site, page)
            assert.equal(site.pages.length, 1)
            assert.equal(site.pages[0].frontmatter.title, "Page 1")
        })
    })

    describe("pageToMarkdown", () => {
        test("should convert page to markdown with frontmatter", () => {
            const page = createJekyllPage("Test", "Content here")
            const markdown = pageToMarkdown(page)
            assert.ok(markdown.startsWith("---"))
            assert.ok(markdown.includes("title: Test"))
            assert.ok(markdown.includes("Content here"))
        })
    })

    describe("parseJekyllPage", () => {
        test("should parse markdown with frontmatter", () => {
            const markdown = `---
title: Test Page
layout: default
---

# Content here`
            const page = parseJekyllPage(markdown)
            assert.equal(page.frontmatter.title, "Test Page")
            assert.equal(page.frontmatter.layout, "default")
            assert.ok(page.content.includes("# Content here"))
        })

        test("should handle markdown without frontmatter", () => {
            const markdown = "# Just content"
            const page = parseJekyllPage(markdown)
            assert.equal(page.frontmatter.title, "Untitled")
            assert.equal(page.content, "# Just content")
        })
    })

    describe("validateJekyllPage", () => {
        test("should validate a correct page", () => {
            const page = createJekyllPage("Valid", "Content")
            const result = validateJekyllPage(page)
            assert.equal(result.valid, true)
            assert.equal(result.errors.length, 0)
        })

        test("should detect missing title", () => {
            const page = { frontmatter: { title: "" }, content: "Content" }
            const result = validateJekyllPage(page as any)
            assert.equal(result.valid, false)
            assert.ok(result.errors.some((e) => e.includes("title")))
        })

        test("should detect missing content", () => {
            const page = { frontmatter: { title: "Title" }, content: "" }
            const result = validateJekyllPage(page as any)
            assert.equal(result.valid, false)
            assert.ok(result.errors.some((e) => e.includes("content")))
        })
    })
})
