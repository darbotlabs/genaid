#!/usr/bin/env node

/**
 * Dependency Analyzer and Optimizer
 * Analyzes dependencies, finds duplicates, suggests optimizations
 */

import { readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

async function runCommand(command, args, cwd) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd,
            stdio: 'pipe',
            shell: true
        })

        let stdout = ''
        let stderr = ''

        child.stdout?.on('data', (data) => {
            stdout += data.toString()
        })

        child.stderr?.on('data', (data) => {
            stderr += data.toString()
        })

        child.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr })
            } else {
                reject(new Error(`Command failed: ${stderr}`))
            }
        })
    })
}

async function getPackageInfo(packagePath) {
    try {
        const packageJson = JSON.parse(await readFile(join(packagePath, 'package.json'), 'utf8'))
        return {
            name: packageJson.name,
            version: packageJson.version,
            dependencies: packageJson.dependencies || {},
            devDependencies: packageJson.devDependencies || {},
            optionalDependencies: packageJson.optionalDependencies || {}
        }
    } catch (e) {
        return null
    }
}

async function analyzeDependencies() {
    console.log('🔍 Analyzing dependencies across packages...')
    
    const packages = ['cli', 'core', 'vscode', 'web', 'sample', 'modulesample']
    const packageInfos = {}
    const dependencyMap = new Map()
    const versionConflicts = new Map()
    
    // Collect package information
    for (const pkg of packages) {
        const info = await getPackageInfo(join(rootDir, 'packages', pkg))
        if (info) {
            packageInfos[pkg] = info
            
            // Track all dependencies
            const allDeps = {
                ...info.dependencies,
                ...info.devDependencies,
                ...info.optionalDependencies
            }
            
            Object.entries(allDeps).forEach(([depName, version]) => {
                if (!dependencyMap.has(depName)) {
                    dependencyMap.set(depName, new Map())
                }
                dependencyMap.get(depName).set(pkg, version)
            })
        }
    }
    
    // Find version conflicts
    for (const [depName, packages] of dependencyMap) {
        const versions = new Set(packages.values())
        if (versions.size > 1) {
            versionConflicts.set(depName, Array.from(packages.entries()))
        }
    }
    
    return {
        packageInfos,
        dependencyMap,
        versionConflicts
    }
}

async function findDuplicateCode() {
    console.log('🔍 Scanning for duplicate code patterns...')
    
    try {
        // Use a simple approach to find potential duplicates
        const { stdout } = await runCommand('find', [
            'packages', '-name', '*.ts', '-exec', 'wc', '-l', '{}', '+'
        ], rootDir)
        
        const fileStats = stdout.split('\n')
            .filter(line => line.trim())
            .map(line => {
                const parts = line.trim().split(/\s+/)
                const lines = parseInt(parts[0])
                const file = parts.slice(1).join(' ')
                return { file, lines }
            })
            .filter(stat => stat.lines > 0)
            .sort((a, b) => b.lines - a.lines)
        
        return fileStats.slice(0, 20) // Top 20 largest files
        
    } catch (e) {
        console.warn('Could not analyze code duplication:', e.message)
        return []
    }
}

async function analyzeBundleSizes() {
    console.log('📦 Analyzing bundle sizes...')
    
    const bundleAnalysis = {}
    const packages = ['cli', 'web', 'vscode']
    
    for (const pkg of packages) {
        try {
            const metafilePath = join(rootDir, 'packages', pkg, 'built', 'metafile.json')
            const metafile = JSON.parse(await readFile(metafilePath, 'utf8'))
            
            const outputs = Object.values(metafile.outputs)
            const totalSize = outputs.reduce((sum, output) => sum + (output.bytes || 0), 0)
            
            bundleAnalysis[pkg] = {
                totalSize,
                outputs: outputs.length,
                inputs: Object.keys(metafile.inputs).length
            }
            
        } catch (e) {
            console.warn(`Could not analyze ${pkg} bundle:`, e.message)
        }
    }
    
    return bundleAnalysis
}

async function generateOptimizationReport(analysis, duplicateCode, bundleAnalysis) {
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            totalPackages: Object.keys(analysis.packageInfos).length,
            totalDependencies: analysis.dependencyMap.size,
            versionConflicts: analysis.versionConflicts.size,
            duplicateCodeFiles: duplicateCode.length
        },
        versionConflicts: Array.from(analysis.versionConflicts.entries()).map(([dep, packages]) => ({
            dependency: dep,
            conflicts: packages
        })),
        largestFiles: duplicateCode,
        bundleSizes: bundleAnalysis,
        recommendations: []
    }
    
    // Generate recommendations
    if (analysis.versionConflicts.size > 0) {
        report.recommendations.push({
            type: 'dependency',
            priority: 'high',
            title: 'Resolve version conflicts',
            description: `Found ${analysis.versionConflicts.size} dependencies with version conflicts`,
            action: 'yarn upgrade and align versions across packages'
        })
    }
    
    // Check for heavy dependencies
    const heavyDeps = ['lodash', 'moment', 'axios', 'request', 'underscore']
    const foundHeavyDeps = Array.from(analysis.dependencyMap.keys())
        .filter(dep => heavyDeps.some(heavy => dep.includes(heavy)))
    
    if (foundHeavyDeps.length > 0) {
        report.recommendations.push({
            type: 'bundle',
            priority: 'medium',
            title: 'Replace heavy dependencies',
            description: `Found potentially heavy dependencies: ${foundHeavyDeps.join(', ')}`,
            action: 'Consider lighter alternatives (e.g., date-fns vs moment, native fetch vs axios)'
        })
    }
    
    // Large file recommendations
    const largeFiles = duplicateCode.filter(f => f.lines > 500)
    if (largeFiles.length > 0) {
        report.recommendations.push({
            type: 'code',
            priority: 'medium',
            title: 'Review large files',
            description: `Found ${largeFiles.length} files with >500 lines`,
            action: 'Consider breaking down large files into smaller modules'
        })
    }
    
    // Bundle size recommendations
    Object.entries(bundleAnalysis).forEach(([pkg, stats]) => {
        if (stats.totalSize > 5 * 1024 * 1024) { // 5MB
            report.recommendations.push({
                type: 'bundle',
                priority: 'high',
                title: `Large ${pkg} bundle`,
                description: `${pkg} bundle is ${Math.round(stats.totalSize / 1024 / 1024)}MB`,
                action: 'Analyze bundle composition and implement code splitting'
            })
        }
    })
    
    return report
}

async function optimizeDependencies() {
    console.log('🚀 Starting dependency optimization analysis...')
    
    const analysis = await analyzeDependencies()
    const duplicateCode = await findDuplicateCode()
    const bundleAnalysis = await analyzeBundleSizes()
    
    const report = await generateOptimizationReport(analysis, duplicateCode, bundleAnalysis)
    
    // Save report
    const reportPath = join(rootDir, '.genaid', 'dependency-analysis.json')
    await writeFile(reportPath, JSON.stringify(report, null, 2))
    
    // Display summary
    console.log('\n📊 Dependency Analysis Summary:')
    console.log(`   Packages analyzed: ${report.summary.totalPackages}`)
    console.log(`   Total dependencies: ${report.summary.totalDependencies}`)
    console.log(`   Version conflicts: ${report.summary.versionConflicts}`)
    console.log(`   Large files (>500 lines): ${duplicateCode.filter(f => f.lines > 500).length}`)
    
    if (report.versionConflicts.length > 0) {
        console.log('\n⚠️  Version Conflicts:')
        report.versionConflicts.slice(0, 5).forEach(conflict => {
            console.log(`   ${conflict.dependency}:`)
            conflict.conflicts.forEach(([pkg, version]) => {
                console.log(`     ${pkg}: ${version}`)
            })
        })
        if (report.versionConflicts.length > 5) {
            console.log(`   ... and ${report.versionConflicts.length - 5} more`)
        }
    }
    
    if (report.recommendations.length > 0) {
        console.log('\n💡 Optimization Recommendations:')
        report.recommendations.forEach((rec, i) => {
            console.log(`   ${i + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`)
            console.log(`      ${rec.description}`)
            console.log(`      Action: ${rec.action}`)
        })
    }
    
    console.log(`\n📄 Full report saved to: ${reportPath}`)
    
    return report
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    optimizeDependencies().catch(error => {
        console.error('Analysis failed:', error)
        process.exit(1)
    })
}

export { optimizeDependencies, analyzeDependencies, findDuplicateCode }