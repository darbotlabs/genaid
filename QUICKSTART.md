# 🚀 GenAID Quick Start Guide

Complete setup guide for Azure Foundry, GitHub Copilot, and OpenWebUI integration.

## 📋 Prerequisites

- Docker and Docker Compose installed
- Azure subscription (for Azure Foundry)
- GitHub account (for GitHub Copilot)
- Azure CLI (optional, for MSAL auth)
- GitHub CLI (optional, for easier auth)

## ⚡ Quick Setup (5 minutes)

### 1. Configure Authentication

Choose your authentication method:

#### Option A: Automated Setup (Recommended)

```bash
# Setup Azure authentication (requires Azure CLI)
./scripts/setup-azure-auth.sh

# Setup GitHub authentication (requires GitHub CLI)
./scripts/setup-github-auth.sh
```

#### Option B: Manual Setup

```bash
# Copy environment template
cp .env.example .env

# Edit with your values
nano .env
```

### 2. Deploy with Docker Compose

```bash
# Start GenAID with all providers
docker compose up -d

# View logs
docker compose logs -f genaid

# Check status
docker compose ps
```

### 3. Access the Web Interface

Open your browser:
- **Local:** http://localhost:8003/
- **LAN:** http://<YOUR_LAN_IP>:8003/

## 🔐 Authentication Methods

### Azure Foundry (MSAL)

GenAID supports multiple Azure authentication methods:

| Method | Use Case | Setup |
|--------|----------|-------|
| `cli` | Local development (recommended) | `az login` |
| `env` | Service principal (CI/CD) | Set AZURE_CLIENT_ID, etc. |
| `managedidentity` | Azure VMs/Containers | Automatic |
| `default` | Try all methods | Fallback chain |

**Example .env:**
```bash
AZURE_CREDENTIALS_TYPE=cli
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-key-here
```

### GitHub Copilot / Models

Get your token:
```bash
# Using GitHub CLI
gh auth login
gh auth token

# Or create manually at https://github.com/settings/tokens
```

**Example .env:**
```bash
GITHUB_TOKEN=ghp_your_token_here
GITHUB_MODELS_API_KEY=ghp_your_token_here
```

### OpenWebUI

Start OpenWebUI:
```bash
docker run -d --name openwebui -p 8080:8080 ghcr.io/open-webui/open-webui:main
```

Configure in .env:
```bash
OPENWEBUI_API_BASE=http://host.docker.internal:8080
OPENWEBUI_API_KEY=your-openwebui-key
```

## 📝 Usage Examples

### Example 1: Azure Foundry with CLI Auth

```javascript
script({ 
    model: "azure:gpt-4o",
    credentialsType: "cli"
})

$`Analyze enterprise AI deployment strategies`
```

### Example 2: GitHub Copilot

```javascript
script({ model: "github:gpt-4o" })

def("CODE", await workspace.readText("app.py"))
$`Review this code for security issues: ${CODE}`
```

### Example 3: Multi-Provider Workflow

```javascript
// Complex analysis with Azure
script({ model: "azure:gpt-4o" })
const analysis = await runPrompt((_) => {
    _.$`Perform detailed analysis...`
})

// Code generation with GitHub
script({ model: "github:gpt-4o-mini" })
const code = await runPrompt((_) => {
    _.$`Generate code based on: ${analysis}`
})

// Quick summary with local model
script({ model: "ollama:phi3" })
$`Summarize in 3 points`
```

### Example 4: Using Model Aliases

Edit `genaid.config.json`:
```json
{
    "modelAliases": {
        "foundry": "azure:gpt-4o",
        "copilot": "github:gpt-4o",
        "fast": "github:gpt-4o-mini",
        "local": "ollama:phi3"
    }
}
```

Use in scripts:
```javascript
script({ model: "foundry" })  // Uses azure:gpt-4o
$`Your prompt here`
```

## 🔧 Configuration Files

### docker-compose.yml
Manages container deployment with:
- Environment variable mounting
- Credential volume mounts (Azure CLI, GitHub CLI)
- Network configuration
- Resource limits

### .env
Your secret configuration:
- API keys and tokens
- Endpoints and URLs
- Authentication settings
- Provider configurations

### genaid.config.json
Application configuration:
- Model aliases
- Provider settings
- Default encodings
- Feature flags

## 📂 Directory Structure

```
genaid/
├── docker-compose.yml          # Container orchestration
├── .env                        # Your secrets (create from .env.example)
├── .env.example               # Template with all options
├── genaid.config.json         # Application config
├── Dockerfile                 # Container build
├── workspace/                 # Your GenAID scripts
│   └── examples/              # Example scripts
├── scripts/                   # Setup utilities
│   ├── setup-azure-auth.sh   # Azure authentication
│   └── setup-github-auth.sh  # GitHub authentication
└── docs/                      # Documentation
    ├── AZURE_FOUNDRY_SETUP.md
    └── USAGE_GUIDE.md
```

## 🐛 Troubleshooting

### Azure Authentication Issues

```bash
# Check Azure login
az account show

# Refresh token
az login

# Test connection
az cognitiveservices account list
```

### GitHub Token Issues

```bash
# Check GitHub auth
gh auth status

# Re-login
gh auth login

# Verify token
gh auth token
```

### Container Issues

```bash
# View logs
docker compose logs -f genaid

# Restart container
docker compose restart genaid

# Rebuild
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Credential Mounting

Ensure credentials are accessible:
```bash
# Check Azure CLI config
ls -la ~/.azure

# Check GitHub CLI config
ls -la ~/.config/gh

# Verify container mounts
docker exec genaid-app ls -la /root/.azure
docker exec genaid-app ls -la /root/.config/gh
```

## 🎯 Common Tasks

### Update Configuration

```bash
# Edit .env
nano .env

# Restart to apply changes
docker compose restart genaid
```

### View Available Models

```bash
# From container
docker exec genaid-app node /app/packages/cli/built/genaid.cjs info models

# List Azure deployments
az cognitiveservices account deployment list \
  --name YOUR_RESOURCE \
  --resource-group YOUR_GROUP
```

### Run Scripts from CLI

```bash
# Run a script file
docker exec genaid-app node /app/packages/cli/built/genaid.cjs run workspace/examples/azure-foundry.genai.md

# Run with specific model
docker exec genaid-app node /app/packages/cli/built/genaid.cjs run my-script.md --model github:gpt-4o
```

### Backup Configuration

```bash
# Backup your secrets
cp .env .env.backup
cp genaid.config.json genaid.config.json.backup
```

## 🔗 Provider URLs

- **Azure Portal:** https://portal.azure.com
- **Azure OpenAI Studio:** https://oai.azure.com/
- **GitHub Tokens:** https://github.com/settings/tokens
- **GitHub Models:** https://github.com/marketplace/models
- **OpenWebUI:** https://openwebui.com/
- **GenAID Docs:** https://darbotlabs.github.io/genaid/

## 📊 Model Comparison

| Provider | Model | Use Case | Cost | Speed |
|----------|-------|----------|------|-------|
| Azure | gpt-4o | Complex analysis | $$$ | Fast |
| Azure | gpt-4o-mini | Quick tasks | $ | Very Fast |
| GitHub | gpt-4o | Development | Free* | Fast |
| GitHub | claude-3-5-sonnet | Reasoning | Free* | Medium |
| Ollama | phi3 | Local/Private | Free | Fast |

*Free tier has rate limits

## 🎓 Next Steps

1. ✅ Complete authentication setup
2. ✅ Test connection with sample scripts
3. ✅ Explore the web interface
4. ✅ Create your first custom script
5. ✅ Configure model aliases for your workflow
6. ✅ Set up multiple providers for different tasks

## 💡 Tips

- Use **Azure** for production workloads
- Use **GitHub** for development and testing
- Use **Ollama** for local/private data
- Use **model aliases** for easy switching
- Mount volumes for persistent workspace
- Use `.env` for secrets, config for settings
- Enable debug logging: `DEBUG=genaid:*`

## 📞 Support

- Documentation: `/docs/` or https://darbotlabs.github.io/genaid/
- Issues: Check container logs first
- Examples: See `workspace/examples/`
- Configuration: See `AZURE_FOUNDRY_SETUP.md`

---

**Happy prompting! 🚀**
