#!/bin/bash
set -e

echo "📦 Preparing node_modules for packaging..."

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKSPACE_ROOT="$(cd "$DESKTOP_DIR/../.." && pwd)"

echo "🗑️  Removing existing node_modules.packaged..."
rm -rf "$DESKTOP_DIR/node_modules.packaged"
mkdir -p "$DESKTOP_DIR/node_modules.packaged"

echo "📥 Installing production dependencies with npm (no symlinks)..."
cd "$DESKTOP_DIR/node_modules.packaged"

# Create a minimal package.json with ALL production dependencies
# Including desktop app deps AND all workspace package dependencies
cat > package.json << 'EOF'
{
  "name": "packaged-deps",
  "version": "1.0.0",
  "dependencies": {
    "electron-store": "^10.1.0",
    "electron-updater": "^6.6.2",
    "keytar": "^7.9.0",
    "pg": "^8.16.3",
    "openai": "^4.75.1",
    "@anthropic-ai/sdk": "^0.31.0",
    "@azure/openai": "^2.0.0",
    "zod": "^3.24.1",
    "better-sqlite3": "^12.4.1",
    "mssql": "^11.0.1",
    "mysql2": "^3.15.0",
    "drizzle-orm": "^0.44.5",
    "drizzle-kit": "^0.31.4"
  }
}
EOF

# Install using npm which doesn't use symlinks
npm install --production --no-package-lock --no-audit --no-fund 2>&1 | grep -v "^npm WARN"

# Remove native addon binaries - let electron-builder rebuild them for each architecture
echo "🗑️  Removing native addon binaries (will be rebuilt per architecture)..."
find node_modules/better-sqlite3/build -name "*.node" -delete 2>/dev/null || true
find node_modules/keytar/build -name "*.node" -delete 2>/dev/null || true

# Move node_modules up one level and remove temp files
mv node_modules ../node_modules.packaged.tmp
cd "$DESKTOP_DIR"
rm -rf node_modules.packaged
mv node_modules.packaged.tmp node_modules.packaged

echo "✅ node_modules.packaged created successfully"
echo "📊 Size: $(du -sh "$DESKTOP_DIR/node_modules.packaged" | cut -f1)"
