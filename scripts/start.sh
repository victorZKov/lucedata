#!/bin/bash

# SQLHelper Production Build and Run Script
# This script builds and runs the application in production mode

set -e  # Exit on any error

echo "🏗️  Starting SQLHelper Production Build..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the SQLHelper project root directory"
    exit 1
fi

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🧹 Cleaning up processes..."
    pkill -f "electron dist/main.js" 2>/dev/null || true
    echo "✅ Cleanup complete"
    exit 0
}

# Set up signal handlers for graceful shutdown
trap cleanup SIGINT SIGTERM

echo "📦 Installing dependencies..."
pnpm install

echo ""
echo "🔨 Building all packages for production..."
pnpm build

echo ""
echo "🚀 Starting production application..."
echo ""
echo "💡 Press Ctrl+C to stop the application"
echo ""

# Start production mode
cd apps/desktop
pnpm start

# This line should not be reached due to the trap, but just in case
cleanup