/**
 * Minimal semver parsing and comparison utilities
 */

export interface SemVer {
    major: number
    minor: number
    patch: number
    prerelease?: string
    build?: string
}

/**
 * Parse a semver string into components
 */
export function semverParse(version: string): SemVer {
    const cleaned = version.replace(/^v/, "").trim()
    const match = cleaned.match(
        /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-.]+))?(?:\+([0-9A-Za-z-.]+))?$/
    )

    if (!match) {
        throw new Error(`Invalid semver: ${version}`)
    }

    return {
        major: parseInt(match[1], 10),
        minor: parseInt(match[2], 10),
        patch: parseInt(match[3], 10),
        prerelease: match[4],
        build: match[5],
    }
}

/**
 * Check if a version satisfies a semver range
 * Supports: >=X.Y, >X.Y, <=X.Y, <X.Y, =X.Y, X.Y (exact), ^X.Y.Z, ~X.Y.Z
 */
export function semverSatisfies(version: string, range: string): boolean {
    try {
        const ver = semverParse(version)
        const trimmedRange = range.trim()

        // Handle >= operator
        if (trimmedRange.startsWith(">=")) {
            const reqVer = semverParse(trimmedRange.substring(2))
            return compareVersions(ver, reqVer) >= 0
        }

        // Handle > operator
        if (trimmedRange.startsWith(">")) {
            const reqVer = semverParse(trimmedRange.substring(1))
            return compareVersions(ver, reqVer) > 0
        }

        // Handle <= operator
        if (trimmedRange.startsWith("<=")) {
            const reqVer = semverParse(trimmedRange.substring(2))
            return compareVersions(ver, reqVer) <= 0
        }

        // Handle < operator
        if (trimmedRange.startsWith("<")) {
            const reqVer = semverParse(trimmedRange.substring(1))
            return compareVersions(ver, reqVer) < 0
        }

        // Handle = operator or exact match
        if (trimmedRange.startsWith("=")) {
            const reqVer = semverParse(trimmedRange.substring(1))
            return compareVersions(ver, reqVer) === 0
        }

        // Handle ^ operator (compatible with)
        if (trimmedRange.startsWith("^")) {
            const reqVer = semverParse(trimmedRange.substring(1))
            if (ver.major !== reqVer.major) return false
            if (ver.major === 0) {
                return (
                    ver.minor === reqVer.minor &&
                    ver.patch >= reqVer.patch
                )
            }
            return compareVersions(ver, reqVer) >= 0
        }

        // Handle ~ operator (approximately equivalent)
        if (trimmedRange.startsWith("~")) {
            const reqVer = semverParse(trimmedRange.substring(1))
            return (
                ver.major === reqVer.major &&
                ver.minor === reqVer.minor &&
                ver.patch >= reqVer.patch
            )
        }

        // Exact match
        const reqVer = semverParse(trimmedRange)
        return compareVersions(ver, reqVer) === 0
    } catch {
        return false
    }
}

/**
 * Compare two semver versions
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
function compareVersions(a: SemVer, b: SemVer): number {
    if (a.major !== b.major) return a.major - b.major
    if (a.minor !== b.minor) return a.minor - b.minor
    if (a.patch !== b.patch) return a.patch - b.patch

    // Handle prerelease comparison
    if (a.prerelease && !b.prerelease) return -1
    if (!a.prerelease && b.prerelease) return 1
    if (a.prerelease && b.prerelease) {
        return a.prerelease.localeCompare(b.prerelease)
    }

    return 0
}
