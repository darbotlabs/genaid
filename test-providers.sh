#!/bin/bash
# Test GenAID Provider Configuration
set -e

echo "🧪 GenAID Provider Configuration Test"
echo "======================================"
echo

# Test container is running
echo "1. Testing container status..."
if docker ps | grep -q genaid-app; then
    echo "   ✅ Container is running"
else
    echo "   ❌ Container is not running"
    exit 1
fi

# Test web interface
echo
echo "2. Testing web interface..."
if curl -s http://localhost:8003/ | grep -q "GenAID"; then
    echo "   ✅ Web interface accessible"
else
    echo "   ❌ Web interface not accessible"
fi

# Test configuration file
echo
echo "3. Testing configuration files..."
if [ -f docker-compose.yml ]; then
    echo "   ✅ docker-compose.yml exists"
else
    echo "   ❌ docker-compose.yml missing"
fi

if [ -f .env.example ]; then
    echo "   ✅ .env.example exists"
else
    echo "   ❌ .env.example missing"
fi

if [ -f genaid.config.json ]; then
    echo "   ✅ genaid.config.json exists"
else
    echo "   ❌ genaid.config.json missing"
fi

# Test documentation
echo
echo "4. Testing documentation..."
docs=(
    "AZURE_FOUNDRY_SETUP.md"
    "QUICKSTART.md"
    "USAGE_GUIDE.md"
    "DEPLOYMENT_SUMMARY.md"
)

for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        echo "   ✅ $doc exists"
    else
        echo "   ❌ $doc missing"
    fi
done

# Test scripts
echo
echo "5. Testing setup scripts..."
scripts=(
    "scripts/setup-azure-auth.sh"
    "scripts/setup-github-auth.sh"
)

for script in "${scripts[@]}"; do
    if [ -f "$script" ] && [ -x "$script" ]; then
        echo "   ✅ $script exists and is executable"
    elif [ -f "$script" ]; then
        echo "   ⚠️  $script exists but not executable"
    else
        echo "   ❌ $script missing"
    fi
done

# Test examples
echo
echo "6. Testing example scripts..."
examples=(
    "workspace/examples/azure-foundry.genai.md"
    "workspace/examples/github-copilot.genai.md"
    "workspace/examples/multi-provider.genai.md"
)

for example in "${examples[@]}"; do
    if [ -f "$example" ]; then
        echo "   ✅ $example exists"
    else
        echo "   ❌ $example missing"
    fi
done

# Check model aliases
echo
echo "7. Checking model aliases in config..."
if grep -q '"foundry"' genaid.config.json; then
    echo "   ✅ 'foundry' alias configured (Azure)"
fi
if grep -q '"copilot"' genaid.config.json; then
    echo "   ✅ 'copilot' alias configured (GitHub)"
fi
if grep -q '"openwebui"' genaid.config.json; then
    echo "   ✅ 'openwebui' alias configured (LiteLLM)"
fi
if grep -q '"local"' genaid.config.json; then
    echo "   ✅ 'local' alias configured (Ollama)"
fi

# Summary
echo
echo "======================================"
echo "✅ Configuration Test Complete!"
echo "======================================"
echo
echo "Container Status: $(docker inspect -f '{{.State.Status}}' genaid-app)"
echo "Access URLs:"
echo "  - Local: http://localhost:8003/"
echo "  - LAN:   http://<YOUR_LAN_IP>:8003/"
echo
echo "Next Steps:"
echo "  1. Configure authentication (run setup scripts)"
echo "  2. Create .env file from .env.example"
echo "  3. Deploy with: docker compose up -d"
echo "  4. Test providers with example scripts"
echo
