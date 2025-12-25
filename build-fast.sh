#!/bin/bash
set -e

echo "🚀 Fast Build Script for CIFS/Network Filesystems"
echo "=================================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run commands with timing
run_timed() {
    local desc="$1"
    shift
    echo -e "${YELLOW}⏱️  $desc...${NC}"
    local start=$(date +%s)
    if "$@"; then
        local end=$(date +%s)
        echo -e "${GREEN}✓ $desc completed in $((end-start))s${NC}"
        return 0
    else
        local end=$(date +%s)
        echo -e "${YELLOW}⚠ $desc failed/skipped in $((end-start))s${NC}"
        return 1
    fi
}

# Check if dependencies exist
if [ ! -d "packages/core/node_modules" ] || [ ! -d "packages/cli/node_modules" ]; then
    echo "❌ Dependencies not found. Please run dependency installation first."
    echo "   Note: This workspace has existing dependencies in package subdirectories."
    exit 1
fi

# 1. Bundle core prompts
run_timed "Bundling core prompts" bash -c "cd packages/core && node bundleprompts.js"

# 2. Compile VSCode extension
run_timed "Compiling VSCode extension" bash -c "cd packages/vscode && npm run compile 2>&1 | tail -20" || echo "VSCode compilation had issues but continuing..."

# 3. Compile Web package (skip if broken)
run_timed "Compiling Web package" bash -c "cd packages/web && npm run compile 2>&1 | tail -20" || echo "Web compilation skipped due to missing dependencies"

# 4. Compile CLI (most important)
run_timed "Compiling CLI" bash -c "cd packages/cli && npm run compile 2>&1 | tail -30"

# 5. Verify build
if [ -f "packages/cli/built/genaid.cjs" ]; then
    echo -e "${GREEN}✅ Build successful!${NC}"
    echo ""
    echo "Built artifacts:"
    echo "  - packages/cli/built/genaid.cjs"
    ls -lh packages/vscode/out/*.js 2>/dev/null | head -3 || echo "    (VSCode extension not built)"
    ls -lh packages/web/built/*.js 2>/dev/null | head -3 || echo "    (Web package not built)"
    echo ""
    echo "Testing CLI:"
    node packages/cli/built/genaid.cjs --version || echo "CLI test failed"
else
    echo -e "❌ Build failed - CLI not found"
    exit 1
fi
