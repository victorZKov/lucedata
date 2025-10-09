#!/bin/bash
set -e

echo "🔨 Building Windows installer for LuceData..."
echo ""

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf release/

# Validate build configuration
echo ""
echo "🔍 Validating build configuration..."
node scripts/validate-build.mjs
if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Build validation failed. Please fix the errors above."
  exit 1
fi

# Install all dependencies
echo ""
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# Build renderer
echo ""
echo "🎨 Building renderer..."
pnpm --filter @sqlhelper/renderer build

# Build desktop (TypeScript compilation)
echo ""
echo "⚡ Building desktop (TypeScript)..."
pnpm --filter @sqlhelper/desktop build

# Build Windows installer
echo ""
echo "🪟 Building Windows installer..."
cd apps/desktop
pnpm electron-builder --win
cd ../..

echo ""
echo "✅ Build complete! Installer is in release/ directory"
echo ""
echo "📁 Generated files:"
ls -lh release/*.exe 2>/dev/null || echo "No .exe files found"
ls -lh release/*.blockmap 2>/dev/null || echo "No .blockmap files found"

echo ""
echo "📦 Unpacked build for testing:"
ls -d release/win-unpacked 2>/dev/null && echo "✅ Unpacked build available at release/win-unpacked/" || echo "❌ No unpacked build found"

echo ""
echo "🎉 Done! You can now test the installer."
