#!/bin/bash
set -e

echo "🍎 Building macOS installer for LuceData..."
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

# Build macOS installer
echo ""
echo "🍎 Building macOS installer..."
cd apps/desktop
pnpm electron-builder --mac
cd ../..

echo ""
echo "✅ Build complete! Installers are in release/ directory"
echo ""
echo "📁 Generated files:"
ls -lh release/*.dmg 2>/dev/null || echo "No .dmg files found"
ls -lh release/*.zip 2>/dev/null || echo "No .zip files found"

echo ""
echo "📦 Unpacked build for testing:"
ls -d release/mac/*.app 2>/dev/null && echo "✅ Unpacked build available" || echo "❌ No unpacked build found"

echo ""
echo "🎉 Done! You can now test the installer."
