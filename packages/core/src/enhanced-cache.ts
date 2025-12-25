/**
 * Enhanced Caching System
 * Provides intelligent caching with TTL, compression, and performance optimization
 */

import { createHash } from 'node:crypto'
import { readFile, writeFile, stat, mkdir, unlink } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { gzipSync, gunzipSync } from 'node:zlib'
import { performanceMonitor } from './performance'

interface CacheEntry<T> {
    data: T
    timestamp: number
    ttl?: number
    hits: number
    size: number
    compressed: boolean
    tags?: string[]
    dependencies?: string[]
}

interface CacheStats {
    totalEntries: number
    totalSize: number
    hitRate: number
    averageAccessTime: number
    compressedEntries: number
    expiredEntries: number
}

interface CacheConfig {
    maxSize?: number // Maximum cache size in bytes
    defaultTTL?: number // Default TTL in milliseconds
    compressionThreshold?: number // Compress entries larger than this
    cleanupInterval?: number // Cleanup interval in ms
    enableCompression?: boolean
    enablePerformanceTracking?: boolean
}

export class EnhancedCache<T = any> {
    private cache = new Map<string, CacheEntry<T>>()
    private accessTimes: number[] = []
    private config: Required<CacheConfig>
    private cleanupTimer?: NodeJS.Timeout
    private persistPath?: string

    constructor(config: CacheConfig = {}, persistPath?: string) {
        this.config = {
            maxSize: config.maxSize || 100 * 1024 * 1024, // 100MB
            defaultTTL: config.defaultTTL || 1000 * 60 * 60, // 1 hour
            compressionThreshold: config.compressionThreshold || 1024, // 1KB
            cleanupInterval: config.cleanupInterval || 1000 * 60 * 5, // 5 minutes
            enableCompression: config.enableCompression ?? true,
            enablePerformanceTracking: config.enablePerformanceTracking ?? true
        }
        
        this.persistPath = persistPath
        this.startCleanupTimer()
        
        if (persistPath) {
            this.loadFromDisk().catch(console.warn)
        }
    }

    /**
     * Generate a cache key from any input
     */
    private generateKey(input: any): string {
        if (typeof input === 'string') return input
        return createHash('sha256').update(JSON.stringify(input)).digest('hex')
    }

    /**
     * Check if an entry has expired
     */
    private isExpired(entry: CacheEntry<T>): boolean {
        if (!entry.ttl) return false
        return Date.now() > entry.timestamp + entry.ttl
    }

    /**
     * Compress data if it exceeds threshold
     */
    private compressData(data: T): { data: Buffer | T; compressed: boolean; size: number } {
        if (!this.config.enableCompression) {
            const serialized = JSON.stringify(data)
            return { 
                data, 
                compressed: false, 
                size: Buffer.byteLength(serialized, 'utf8') 
            }
        }

        const serialized = JSON.stringify(data)
        const originalSize = Buffer.byteLength(serialized, 'utf8')
        
        if (originalSize > this.config.compressionThreshold) {
            const compressed = gzipSync(Buffer.from(serialized, 'utf8'))
            return { 
                data: compressed, 
                compressed: true, 
                size: compressed.length 
            }
        }
        
        return { data, compressed: false, size: originalSize }
    }

    /**
     * Decompress data if needed
     */
    private decompressData(entry: CacheEntry<T>): T {
        if (!entry.compressed) return entry.data
        
        const compressed = entry.data as Buffer
        const decompressed = gunzipSync(compressed)
        return JSON.parse(decompressed.toString('utf8'))
    }

    /**
     * Get current cache size in bytes
     */
    private getCurrentSize(): number {
        return Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0)
    }

    /**
     * Evict entries to make space
     */
    private evictEntries(targetSize: number): void {
        const entries = Array.from(this.cache.entries())
        
        // Sort by hits (LFU) and timestamp (LRU)
        entries.sort((a, b) => {
            const [, entryA] = a
            const [, entryB] = b
            
            // First by hits (ascending - evict least frequently used)
            if (entryA.hits !== entryB.hits) {
                return entryA.hits - entryB.hits
            }
            
            // Then by timestamp (ascending - evict least recently used)
            return entryA.timestamp - entryB.timestamp
        })

        let currentSize = this.getCurrentSize()
        for (const [key] of entries) {
            if (currentSize <= targetSize) break
            
            const entry = this.cache.get(key)
            if (entry) {
                currentSize -= entry.size
                this.cache.delete(key)
            }
        }
    }

    /**
     * Set a value in the cache
     */
    set(
        key: any, 
        value: T, 
        options: {
            ttl?: number
            tags?: string[]
            dependencies?: string[]
        } = {}
    ): void {
        const startTime = performance.now()
        const cacheKey = this.generateKey(key)
        
        // Compress data if needed
        const { data, compressed, size } = this.compressData(value)
        
        // Check if we need to evict entries
        const currentSize = this.getCurrentSize()
        const targetSize = this.config.maxSize - size
        
        if (currentSize > targetSize) {
            this.evictEntries(targetSize)
        }

        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl: options.ttl || this.config.defaultTTL,
            hits: 0,
            size,
            compressed,
            tags: options.tags,
            dependencies: options.dependencies
        }

        this.cache.set(cacheKey, entry)
        
        if (this.config.enablePerformanceTracking) {
            performanceMonitor.record('cache_set', performance.now() - startTime, 'cache', {
                key: cacheKey,
                size,
                compressed
            })
        }
    }

    /**
     * Get a value from the cache
     */
    get(key: any): T | undefined {
        const startTime = performance.now()
        const cacheKey = this.generateKey(key)
        const entry = this.cache.get(cacheKey)
        
        if (!entry) {
            if (this.config.enablePerformanceTracking) {
                performanceMonitor.record('cache_miss', performance.now() - startTime, 'cache', {
                    key: cacheKey
                })
            }
            return undefined
        }

        if (this.isExpired(entry)) {
            this.cache.delete(cacheKey)
            if (this.config.enablePerformanceTracking) {
                performanceMonitor.record('cache_expired', performance.now() - startTime, 'cache', {
                    key: cacheKey
                })
            }
            return undefined
        }

        // Update access statistics
        entry.hits++
        entry.timestamp = Date.now()
        
        const accessTime = performance.now() - startTime
        this.accessTimes.push(accessTime)
        
        // Keep only recent access times for statistics
        if (this.accessTimes.length > 1000) {
            this.accessTimes = this.accessTimes.slice(-500)
        }

        if (this.config.enablePerformanceTracking) {
            performanceMonitor.record('cache_hit', accessTime, 'cache', {
                key: cacheKey,
                hits: entry.hits,
                compressed: entry.compressed
            })
        }

        return this.decompressData(entry)
    }

    /**
     * Check if a key exists in the cache
     */
    has(key: any): boolean {
        const cacheKey = this.generateKey(key)
        const entry = this.cache.get(cacheKey)
        return entry !== undefined && !this.isExpired(entry)
    }

    /**
     * Delete a specific key
     */
    delete(key: any): boolean {
        const cacheKey = this.generateKey(key)
        return this.cache.delete(cacheKey)
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear()
        this.accessTimes = []
    }

    /**
     * Clear entries by tags
     */
    clearByTags(tags: string[]): number {
        let cleared = 0
        const tagSet = new Set(tags)
        
        for (const [key, entry] of this.cache.entries()) {
            if (entry.tags && entry.tags.some(tag => tagSet.has(tag))) {
                this.cache.delete(key)
                cleared++
            }
        }
        
        return cleared
    }

    /**
     * Clear entries by dependencies
     */
    clearByDependencies(dependencies: string[]): number {
        let cleared = 0
        const depSet = new Set(dependencies)
        
        for (const [key, entry] of this.cache.entries()) {
            if (entry.dependencies && entry.dependencies.some(dep => depSet.has(dep))) {
                this.cache.delete(key)
                cleared++
            }
        }
        
        return cleared
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        const entries = Array.from(this.cache.values())
        const totalEntries = entries.length
        const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0)
        const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0)
        const compressedEntries = entries.filter(entry => entry.compressed).length
        const expiredEntries = entries.filter(entry => this.isExpired(entry)).length
        
        const hitRate = totalHits > 0 ? totalHits / (totalHits + totalEntries) : 0
        const averageAccessTime = this.accessTimes.length > 0 
            ? this.accessTimes.reduce((sum, time) => sum + time, 0) / this.accessTimes.length 
            : 0

        return {
            totalEntries,
            totalSize,
            hitRate,
            averageAccessTime,
            compressedEntries,
            expiredEntries
        }
    }

    /**
     * Start automatic cleanup timer
     */
    private startCleanupTimer(): void {
        this.cleanupTimer = setInterval(() => {
            this.cleanup()
        }, this.config.cleanupInterval)
    }

    /**
     * Clean up expired entries
     */
    cleanup(): number {
        let cleaned = 0
        
        for (const [key, entry] of this.cache.entries()) {
            if (this.isExpired(entry)) {
                this.cache.delete(key)
                cleaned++
            }
        }
        
        return cleaned
    }

    /**
     * Save cache to disk
     */
    async saveToDisk(): Promise<void> {
        if (!this.persistPath) return
        
        const cacheData = {
            entries: Array.from(this.cache.entries()),
            timestamp: Date.now()
        }

        await mkdir(dirname(this.persistPath), { recursive: true })
        await writeFile(this.persistPath, JSON.stringify(cacheData))
    }

    /**
     * Load cache from disk
     */
    async loadFromDisk(): Promise<void> {
        if (!this.persistPath) return
        
        try {
            const data = await readFile(this.persistPath, 'utf8')
            const cacheData = JSON.parse(data)
            
            this.cache = new Map(cacheData.entries)
            
            // Clean up expired entries after loading
            this.cleanup()
            
        } catch (e) {
            // File doesn't exist or is corrupted, start fresh
        }
    }

    /**
     * Destroy the cache and cleanup resources
     */
    destroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer)
        }
        
        if (this.persistPath) {
            this.saveToDisk().catch(console.warn)
        }
        
        this.clear()
    }
}

// Factory function for creating enhanced caches
export function createEnhancedCache<T = any>(
    name: string, 
    config?: CacheConfig,
    persistPath?: string
): EnhancedCache<T> {
    const fullPersistPath = persistPath || 
        (typeof process !== 'undefined' && process.cwd ? 
            join(process.cwd(), '.genaid', 'cache', `${name}.json`) : 
            undefined)
    
    return new EnhancedCache<T>(config, fullPersistPath)
}

export type { CacheConfig, CacheStats, CacheEntry }