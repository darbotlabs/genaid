# GenAID Enhanced API Guide

## Overview

The GenAID Enhanced API provides powerful endpoints for:
- **Script Execution**: Run GenAID scripts programmatically
- **Streaming**: Real-time updates during execution
- **Webhooks**: Async notifications when jobs complete
- **Batch Processing**: Execute multiple scripts efficiently
- **Agent Swarms**: Orchestrate multiple agents
- **Visualizations**: Generate diagrams and workflows
- **Jupyter Integration**: Convert and execute notebooks
- **Adaptive Cards**: Create rich interactive cards
- **Wiki Generation**: Generate Jekyll documentation

## Authentication

All API requests require authentication via API key in the header:

```bash
curl -H "X-API-Key: gk_your_api_key_here" \
  http://localhost:8003/api/run
```

### Generate API Key

```typescript
import { APIAuth } from "genaid/api-enhanced"

const auth = new APIAuth()
const apiKey = auth.generateKey("my-app", ["read", "write"])
console.log(`Your API key: ${apiKey}`)
```

## Rate Limiting

API requests are rate-limited to prevent abuse:
- **Default**: 100 requests per minute per API key
- **Headers**: Response includes rate limit info

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

## Endpoints

### 1. Script Execution

Execute a GenAID script synchronously.

```typescript
import { run } from "genaid/api"

const result = await run("my-script", ["file1.txt", "file2.txt"], {
    envVars: {
        MODEL: "github:gpt-4o",
        TEMPERATURE: "0.7"
    }
})

console.log(result.text)
```

**HTTP Request:**
```bash
curl -X POST http://localhost:8003/api/run \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_key" \
  -d '{
    "scriptId": "my-script",
    "files": ["file1.txt"],
    "envVars": {
      "MODEL": "github:gpt-4o"
    }
  }'
```

### 2. Streaming

Stream real-time updates during script execution.

```typescript
import { runStream } from "genaid/api-enhanced"

for await (const chunk of runStream("analysis-script", ["data.csv"])) {
    if (chunk.type === "chunk") {
        console.log(chunk.data)
    } else if (chunk.type === "end") {
        console.log("Complete!", chunk.metadata)
    }
}
```

**Server-Sent Events:**
```bash
curl -N -H "X-API-Key: your_key" \
  http://localhost:8003/api/stream \
  -d '{"scriptId": "analysis-script"}'
```

### 3. Webhooks

Execute script asynchronously with webhook notification.

```typescript
import { runWithWebhook } from "genaid/api-enhanced"

const { jobId } = await runWithWebhook(
    "long-running-script",
    {
        url: "https://myapp.com/webhook",
        headers: {
            "Authorization": "Bearer token"
        },
        retryAttempts: 3
    },
    ["large-file.pdf"]
)

console.log(`Job ID: ${jobId}`)
```

**Webhook Payload:**
```json
{
  "jobId": "job_1234567890_abc",
  "status": "completed",
  "result": {
    "ok": true,
    "text": "Analysis complete...",
    "stats": {}
  },
  "timestamp": 1640000000000
}
```

### 4. Batch Processing

Execute multiple scripts in parallel or sequential mode.

```typescript
import { runBatch } from "genaid/api-enhanced"

const results = await runBatch(
    [
        { scriptId: "script1", files: ["file1.txt"] },
        { scriptId: "script2", files: ["file2.txt"] },
        { scriptId: "script3", files: ["file3.txt"] }
    ],
    {
        parallel: true,
        maxConcurrent: 2,
        onProgress: (completed, total) => {
            console.log(`Progress: ${completed}/${total}`)
        }
    }
)

results.forEach(({ scriptId, result, error }) => {
    if (error) {
        console.error(`${scriptId} failed:`, error)
    } else {
        console.log(`${scriptId} succeeded:`, result.text)
    }
})
```

### 5. Job Management

Track and manage async jobs.

```typescript
import { JobManager } from "genaid/api-enhanced"

const manager = new JobManager()

// Create job
const jobId = manager.createJob("my-script")

// Check status
const status = manager.getJob(jobId)
console.log(status)

// Wait for completion
const result = await manager.waitForCompletion(jobId, {
    timeout: 300000,  // 5 minutes
    pollInterval: 1000  // 1 second
})
```

### 6. Agent Swarm

Orchestrate multiple agents to solve complex tasks.

```bash
curl -X POST http://localhost:8003/api/agents/swarm \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_key" \
  -d '{
    "task": "Analyze repository and create documentation",
    "agents": ["git", "fs", "docs"],
    "strategy": "adaptive"
  }'
```

**Response:**
```json
{
  "ok": true,
  "taskBreakdown": [
    "Analyze git history",
    "Read source files",
    "Generate documentation"
  ],
  "agentAssignments": {
    "git": ["Analyze git history"],
    "fs": ["Read source files"],
    "docs": ["Generate documentation"]
  },
  "results": {
    "git": "...",
    "fs": "...",
    "docs": "..."
  }
}
```

### 7. Workflow Visualization

Generate Mermaid diagrams for workflows.

```bash
curl -X POST http://localhost:8003/api/visualize/workflow \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_key" \
  -d '{
    "name": "CI/CD Pipeline",
    "nodes": [
      {"id": "start", "label": "Commit", "type": "start"},
      {"id": "build", "label": "Build", "type": "process"},
      {"id": "test", "label": "Test", "type": "process"}
    ],
    "edges": [
      {"from": "start", "to": "build"},
      {"from": "build", "to": "test"}
    ]
  }'
```

### 8. Jupyter Conversion

Convert between GenAID scripts and Jupyter notebooks.

```bash
curl -X POST http://localhost:8003/api/jupyter/convert \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_key" \
  -d '{
    "content": "# Analysis\n```python\nprint(\"hello\")\n```",
    "format": "to-notebook",
    "language": "python"
  }'
```

### 9. Adaptive Cards

Create Microsoft Adaptive Cards from data.

```bash
curl -X POST http://localhost:8003/api/cards/create \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_key" \
  -d '{
    "data": {
      "Name": "John Doe",
      "Status": "Active",
      "Score": "95%"
    },
    "title": "User Report",
    "subtitle": "Monthly Summary"
  }'
```

### 10. Jekyll Wiki Generation

Generate Jekyll documentation sites.

```bash
curl -X POST http://localhost:8003/api/wiki/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_key" \
  -d '{
    "title": "My Project Docs",
    "description": "Comprehensive documentation",
    "pages": [
      {
        "title": "Getting Started",
        "content": "# Installation\n...",
        "categories": ["Guides"]
      }
    ]
  }'
```

## Error Handling

All endpoints return standard error responses:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Script not found",
    "details": {}
  }
}
```

**Common Error Codes:**
- `INVALID_REQUEST`: Bad request parameters
- `UNAUTHORIZED`: Invalid or missing API key
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `SCRIPT_NOT_FOUND`: Script ID doesn't exist
- `EXECUTION_FAILED`: Script execution error

## Best Practices

### 1. Use Streaming for Long Operations

```typescript
// Good: Get progressive updates
for await (const chunk of runStream("long-script")) {
    updateUI(chunk.data)
}

// Less ideal: Wait for entire operation
const result = await run("long-script")
```

### 2. Use Webhooks for Background Jobs

```typescript
// Good: Non-blocking execution
const { jobId } = await runWithWebhook("heavy-script", webhook)
return { jobId, status: "processing" }

// Less ideal: Blocking execution
const result = await run("heavy-script")
```

### 3. Batch Related Operations

```typescript
// Good: Efficient batch processing
await runBatch(jobs, { parallel: true, maxConcurrent: 5 })

// Less ideal: Sequential individual calls
for (const job of jobs) {
    await run(job.scriptId, job.files)
}
```

### 4. Implement Retry Logic

```typescript
async function runWithRetry(scriptId, files, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await run(scriptId, files)
        } catch (error) {
            if (i === maxRetries - 1) throw error
            await sleep(1000 * (i + 1))
        }
    }
}
```

### 5. Handle Rate Limits

```typescript
import { RateLimiter } from "genaid/api-enhanced"

const limiter = new RateLimiter(100, 60000)

async function makeRequest(apiKey) {
    const { allowed, remaining, resetAt } = limiter.checkLimit(apiKey)
    
    if (!allowed) {
        const waitTime = resetAt - Date.now()
        await sleep(waitTime)
        return makeRequest(apiKey)
    }
    
    // Make the request
    return await run("script")
}
```

## SDK Examples

### TypeScript/JavaScript

```typescript
import { 
    run, 
    runStream, 
    runBatch,
    runWithWebhook 
} from "genaid/api"

// Simple execution
const result = await run("analyze", ["data.csv"])

// Streaming
for await (const chunk of runStream("process", files)) {
    console.log(chunk)
}

// Batch processing
const results = await runBatch(jobs, { parallel: true })

// Async with webhook
await runWithWebhook("heavy-task", webhook, files)
```

### Python

```python
import requests

API_URL = "http://localhost:8003/api"
API_KEY = "your_api_key"

def run_script(script_id, files=[]):
    response = requests.post(
        f"{API_URL}/run",
        json={"scriptId": script_id, "files": files},
        headers={"X-API-Key": API_KEY}
    )
    return response.json()

result = run_script("analyze", ["data.csv"])
print(result)
```

### curl

```bash
#!/bin/bash

API_KEY="your_api_key"
API_URL="http://localhost:8003/api"

curl -X POST "$API_URL/run" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "scriptId": "analyze",
    "files": ["data.csv"]
  }'
```

## OpenAPI Specification

The complete API specification is available in OpenAPI 3.0 format:
- Location: `docs/openapi.yaml`
- Swagger UI: http://localhost:8003/api/docs
- ReDoc: http://localhost:8003/api/redoc

Import into tools like Postman, Insomnia, or generate SDKs.

## Support

- Documentation: https://darbotlabs.github.io/genaid/
- Issues: https://github.com/darbotlabs/genaid/issues
- Examples: `examples/` directory
