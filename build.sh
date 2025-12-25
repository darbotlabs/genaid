#!/bin/bash
# Build script for GenAID
# This script handles UNC path issues on Windows

set -e

echo "Starting GenAID production build..."
echo ""

# Step 1: Type checking
echo "Step 1/5: Running TypeScript type checking..."
yarn typecheck || {
    echo "Type checking failed. Trying alternative method..."
    cd packages/core && yarn typecheck && cd ../..
    cd packages/vscode && yarn typecheck && cd ../..
    cd packages/cli && yarn typecheck && cd ../..
    cd packages/web && yarn typecheck && cd ../..
}
echo "✓ Type checking complete"
echo ""

# Step 2: Compile
echo "Step 2/5: Compiling packages..."
yarn compile || {
    echo "Compile failed. Check errors above."
    exit 1
}
echo "✓ Compilation complete"
echo ""

# Step 3: Package VSCode extension
echo "Step 3/5: Packaging VSCode extension..."
yarn package || {
    echo "Packaging failed. Check errors above."
    exit 1
}
echo "✓ VSCode extension packaged"
echo ""

# Step 4: Validate CLI
echo "Step 4/5: Validating CLI build..."
if [ -f "packages/cli/built/genaid.cjs" ]; then
    node packages/cli/built/genaid.cjs --version
    echo "✓ CLI build validated"
else
    echo "✗ CLI build not found!"
    exit 1
fi
echo ""

# Step 5: Build documentation (optional)
read -p "Build documentation? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Step 5/5: Building documentation..."
    yarn build:docs
    echo "✓ Documentation built"
fi

echo ""
echo "=========================================="
echo "Build completed successfully!"
echo "=========================================="
echo ""
echo "Build outputs:"
echo "  - CLI: packages/cli/built/genaid.cjs"
echo "  - VSCode Extension: packages/vscode/genaid.vsix"
if [ -d "docs/dist" ]; then
    echo "  - Documentation: docs/dist/"
fi
echo ""

