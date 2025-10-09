# Bug Fix Task: Windows Installation Package - electron-updater Error

**Priority**: P0 (CRITICAL)  
**Category**: Build/Deployment  
**Estimated Time**: 2-3 hours  
**Complexity**: Medium-High

---

## Issue Description

**Error Message:**

```
Uncaught Exception:
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'electron-updater' imported from
C:\apps\LuceData\resources\app\dist\apps\desktop\src\main.js

Did you mean to import
"file:///C:/apps/LuceData/resources/app/node_modules/electron-updater"?
```

**Problem:**

- Windows installer builds successfully
- Application launches but crashes immediately
- electron-updater module not found in packaged app
- Module exists in node_modules but not bundled correctly

---

## Files to Review/Modify

### Primary Files:

- `apps/desktop/electron-builder.json` - Electron builder configuration
- `apps/desktop/package.json` - Desktop app dependencies
- `package.json` - Root package.json
- `apps/desktop/src/main.ts` - Main process entry point (TypeScript)
- `turbo.json` - Build pipeline configuration

### Related Files:

- `scripts/dev.sh` - Development build script (in root /scripts)
- `scripts/start.sh` - Start script (in root /scripts)
- `scripts/update-version.mjs` - Version update script
- `apps/desktop/scripts/afterPack.cjs` - Post-build processing
- `apps/desktop/scripts/notarize.cjs` - macOS notarization
- `pnpm-workspace.yaml` - Workspace configuration

---

## Investigation Phase

### Estimated Time: 45 mins

### Step 1: Verify electron-updater Installation

```bash
# Check if electron-updater is installed
grep -r "electron-updater" package.json apps/desktop/package.json

# Check node_modules
ls -la node_modules/electron-updater 2>/dev/null || echo "Not found in root"
ls -la apps/desktop/node_modules/electron-updater 2>/dev/null || echo "Not found in desktop"

# Check if it's in dependencies or devDependencies
cat apps/desktop/package.json | grep -A5 -B5 "electron-updater"
```

### Step 2: Review Electron Builder Configuration

```bash
# View electron-builder config
cat apps/desktop/electron-builder.json

# Check for files/extraResources configuration
grep -A10 "files\|extraResources\|extraFiles" apps/desktop/electron-builder.json
```

### Step 3: Check Import Statement

```bash
# Find how electron-updater is imported in main.ts
grep -n "electron-updater" apps/desktop/src/main.ts
grep -n "require.*electron-updater\|import.*electron-updater" apps/desktop/src/main.ts
```

**Current Import in main.ts:**

```typescript
import electronUpdater from "electron-updater";
const { autoUpdater } = electronUpdater;
```

### Step 4: Review Build Output

```bash
# Check what's in the built Windows package
ls -la release/win-unpacked/resources/app/
ls -la release/win-unpacked/resources/app/node_modules/ 2>/dev/null
```

---

## Root Cause Analysis

### Possible Causes:

1. **electron-updater in wrong dependencies section**
   - In devDependencies instead of dependencies
   - Not hoisted by pnpm

2. **Module not included in electron-builder files**
   - electron-builder not bundling node_modules correctly
   - Files pattern excluding the module

3. **ES Module vs CommonJS issue**
   - Import statement incompatible with module type
   - Missing type declaration

4. **Build process not copying dependencies**
   - Turbo.json not including node_modules in outputs
   - Build script not installing production dependencies

---

## Solution Implementation

### Estimated Time: 1.5-2 hours

### Fix 1: Ensure Correct Dependencies (30 mins)

```bash
# Check current configuration
cat apps/desktop/package.json | grep -A20 "dependencies"
```

**Current apps/desktop/package.json:**

✅ **GOOD NEWS:** electron-updater is already in dependencies!

```json
{
  "name": "@sqlhelper/desktop",
  "version": "0.1.3",
  "main": "dist/apps/desktop/src/main.js",
  "type": "module",
  "dependencies": {
    "electron-updater": "^6.6.2", // ✅ Already in dependencies
    "@sqlhelper/ai-integration": "workspace:*",
    "@sqlhelper/database-core": "workspace:*",
    "@sqlhelper/storage": "workspace:*",
    "electron-store": "^10.1.0",
    "keytar": "^7.9.0",
    "pg": "^8.16.3"
  }
}
```

**Key Points:**

- ✅ electron-updater is already in `dependencies` (not devDependencies)
- ✅ Using recent version (^6.6.2)
- ⚠️ Package.json has `"type": "module"` - ES Module mode
- ⚠️ Main entry is `dist/apps/desktop/src/main.js` (built from TypeScript)

### Fix 2: Update electron-builder Configuration (30 mins)

```json
// apps/desktop/electron-builder.json
{
  "appId": "com.lucedata.app",
  "productName": "LuceData",
  "directories": {
    "output": "../../release",
    "buildResources": "assets"
  },
  "files": ["dist/**/*", "node_modules/**/*", "package.json"],
  "extraResources": [
    {
      "from": "node_modules/electron-updater",
      "to": "app/node_modules/electron-updater",
      "filter": ["**/*"]
    }
  ],
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64"]
      }
    ],
    "icon": "assets/icon.ico",
    "artifactName": "${productName} Setup ${version}.${ext}",
    "publish": {
      "provider": "generic",
      "url": "https://your-update-server.com/releases"
    }
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true
  },
  "mac": {
    "category": "public.app-category.developer-tools",
    "icon": "assets/icon.icns",
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "assets/entitlements.mac.plist",
    "entitlementsInherit": "assets/entitlements.mac.plist"
  },
  "linux": {
    "target": ["AppImage"],
    "category": "Development",
    "icon": "assets/icon.png"
  }
}
```

**Alternative approach (if above doesn't work):**

```json
{
  "files": [
    "dist/**/*",
    "!node_modules",
    "node_modules/electron-updater/**/*",
    "package.json"
  ],
  "asarUnpack": ["node_modules/electron-updater/**/*"]
}
```

### Fix 3: Update Main Process Import (15 mins)

**Current import in apps/desktop/src/main.ts:**

```typescript
import electronUpdater from "electron-updater";
const { autoUpdater } = electronUpdater;
```

**Issue Analysis:**

- ✅ Package.json has `"type": "module"` - ES modules enabled
- ⚠️ Import uses default import, then destructures
- ⚠️ This pattern can cause issues in packaged builds

**Recommended Fix - Use direct named import:**

```typescript
// apps/desktop/src/main.ts

// Option 1: Direct named import (RECOMMENDED)
import { autoUpdater } from "electron-updater";

// Option 2: Keep current if it works in dev
// import electronUpdater from "electron-updater";
// const { autoUpdater } = electronUpdater;
```

**TypeScript Configuration:**
Ensure `apps/desktop/tsconfig.json` has correct module settings:

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2022",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

### Fix 4: Update Build Pipeline (30 mins)

**Update turbo.json to ensure dependencies are included:**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "node_modules/**"],
      "env": ["NODE_ENV"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**Create/Update build script in /scripts folder:**

```bash
# scripts/build-windows.sh

#!/bin/bash
set -e

echo "🔨 Building Windows installer for LuceData..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf release/

# Install all dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# Build renderer
echo "🎨 Building renderer..."
pnpm --filter @sqlhelper/renderer build

# Build desktop (TypeScript compilation)
echo "⚡ Building desktop (TypeScript)..."
pnpm --filter @sqlhelper/desktop build

# Optional: Install production dependencies for desktop
# (Usually not needed with asar: false in electron-builder config)
# echo "📦 Installing production dependencies for desktop..."
# cd apps/desktop
# pnpm install --prod --no-optional
# cd ../..

# Build Windows installer
echo "🪟 Building Windows installer..."
cd apps/desktop
pnpm electron-builder --win
cd ../..

echo "✅ Build complete! Installer is in release/ directory"
echo "📁 Files:"
ls -lh release/*.exe 2>/dev/null || echo "No .exe files found"
```

**Make it executable:**

```bash
chmod +x scripts/build-windows.sh
```

**Add to root package.json scripts:**

```json
{
  "scripts": {
    "build:win": "./scripts/build-windows.sh",
    "build:mac": "./scripts/build-mac.sh",
    "build:linux": "./scripts/build-linux.sh"
  }
}
```

### Fix 5: Verify Package Structure (15 mins)

After building, verify the structure:

```bash
# Extract and inspect the built package
cd release/win-unpacked

# Check if electron-updater exists
ls -la resources/app/node_modules/electron-updater

# Check package.json
cat resources/app/package.json | grep electron-updater

# Check main.js
cat resources/app/dist/main.js | grep electron-updater
```

---

## Alternative Solution: Bundle electron-updater

If the above doesn't work, bundle electron-updater with the app:

```javascript
// apps/desktop/webpack.config.js (if using webpack)

module.exports = {
  target: "electron-main",
  entry: "./src/main.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "main.js",
  },
  externals: {
    // Don't bundle these, they'll be in node_modules
    electron: "commonjs2 electron",
    "electron-updater": "commonjs2 electron-updater",
  },
};
```

Or use Vite:

```javascript
// apps/desktop/vite.config.js

import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/main.js",
      formats: ["cjs"],
      fileName: "main",
    },
    rollupOptions: {
      external: ["electron", "electron-updater"],
      output: {
        format: "cjs",
      },
    },
  },
});
```

---

## Testing Phase

### Estimated Time: 30 mins

### Test on Development Machine:

```bash
# Clean everything
rm -rf node_modules apps/*/node_modules release/

# Fresh install
pnpm install

# Build
pnpm --filter @sqlhelper/renderer build
pnpm --filter @sqlhelper/desktop build

# Build Windows installer
pnpm --filter @sqlhelper/desktop electron-builder --win --dir

# Test the unpacked version
./release/win-unpacked/LuceData.exe
```

### Check for Errors:

1. **Application launches successfully**
   - [ ] No crash on startup
   - [ ] No console errors about electron-updater

2. **Auto-updater initializes**
   - [ ] Check for updates functionality works
   - [ ] No module not found errors

3. **Installed version works**
   - [ ] Install the .exe
   - [ ] Launch from installed location
   - [ ] Verify auto-updater works

---

## Debug Mode

**Good news:** The app already has excellent logging in main.ts!

Add additional electron-updater specific debugging:

```typescript
// apps/desktop/src/main.ts

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Add this near the top of the file, after existing logs
log("Checking electron-updater module paths...");

try {
  // Log module resolution paths
  log("Module paths:", {
    __dirname: path.dirname(fileURLToPath(import.meta.url)),
    resourcesPath: process.resourcesPath,
    appPath: app.getAppPath(),
    cwd: process.cwd(),
  });

  // Try to import electron-updater
  log("Attempting to import electron-updater...");
  const electronUpdater = await import("electron-updater");
  const { autoUpdater: testUpdater } = electronUpdater;
  log("✅ electron-updater loaded successfully", {
    version: testUpdater.currentVersion,
  });

  // Check if node_modules exists in various locations
  const locations = [
    path.join(app.getAppPath(), "node_modules", "electron-updater"),
    path.join(process.resourcesPath, "app", "node_modules", "electron-updater"),
    path.join(process.cwd(), "node_modules", "electron-updater"),
  ];

  locations.forEach(loc => {
    const exists = fs.existsSync(loc);
    log(`electron-updater at ${loc}: ${exists ? "✅ EXISTS" : "❌ NOT FOUND"}`);
  });
} catch (error) {
  logError("Failed to load electron-updater", error);

  // Show user-friendly error dialog
  dialog.showErrorBox(
    "Update System Error",
    "The auto-update system could not be initialized. " +
      "The application will continue to work, but automatic updates will be disabled.\n\n" +
      `Error: ${error.message}`
  );
}
```

**The app's existing startup log file location:**

```typescript
// Already in main.ts:
const logFilePath = path.join(
  app.getPath("temp"),
  `sqlhelper-startup-${Date.now()}.log`
);
```

Check this log file after the app crashes to see detailed module loading info!

---

## Prevention: Pre-build Validation

Add a script to validate before building:

```javascript
// scripts/validate-build.mjs

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const desktopPkgPath = path.join(rootDir, "apps/desktop/package.json");
const builderConfigPath = path.join(
  rootDir,
  "apps/desktop/electron-builder.json"
);

console.log("🔍 Validating build configuration for LuceData...\n");

// Check desktop package.json exists
if (!fs.existsSync(desktopPkgPath)) {
  console.error("❌ apps/desktop/package.json not found");
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(desktopPkgPath, "utf-8"));

// Check electron-updater is in dependencies (not devDependencies)
if (!pkg.dependencies || !pkg.dependencies["electron-updater"]) {
  console.error("❌ electron-updater not found in dependencies");
  console.error("   Add it with: cd apps/desktop && pnpm add electron-updater");
  process.exit(1);
}
console.log(
  "✅ electron-updater in dependencies:",
  pkg.dependencies["electron-updater"]
);

// Check for ES module configuration
if (pkg.type === "module") {
  console.log('✅ Package type is "module" (ES modules enabled)');
} else {
  console.warn('⚠️  Warning: Package type is not set to "module"');
}

// Check electron-builder config exists
if (!fs.existsSync(builderConfigPath)) {
  console.error("❌ apps/desktop/electron-builder.json not found");
  process.exit(1);
}
console.log("✅ electron-builder.json exists");

// Validate electron-builder configuration
const builderConfig = JSON.parse(fs.readFileSync(builderConfigPath, "utf-8"));

// Check asar setting
if (builderConfig.asar === false) {
  console.log("✅ asar is disabled (recommended for module resolution)");
} else {
  console.warn("⚠️  Warning: asar is enabled or not set");
}

// Check files configuration
if (!builderConfig.files) {
  console.error("❌ No files configuration in electron-builder.json");
  process.exit(1);
}
console.log("✅ Files configuration present");

// Check if dist is included
const hasDistFiles = builderConfig.files.some(
  f => typeof f === "string" && f.includes("dist")
);
if (!hasDistFiles) {
  console.error("❌ dist/** not included in files configuration");
  process.exit(1);
}
console.log("✅ dist/** included in files");

// Check TypeScript build output exists
const mainJsPath = path.join(rootDir, "apps/desktop", pkg.main);
if (!fs.existsSync(mainJsPath)) {
  console.warn(`⚠️  Warning: Main file not found: ${pkg.main}`);
  console.warn("   Run: pnpm --filter @sqlhelper/desktop build");
}

console.log("\n✅ Build configuration validated successfully!\n");
```

**Add to root package.json:**

```json
{
  "scripts": {
    "validate": "node scripts/validate-build.mjs",
    "prebuild:win": "pnpm validate",
    "prebuild:mac": "pnpm validate",
    "build:win": "./scripts/build-windows.sh",
    "build:mac": "./scripts/build-mac.sh"
  }
}
```

**Make script executable:**

```bash
chmod +x scripts/validate-build.mjs
```

---

## Documentation Update

Update BUILD_DEPLOYMENT_GUIDE.md:

```markdown
## Windows Build Requirements

### electron-updater Configuration

electron-updater MUST be in `dependencies` (not devDependencies):

\`\`\`json
{
"dependencies": {
"electron-updater": "^6.1.7"
}
}
\`\`\`

### electron-builder Configuration

Ensure node_modules are included:

\`\`\`json
{
"files": [
"dist/**/*",
"node_modules/**/*",
"package.json"
]
}
\`\`\`

### Troubleshooting

If you see "Cannot find package 'electron-updater'":

1. Check electron-updater is in dependencies
2. Run `pnpm install` in apps/desktop
3. Verify electron-builder.json includes node_modules
4. Clean and rebuild: `rm -rf release/ && pnpm build`
```

---

## Success Criteria

✅ electron-updater in dependencies (not devDependencies)  
✅ electron-builder.json includes node_modules  
✅ Windows installer builds without errors  
✅ Application launches successfully  
✅ No "module not found" errors  
✅ Auto-updater initializes correctly  
✅ Tested on clean Windows installation  
✅ Documentation updated

---

## Rollback Plan

If build breaks:

1. Revert electron-builder.json changes
2. Revert package.json changes
3. Use previous working build
4. Debug with unpacked build first

---

## Future Improvements

1. **Add build validation script** to CI/CD
2. **Test unpacked build** before creating installer
3. **Add telemetry** to track module loading issues
4. **Consider using electron-builder's asarUnpack** for critical modules
5. **Document all required dependencies** in README

---

## Notes

- Always test unpacked build (--dir flag) before creating installer
- Windows requires different handling than macOS/Linux
- pnpm workspace hoisting can cause issues - be explicit with dependencies
- Consider using electron-builder's autoUpdate feature instead of manual implementation
- Keep electron-updater version in sync across all packages
