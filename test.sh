#!/bin/bash

# zevals Test Script
# This script runs tests for the zevals project

set -e  # Exit on any error

echo "🧪 Running zevals tests..."

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

# Run tests
echo "🔧 Running test suite..."

# Check if OpenAI API key is available for full tests
if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  Note: OPENAI_API_KEY not set. Some tests will be skipped."
    echo "   Set OPENAI_API_KEY environment variable to run all tests."
    echo ""
fi

# Run the tests
pnpm test

echo "✅ Tests completed!"