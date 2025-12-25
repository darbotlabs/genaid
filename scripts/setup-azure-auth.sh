#!/bin/bash
# Setup Azure Authentication for GenAID
set -e

echo "🔐 GenAID Azure Authentication Setup"
echo "====================================="
echo

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI not found${NC}"
    echo "Installing Azure CLI..."
    curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
else
    echo -e "${GREEN}✅ Azure CLI found${NC}"
fi

# Check if logged in
echo
echo "Checking Azure login status..."
if az account show &> /dev/null; then
    echo -e "${GREEN}✅ Already logged in to Azure${NC}"
    az account show --query "{Name:name, SubscriptionId:id, TenantId:tenantId}" -o table
else
    echo -e "${YELLOW}⚠️  Not logged in to Azure${NC}"
    echo "Opening Azure login..."
    az login
fi

# Get subscription info
echo
echo "Getting Azure subscription info..."
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)

echo -e "${GREEN}Subscription ID: ${SUBSCRIPTION_ID}${NC}"
echo -e "${GREEN}Tenant ID: ${TENANT_ID}${NC}"

# List Azure OpenAI resources
echo
echo "Looking for Azure OpenAI resources..."
RESOURCES=$(az cognitiveservices account list --query "[?kind=='OpenAI'].{Name:name, ResourceGroup:resourceGroup, Location:location, Endpoint:properties.endpoint}" -o json)

if [ "$RESOURCES" == "[]" ]; then
    echo -e "${YELLOW}⚠️  No Azure OpenAI resources found${NC}"
    echo "Create one at: https://portal.azure.com/#create/Microsoft.CognitiveServicesOpenAI"
else
    echo -e "${GREEN}✅ Found Azure OpenAI resources:${NC}"
    echo "$RESOURCES" | jq -r '.[] | "  - \(.Name) (\(.Location)) in \(.ResourceGroup)"'
    
    # Prompt for resource selection
    echo
    RESOURCE_COUNT=$(echo "$RESOURCES" | jq 'length')
    if [ "$RESOURCE_COUNT" -eq 1 ]; then
        RESOURCE_NAME=$(echo "$RESOURCES" | jq -r '.[0].Name')
        RESOURCE_GROUP=$(echo "$RESOURCES" | jq -r '.[0].ResourceGroup')
        ENDPOINT=$(echo "$RESOURCES" | jq -r '.[0].Endpoint')
        echo "Using resource: $RESOURCE_NAME"
    else
        echo "Select a resource (enter name):"
        read -r RESOURCE_NAME
        RESOURCE_GROUP=$(echo "$RESOURCES" | jq -r ".[] | select(.Name==\"$RESOURCE_NAME\") | .ResourceGroup")
        ENDPOINT=$(echo "$RESOURCES" | jq -r ".[] | select(.Name==\"$RESOURCE_NAME\") | .Endpoint")
    fi
    
    # Get API key
    echo
    echo "Getting API key for $RESOURCE_NAME..."
    API_KEY=$(az cognitiveservices account keys list \
        --name "$RESOURCE_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query key1 -o tsv)
    
    # Update .env file
    echo
    echo "Updating .env file..."
    
    if [ ! -f .env ]; then
        echo "Creating .env from .env.example..."
        cp .env.example .env
    fi
    
    # Update environment variables
    sed -i.bak "s|AZURE_OPENAI_API_KEY=.*|AZURE_OPENAI_API_KEY=$API_KEY|g" .env
    sed -i.bak "s|AZURE_OPENAI_ENDPOINT=.*|AZURE_OPENAI_ENDPOINT=$ENDPOINT|g" .env
    sed -i.bak "s|AZURE_OPENAI_SUBSCRIPTION_ID=.*|AZURE_OPENAI_SUBSCRIPTION_ID=$SUBSCRIPTION_ID|g" .env
    sed -i.bak "s|AZURE_OPENAI_RESOURCE_GROUP=.*|AZURE_OPENAI_RESOURCE_GROUP=$RESOURCE_GROUP|g" .env
    sed -i.bak "s|AZURE_CREDENTIALS_TYPE=.*|AZURE_CREDENTIALS_TYPE=cli|g" .env
    
    rm -f .env.bak
    
    echo -e "${GREEN}✅ .env file updated${NC}"
    
    # List deployments
    echo
    echo "Available model deployments:"
    az cognitiveservices account deployment list \
        --name "$RESOURCE_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query "[].{Name:name, Model:properties.model.name, Version:properties.model.version}" \
        -o table
fi

# Test connection
echo
echo "Testing Azure OpenAI connection..."
if [ -n "$API_KEY" ] && [ -n "$ENDPOINT" ]; then
    DEPLOYMENT=$(az cognitiveservices account deployment list \
        --name "$RESOURCE_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query "[0].name" -o tsv)
    
    if [ -n "$DEPLOYMENT" ]; then
        echo "Testing with deployment: $DEPLOYMENT"
        curl -s -X POST "$ENDPOINT/openai/deployments/$DEPLOYMENT/chat/completions?api-version=2024-08-01-preview" \
            -H "Content-Type: application/json" \
            -H "api-key: $API_KEY" \
            -d '{"messages":[{"role":"user","content":"Say hello"}],"max_tokens":10}' \
            | jq -r '.choices[0].message.content' && echo
        
        echo -e "${GREEN}✅ Azure OpenAI connection successful!${NC}"
    fi
fi

# Summary
echo
echo "====================================="
echo "✅ Setup Complete!"
echo "====================================="
echo
echo "Configuration saved to .env:"
echo "  - AZURE_OPENAI_ENDPOINT: $ENDPOINT"
echo "  - AZURE_OPENAI_SUBSCRIPTION_ID: $SUBSCRIPTION_ID"
echo "  - AZURE_OPENAI_RESOURCE_GROUP: $RESOURCE_GROUP"
echo "  - AZURE_CREDENTIALS_TYPE: cli"
echo
echo "Next steps:"
echo "  1. Review .env file and adjust as needed"
echo "  2. Run: docker compose up -d"
echo "  3. Access GenAID at: http://localhost:8003"
echo
