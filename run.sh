#!/bin/bash

# zevals Run Script
# This script installs, builds, and tests the zevals project in one go

set -e  # Exit on any error

echo "🚀 Running complete zevals setup and test pipeline..."
echo ""

# Step 1: Install dependencies
echo "=== STEP 1: Installing Dependencies ==="
./install.sh
echo ""

# Step 2: Build project
echo "=== STEP 2: Building Project ==="
./build.sh
echo ""

# Step 3: Run tests
echo "=== STEP 3: Running Tests ==="
./test.sh
echo ""

echo "🎉 All done! zevals is ready to use."
echo ""
echo "📚 To learn more about zevals:"
echo "  - Check out the README.md file"
echo "  - Look at examples in packages/test/src/examples/"
echo "  - Visit the repository: https://github.com/boudarbala/zevals"