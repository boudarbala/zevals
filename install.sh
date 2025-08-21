#!/bin/bash

# zevals Installation Script
# This script installs all dependencies for the zevals project

set -e  # Exit on any error

echo "🚀 Installing zevals dependencies..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "📦 pnpm not found. Installing pnpm..."
    npm install -g pnpm
else
    echo "✅ pnpm is already installed"
fi

# Install dependencies
echo "📥 Installing project dependencies..."
pnpm install

# Approve build scripts if needed
echo "🔧 Configuring build scripts..."
if [ -f "pnpm-lock.yaml" ]; then
    echo "esbuild" | pnpm approve-builds || true
fi

echo "✅ Installation completed successfully!"
echo ""
echo "Next steps:"
echo "  - Run './build.sh' to build the project"
echo "  - Run './test.sh' to run tests"
echo "  - Run './run.sh' to install, build, and test in one go"