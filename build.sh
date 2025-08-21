#!/bin/bash

# zevals Build Script
# This script builds the entire zevals project

set -e  # Exit on any error

echo "🔨 Building zevals project..."

# Check if pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo "❌ Error: pnpm is not installed. Please run './install.sh' first."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "❌ Error: Dependencies not installed. Please run './install.sh' first."
    exit 1
fi

# Build the project
echo "🔧 Compiling TypeScript..."
pnpm build

echo "✅ Build completed successfully!"
echo ""
echo "Next steps:"
echo "  - Run './test.sh' to run tests"
echo "  - Check './packages/*/dist' for compiled output"