import { build } from "esbuild"
import { cp } from "node:fs/promises"
import { readdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

// Enhanced build with code splitting and optimization
await build({
    entryPoints: ["src/index.tsx"],
    bundle: true,
    minify: true,
    sourcemap: true,
    target: ["es2020"],
    format: "esm",
    outfile: "./built/web.mjs",
    loader: { ".js": "jsx" },
    external: ["vscode"],
    define: {
        "process.env.NODE_ENV": '"production"',
    },
    // Enhanced optimization options
    treeShaking: true,
    splitting: false, // Can't use splitting with outfile
    metafile: true,
    // Bundle analysis
    logLevel: "info",
    // Performance optimizations
    keepNames: false,
    platform: "browser"
})

// Generate bundle analysis
const result = await build({
    entryPoints: ["src/index.tsx"],
    bundle: true,
    minify: false, // Don't minify for analysis
    sourcemap: false,
    target: ["es2020"],
    format: "esm",
    outdir: "./built/analysis",
    loader: { ".js": "jsx" },
    external: ["vscode"],
    define: {
        "process.env.NODE_ENV": '"development"',
    },
    metafile: true,
    write: false, // Don't write files, just get analysis
})

// Save metafile for analysis
if (result.metafile) {
    await writeFile("./built/metafile.json", JSON.stringify(result.metafile, null, 2))
    
    // Generate bundle stats
    const stats = {
        timestamp: new Date().toISOString(),
        totalSize: Object.values(result.metafile.outputs).reduce((sum, output) => sum + output.bytes, 0),
        entryPoints: Object.keys(result.metafile.inputs).length,
        outputs: Object.keys(result.metafile.outputs).length
    }
    
    await writeFile("./built/bundle-stats.json", JSON.stringify(stats, null, 2))
    console.log(`📊 Bundle stats: ${stats.totalSize} bytes, ${stats.entryPoints} inputs, ${stats.outputs} outputs`)
}

await cp("./built/web.mjs", "../cli/built/web.mjs")
await cp("./built/web.mjs.map", "../cli/built/web.mjs.map")
await cp("./index.html", "../cli/built/index.html")
await cp("./favicon.svg", "../cli/built/favicon.svg")
await cp(
    "../../node_modules/@vscode/codicons/dist/codicon.ttf",
    "../cli/built/codicon.ttf"
)
await cp(
    "../../node_modules/@vscode/codicons/dist/codicon.css",
    "../cli/built/codicon.css"
)

const cssDir = "./src"
const outputCssFile = "../cli/built/markdown.css"
const cssFiles = (await readdir(cssDir))
    .filter((file) => file.endsWith(".css"))
    .map((f) => join(cssDir, f))
let concatenatedCss = ""
for (const filePath of cssFiles) {
    const fileContent = await readFile(filePath, "utf-8")
    concatenatedCss += fileContent + "\n"
}
await writeFile(outputCssFile, concatenatedCss)
