#!/usr/bin/env node

/**
 * Enhanced Development Server
 * Provides intelligent hot reload, performance monitoring, and optimized rebuilds
 */

import { spawn } from 'node:child_process'
import { watch } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { debounce } from '../packages/core/src/util.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

// Development server state
const devState = {
    processes: new Map(),
    watchers: new Map(),
    lastRestart: Date.now(),
    restartCount: 0,
    buildQueue: new Set(),
    isBuilding: false
}

// Package dependencies for smart rebuilds
const PACKAGE_DEPS = {
    'cli': ['core'],
    'web': ['core'],
    'vscode': ['core', 'cli'],
    'docs': ['core', 'cli']
}

// Watch patterns for different file types
const WATCH_PATTERNS = {
    'src/**/*.ts': ['typecheck', 'build'],
    'src/**/*.tsx': ['typecheck', 'build'],
    'src/**/*.js': ['build'],
    'src/**/*.mjs': ['build'],
    'package.json': ['install', 'build'],
    'tsconfig.json': ['typecheck', 'build'],
    '*.config.*': ['build']
}

async function runCommand(command, args, cwd, background = false) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd,
            stdio: background ? 'ignore' : 'inherit',
            shell: true
        })

        if (background) {
            resolve(child)
            return
        }

        child.on('close', (code) => {
            if (code === 0) {
                resolve()
            } else {
                reject(new Error(`Command failed with code ${code}`))
            }
        })
    })
}

async function stopProcess(name) {
    const process = devState.processes.get(name)
    if (process && !process.killed) {
        console.log(`🛑 Stopping ${name}...`)
        process.kill('SIGTERM')
        devState.processes.delete(name)
    }
}

async function startProcess(name, command, args, cwd) {
    await stopProcess(name)
    
    console.log(`🚀 Starting ${name}...`)
    const child = await runCommand(command, args, cwd, true)
    
    child.stdout?.on('data', (data) => {
        process.stdout.write(`[${name}] ${data}`)
    })
    
    child.stderr?.on('data', (data) => {
        process.stderr.write(`[${name}] ${data}`)
    })
    
    child.on('exit', (code) => {
        if (code !== 0) {
            console.log(`❌ ${name} exited with code ${code}`)
        }
        devState.processes.delete(name)
    })
    
    devState.processes.set(name, child)
    return child
}

async function buildPackage(packageName, force = false) {
    if (devState.isBuilding && !force) {
        devState.buildQueue.add(packageName)
        return
    }
    
    devState.isBuilding = true
    const packagePath = join(rootDir, 'packages', packageName)
    
    try {
        console.log(`🔨 Rebuilding ${packageName}...`)
        const startTime = Date.now()
        
        await runCommand('yarn', ['compile'], packagePath)
        
        const buildTime = Date.now() - startTime
        console.log(`✅ Rebuilt ${packageName} in ${buildTime}ms`)
        
        // Rebuild dependent packages
        const dependents = Object.entries(PACKAGE_DEPS)
            .filter(([, deps]) => deps.includes(packageName))
            .map(([pkg]) => pkg)
        
        for (const dependent of dependents) {
            await buildPackage(dependent, true)
        }
        
    } catch (error) {
        console.error(`❌ Failed to rebuild ${packageName}:`, error.message)
    } finally {
        devState.isBuilding = false
        
        // Process build queue
        if (devState.buildQueue.size > 0) {
            const nextPackage = Array.from(devState.buildQueue)[0]
            devState.buildQueue.delete(nextPackage)
            setTimeout(() => buildPackage(nextPackage), 100)
        }
    }
}

const debouncedBuild = debounce(buildPackage, 300)

function setupFileWatcher(packageName) {
    const packagePath = join(rootDir, 'packages', packageName)
    const srcPath = join(packagePath, 'src')
    
    console.log(`👀 Watching ${relative(rootDir, srcPath)}...`)
    
    const watcher = watch(srcPath, { recursive: true }, (eventType, filename) => {
        if (!filename) return
        
        const ext = filename.split('.').pop()
        if (!['ts', 'tsx', 'js', 'mjs', 'json'].includes(ext)) return
        
        console.log(`📝 Changed: ${relative(rootDir, join(srcPath, filename))}`)
        debouncedBuild(packageName)
    })
    
    devState.watchers.set(packageName, watcher)
    return watcher
}

async function startDevServer() {
    console.log('🌟 Starting enhanced development server...')
    
    // Initial build
    console.log('📦 Running initial build...')
    await runCommand('yarn', ['compile:ext'], rootDir)
    
    // Start file watchers for packages
    ['core', 'cli', 'web', 'vscode'].forEach(pkg => {
        setupFileWatcher(pkg)
    })
    
    // Start development services
    await Promise.all([
        startProcess('web-server', 'yarn', ['serve:web'], rootDir),
        startProcess('cli-server', 'yarn', ['serve:cli'], rootDir),
        startProcess('docs-server', 'yarn', ['docs'], rootDir)
    ])
    
    console.log('🎉 Development server ready!')
    console.log('📖 Documentation: http://localhost:4321')
    console.log('🌐 Web interface: http://localhost:3000')
    console.log('⚡ CLI server: http://localhost:8080')
}

async function stopDevServer() {
    console.log('🛑 Stopping development server...')
    
    // Stop all processes
    for (const [name] of devState.processes) {
        await stopProcess(name)
    }
    
    // Close file watchers
    for (const [name, watcher] of devState.watchers) {
        console.log(`👋 Stopping watcher for ${name}`)
        watcher.close()
    }
    
    devState.watchers.clear()
    console.log('✅ Development server stopped')
}

// Performance monitoring
setInterval(() => {
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()
    
    console.log(`📊 Dev server stats - Uptime: ${Math.floor(uptime)}s, Memory: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB, Restarts: ${devState.restartCount}`)
}, 30000) // Every 30 seconds

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...')
    await stopDevServer()
    process.exit(0)
})

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...')
    await stopDevServer()
    process.exit(0)
})

// Start if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    startDevServer().catch(error => {
        console.error('Dev server failed:', error)
        process.exit(1)
    })
}

export { startDevServer, stopDevServer }