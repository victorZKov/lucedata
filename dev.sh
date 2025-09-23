#!/bin/bash

# SQLHelper Development Script
# This script builds and runs the application in development mode

set -e  # Exit on any error

echo "🚀 Starting SQLHelper Development Environment..."
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
    pkill -f "pnpm dev" 2>/dev/null || true
    pkill -f "electron" 2>/dev/null || true
    pkill -f "tsc --watch" 2>/dev/null || true
    echo "✅ Cleanup complete"
    exit 0
}

# Set up signal handlers for graceful shutdown
trap cleanup SIGINT SIGTERM

echo "📦 Installing dependencies..."
pnpm install

echo ""
echo "🔨 Building all packages..."
pnpm build

echo ""
echo "🚀 Starting development server..."
echo "   - Renderer will be available at http://localhost:5173"
echo "   - Electron app will launch automatically"
echo ""
echo "💡 Press Ctrl+C to stop the development server"
echo ""

# Start renderer dev server in the background
(pnpm --filter @sqlhelper/renderer dev) &

# Start desktop app
pnpm --filter @sqlhelper/desktop dev

# This line should not be reached due to the trap, but just in case
cleanup