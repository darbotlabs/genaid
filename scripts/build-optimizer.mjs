#!/usr/bin/env node

/**
 * Enhanced Build Performance Optimizer
 * Provides parallel building, caching, and performance monitoring
 */

import { spawn } from 'node:child_process'
import { readFile, writeFile, stat, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

// Build performance tracking
const buildMetrics = {
    startTime: Date.now(),
    packages: {},
    totalTime: 0,
    cacheHits: 0,
    cacheMisses: 0
}

// Package build order for optimal dependency resolution
const BUILD_ORDER = [
    'core',
    'cli', 
    'web',
    'vscode'
]

// Cache configuration
const CACHE_DIR = join(rootDir, '.genaid', 'build-cache')

async function ensureCacheDir() {
    try {
        await mkdir(CACHE_DIR, { recursive: true })
    } catch (e) {
        // Directory already exists
    }
}

async function getPackageHash(packagePath) {
    try {
        const packageJson = await readFile(join(packagePath, 'package.json'), 'utf8')
        const tsConfig = await readFile(join(packagePath, 'tsconfig.json'), 'utf8').catch(() => '{}')
        const srcStats = await stat(join(packagePath, 'src')).catch(() => ({ mtime: new Date(0) }))
        
        return Buffer.from(packageJson + tsConfig + srcStats.mtime.toISOString()).toString('base64')
    } catch (e) {
        return Date.now().toString()
    }
}

async function isCacheValid(packageName, hash) {
    try {
        const cacheFile = join(CACHE_DIR, `${packageName}.hash`)
        const cachedHash = await readFile(cacheFile, 'utf8')
        return cachedHash.trim() === hash
    } catch (e) {
        return false
    }
}

async function updateCache(packageName, hash) {
    const cacheFile = join(CACHE_DIR, `${packageName}.hash`)
    await writeFile(cacheFile, hash)
}

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
                reject(new Error(`Command failed with code ${code}: ${stderr}`))
            }
        })
    })
}

async function buildPackage(packageName) {
    const packagePath = join(rootDir, 'packages', packageName)
    const startTime = Date.now()
    
    console.log(`📦 Building ${packageName}...`)
    
    // Check cache
    const hash = await getPackageHash(packagePath)
    const cached = await isCacheValid(packageName, hash)
    
    if (cached) {
        console.log(`💨 Cache hit for ${packageName}`)
        buildMetrics.cacheHits++
        buildMetrics.packages[packageName] = { time: 0, cached: true }
        return
    }
    
    buildMetrics.cacheMisses++
    
    try {
        // Run build command based on package
        let buildCmd = 'yarn'
        let buildArgs = ['compile']
        
        if (packageName === 'web') {
            buildArgs = ['compile']
        } else if (packageName === 'vscode') {
            buildArgs = ['compile']
        }
        
        await runCommand(buildCmd, buildArgs, packagePath)
        await updateCache(packageName, hash)
        
        const buildTime = Date.now() - startTime
        buildMetrics.packages[packageName] = { time: buildTime, cached: false }
        console.log(`✅ Built ${packageName} in ${buildTime}ms`)
        
    } catch (error) {
        console.error(`❌ Failed to build ${packageName}:`, error.message)
        throw error
    }
}

async function buildParallel(packages) {
    const results = await Promise.allSettled(
        packages.map(pkg => buildPackage(pkg))
    )
    
    const failed = results
        .map((result, index) => ({ result, package: packages[index] }))
        .filter(({ result }) => result.status === 'rejected')
    
    if (failed.length > 0) {
        console.error('❌ Failed packages:', failed.map(f => f.package))
        throw new Error(`Build failed for: ${failed.map(f => f.package).join(', ')}`)
    }
}

async function optimizedBuild() {
    console.log('🚀 Starting optimized build process...')
    
    await ensureCacheDir()
    
    // Build core first (dependency for others)
    await buildPackage('core')
    
    // Build CLI and web in parallel (independent)
    await buildParallel(['cli', 'web'])
    
    // Build VSCode extension last (may depend on CLI)
    await buildPackage('vscode')
    
    buildMetrics.totalTime = Date.now() - buildMetrics.startTime
    
    // Report metrics
    console.log('\n📊 Build Performance Report:')
    console.log(`Total time: ${buildMetrics.totalTime}ms`)
    console.log(`Cache hits: ${buildMetrics.cacheHits}`)
    console.log(`Cache misses: ${buildMetrics.cacheMisses}`)
    console.log(`Cache efficiency: ${((buildMetrics.cacheHits / (buildMetrics.cacheHits + buildMetrics.cacheMisses)) * 100).toFixed(1)}%`)
    
    console.log('\nPackage build times:')
    Object.entries(buildMetrics.packages).forEach(([pkg, metrics]) => {
        const status = metrics.cached ? '(cached)' : `${metrics.time}ms`
        console.log(`  ${pkg}: ${status}`)
    })
    
    // Save metrics for analysis
    await writeFile(
        join(CACHE_DIR, 'build-metrics.json'),
        JSON.stringify(buildMetrics, null, 2)
    )
    
    console.log('\n🎉 Build optimization complete!')
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    optimizedBuild().catch(error => {
        console.error('Build failed:', error)
        process.exit(1)
    })
}

export { optimizedBuild, buildMetrics }