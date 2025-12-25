script({
    title: "API reference documentation generator",
    description: "Generate reference documentation from a GenAID API type",
    parameters: {
        api: {
            type: "string",
            description: "The API to generate documentation for",
        },
    },
    system: ["system", "system.files"],
    tools: ["fs", "md"],
    group: "docs"
})

const api = env.vars.api || "git"
const doc = env.vars.route || api.toLocaleLowerCase() + ".mdx"
const ref = "docs/src/content/docs/reference/scripts"
const docpath = path.join(ref, doc)

$`## Role 

Your are a technical writer for GenAID. You write clear and concise documentation for the GenAID API.

## Task

Generate or update a reference documentation related to ${api}.

- update the existing documentation (${doc}) if it exists with minimal changes
- document all APIs related ${api}. This is important.
- do NOT document other APIs

## Output

- use markdown
- the frontmatter should contain the title, description
- do NOT modify attributes of the existing code regions. It is valid to have any parameters when declaring a code region.

    \`\`\`js 'THIS IS OK' <-- do not modify

## Context

- the documentation is in markdown/MDX and has frontmatter: ${ref}/*.md*
- take inspiration from the existing samples are in "packages/sample/genaid/*.genai.*" and you can grep for '${api}\.'
- the online documentation: https://darbotlabs.github.io/genaid/
- API_TYPES contains the public TypeScript types for the GenAID API
`

def("API_TYPES", { filename: "genaid/genaid.d.ts" })

defOutputProcessor(({ fences, fileEdits }) => {
    const src = fences.find(
        (f) => f.language === "markdown" || f.language === "md"
    )
    return {
        files: {
            [docpath]: src?.content,
        },
    }
})
