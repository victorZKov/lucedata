#!/bin/bash

# Enhanced SQLHelper Development Script with automatic preload fixes

set -e  # Exit on any error

echo "🚀 Starting SQLHelper Development Environment..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the SQLHelper project root directory"
    exit 1
fi

# Function to fix preload file
fix_preload() {
    echo "🔧 Checking and fixing preload file..."
    cd apps/desktop
    if [ ! -f "fix-preload.sh" ]; then
        echo "⚠️  fix-preload.sh not found, skipping preload fix"
        cd ../..
        return
    fi
    ./fix-preload.sh
    cd ../..
}

# Function to monitor and auto-fix preload
monitor_preload() {
    while true; do
        sleep 5
        if [ -f "apps/desktop/dist/apps/desktop/src/preload.cjs" ]; then
            if ! grep -q "createSqlTab" apps/desktop/dist/apps/desktop/src/preload.cjs; then
                echo "🔄 Preload file missing createSqlTab, auto-fixing..."
                fix_preload
            fi
        fi
    done
}

# If called with 'prod' or '--prod', build and start desktop app instead of dev servers
if [ "$1" = "prod" ] || [ "$1" = "--prod" ] || [ "$1" = "start" ] || [ "$1" = "--start" ]; then
    echo "🏗️  Building renderer..."
    pnpm -w --filter @sqlhelper/renderer build
    echo "🏗️  Building desktop..."
    pnpm -w --filter @sqlhelper/desktop build
    fix_preload
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
    pkill -f "monitor_preload" 2>/dev/null || true
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

# Initial preload fix
fix_preload

echo ""
echo "🚀 Starting development server..."
echo "   - Renderer will be available at http://localhost:5173"
echo "   - Electron app will launch automatically"
echo "   - Auto-fixing preload file every 5 seconds"
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

# Start preload monitoring in the background
monitor_preload &
MONITOR_PID=$!

# Start renderer dev server in the background on selected port
(PORT=$RENDERER_PORT pnpm --filter @sqlhelper/renderer dev) &
RENDERER_PID=$!

# Wait for Vite to be ready
pnpm --filter @sqlhelper/desktop wait-on "$RENDERER_URL" || true

# Fix preload before starting desktop
fix_preload

# Start desktop app (dev)
NODE_ENV=development RENDERER_URL=$RENDERER_URL pnpm --filter @sqlhelper/desktop dev

# This line should not be reached due to the trap, but just in case
cleanup