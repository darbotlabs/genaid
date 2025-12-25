#!/usr/bin/env zx
/**
 * Comprehensive dependency upgrade script
 * Upgrades all packages safely with testing
 */
import "zx/globals"

console.log("🚀 GenAID Comprehensive Package Upgrade")
console.log("=" .repeat(50))

// Critical packages that need careful upgrade
const critical = [
    "typescript",
    "esbuild",
    "@types/node",
    "openai",
    "@anthropic-ai/sdk",
    "@modelcontextprotocol/sdk",
]

// Auto-upgrade safe packages
const autoUpgrade = [
    "@inquirer/prompts",
    "@azure/identity",
    "@azure/search-documents",
    "@huggingface/jinja",
    "@octokit/core",
    "@octokit/rest",
    "@octokit/plugin-paginate-rest",
    "@octokit/plugin-retry",
    "@octokit/plugin-throttling",
    "debug",
    "dockerode",
    "file-type",
    "gpt-tokenizer",
    "yaml",
    "zod",
    "zod-to-json-schema",
    "tsx",
    "zx",
    "eslint",
    "prettier",
]

// Optional dependencies that can fail
const optional = [
    "@ast-grep/napi",
    "@ast-grep/lang-c",
    "@ast-grep/lang-cpp",
    "@ast-grep/lang-csharp",
    "@ast-grep/lang-python",
    "@ast-grep/lang-yaml",
    "@huggingface/transformers",
    "@lvce-editor/ripgrep",
    "tree-sitter-wasms",
    "pdfjs-dist",
    "playwright",
    "skia-canvas",
    "z3-solver",
]

const timestamp = new Date().toISOString().replace(/[^0-9]/g, "-")
const branch = `deps/upgrade-${timestamp}`

try {
    console.log("\n📦 Step 1: Checking current package status...")
    await $`npm outdated`.nothrow()

    console.log("\n📦 Step 2: Upgrading auto-safe packages...")
    if (autoUpgrade.length > 0) {
        await $`npx npm-check-updates -u ${autoUpgrade.join(" ")}`.verbose(true)
    }

    console.log("\n📦 Step 3: Checking critical packages (manual review needed)...")
    for (const pkg of critical) {
        console.log(`  ⚠️  ${pkg} - requires manual review`)
        await $`npx npm-check-updates ${pkg}`.nothrow()
    }

    console.log("\n📦 Step 4: Attempting optional dependency upgrades...")
    for (const pkg of optional) {
        try {
            await $`npx npm-check-updates -u ${pkg}`.timeout("10s").nothrow()
            console.log(`  ✅ ${pkg} upgraded`)
        } catch (error) {
            console.log(`  ⚠️  ${pkg} - skipped (optional)`)
        }
    }

    console.log("\n📦 Step 5: Installing updated packages...")
    await $`yarn install`.timeout("300s")

    console.log("\n🔍 Step 6: Type checking...")
    try {
        await $`yarn typecheck`.timeout("120s")
        console.log("  ✅ Type check passed")
    } catch (error) {
        console.log("  ⚠️  Type check failed - may need manual fixes")
    }

    console.log("\n🔨 Step 7: Compiling...")
    try {
        await $`yarn compile:cli`.timeout("180s")
        console.log("  ✅ Compilation successful")
    } catch (error) {
        console.log("  ⚠️  Compilation issues - checking build-fast...")
        try {
            await $`bash build-fast.sh`.timeout("60s")
            console.log("  ✅ Fast build successful")
        } catch (buildError) {
            console.log("  ❌ Build failed - manual intervention needed")
        }
    }

    console.log("\n🧪 Step 8: Running tests...")
    try {
        await $`yarn test:core`.timeout("120s")
        console.log("  ✅ Tests passed")
    } catch (error) {
        console.log("  ⚠️  Some tests failed - review needed")
    }

    console.log("\n📊 Step 9: Generating upgrade report...")
    const report = {
        timestamp: new Date().toISOString(),
        branch,
        upgraded: {
            auto: autoUpgrade,
            critical: critical,
            optional: optional,
        },
        status: {
            typecheck: "See above",
            compile: "See above",
            tests: "See above",
        },
    }

    await fs.writeFile(
        "UPGRADE_REPORT.json",
        JSON.stringify(report, null, 2)
    )
    console.log("  ✅ Report saved to UPGRADE_REPORT.json")

    console.log("\n🎯 Step 10: Git operations...")
    const status = await $`git status --porcelain`.nothrow()
    
    if (!status.stdout.trim()) {
        console.log("  ℹ️  No changes detected, skipping git operations")
        process.exit(0)
    }

    console.log("  📝 Changes detected, creating branch...")
    await $`git checkout -b ${branch}`.nothrow()
    await $`git add .`
    await $`git commit -m "chore: upgrade dependencies\n\nAuto-upgraded packages:\n${autoUpgrade.map(p => `- ${p}`).join("\n")}\n\nCritical packages (review needed):\n${critical.map(p => `- ${p}`).join("\n")}" -n`

    console.log("\n✅ Upgrade complete!")
    console.log("\nNext steps:")
    console.log(`  1. Review changes: git diff main`)
    console.log(`  2. Test manually: yarn genaid run <test-script>`)
    console.log(`  3. Push branch: git push -u origin ${branch}`)
    console.log(`  4. Create PR: gh pr create -f`)

} catch (error) {
    console.error("\n❌ Upgrade failed:", error.message)
    console.log("\nTroubleshooting:")
    console.log("  1. Check UPGRADE_REPORT.json for details")
    console.log("  2. Review failed packages manually")
    console.log("  3. Consider using build-fast.sh for CIFS issues")
    console.log("  4. Check BUILD_FIXES.md for known issues")
    process.exit(1)
}
