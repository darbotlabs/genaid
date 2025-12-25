# Azure Foundry / MSAL / GitHub Copilot Configuration Guide

This guide explains how to configure GenAID to work with Azure Foundry (Azure AI Studio), GitHub Copilot CLI, and OpenWebUI.

## Table of Contents
1. [Azure Foundry Setup](#azure-foundry-setup)
2. [GitHub Copilot CLI Setup](#github-copilot-cli-setup)
3. [OpenWebUI Setup](#openwebui-setup)
4. [Authentication Methods](#authentication-methods)
5. [Usage Examples](#usage-examples)

---

## Azure Foundry Setup

### Prerequisites
- Azure subscription
- Azure OpenAI or Azure AI Studio resource
- Azure CLI installed (`az` command)

### 1. Install Azure CLI
```bash
# Ubuntu/Debian
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# macOS
brew install azure-cli

# Windows
# Download from: https://aka.ms/installazurecliwindows
```

### 2. Login to Azure
```bash
az login
```

### 3. Get Your Azure Configuration

#### Option A: Using Azure Portal
1. Go to https://portal.azure.com
2. Navigate to your Azure OpenAI resource
3. Click "Keys and Endpoint"
4. Copy:
   - Key 1 or Key 2 → `AZURE_OPENAI_API_KEY`
   - Endpoint → `AZURE_OPENAI_ENDPOINT`

#### Option B: Using Azure CLI
```bash
# List your OpenAI resources
az cognitiveservices account list --query "[?kind=='OpenAI'].{name:name,resourceGroup:resourceGroup,location:location}"

# Get endpoint and keys
az cognitiveservices account show \
  --name YOUR_RESOURCE_NAME \
  --resource-group YOUR_RESOURCE_GROUP \
  --query "properties.endpoint"

az cognitiveservices account keys list \
  --name YOUR_RESOURCE_NAME \
  --resource-group YOUR_RESOURCE_GROUP
```

### 4. Configure Environment Variables

Create a `.env` file:
```bash
cp .env.example .env
```

Edit `.env` with your values:
```bash
# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=your-key-here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_VERSION=2024-08-01-preview

# For automatic model discovery
AZURE_OPENAI_SUBSCRIPTION_ID=your-subscription-id
AZURE_OPENAI_RESOURCE_GROUP=your-resource-group

# Authentication method (use Azure CLI)
AZURE_CREDENTIALS_TYPE=cli
```

### 5. Azure AI Foundry (Serverless Endpoints)

If using Azure AI Studio serverless deployments:

```bash
# Azure AI Inference
AZURE_AI_INFERENCE_ENDPOINT=https://your-endpoint.inference.ai.azure.com
AZURE_AI_INFERENCE_API_KEY=your-inference-key

# Azure Serverless Models
AZURE_SERVERLESS_MODELS_ENDPOINT=https://your-endpoint.models.ai.azure.com
AZURE_SERVERLESS_MODELS_API_KEY=your-serverless-key
```

---

## GitHub Copilot CLI Setup

### 1. Install GitHub CLI
```bash
# Ubuntu/Debian
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh

# macOS
brew install gh

# Windows
winget install --id GitHub.cli
```

### 2. Authenticate with GitHub
```bash
gh auth login
```

### 3. Create GitHub Personal Access Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes:
   - `repo` (Full control of private repositories)
   - `read:user` (Read user profile data)
4. Copy the token

### 4. Configure GitHub in .env
```bash
GITHUB_TOKEN=ghp_your_token_here
GITHUB_MODELS_API_KEY=ghp_your_token_here
```

### 5. Using GitHub Copilot Models

GitHub Models are available through Azure's infrastructure:

```javascript
// In your GenAID script
script({ model: "github:gpt-4o" })
$`Your prompt here`
```

Available models:
- `github:gpt-4o`
- `github:gpt-4o-mini`
- `github:gpt-4-turbo`
- `github:claude-3-5-sonnet`
- `github:llama-3.1-405b`

---

## OpenWebUI Setup

### 1. Install OpenWebUI
```bash
# Using Docker
docker run -d \
  --name openwebui \
  -p 8080:8080 \
  -v open-webui:/app/backend/data \
  ghcr.io/open-webui/open-webui:main

# Or with Docker Compose
docker compose up -d openwebui
```

### 2. Configure OpenWebUI

1. Access OpenWebUI at http://localhost:8080
2. Create an account (first user becomes admin)
3. Go to Settings → Connections
4. Add your LLM providers (OpenAI, Azure, Ollama, etc.)

### 3. Get OpenWebUI API Key

1. In OpenWebUI, go to Settings → Account
2. Generate an API key
3. Copy the key

### 4. Configure in .env
```bash
OPENWEBUI_API_BASE=http://localhost:8080
OPENWEBUI_API_KEY=your-openwebui-api-key
```

### 5. Using OpenWebUI with GenAID

OpenWebUI uses OpenAI-compatible API, so use the `litellm` provider:

```javascript
script({ model: "litellm:gpt-4" })
```

---

## Authentication Methods

GenAID supports multiple Azure authentication methods via MSAL:

### 1. Azure CLI (Recommended for Local Development)
```bash
AZURE_CREDENTIALS_TYPE=cli
az login
```

### 2. Environment Variables (Service Principal)
```bash
AZURE_CREDENTIALS_TYPE=env
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
```

### 3. Azure PowerShell
```bash
AZURE_CREDENTIALS_TYPE=powershell
Connect-AzAccount
```

### 4. Azure Developer CLI
```bash
AZURE_CREDENTIALS_TYPE=devcli
azd auth login
```

### 5. Managed Identity (Azure VMs/Containers)
```bash
AZURE_CREDENTIALS_TYPE=managedidentity
```

### 6. Workload Identity (Kubernetes)
```bash
AZURE_CREDENTIALS_TYPE=workloadidentity
```

### 7. Default Credential Chain
```bash
AZURE_CREDENTIALS_TYPE=default
# Tries: env → cli → devcli → powershell → managed identity
```

---

## Usage Examples

### Example 1: Using Azure Foundry with CLI Auth
```javascript
// Configure in script
script({ 
    model: "azure:gpt-4o",
    credentialsType: "cli"
})

$`Analyze this code and suggest improvements.`
```

### Example 2: Using GitHub Copilot
```javascript
script({ model: "github:gpt-4o" })

def("CODE", await workspace.readText("app.js"))
$`Review this code for security issues: ${CODE}`
```

### Example 3: Using Multiple Providers
```javascript
// Use Azure for main task
script({ model: "azure:gpt-4o" })
const analysis = await runPrompt((_) => {
    _.def("DATA", data)
    _.$`Analyze this data: ${DATA}`
})

// Use GitHub Copilot for code generation
script({ model: "github:gpt-4o-mini" })
const code = await runPrompt((_) => {
    _.$`Generate Python code for: ${analysis}`
})
```

### Example 4: Using OpenWebUI
```javascript
// Point to OpenWebUI via LiteLLM provider
script({ 
    model: "litellm:gpt-4",
    base: process.env.OPENWEBUI_API_BASE
})

$`Your prompt here`
```

---

## Docker Deployment with Full Configuration

### 1. Deploy with Docker Compose
```bash
# Create .env file
cp .env.example .env
# Edit .env with your credentials

# Start services
docker compose up -d

# View logs
docker compose logs -f genaid
```

### 2. Access the Web Interface
- LAN: http://10.1.8.69:8003/
- Local: http://localhost:8003/

### 3. Using Azure CLI from Container
The container mounts `~/.azure` for Azure CLI authentication:

```bash
# Login on host machine
az login

# Container automatically uses your credentials
docker compose up -d
```

---

## Troubleshooting

### Azure Authentication Issues
```bash
# Check Azure CLI login status
az account show

# Refresh token
az account get-access-token --resource https://cognitiveservices.azure.com

# Test Azure OpenAI connection
curl -X POST "$AZURE_OPENAI_ENDPOINT/openai/deployments/YOUR_DEPLOYMENT/chat/completions?api-version=2024-08-01-preview" \
  -H "Content-Type: application/json" \
  -H "api-key: $AZURE_OPENAI_API_KEY" \
  -d '{"messages":[{"role":"user","content":"Hello"}],"max_tokens":50}'
```

### GitHub Token Issues
```bash
# Verify token
gh auth status

# Test GitHub Models API
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://models.inference.ai.azure.com/models
```

### Container Credential Mounting
```bash
# Ensure credentials are readable
ls -la ~/.azure
ls -la ~/.config/gh

# Check container mounts
docker exec genaid-app ls -la /root/.azure
docker exec genaid-app ls -la /root/.config/gh
```

---

## Environment Variable Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key | `abc123...` |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint | `https://my-resource.openai.azure.com` |
| `AZURE_CREDENTIALS_TYPE` | Auth method | `cli`, `env`, `default` |
| `GITHUB_TOKEN` | GitHub PAT | `ghp_abc123...` |
| `OPENWEBUI_API_BASE` | OpenWebUI URL | `http://localhost:8080` |
| `LITELLM_API_BASE` | LiteLLM proxy URL | `http://localhost:4000` |

---

## Next Steps

1. ✅ Configure your preferred authentication method
2. ✅ Set up environment variables in `.env`
3. ✅ Deploy with Docker Compose
4. ✅ Test connectivity with sample scripts
5. ✅ Explore the web interface at http://10.1.8.69:8003/

For more information, see:
- [GenAID Documentation](https://darbotlabs.github.io/genaid/)
- [Azure OpenAI Documentation](https://learn.microsoft.com/azure/ai-services/openai/)
- [GitHub Models Documentation](https://github.com/marketplace/models)
- [OpenWebUI Documentation](https://docs.openwebui.com/)
