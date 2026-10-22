#!/usr/bin/env node
/**
 * TypeScript 7's tsc is a native binary shipped as an optional dependency
 * (@typescript/typescript-<platform>-<arch>). .yarnrc sets --ignore-optional,
 * which skips that package along with pdfjs-dist, playwright, z3-solver, and
 * skia-canvas. Those platform packages also declare os/cpu constraints, so
 * they cannot be ordinary required dependencies without failing install on
 * every other machine. Unpack only the binary for this machine.
 */
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const require = createRequire(path.join(root, "package.json"))

let version
try {
    version = require("typescript/package.json").version
} catch {
    console.log("typescript is not installed; skipping the native tsc binary")
    process.exit(0)
}

const short = `typescript-${process.platform}-${process.arch}`
const pkgName = `@typescript/${short}`
const dest = path.join(root, "node_modules", "@typescript", short)
const marker = path.join(dest, "package.json")

if (existsSync(marker)) {
    try {
        if (require(marker).version === version) process.exit(0)
    } catch {
        // reinstall below
    }
}

const tmp = path.join(root, "node_modules", ".typescript-native-tmp")
rmSync(tmp, { recursive: true, force: true })
mkdirSync(tmp, { recursive: true })

try {
    execFileSync("npm", ["pack", `${pkgName}@${version}`], {
        cwd: tmp,
        stdio: "inherit",
    })
} catch {
    console.error(
        `Unable to download ${pkgName}@${version}. tsc will not run on ${process.platform}/${process.arch}.`
    )
    process.exit(1)
}

const tarball = readdirSync(tmp).find((name) => name.endsWith(".tgz"))
if (!tarball) {
    console.error(`npm pack did not produce a tarball for ${pkgName}@${version}`)
    process.exit(1)
}

rmSync(dest, { recursive: true, force: true })
mkdirSync(dest, { recursive: true })
execFileSync("tar", ["-xzf", path.join(tmp, tarball), "-C", dest, "--strip-components=1"], {
    stdio: "inherit",
})
rmSync(tmp, { recursive: true, force: true })
console.log(`installed ${pkgName}@${version}`)
