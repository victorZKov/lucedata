# LuceData/SQLHelper - Project Structure Reference

**Last Updated:** October 8, 2025

This document provides a quick reference for the project structure to help with bug fixes and feature development.

---

## 📁 Directory Structure

```
SQLHelper/
├── apps/
│   ├── desktop/              # Electron main process
│   │   ├── src/
│   │   │   └── main.ts      # 🔥 Main entry point (TypeScript!)
│   │   ├── scripts/         # Desktop-specific build scripts
│   │   │   ├── afterPack.cjs
│   │   │   ├── notarize.cjs
│   │   │   ├── generate-icon.mjs
│   │   │   └── prepare-workspace-modules.mjs
│   │   ├── package.json     # Desktop dependencies
│   │   ├── electron-builder.json  # Build configuration
│   │   └── tsconfig.json
│   │
│   └── renderer/            # React frontend
│       ├── src/
│       │   ├── components/
│       │   ├── stores/
│       │   ├── lib/
│       │   └── hooks/
│       ├── package.json
│       └── vite.config.ts
│
├── packages/                # Shared packages
│   ├── ai-core/
│   ├── ai-integration/
│   ├── database-core/
│   ├── storage/
│   ├── common/
│   └── ui-kit/
│
├── scripts/                 # 🔥 ROOT-LEVEL SCRIPTS
│   ├── dev.sh              # Development (bash)
│   ├── dev.ps1             # Development (PowerShell)
│   ├── start.sh            # Start app (bash)
│   ├── start.ps1           # Start app (PowerShell)
│   ├── deploy-update.sh    # Deploy updates
│   ├── update-version.mjs  # Version management
│   └── setup-codesigning.sh
│
├── release/                 # Build output directory
│   ├── win-unpacked/       # Windows unpacked build
│   ├── mac/                # macOS builds
│   ├── *.exe               # Windows installers
│   ├── *.dmg               # macOS installers
│   └── latest.yml          # Update manifest
│
├── docs/                    # Documentation
├── prompt/                  # Development prompts/guides
│   └── bugs-001/           # Bug fix task files
├── package.json            # Root workspace config
├── pnpm-workspace.yaml     # PNPM workspace definition
├── turbo.json              # Turborepo config
└── tsconfig.json           # Root TypeScript config
```

---

## 🔧 Technology Stack

### Main Process (Electron)

- **Language:** TypeScript (`.ts` files)
- **Module System:** ES Modules (`"type": "module"`)
- **Entry Point:** `apps/desktop/src/main.ts`
- **Build Output:** `dist/apps/desktop/src/main.js`
- **Runtime:** Electron 38.2.0

### Renderer Process (Frontend)

- **Framework:** React
- **Build Tool:** Vite
- **Language:** TypeScript
- **Styling:** TailwindCSS

### Package Manager

- **Tool:** PNPM 8.12.1
- **Workspaces:** Monorepo setup
- **Build System:** Turborepo

---

## 📦 Key Configuration Files

### apps/desktop/package.json

```json
{
  "name": "@sqlhelper/desktop",
  "version": "0.1.3",
  "type": "module", // ✅ ES Modules enabled
  "main": "dist/apps/desktop/src/main.js", // Build output path
  "dependencies": {
    "electron-updater": "^6.6.2", // ✅ In dependencies (not dev)
    "@sqlhelper/ai-integration": "workspace:*",
    "@sqlhelper/database-core": "workspace:*",
    "@sqlhelper/storage": "workspace:*",
    "electron-store": "^10.1.0",
    "pg": "^8.16.3"
  }
}
```

### apps/desktop/electron-builder.json

```json
{
  "appId": "com.lucedata.app",
  "productName": "LuceData",
  "asar": false, // ✅ No ASAR for easier debugging
  "npmRebuild": true,
  "buildDependenciesFromSource": true,
  "files": [
    "dist/**/*", // TypeScript compiled output
    "assets/**/*",
    "package.json",
    {
      "from": "../renderer/dist",
      "to": "dist/apps/renderer/dist" // Include renderer build
    }
  ]
}
```

---

## 🚀 Common Commands

### Development

```bash
# Start development mode
pnpm dev

# Start specific package
pnpm --filter @sqlhelper/desktop dev
pnpm --filter @sqlhelper/renderer dev

# Build all packages
pnpm build

# Type checking
pnpm type-check
```

### Building Installers

```bash
# macOS
cd apps/desktop
pnpm electron-builder --mac

# Windows
cd apps/desktop
pnpm electron-builder --win

# Linux
cd apps/desktop
pnpm electron-builder --linux

# All platforms
cd apps/desktop
pnpm electron-builder --mac --win --linux
```

### Testing Unpacked Build

```bash
# Build without packaging (faster for testing)
cd apps/desktop
pnpm electron-builder --dir

# Test the unpacked app
./release/win-unpacked/LuceData.exe          # Windows
open ./release/mac/LuceData.app              # macOS
./release/linux-unpacked/lucedata            # Linux
```

---

## 🔍 Important Code Locations

### Main Process (apps/desktop/src/main.ts)

```typescript
// Key imports
import { app, BrowserWindow, Menu, ipcMain } from "electron";
import Store from "electron-store";
import electronUpdater from "electron-updater";
const { autoUpdater } = electronUpdater;

// Logging system (lines ~40-100)
const logFilePath = path.join(
  app.getPath("temp"),
  `sqlhelper-startup-${Date.now()}.log`
);
const logStream = fs.createWriteStream(logFilePath, { flags: "a" });
function log(message: string, data?: any) {
  /* ... */
}
function logError(message: string, error?: any) {
  /* ... */
}

// Error handling (lines ~90-120)
process.on("uncaughtException", error => {
  /* ... */
});
process.on("unhandledRejection", error => {
  /* ... */
});

// Menu definition (search for "Menu.buildFromTemplate")
// IPC handlers (search for "ipcMain.handle")
// Window creation (search for "new BrowserWindow")
```

### Key IPC Channels

```typescript
// Common IPC patterns in main.ts
ipcMain.handle("some-action", async (event, arg) => {
  // Handle async operations
  return result;
});

ipcMain.on("some-event", (event, arg) => {
  // Handle sync operations
});

// Send to renderer
mainWindow.webContents.send("event-name", data);
```

### Renderer IPC (apps/renderer/src/lib/ipc.ts)

```typescript
// Invoke (async)
const result = await ipcRenderer.invoke("some-action", arg);

// Listen for events
ipcRenderer.on("event-name", (event, data) => {
  // Handle event
});

// Send to main
ipcRenderer.send("some-event", arg);
```

---

## 🐛 Debugging

### Log Files

```bash
# macOS
~/Library/Logs/LuceData/

# Windows
%USERPROFILE%\AppData\Roaming\LuceData\logs\

# Linux
~/.config/LuceData/logs/

# Startup logs (temporary)
# Check console output for: "Log file location:"
# Usually: /tmp/sqlhelper-startup-*.log
```

### Chrome DevTools

```typescript
// Enable DevTools in main.ts
mainWindow.webContents.openDevTools();
```

### Debug Mode

```bash
# Run with debug flag
electron apps/desktop/dist/apps/desktop/src/main.js --dev

# Or use npm script
pnpm --filter @sqlhelper/desktop start:dev
```

---

## 📝 Code Style & Patterns

### TypeScript

- Use explicit types for function parameters and returns
- Prefer `interface` over `type` for objects
- Use `async/await` over `.then()` callbacks
- Enable strict mode

### Imports

```typescript
// ES Module imports (type: "module" in package.json)
import { something } from "package";
import type { SomeType } from "package"; // Type-only import

// Dynamic imports
const module = await import("package");
```

### IPC Naming

- Use kebab-case: `'get-connection'`, `'save-settings'`
- Prefix with context: `'db-connect'`, `'ai-query'`, `'menu-refresh'`
- Return objects with success flag: `{ success: true, data: ... }`

### Error Handling

```typescript
try {
  // Operation
  log("Starting operation...");
  const result = await someOperation();
  return { success: true, data: result };
} catch (error) {
  logError("Operation failed", error);
  return { success: false, error: error.message };
}
```

---

## 🔐 Security Notes

- `nodeIntegration` should be false
- Use `contextIsolation: true`
- Expose safe APIs via `preload.ts`
- Never pass user input directly to shell commands
- Validate all IPC inputs

---

## 📚 Dependencies Management

### Adding Dependencies

```bash
# Add to root
pnpm add <package>

# Add to specific workspace
pnpm --filter @sqlhelper/desktop add <package>

# Add workspace dependency
pnpm --filter @sqlhelper/desktop add @sqlhelper/common@workspace:*
```

### Important: electron-updater MUST be in `dependencies`

```json
{
  "dependencies": {
    "electron-updater": "^6.6.2" // ✅ Correct
  },
  "devDependencies": {
    // "electron-updater": "^6.6.2"  // ❌ Wrong!
  }
}
```

---

## 🎯 Quick Reference for Bug Fixes

### For Menu Issues

- File: `apps/desktop/src/main.ts`
- Search for: `Menu.buildFromTemplate`, `MenuItemConstructorOptions`
- IPC handlers: Search for `ipcMain.handle`

### For Connection Tree Issues

- Frontend: `apps/renderer/src/components/ConnectionsTree/`
- State: `apps/renderer/src/stores/connectionsStore.ts`
- IPC: Check both main.ts and renderer IPC calls

### For Chat Issues

- Frontend: `apps/renderer/src/components/Chat/`
- AI Integration: `packages/ai-integration/`
- State: `apps/renderer/src/stores/chatStore.ts`

### For Query Editor Issues

- Frontend: `apps/renderer/src/components/QueryEditor/`
- Look for Monaco Editor or CodeMirror integration

### For Build/Installer Issues

- Config: `apps/desktop/electron-builder.json`
- Scripts: `scripts/` (root level) and `apps/desktop/scripts/`
- Dependencies: `apps/desktop/package.json`

---

## 🆘 Common Issues

### Module Not Found

1. Check if in `dependencies` (not `devDependencies`)
2. Check `electron-builder.json` files configuration
3. Check if TypeScript compiled: `pnpm --filter @sqlhelper/desktop build`
4. Try: `rm -rf node_modules && pnpm install`

### Build Fails

1. Clean: `rm -rf release/ dist/`
2. Rebuild: `pnpm --filter @sqlhelper/desktop build`
3. Check TypeScript errors: `pnpm type-check`

### App Won't Start

1. Check startup log in `/tmp/sqlhelper-startup-*.log`
2. Run with: `electron apps/desktop/dist/apps/desktop/src/main.js`
3. Check DevTools console
4. Look for uncaught exceptions in logs

---

## 📖 Related Documentation

- Main docs: `/docs/`
- Build guide: `/docs/BUILD_DEPLOYMENT_GUIDE.md`
- Bug fixes: `/prompt/bugs-001/`
- Website: `/website/` (Next.js marketing site)

---

**Remember:** Always test changes in development mode before building installers!
