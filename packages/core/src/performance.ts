/**
 * Enhanced Performance Monitoring System
 * Provides comprehensive performance tracking and optimization insights
 */

interface PerformanceMetric {
    name: string
    startTime: number
    endTime?: number
    duration?: number
    metadata?: Record<string, any>
    category?: string
    tags?: string[]
}

interface PerformanceProfile {
    id: string
    name: string
    startTime: number
    endTime?: number
    metrics: PerformanceMetric[]
    memoryUsage?: NodeJS.MemoryUsage
    cpuUsage?: NodeJS.CpuUsage
}

class PerformanceMonitor {
    private profiles: Map<string, PerformanceProfile> = new Map()
    private activeMetrics: Map<string, PerformanceMetric> = new Map()
    private globalStartTime: number = Date.now()
    private enabledCategories: Set<string> = new Set(['all'])

    /**
     * Enable performance monitoring for specific categories
     */
    enableCategories(categories: string[]): void {
        categories.forEach(cat => this.enabledCategories.add(cat))
    }

    /**
     * Disable performance monitoring for specific categories
     */
    disableCategories(categories: string[]): void {
        categories.forEach(cat => this.enabledCategories.delete(cat))
    }

    /**
     * Check if a category is enabled for monitoring
     */
    private isCategoryEnabled(category?: string): boolean {
        if (!category) return this.enabledCategories.has('all')
        return this.enabledCategories.has('all') || this.enabledCategories.has(category)
    }

    /**
     * Start a new performance profile
     */
    startProfile(id: string, name: string): void {
        if (this.profiles.has(id)) {
            console.warn(`Performance profile '${id}' already exists`)
            return
        }

        const profile: PerformanceProfile = {
            id,
            name,
            startTime: Date.now(),
            metrics: [],
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage()
        }

        this.profiles.set(id, profile)
    }

    /**
     * End a performance profile
     */
    endProfile(id: string): PerformanceProfile | undefined {
        const profile = this.profiles.get(id)
        if (!profile) {
            console.warn(`Performance profile '${id}' not found`)
            return undefined
        }

        profile.endTime = Date.now()
        
        // Capture final system metrics
        const finalMemory = process.memoryUsage()
        const finalCpu = process.cpuUsage(profile.cpuUsage)

        // Add summary metric
        profile.metrics.push({
            name: 'profile_summary',
            startTime: profile.startTime,
            endTime: profile.endTime,
            duration: profile.endTime - profile.startTime,
            category: 'system',
            metadata: {
                memoryDelta: {
                    heapUsed: finalMemory.heapUsed - profile.memoryUsage!.heapUsed,
                    heapTotal: finalMemory.heapTotal - profile.memoryUsage!.heapTotal,
                    external: finalMemory.external - profile.memoryUsage!.external
                },
                cpuUsage: finalCpu
            }
        })

        this.profiles.delete(id)
        return profile
    }

    /**
     * Start timing a specific operation
     */
    startTiming(name: string, category?: string, metadata?: Record<string, any>): void {
        if (!this.isCategoryEnabled(category)) return

        if (this.activeMetrics.has(name)) {
            console.warn(`Timing '${name}' already active`)
            return
        }

        const metric: PerformanceMetric = {
            name,
            startTime: performance.now(),
            category,
            metadata
        }

        this.activeMetrics.set(name, metric)
    }

    /**
     * End timing for a specific operation
     */
    endTiming(name: string): PerformanceMetric | undefined {
        const metric = this.activeMetrics.get(name)
        if (!metric) {
            console.warn(`Timing '${name}' not found`)
            return undefined
        }

        metric.endTime = performance.now()
        metric.duration = metric.endTime - metric.startTime

        this.activeMetrics.delete(name)
        return metric
    }

    /**
     * Record a one-time performance measurement
     */
    record(name: string, value: number, category?: string, metadata?: Record<string, any>): void {
        if (!this.isCategoryEnabled(category)) return

        const now = performance.now()
        const metric: PerformanceMetric = {
            name,
            startTime: now,
            endTime: now,
            duration: value,
            category,
            metadata
        }

        // Add to current profile if one exists
        const currentProfile = Array.from(this.profiles.values()).find(p => !p.endTime)
        if (currentProfile) {
            currentProfile.metrics.push(metric)
        }
    }

    /**
     * Get performance statistics for analysis
     */
    getStats(): {
        uptime: number
        activeProfiles: number
        activeTimings: number
        totalProfiles: number
        memoryUsage: NodeJS.MemoryUsage
        cpuUsage: NodeJS.CpuUsage
    } {
        return {
            uptime: Date.now() - this.globalStartTime,
            activeProfiles: this.profiles.size,
            activeTimings: this.activeMetrics.size,
            totalProfiles: this.profiles.size,
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage()
        }
    }

    /**
     * Generate a performance report
     */
    generateReport(profileId?: string): {
        timestamp: string
        uptime: number
        systemStats: ReturnType<typeof this.getStats>
        profiles: PerformanceProfile[]
        topMetrics: PerformanceMetric[]
        recommendations: string[]
    } {
        const stats = this.getStats()
        const profiles = profileId 
            ? [this.profiles.get(profileId)].filter(Boolean) as PerformanceProfile[]
            : Array.from(this.profiles.values())

        // Collect all metrics
        const allMetrics = profiles.flatMap(p => p.metrics)
        
        // Find slowest operations
        const topMetrics = allMetrics
            .filter(m => m.duration !== undefined && m.duration > 0)
            .sort((a, b) => (b.duration || 0) - (a.duration || 0))
            .slice(0, 10)

        // Generate recommendations
        const recommendations: string[] = []
        
        if (stats.memoryUsage.heapUsed > 100 * 1024 * 1024) { // > 100MB
            recommendations.push('Consider memory optimization - heap usage is high')
        }
        
        const slowOperations = allMetrics.filter(m => (m.duration || 0) > 1000) // > 1s
        if (slowOperations.length > 0) {
            recommendations.push(`Found ${slowOperations.length} operations taking >1s - consider optimization`)
        }

        if (stats.activeTimings > 20) {
            recommendations.push('High number of active timings - consider reducing monitoring overhead')
        }

        return {
            timestamp: new Date().toISOString(),
            uptime: stats.uptime,
            systemStats: stats,
            profiles,
            topMetrics,
            recommendations
        }
    }

    /**
     * Create a decorator for automatic performance monitoring
     */
    monitor(category?: string) {
        return function <T extends (...args: any[]) => any>(
            target: any,
            propertyKey: string,
            descriptor: TypedPropertyDescriptor<T>
        ) {
            const originalMethod = descriptor.value!
            
            descriptor.value = function (this: any, ...args: any[]) {
                const monitor = performance as any as PerformanceMonitor
                const timingName = `${target.constructor.name}.${propertyKey}`
                
                monitor.startTiming(timingName, category, {
                    args: args.length,
                    className: target.constructor.name
                })
                
                try {
                    const result = originalMethod.apply(this, args)
                    
                    if (result instanceof Promise) {
                        return result.finally(() => {
                            monitor.endTiming(timingName)
                        })
                    } else {
                        monitor.endTiming(timingName)
                        return result
                    }
                } catch (error) {
                    monitor.endTiming(timingName)
                    throw error
                }
            } as T
            
            return descriptor
        }
    }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor()

// Utility functions
export function withTiming<T>(
    name: string, 
    fn: () => T, 
    category?: string, 
    metadata?: Record<string, any>
): T {
    performanceMonitor.startTiming(name, category, metadata)
    try {
        const result = fn()
        if (result instanceof Promise) {
            return result.finally(() => {
                performanceMonitor.endTiming(name)
            }) as T
        } else {
            performanceMonitor.endTiming(name)
            return result
        }
    } catch (error) {
        performanceMonitor.endTiming(name)
        throw error
    }
}

export function profile<T>(id: string, name: string, fn: () => T): T {
    performanceMonitor.startProfile(id, name)
    try {
        const result = fn()
        if (result instanceof Promise) {
            return result.finally(() => {
                performanceMonitor.endProfile(id)
            }) as T
        } else {
            performanceMonitor.endProfile(id)
            return result
        }
    } catch (error) {
        performanceMonitor.endProfile(id)
        throw error
    }
}

/**
 * Mark a performance point in time
 */
export function mark(name: string, metadata?: Record<string, any>): void {
    performanceMonitor.startTiming(name, undefined, metadata)
}

/**
 * Measure duration between marks or from a mark to now
 */
export function measure(name: string): void {
    performanceMonitor.endTiming(name)
}

/**
 * Log a JSON summary of the current performance state.
 */
export function logPerformance() {
    const report = performanceMonitor.generateReport()
    console.log(JSON.stringify(report, null, 2))
    return report
}

// Export types
export type { PerformanceMetric, PerformanceProfile }
export { PerformanceMonitor }
