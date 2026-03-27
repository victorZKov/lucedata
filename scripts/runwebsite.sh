#!/bin/bash

# LuceData Product Website Development Script
# This script runs the Next.js marketing website independently from the desktop app

set -e  # Exit on any error

echo "🌐 Starting LuceData Product Website..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the SQLHelper project root directory"
    exit 1
fi

# Check if website directory exists
if [ ! -d "website" ]; then
    echo "❌ Error: Website directory not found"
    exit 1
fi

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🧹 Cleaning up website processes..."
    pkill -f "next dev" 2>/dev/null || true
    echo "✅ Cleanup complete"
    exit 0
}

# Set up signal handlers for graceful shutdown
trap cleanup SIGINT SIGTERM

echo "📂 Navigating to website directory..."
cd website

echo ""
echo "📦 Installing website dependencies..."
pnpm install

echo ""
echo "🚀 Starting Next.js development server..."
echo "   - Website will be available at http://localhost:3000"
echo ""
echo "💡 Press Ctrl+C to stop the development server"
echo ""

# Start the Next.js dev server
pnpm dev

# This line should not be reached due to the trap, but just in case
cleanup
