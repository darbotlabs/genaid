#!/bin/bash
# Setup GitHub Copilot/Models Authentication for GenAID
set -e

echo "🐙 GenAID GitHub Authentication Setup"
echo "====================================="
echo

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI not found${NC}"
    echo "Installing GitHub CLI..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
        sudo apt update
        sudo apt install gh -y
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install gh
    else
        echo -e "${RED}Please install GitHub CLI manually: https://cli.github.com/manual/installation${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ GitHub CLI found${NC}"
fi

# Check if logged in
echo
echo "Checking GitHub login status..."
if gh auth status &> /dev/null; then
    echo -e "${GREEN}✅ Already logged in to GitHub${NC}"
    gh auth status
else
    echo -e "${YELLOW}⚠️  Not logged in to GitHub${NC}"
    echo "Opening GitHub login..."
    gh auth login
fi

# Get token
echo
echo "Getting GitHub token..."
GITHUB_TOKEN=$(gh auth token)

if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${RED}❌ Failed to get GitHub token${NC}"
    echo "Please run: gh auth login"
    exit 1
fi

echo -e "${GREEN}✅ GitHub token retrieved${NC}"

# Update .env file
echo
echo "Updating .env file..."

if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
fi

# Update environment variables
sed -i.bak "s|GITHUB_TOKEN=.*|GITHUB_TOKEN=$GITHUB_TOKEN|g" .env
sed -i.bak "s|GITHUB_MODELS_API_KEY=.*|GITHUB_MODELS_API_KEY=$GITHUB_TOKEN|g" .env

rm -f .env.bak

echo -e "${GREEN}✅ .env file updated${NC}"

# Test GitHub Models API
echo
echo "Testing GitHub Models API..."
MODELS_RESPONSE=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
    https://models.inference.ai.azure.com/models 2>&1)

if echo "$MODELS_RESPONSE" | jq -e '.data' &> /dev/null; then
    echo -e "${GREEN}✅ GitHub Models API connection successful!${NC}"
    echo
    echo "Available models:"
    echo "$MODELS_RESPONSE" | jq -r '.data[].id' | head -10
else
    echo -e "${YELLOW}⚠️  Could not list models (may require GitHub Copilot subscription)${NC}"
fi

# Summary
echo
echo "====================================="
echo "✅ Setup Complete!"
echo "====================================="
echo
echo "Configuration saved to .env"
echo
echo "Available GitHub models in GenAID:"
echo "  - github:gpt-4o"
echo "  - github:gpt-4o-mini"
echo "  - github:gpt-4-turbo"
echo "  - github:claude-3-5-sonnet"
echo "  - github:llama-3.1-405b"
echo
echo "Example usage in GenAID:"
echo '  script({ model: "github:gpt-4o" })'
echo '  $`Your prompt here`'
echo
echo "Next steps:"
echo "  1. Review .env file"
echo "  2. Run: docker compose up -d"
echo "  3. Access GenAID at: http://localhost:8003"
echo
