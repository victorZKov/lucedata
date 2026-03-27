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

# If called with 'prod' or '--prod', build and start desktop app instead of dev servers
if [ "$1" = "prod" ] || [ "$1" = "--prod" ] || [ "$1" = "start" ] || [ "$1" = "--start" ]; then
    echo "🏗️  Building renderer..."
    pnpm -w --filter @sqlhelper/renderer build
    echo "🏗️  Building desktop..."
    pnpm -w --filter @sqlhelper/desktop build
    echo "🚀 Starting desktop (production)..."
    pnpm -w --filter @sqlhelper/desktop start
    exit $?
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

# Choose a dev port (prefer 5173, fallback 5174)
RENDERER_PORT=5173
if lsof -nP -iTCP:5173 -sTCP:LISTEN >/dev/null 2>&1; then
    echo "⚠️  Port 5173 is busy; using 5174 for Vite"
    RENDERER_PORT=5174
fi

export RENDERER_URL="http://localhost:${RENDERER_PORT}"
echo "🔗 Using RENDERER_URL=$RENDERER_URL"

# Start renderer dev server in the background on selected port
(PORT=$RENDERER_PORT pnpm --filter @sqlhelper/renderer dev) &

# Wait for Vite to be ready
pnpm --filter @sqlhelper/desktop wait-on "$RENDERER_URL" || true

# Start desktop app (dev)
NODE_ENV=development RENDERER_URL=$RENDERER_URL pnpm --filter @sqlhelper/desktop dev

# This line should not be reached due to the trap, but just in case
cleanup