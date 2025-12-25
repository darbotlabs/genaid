# GenLogging Integration Guide

## Overview

GenLogging provides FastAPI-style comprehensive logging with performance monitoring, structured output, and rich context throughout the GenAID framework.

## Features

✅ **Multiple Log Levels**: TRACE, DEBUG, INFO, SUCCESS, WARNING, ERROR, CRITICAL  
✅ **Performance Monitoring**: Automatic timing with `timed()` method  
✅ **Structured Logging**: JSON output for machine parsing  
✅ **Category-based Filtering**: Enable/disable specific categories  
✅ **Rich Context**: Attach metadata to every log  
✅ **Child Loggers**: Inherit configuration with additional context  
✅ **Statistics**: Track errors, warnings, and performance metrics  
✅ **Export**: JSON export of all logs for analysis  

## Quick Start

### Basic Usage

```typescript
import { getLogger } from "./genlogging"

// Create a logger
const logger = getLogger("mymodule")

// Log at different levels
logger.info("Application started", "startup")
logger.debug("Processing request", "request", { id: 123 })
logger.success("Operation completed", "operation", { duration: 245 })
logger.warning("Cache miss", "cache", { key: "user:123" })
logger.error("Failed to connect", "database", { host: "localhost" }, error)
```

### Performance Monitoring

```typescript
// Automatic timing with performance logging
const result = await logger.timed(
    "fetchUserData",
    async () => {
        return await db.users.findOne({ id: userId })
    },
    "database",
    { userId }
)

// Manual performance tracking
performanceMonitor.startTiming("complexOperation", "processing")
// ... do work ...
const metric = performanceMonitor.endTiming("complexOperation")
```

### Configuration

```typescript
import { configureLogging, LogLevel } from "./genlogging"

// Configure globally
configureLogging({
    minLevel: LogLevel.DEBUG,
    enablePerformance: true,
    enableStackTraces: true,
    categories: ["api", "database", "cache"],
    structured: false, // Human-readable output
    prettify: true,
})

// Or per-logger
const logger = getLogger("api", {
    minLevel: LogLevel.TRACE,
    tags: ["production", "v1.2.3"],
})
```

### Child Loggers

```typescript
const rootLogger = getLogger("app")
const dbLogger = rootLogger.child("database", ["mysql"])
const cacheLogger = rootLogger.child("cache", ["redis"])

// Child loggers inherit parent configuration
dbLogger.info("Connection established", "connection", { pool: 10 })
```

### Statistics and Analysis

```typescript
// Get logger statistics
const stats = logger.getStats()
console.log(`Total logs: ${stats.total}`)
console.log(`Errors: ${stats.errors}`)
console.log(`Warnings: ${stats.warnings}`)
console.log(`By level:`, stats.byLevel)
console.log(`By category:`, stats.byCategory)
console.log(`Average duration: ${stats.averageDuration}ms`)

// Get filtered entries
const recentErrors = logger.getEntries({
    minLevel: LogLevel.ERROR,
    since: Date.now() - 3600000, // Last hour
})

// Export for external analysis
const json = logger.exportJSON()
await fs.writeFile("logs.json", json)
```

## Integration Patterns

### 1. Module Initialization

```typescript
// packages/core/src/mymodule.ts
import { getLogger } from "./genlogging"

const logger = getLogger("genaid:mymodule")

export class MyModule {
    constructor() {
        logger.info("MyModule initialized", "init")
    }

    async processData(data: any) {
        return await logger.timed(
            "processData",
            async () => {
                logger.debug("Processing started", "process", { size: data.length })
                // ... processing ...
                logger.success("Processing completed", "process")
                return result
            },
            "processing"
        )
    }
}
```

### 2. API Endpoints

```typescript
// packages/cli/src/api.ts
import { getLogger } from "../../core/src/genlogging"

const logger = getLogger("genaid:api")

export async function handleRequest(req: Request): Promise<Response> {
    const requestLogger = logger.child("request", [req.method])
    
    requestLogger.info("Request received", "http", {
        path: req.url,
        method: req.method,
    })

    try {
        const result = await requestLogger.timed(
            "processRequest",
            () => processRequest(req),
            "processing"
        )
        
        requestLogger.success("Request completed", "http", {
            status: 200,
            path: req.url,
        })
        
        return result
    } catch (error) {
        requestLogger.error(
            "Request failed",
            "http",
            { path: req.url },
            error
        )
        throw error
    }
}
```

### 3. Script Execution

```typescript
// packages/core/src/runtime.ts
import { getLogger } from "./genlogging"

const logger = getLogger("genaid:script")

export async function runScript(scriptId: string): Promise<void> {
    const scriptLogger = logger.child("execution", [scriptId])
    
    scriptLogger.info("Script starting", "lifecycle", { scriptId })

    try {
        await scriptLogger.timed(
            `run:${scriptId}`,
            async () => {
                scriptLogger.debug("Loading script", "loader", { scriptId })
                const script = await loadScript(scriptId)
                
                scriptLogger.debug("Executing script", "executor", { scriptId })
                const result = await executeScript(script)
                
                return result
            },
            "execution"
        )
        
        scriptLogger.success("Script completed", "lifecycle", { scriptId })
    } catch (error) {
        scriptLogger.critical(
            "Script failed",
            "lifecycle",
            { scriptId },
            error
        )
        throw error
    }
}
```

### 4. LLM Operations

```typescript
// packages/core/src/llm.ts
import { getLogger } from "./genlogging"

const logger = getLogger("genaid:llm")

export async function callLLM(
    model: string,
    prompt: string
): Promise<string> {
    const llmLogger = logger.child("call", [model])
    
    llmLogger.info("LLM call starting", "request", {
        model,
        promptLength: prompt.length,
    })

    try {
        const response = await llmLogger.timed(
            `llm:${model}`,
            async () => {
                llmLogger.trace("Sending prompt", "api", { prompt })
                const result = await api.call(model, prompt)
                llmLogger.trace("Received response", "api", { 
                    responseLength: result.length 
                })
                return result
            },
            "api"
        )
        
        llmLogger.success("LLM call completed", "response", {
            model,
            responseLength: response.length,
        })
        
        return response
    } catch (error) {
        llmLogger.error(
            "LLM call failed",
            "error",
            { model },
            error
        )
        throw error
    }
}
```

### 5. Debug Mode Integration

```typescript
// Automatically enable detailed logging when DEBUG is set
if (process.env.DEBUG) {
    const debugCategories = process.env.DEBUG.split(",").map(c => c.trim())
    
    configureLogging({
        minLevel: LogLevel.TRACE,
        enablePerformance: true,
        enableStackTraces: true,
        categories: debugCategories.includes("*") ? ["all"] : debugCategories,
        structured: process.env.LOG_FORMAT === "json",
    })
}
```

## Integration Points

### High Priority (Core Functionality)

1. ✅ **packages/core/src/genlogging.ts** - New comprehensive logging system
2. 🔲 **packages/core/src/index.ts** - Export genlogging
3. 🔲 **packages/cli/src/runtime.ts** - Script execution logging
4. 🔲 **packages/core/src/host.ts** - Host operations logging
5. 🔲 **packages/core/src/generation.ts** - LLM generation logging
6. 🔲 **packages/core/src/promptrunner.ts** - Prompt execution logging

### Medium Priority (Enhanced Features)

7. 🔲 **packages/cli/src/api.ts** - API endpoint logging
8. 🔲 **packages/core/src/parsers.ts** - Parser operation logging
9. 🔲 **packages/core/src/retrieval.ts** - Retrieval operation logging
10. 🔲 **packages/core/src/tools.ts** - Tool execution logging

### Lower Priority (Optional Enhancements)

11. 🔲 **packages/vscode/src/extension.ts** - VSCode extension logging
12. 🔲 **packages/web/src/api.ts** - Web API logging
13. 🔲 **packages/sample/genaid/*.genai.mjs** - Example scripts

## Environment Variables

```bash
# Enable genlogging with categories
DEBUG=genaid:api,genaid:llm,genaid:script genaid run myscript

# Enable all genaid logging
DEBUG=genaid:* genaid run myscript

# Enable structured JSON logging
LOG_FORMAT=json DEBUG=genaid:* genaid run myscript

# Set minimum log level
LOG_LEVEL=TRACE DEBUG=genaid:* genaid run myscript

# Enable performance monitoring
ENABLE_PERFORMANCE=true DEBUG=genaid:* genaid run myscript
```

## Best Practices

### 1. Use Appropriate Log Levels

- **TRACE**: Very detailed debugging (function entry/exit)
- **DEBUG**: Debugging information (variable values, flow control)
- **INFO**: General informational messages (startup, configuration)
- **SUCCESS**: Successful operations (completed tasks)
- **WARNING**: Unexpected but recoverable situations (cache miss, retry)
- **ERROR**: Error conditions that are handled (caught exceptions)
- **CRITICAL**: Fatal errors (unrecoverable failures)

### 2. Provide Rich Context

```typescript
// ❌ Poor
logger.info("Processing")

// ✅ Good
logger.info("Processing user request", "api", {
    userId: user.id,
    action: "create",
    resource: "document",
})
```

### 3. Use Child Loggers for Components

```typescript
const apiLogger = rootLogger.child("api")
const dbLogger = rootLogger.child("database")
const cacheLogger = rootLogger.child("cache")
```

### 4. Always Use timed() for Performance-Critical Operations

```typescript
const result = await logger.timed(
    "operationName",
    async () => await expensiveOperation(),
    "category",
    { context: "data" }
)
```

### 5. Log Errors with Full Context

```typescript
try {
    await operation()
} catch (error) {
    logger.error(
        "Operation failed",
        "operation",
        { 
            input: data,
            attemptNumber: retries,
        },
        error
    )
}
```

## Performance Considerations

- Logs are kept in memory (last 1000 entries per logger)
- Performance monitoring has minimal overhead (<1ms per timing)
- Structured logging is more expensive than simple logging
- Use appropriate log levels to reduce noise
- Consider disabling TRACE level in production

## Migration from Existing Logging

### From debug module

```typescript
// Before
import debug from "debug"
const dbg = debug("genaid:module")
dbg("message")

// After
import { getLogger } from "./genlogging"
const logger = getLogger("genaid:module")
logger.debug("message", "category")
```

### From console.log

```typescript
// Before
console.log("Processing", data)

// After
logger.info("Processing", "operation", { data })
```

### From packages/cli/src/log.ts

```typescript
// Before
import { info, warn, error } from "./log"
info("Message")

// After
import { getLogger } from "../../core/src/genlogging"
const logger = getLogger("genaid:cli")
logger.info("Message", "cli")
```

## Testing

```typescript
import { getLogger, LogLevel } from "./genlogging"

// In tests, capture logs
const logger = getLogger("test")

// Perform operations
logger.info("Test operation", "test")

// Assert on logs
const entries = logger.getEntries()
assert.equal(entries.length, 1)
assert.equal(entries[0].message, "Test operation")

// Check stats
const stats = logger.getStats()
assert.equal(stats.errors, 0)
```

## Troubleshooting

### Logs not appearing

1. Check DEBUG environment variable is set
2. Verify log level is appropriate
3. Check category filtering

### Performance impact

1. Reduce log level (INFO or WARNING in production)
2. Disable performance monitoring if not needed
3. Use category filtering to reduce overhead

### Memory usage

1. Logs are limited to 1000 entries per logger
2. Call `logger.clear()` periodically if needed
3. Use structured logging with external log aggregation

## Next Steps

1. ✅ Created comprehensive GenLogging system
2. 🔲 Export from packages/core/src/index.ts
3. 🔲 Integrate into key modules (runtime, host, generation)
4. 🔲 Add environment variable support
5. 🔲 Create examples in sample scripts
6. 🔲 Update documentation
7. 🔲 Add tests for genlogging
