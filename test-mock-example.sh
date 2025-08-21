#!/bin/bash

# zevals Mock Example Test Script
# This script runs the mock example that doesn't require API keys

set -e  # Exit on any error

echo "🧪 Running zevals mock example (no API keys required)..."

# Check if pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo "❌ Error: pnpm is not installed. Please run './install.sh' first."
    exit 1
fi

# Check if project is built
if [ ! -d "packages/core/dist" ]; then
    echo "❌ Error: Project not built. Please run './build.sh' first."
    exit 1
fi

# Run just the mock example test
echo "🔧 Running mock example test..."
pnpm vitest run packages/test/src/examples/mock-example.spec.ts

echo "✅ Mock example test completed successfully!"
echo ""
echo "This test demonstrates zevals functionality without requiring external API keys."
echo "It shows how to create custom agents and evaluation criteria using mocks."