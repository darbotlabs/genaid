#!/bin/bash
set -e

echo "📦 Installing dependencies in individual packages"
echo "================================================="

# Since yarn workspaces fail on CIFS, install in each package directly
packages=("packages/core" "packages/cli" "packages/vscode" "packages/web")

for pkg in "${packages[@]}"; do
    if [ -d "$pkg" ]; then
        echo "Installing in $pkg..."
        cd "$pkg"
        npm install --legacy-peer-deps --prefer-offline 2>&1 | tail -5
        cd - > /dev/null
        echo "✓ $pkg done"
    fi
done

echo "✅ All package dependencies installed"
