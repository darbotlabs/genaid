# GenAID Web UI Usage Guide

## Accessing the Application

**LAN Access:** http://<YOUR_LAN_IP>:8003/  
**Local Access:** http://localhost:8003/

## What is GenAID?

GenAID is a JavaScript/TypeScript framework for programmatically assembling prompts for Large Language Models (LLMs). The web interface allows you to:

1. **Run GenAID Scripts** - Execute pre-written or custom GenAID scripts
2. **Browse Available Scripts** - View system scripts and custom scripts in your workspace
3. **Configure LLM Providers** - Connect to OpenAI, Azure OpenAI, Anthropic, GitHub Copilot, etc.
4. **View Results** - See script execution results, file outputs, and traces

## Getting Started

### 1. First Time Setup

When you open the web interface, you'll need to:

1. Configure your LLM provider (API keys)
2. Select a default model
3. Choose a workspace directory (or use the container's workspace)

### 2. Running Your First Script

The web UI provides:

- **Script Browser**: Left sidebar showing available scripts
- **Editor**: Central area for viewing/editing script content
- **Console**: Bottom panel showing execution logs and results
- **Settings**: Top-right for configuration

### 3. Example Scripts Available

GenAID includes 79+ built-in system scripts such as:

- `system` - Base system prompts
- `system.agent_*` - Various AI agents (git, github, docs, etc.)
- `system.python` - Python code assistance
- `system.typescript` - TypeScript code assistance
- `system.summarize` - Document summarization
- `system.git` - Git operations
- `system.github` - GitHub integration

### 4. Command Line Alternative

You can also use GenAID via CLI inside the container:

```bash
docker exec -it genaid-app node /app/packages/cli/built/genaid.cjs --help
```

## Common Use Cases

### Data Extraction
```javascript
def("FILE", env.files, { endsWith: ".pdf" })
const schema = defSchema("DATA", { type: "array", items: { ... } })
$`Extract data from FILE using ${schema} schema.`
```

### Code Analysis
```javascript
def("CODE", await workspace.readText("app.js"))
$`Analyze the CODE and suggest improvements.`
```

### Document Summarization
```javascript
def("DOC", await workspace.readText("report.md"))
$`Summarize DOC in 3 bullet points.`
```

## Container Management

```bash
# View logs
docker logs genaid-app

# Restart container
docker restart genaid-app

# Stop container
docker stop genaid-app

# Start container
docker start genaid-app
```

## Troubleshooting

### Blank UI
- Check browser console (F12) for JavaScript errors
- Verify http://<YOUR_LAN_IP>:8003/built/web.mjs loads successfully
- Clear browser cache and reload

### Connection Issues
- Ensure container is running: `docker ps | grep genaid-app`
- Check container logs: `docker logs genaid-app`
- Verify port 8003 is accessible

### Performance Issues
- Container has 4GB RAM limit and 3GB heap size
- Monitor with: `docker stats genaid-app`

## Documentation

Full documentation: https://darbotlabs.github.io/genaid/

## Version

Current version: 1.135.0
