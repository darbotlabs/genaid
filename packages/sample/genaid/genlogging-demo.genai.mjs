/**
 * GenLogging Demo Script
 * Demonstrates FastAPI-style comprehensive logging with performance monitoring
 * 
 * Run with: DEBUG=genaid:* genaid run genlogging-demo
 * Or: LOG_FORMAT=json DEBUG=genaid:* genaid run genlogging-demo
 */

import { getLogger, LogLevel, configureLogging } from "../../core/src/genlogging"
import { performanceMonitor } from "../../core/src/performance"

// Configure logging (optional, can also use environment variables)
if (process.env.LOG_LEVEL) {
    configureLogging({
        minLevel: LogLevel[process.env.LOG_LEVEL as keyof typeof LogLevel] || LogLevel.INFO,
        enablePerformance: process.env.ENABLE_PERFORMANCE !== "false",
        structured: process.env.LOG_FORMAT === "json",
        prettify: process.env.LOG_PRETTY !== "false",
    })
}

// Create logger for this script
const logger = getLogger("genaid:demo")

script({
    title: "GenLogging Demo",
    description: "Demonstrates comprehensive logging with performance monitoring",
    parameters: {
        operation: {
            type: "string",
            description: "Operation to demonstrate",
            default: "all",
        },
    },
})

// Simulate async operation
async function simulateWork(ms: number, shouldFail: boolean = false) {
    await new Promise(resolve => setTimeout(resolve, ms))
    if (shouldFail) throw new Error("Simulated failure")
    return `Completed after ${ms}ms`
}

// Demo 1: Basic logging at different levels
async function demoBasicLogging() {
    logger.info("Starting basic logging demo", "demo", {
        timestamp: Date.now(),
    })

    logger.trace("This is a trace message (very detailed)", "demo")
    logger.debug("This is a debug message", "demo", { debugInfo: "some data" })
    logger.info("This is an info message", "demo")
    logger.success("Operation succeeded!", "demo", { result: "success" })
    logger.warning("This is a warning", "demo", { severity: "medium" })

    try {
        throw new Error("Example error")
    } catch (error) {
        logger.error("Caught an error", "demo", { context: "error handling" }, error)
    }

    logger.info("Basic logging demo completed", "demo")
}

// Demo 2: Performance monitoring
async function demoPerformanceMonitoring() {
    logger.info("Starting performance monitoring demo", "demo")

    // Method 1: Using logger.timed()
    const result1 = await logger.timed(
        "fastOperation",
        async () => {
            return await simulateWork(100)
        },
        "performance",
        { method: "logger.timed" }
    )
    logger.success(`Result: ${result1}`, "performance")

    // Method 2: Using logger.timed() with slower operation
    const result2 = await logger.timed(
        "slowOperation",
        async () => {
            return await simulateWork(500)
        },
        "performance",
        { method: "logger.timed", expected: "slow" }
    )
    logger.success(`Result: ${result2}`, "performance")

    // Method 3: Manual performance tracking
    performanceMonitor.startTiming("manualOperation", "performance")
    await simulateWork(200)
    const metric = performanceMonitor.endTiming("manualOperation")
    logger.info("Manual timing completed", "performance", {
        duration: metric?.duration,
        method: "performanceMonitor",
    })

    logger.info("Performance monitoring demo completed", "demo")
}

// Demo 3: Child loggers
async function demoChildLoggers() {
    logger.info("Starting child logger demo", "demo")

    // Create child loggers for different components
    const apiLogger = logger.child("api", ["v1", "rest"])
    const dbLogger = logger.child("database", ["mysql", "pool"])
    const cacheLogger = logger.child("cache", ["redis", "cluster"])

    // Use child loggers
    apiLogger.info("API request received", "request", {
        method: "GET",
        path: "/users/123",
    })

    await dbLogger.timed(
        "query",
        async () => {
            await simulateWork(150)
            return { id: 123, name: "John Doe" }
        },
        "query",
        { table: "users", id: 123 }
    )

    cacheLogger.info("Cache hit", "get", {
        key: "user:123",
        ttl: 3600,
    })

    apiLogger.success("API request completed", "response", {
        status: 200,
        cached: true,
    })

    logger.info("Child logger demo completed", "demo")
}

// Demo 4: Error handling and logging
async function demoErrorHandling() {
    logger.info("Starting error handling demo", "demo")

    // Handled error
    try {
        await logger.timed(
            "failingOperation",
            async () => {
                await simulateWork(100, true)
            },
            "error-demo"
        )
    } catch (error) {
        logger.error(
            "Operation failed as expected",
            "error-demo",
            { 
                recovered: true,
                fallback: "default-value" 
            },
            error
        )
    }

    // Critical error (logged but not thrown in demo)
    logger.critical(
        "Hypothetical critical failure",
        "critical-demo",
        {
            system: "database",
            impact: "service unavailable",
        },
        new Error("Connection lost")
    )

    logger.info("Error handling demo completed", "demo")
}

// Demo 5: Statistics and analysis
async function demoStatistics() {
    logger.info("Starting statistics demo", "demo")

    // Run some operations
    for (let i = 0; i < 5; i++) {
        await logger.timed(
            `batch-${i}`,
            async () => await simulateWork(50 + i * 20),
            "batch",
            { iteration: i }
        )
    }

    // Get statistics
    const stats = logger.getStats()
    logger.info("Logger statistics", "stats", {
        total: stats.total,
        errors: stats.errors,
        warnings: stats.warnings,
        categories: Object.keys(stats.byCategory),
        levels: Object.keys(stats.byLevel),
        averageDuration: stats.averageDuration?.toFixed(2) + "ms",
    })

    // Get filtered entries
    const recentEntries = logger.getEntries({
        minLevel: LogLevel.INFO,
        since: Date.now() - 10000,
    })
    logger.info(`Recent entries: ${recentEntries.length}`, "stats")

    // Get performance report
    const perfReport = performanceMonitor.generateReport()
    logger.info("Performance report", "stats", {
        uptime: perfReport.uptime,
        profiles: perfReport.profiles.length,
        topOperations: perfReport.topMetrics.slice(0, 3).map(m => ({
            name: m.name,
            duration: m.duration?.toFixed(2),
        })),
    })

    logger.info("Statistics demo completed", "demo")
}

// Main execution
$`echo "🚀 GenLogging Demonstration"`
$`echo "============================"`
$`echo ""`

logger.info("GenLogging demo starting", "main", {
    operation: env.vars.operation || "all",
    environment: {
        DEBUG: process.env.DEBUG,
        LOG_FORMAT: process.env.LOG_FORMAT,
        LOG_LEVEL: process.env.LOG_LEVEL,
    },
})

try {
    const operation = env.vars.operation || "all"

    switch (operation) {
        case "basic":
            await demoBasicLogging()
            break
        case "performance":
            await demoPerformanceMonitoring()
            break
        case "child":
            await demoChildLoggers()
            break
        case "error":
            await demoErrorHandling()
            break
        case "stats":
            await demoStatistics()
            break
        case "all":
        default:
            await demoBasicLogging()
            $`echo ""`
            await demoPerformanceMonitoring()
            $`echo ""`
            await demoChildLoggers()
            $`echo ""`
            await demoErrorHandling()
            $`echo ""`
            await demoStatistics()
            break
    }

    logger.success("GenLogging demo completed successfully!", "main")

    // Export final statistics
    $`echo ""`
    $`echo "📊 Final Statistics:"`
    const finalStats = logger.getStats()
    $`echo "Total logs: ${finalStats.total}"`
    $`echo "Errors: ${finalStats.errors}"`
    $`echo "Warnings: ${finalStats.warnings}"`
    if (finalStats.averageDuration) {
        $`echo "Average duration: ${finalStats.averageDuration.toFixed(2)}ms"`
    }

    // Optionally export logs to file
    if (process.env.EXPORT_LOGS) {
        const json = logger.exportJSON()
        defFileMerge("genlogging-demo-export.json", json)
        $`echo ""`
        $`echo "📄 Logs exported to genlogging-demo-export.json"`
    }

    $`echo ""`
    $`echo "✅ Demo completed! Try different options:"`
    $`echo "  DEBUG=genaid:* genaid run genlogging-demo operation=basic"`
    $`echo "  DEBUG=genaid:* genaid run genlogging-demo operation=performance"`
    $`echo "  LOG_FORMAT=json DEBUG=genaid:* genaid run genlogging-demo"`
    $`echo "  EXPORT_LOGS=true DEBUG=genaid:* genaid run genlogging-demo"`

} catch (error) {
    logger.critical("Demo failed", "main", {}, error)
    throw error
}
