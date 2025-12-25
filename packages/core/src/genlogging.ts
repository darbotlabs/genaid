/**
 * GenLogging - FastAPI-style comprehensive logging system for GenAID
 * Provides structured logging with performance monitoring, categories, and detailed context
 */

import { Debugger } from "debug"
import { genaidDebug } from "./debug"
import { performanceMonitor, PerformanceMetric } from "./performance"
import { consoleLogFormat } from "./logging"

/**
 * Log levels matching FastAPI patterns
 */
export enum LogLevel {
    TRACE = 0,
    DEBUG = 10,
    INFO = 20,
    SUCCESS = 25,
    WARNING = 30,
    ERROR = 40,
    CRITICAL = 50,
}

/**
 * Log entry structure with rich metadata
 */
export interface LogEntry {
    timestamp: number
    level: LogLevel
    category: string
    message: string
    context?: Record<string, any>
    error?: Error
    performance?: PerformanceMetric
    tags?: string[]
    stack?: string
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
    minLevel?: LogLevel
    enablePerformance?: boolean
    enableStackTraces?: boolean
    categories?: string[]
    tags?: string[]
    structured?: boolean
    prettify?: boolean
}

/**
 * GenLogger - Enhanced logger with FastAPI-style features
 */
export class GenLogger {
    private debuggers: Map<string, Debugger> = new Map()
    private entries: LogEntry[] = []
    private config: Required<LoggerConfig>
    private startTime: number = Date.now()

    constructor(
        private readonly namespace: string,
        config?: LoggerConfig
    ) {
        this.config = {
            minLevel: config?.minLevel ?? LogLevel.INFO,
            enablePerformance: config?.enablePerformance ?? true,
            enableStackTraces: config?.enableStackTraces ?? false,
            categories: config?.categories ?? ["all"],
            tags: config?.tags ?? [],
            structured: config?.structured ?? false,
            prettify: config?.prettify ?? true,
        }
    }

    /**
     * Get or create a debug logger for a category
     */
    private getDebugger(category: string): Debugger {
        if (!this.debuggers.has(category)) {
            const dbg = genaidDebug(`${this.namespace}:${category}`)
            this.debuggers.set(category, dbg)
        }
        return this.debuggers.get(category)!
    }

    /**
     * Check if a log level should be logged
     */
    private shouldLog(level: LogLevel, category?: string): boolean {
        if (level < this.config.minLevel) return false
        if (category && this.config.categories.length > 0) {
            if (
                !this.config.categories.includes("all") &&
                !this.config.categories.includes(category)
            ) {
                return false
            }
        }
        return true
    }

    /**
     * Create a log entry
     */
    private createEntry(
        level: LogLevel,
        message: string,
        category: string,
        context?: Record<string, any>,
        error?: Error
    ): LogEntry {
        const entry: LogEntry = {
            timestamp: Date.now(),
            level,
            category,
            message,
            context,
            error,
            tags: this.config.tags,
        }

        if (this.config.enableStackTraces && (error || level >= LogLevel.ERROR)) {
            entry.stack = error?.stack || new Error().stack
        }

        return entry
    }

    /**
     * Format and output a log entry
     */
    private output(entry: LogEntry): void {
        const dbg = this.getDebugger(entry.category)
        
        if (this.config.structured) {
            // Structured JSON logging (FastAPI-style)
            dbg(JSON.stringify(entry, null, this.config.prettify ? 2 : 0))
        } else {
            // Human-readable logging
            const levelName = LogLevel[entry.level]
            const duration = entry.timestamp - this.startTime
            const parts = [
                `[${levelName}]`,
                `[${entry.category}]`,
                entry.message
            ]

            if (entry.context && Object.keys(entry.context).length > 0) {
                parts.push(`\n  Context: ${consoleLogFormat(entry.context)}`)
            }

            if (entry.performance) {
                parts.push(`\n  Performance: ${entry.performance.duration?.toFixed(2)}ms`)
            }

            if (entry.error) {
                parts.push(`\n  Error: ${entry.error.message}`)
                if (entry.stack) {
                    parts.push(`\n  Stack: ${entry.stack}`)
                }
            }

            if (entry.tags && entry.tags.length > 0) {
                parts.push(`\n  Tags: ${entry.tags.join(", ")}`)
            }

            parts.push(`(+${duration}ms)`)

            dbg(parts.join(" "))
        }

        // Store in memory for analysis
        this.entries.push(entry)
        
        // Keep only last 1000 entries to prevent memory issues
        if (this.entries.length > 1000) {
            this.entries.shift()
        }
    }

    /**
     * Log a trace message (most verbose)
     */
    trace(message: string, category: string = "trace", context?: Record<string, any>): void {
        if (!this.shouldLog(LogLevel.TRACE, category)) return
        const entry = this.createEntry(LogLevel.TRACE, message, category, context)
        this.output(entry)
    }

    /**
     * Log a debug message
     */
    debug(message: string, category: string = "debug", context?: Record<string, any>): void {
        if (!this.shouldLog(LogLevel.DEBUG, category)) return
        const entry = this.createEntry(LogLevel.DEBUG, message, category, context)
        this.output(entry)
    }

    /**
     * Log an info message
     */
    info(message: string, category: string = "info", context?: Record<string, any>): void {
        if (!this.shouldLog(LogLevel.INFO, category)) return
        const entry = this.createEntry(LogLevel.INFO, message, category, context)
        this.output(entry)
    }

    /**
     * Log a success message
     */
    success(message: string, category: string = "success", context?: Record<string, any>): void {
        if (!this.shouldLog(LogLevel.SUCCESS, category)) return
        const entry = this.createEntry(LogLevel.SUCCESS, message, category, context)
        this.output(entry)
    }

    /**
     * Log a warning message
     */
    warning(message: string, category: string = "warning", context?: Record<string, any>): void {
        if (!this.shouldLog(LogLevel.WARNING, category)) return
        const entry = this.createEntry(LogLevel.WARNING, message, category, context)
        this.output(entry)
    }

    /**
     * Log an error message
     */
    error(message: string, category: string = "error", context?: Record<string, any>, error?: Error): void {
        if (!this.shouldLog(LogLevel.ERROR, category)) return
        const entry = this.createEntry(LogLevel.ERROR, message, category, context, error)
        this.output(entry)
    }

    /**
     * Log a critical message
     */
    critical(message: string, category: string = "critical", context?: Record<string, any>, error?: Error): void {
        if (!this.shouldLog(LogLevel.CRITICAL, category)) return
        const entry = this.createEntry(LogLevel.CRITICAL, message, category, context, error)
        this.output(entry)
    }

    /**
     * Log with performance timing
     */
    async timed<T>(
        name: string,
        fn: () => T | Promise<T>,
        category: string = "performance",
        context?: Record<string, any>
    ): Promise<T> {
        const timingName = `${this.namespace}:${category}:${name}`
        
        if (this.config.enablePerformance) {
            performanceMonitor.startTiming(timingName, category, context)
        }

        this.debug(`Starting: ${name}`, category, context)

        try {
            const result = await fn()
            
            if (this.config.enablePerformance) {
                const metric = performanceMonitor.endTiming(timingName)
                if (metric) {
                    const entry = this.createEntry(
                        LogLevel.DEBUG,
                        `Completed: ${name}`,
                        category,
                        context
                    )
                    entry.performance = metric
                    this.output(entry)
                }
            } else {
                this.success(`Completed: ${name}`, category, context)
            }

            return result
        } catch (error) {
            if (this.config.enablePerformance) {
                performanceMonitor.endTiming(timingName)
            }
            
            this.error(
                `Failed: ${name}`,
                category,
                context,
                error instanceof Error ? error : new Error(String(error))
            )
            throw error
        }
    }

    /**
     * Create a child logger with additional context
     */
    child(category: string, additionalTags?: string[]): GenLogger {
        const childLogger = new GenLogger(`${this.namespace}:${category}`, {
            ...this.config,
            tags: [...this.config.tags, ...(additionalTags || [])],
        })
        return childLogger
    }

    /**
     * Get all log entries
     */
    getEntries(filter?: {
        minLevel?: LogLevel
        category?: string
        since?: number
    }): LogEntry[] {
        let filtered = [...this.entries]

        if (filter) {
            if (filter.minLevel !== undefined) {
                filtered = filtered.filter(e => e.level >= filter.minLevel!)
            }
            if (filter.category) {
                filtered = filtered.filter(e => e.category === filter.category)
            }
            if (filter.since !== undefined) {
                filtered = filtered.filter(e => e.timestamp >= filter.since!)
            }
        }

        return filtered
    }

    /**
     * Get statistics about logged entries
     */
    getStats(): {
        total: number
        byLevel: Record<string, number>
        byCategory: Record<string, number>
        errors: number
        warnings: number
        averageDuration?: number
    } {
        const stats = {
            total: this.entries.length,
            byLevel: {} as Record<string, number>,
            byCategory: {} as Record<string, number>,
            errors: 0,
            warnings: 0,
            averageDuration: undefined as number | undefined,
        }

        let totalDuration = 0
        let durationCount = 0

        for (const entry of this.entries) {
            // Count by level
            const levelName = LogLevel[entry.level]
            stats.byLevel[levelName] = (stats.byLevel[levelName] || 0) + 1

            // Count by category
            stats.byCategory[entry.category] = (stats.byCategory[entry.category] || 0) + 1

            // Count errors and warnings
            if (entry.level >= LogLevel.ERROR) stats.errors++
            if (entry.level === LogLevel.WARNING) stats.warnings++

            // Calculate average duration
            if (entry.performance?.duration) {
                totalDuration += entry.performance.duration
                durationCount++
            }
        }

        if (durationCount > 0) {
            stats.averageDuration = totalDuration / durationCount
        }

        return stats
    }

    /**
     * Clear all stored log entries
     */
    clear(): void {
        this.entries = []
        this.startTime = Date.now()
    }

    /**
     * Export logs as JSON
     */
    exportJSON(): string {
        return JSON.stringify({
            namespace: this.namespace,
            config: this.config,
            entries: this.entries,
            stats: this.getStats(),
        }, null, 2)
    }

    /**
     * Configure the logger
     */
    configure(config: Partial<LoggerConfig>): void {
        Object.assign(this.config, config)
    }
}

/**
 * Create a logger factory
 */
export class LoggerFactory {
    private loggers: Map<string, GenLogger> = new Map()
    private globalConfig: LoggerConfig = {
        minLevel: LogLevel.INFO,
        enablePerformance: true,
        enableStackTraces: false,
        categories: ["all"],
        tags: [],
        structured: false,
        prettify: true,
    }

    /**
     * Set global configuration for all loggers
     */
    configure(config: Partial<LoggerConfig>): void {
        Object.assign(this.globalConfig, config)
        // Update existing loggers
        for (const logger of this.loggers.values()) {
            logger.configure(config)
        }
    }

    /**
     * Get or create a logger for a namespace
     */
    getLogger(namespace: string, config?: LoggerConfig): GenLogger {
        if (!this.loggers.has(namespace)) {
            const logger = new GenLogger(namespace, {
                ...this.globalConfig,
                ...config,
            })
            this.loggers.set(namespace, logger)
        }
        return this.loggers.get(namespace)!
    }

    /**
     * Get all loggers
     */
    getAllLoggers(): GenLogger[] {
        return Array.from(this.loggers.values())
    }

    /**
     * Get aggregated statistics from all loggers
     */
    getAggregatedStats(): {
        totalLoggers: number
        totalEntries: number
        totalErrors: number
        totalWarnings: number
        byNamespace: Record<string, any>
    } {
        const stats = {
            totalLoggers: this.loggers.size,
            totalEntries: 0,
            totalErrors: 0,
            totalWarnings: 0,
            byNamespace: {} as Record<string, any>,
        }

        const loggersArray = Array.from(this.loggers.entries())
        for (const [namespace, logger] of loggersArray) {
            const loggerStats = logger.getStats()
            stats.totalEntries += loggerStats.total
            stats.totalErrors += loggerStats.errors
            stats.totalWarnings += loggerStats.warnings
            stats.byNamespace[namespace] = loggerStats
        }

        return stats
    }
}

// Global logger factory instance
export const loggerFactory = new LoggerFactory()

/**
 * Convenience function to get a logger
 */
export function getLogger(namespace: string, config?: LoggerConfig): GenLogger {
    return loggerFactory.getLogger(namespace, config)
}

/**
 * Convenience function to configure all loggers
 */
export function configureLogging(config: Partial<LoggerConfig>): void {
    loggerFactory.configure(config)
}
