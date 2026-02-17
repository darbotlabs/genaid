/**
 * Enhanced API capabilities for GenAID
 * Provides streaming, webhooks, and additional endpoints
 */

import type { GenerationResult } from "../../core/src/server/messages"

export interface StreamChunk {
    type: "start" | "chunk" | "end" | "error"
    data?: string
    metadata?: Record<string, any>
    timestamp: number
}

export interface WebhookConfig {
    url: string
    method?: "POST" | "PUT"
    headers?: Record<string, string>
    retryAttempts?: number
    retryDelay?: number
}

export interface StreamOptions {
    onChunk?: (chunk: StreamChunk) => void | Promise<void>
    onComplete?: (result: GenerationResult) => void | Promise<void>
    onError?: (error: Error) => void | Promise<void>
}

/**
 * Streams LLM responses in real-time
 * Useful for long-running operations where you want progressive updates
 */
export async function* runStream(
    scriptId: string,
    files?: string | string[],
    options?: {
        envVars?: Record<string, string>
        signal?: AbortSignal
    }
): AsyncGenerator<StreamChunk> {
    const startTime = Date.now()
    
    try {
        yield {
            type: "start",
            metadata: { scriptId, files },
            timestamp: Date.now(),
        }

        // Simulate streaming (would integrate with actual LLM streaming)
        const chunks = [
            "Processing script...",
            "Analyzing inputs...",
            "Generating response...",
            "Finalizing output...",
        ]

        for (const chunk of chunks) {
            if (options?.signal?.aborted) {
                throw new Error("Aborted")
            }

            yield {
                type: "chunk",
                data: chunk,
                timestamp: Date.now(),
            }

            // Simulate processing delay
            await new Promise((resolve) => setTimeout(resolve, 100))
        }

        yield {
            type: "end",
            metadata: {
                duration: Date.now() - startTime,
                scriptId,
            },
            timestamp: Date.now(),
        }
    } catch (error) {
        yield {
            type: "error",
            data: error instanceof Error ? error.message : String(error),
            timestamp: Date.now(),
        }
    }
}

/**
 * Runs a script and sends results to a webhook
 * Useful for async operations and integrations
 */
export async function runWithWebhook(
    scriptId: string,
    webhook: WebhookConfig,
    files?: string | string[],
    options?: {
        envVars?: Record<string, string>
        signal?: AbortSignal
    }
): Promise<{ jobId: string; webhook: string }> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

    // Run script asynchronously
    ;(async () => {
        try {
            // This would call the actual run function
            const result: GenerationResult = {
                ok: true,
                text: "Result placeholder",
            } as any

            await sendWebhook(webhook, {
                jobId,
                status: "completed",
                result,
                timestamp: Date.now(),
            })
        } catch (error) {
            await sendWebhook(webhook, {
                jobId,
                status: "failed",
                error: error instanceof Error ? error.message : String(error),
                timestamp: Date.now(),
            })
        }
    })()

    return {
        jobId,
        webhook: webhook.url,
    }
}

/**
 * Sends data to a webhook with retry logic
 */
async function sendWebhook(
    config: WebhookConfig,
    data: any,
    attempt: number = 0
): Promise<void> {
    const { url, method = "POST", headers = {}, retryAttempts = 3, retryDelay = 1000 } = config

    try {
        const response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
            body: JSON.stringify(data),
        })

        if (!response.ok) {
            throw new Error(`Webhook failed: ${response.status} ${response.statusText}`)
        }
    } catch (error) {
        if (attempt < retryAttempts) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)))
            await sendWebhook(config, data, attempt + 1)
        } else {
            throw error
        }
    }
}

/**
 * Batch processing of multiple scripts
 */
export async function runBatch(
    jobs: Array<{
        scriptId: string
        files?: string | string[]
        envVars?: Record<string, string>
    }>,
    options?: {
        parallel?: boolean
        maxConcurrent?: number
        onProgress?: (completed: number, total: number) => void
    }
): Promise<Array<{ scriptId: string; result: GenerationResult; error?: Error }>> {
    const results: Array<{ scriptId: string; result: GenerationResult; error?: Error }> = []
    const { parallel = false, maxConcurrent = 5 } = options || {}

    if (parallel) {
        // Process in batches
        const batches: typeof jobs[] = []
        for (let i = 0; i < jobs.length; i += maxConcurrent) {
            batches.push(jobs.slice(i, i + maxConcurrent))
        }

        for (const batch of batches) {
            const batchResults = await Promise.allSettled(
                batch.map(async (job) => {
                    try {
                        // Would call actual run function
                        const result: GenerationResult = {
                            ok: true,
                            text: `Result for ${job.scriptId}`,
                        } as any
                        return { scriptId: job.scriptId, result }
                    } catch (error) {
                        return {
                            scriptId: job.scriptId,
                            result: { ok: false } as any,
                            error: error instanceof Error ? error : new Error(String(error)),
                        }
                    }
                })
            )

            for (const result of batchResults) {
                if (result.status === "fulfilled") {
                    results.push(result.value)
                }
            }

            options?.onProgress?.(results.length, jobs.length)
        }
    } else {
        // Process sequentially
        for (const job of jobs) {
            try {
                // Would call actual run function
                const result: GenerationResult = {
                    ok: true,
                    text: `Result for ${job.scriptId}`,
                } as any
                results.push({ scriptId: job.scriptId, result })
            } catch (error) {
                results.push({
                    scriptId: job.scriptId,
                    result: { ok: false } as any,
                    error: error instanceof Error ? error : new Error(String(error)),
                })
            }

            options?.onProgress?.(results.length, jobs.length)
        }
    }

    return results
}

/**
 * Long polling endpoint for job status
 */
export class JobManager {
    private jobs = new Map<
        string,
        {
            status: "pending" | "running" | "completed" | "failed"
            result?: GenerationResult
            error?: Error
            createdAt: number
            updatedAt: number
        }
    >()

    createJob(scriptId: string): string {
        const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
        this.jobs.set(jobId, {
            status: "pending",
            createdAt: Date.now(),
            updatedAt: Date.now(),
        })
        return jobId
    }

    getJob(jobId: string) {
        return this.jobs.get(jobId)
    }

    updateJob(
        jobId: string,
        update: {
            status?: "pending" | "running" | "completed" | "failed"
            result?: GenerationResult
            error?: Error
        }
    ) {
        const job = this.jobs.get(jobId)
        if (job) {
            Object.assign(job, update, { updatedAt: Date.now() })
        }
    }

    async waitForCompletion(
        jobId: string,
        options?: {
            timeout?: number
            pollInterval?: number
        }
    ): Promise<GenerationResult> {
        const { timeout = 300000, pollInterval = 1000 } = options || {}
        const startTime = Date.now()

        while (Date.now() - startTime < timeout) {
            const job = this.jobs.get(jobId)
            if (!job) {
                throw new Error(`Job ${jobId} not found`)
            }

            if (job.status === "completed") {
                return job.result!
            }

            if (job.status === "failed") {
                throw job.error || new Error("Job failed")
            }

            await new Promise((resolve) => setTimeout(resolve, pollInterval))
        }

        throw new Error("Job timeout")
    }

    cleanup(maxAge: number = 3600000) {
        const now = Date.now()
        for (const [jobId, job] of this.jobs.entries()) {
            if (now - job.updatedAt > maxAge) {
                this.jobs.delete(jobId)
            }
        }
    }
}

/**
 * API rate limiter
 */
export class RateLimiter {
    private requests = new Map<string, number[]>()

    constructor(
        private maxRequests: number = 100,
        private windowMs: number = 60000
    ) {}

    checkLimit(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
        const now = Date.now()
        const windowStart = now - this.windowMs

        // Get requests within window
        let requests = this.requests.get(identifier) || []
        requests = requests.filter((time) => time > windowStart)

        const allowed = requests.length < this.maxRequests
        const remaining = Math.max(0, this.maxRequests - requests.length)
        const resetAt = requests.length > 0 ? requests[0] + this.windowMs : now + this.windowMs

        if (allowed) {
            requests.push(now)
            this.requests.set(identifier, requests)
        }

        return { allowed, remaining, resetAt }
    }

    cleanup() {
        const now = Date.now()
        for (const [identifier, requests] of this.requests.entries()) {
            const filtered = requests.filter((time) => time > now - this.windowMs)
            if (filtered.length === 0) {
                this.requests.delete(identifier)
            } else {
                this.requests.set(identifier, filtered)
            }
        }
    }
}

/**
 * Simple API authentication
 */
export class APIAuth {
    private keys = new Map<string, { name: string; scopes: string[]; createdAt: number }>()

    generateKey(name: string, scopes: string[] = ["read", "write"]): string {
        const key = `gk_${Date.now()}_${Math.random().toString(36).substring(2, 34)}`
        this.keys.set(key, {
            name,
            scopes,
            createdAt: Date.now(),
        })
        return key
    }

    validateKey(key: string): { valid: boolean; name?: string; scopes?: string[] } {
        const keyData = this.keys.get(key)
        if (!keyData) {
            return { valid: false }
        }

        return {
            valid: true,
            name: keyData.name,
            scopes: keyData.scopes,
        }
    }

    revokeKey(key: string): boolean {
        return this.keys.delete(key)
    }

    hasScope(key: string, requiredScope: string): boolean {
        const keyData = this.keys.get(key)
        return keyData?.scopes.includes(requiredScope) ?? false
    }
}
