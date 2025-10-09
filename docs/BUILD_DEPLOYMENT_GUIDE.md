# Cross-Platform Build & Deployment Guide

## Overview

SQLHelper uses a **single repository** with **platform-specific builds** approach. This means:

- ✅ One codebase for all platforms (Windows, macOS, Linux)
- ✅ Shared React UI, business logic, and database code
- ✅ Platform-specific native modules handled automatically
- ✅ Platform-specific installers and app packages

## Development Workflow

### Development Scripts by Platform

**Windows (PowerShell):**

```powershell
.\dev.ps1          # Development mode
.\start.ps1        # Production mode
.\dev-enhanced.ps1 # Development with preload monitoring
```

**macOS/Linux (Bash):**

```bash
./dev.sh           # Development mode
./start.sh         # Production mode
./dev-enhanced.sh  # Development with preload monitoring
```

### Universal Commands (All Platforms)

```bash
pnpm dev           # Start development mode
pnpm build         # Build all packages
pnpm rebuild       # Rebuild native modules
pnpm clean         # Clean build artifacts
```

## Production Builds

### Building for Specific Platforms

**Build for macOS:**

```bash
pnpm dist:mac
# Creates: release/SQL Helper-0.1.0.dmg
#          release/SQL Helper-0.1.0-mac.zip
```

**Build for Windows:**

```bash
pnpm dist:win
# Creates: release/SQL Helper Setup 0.1.0.exe
#          release/SQL Helper 0.1.0.exe (portable)
```

**Build for Linux:**

```bash
pnpm dist:linux
# Creates: release/SQL Helper-0.1.0.AppImage
#          release/sql-helper_0.1.0_amd64.deb
```

**Build for All Platforms:**

```bash
pnpm dist:all
# Creates installers for macOS, Windows, and Linux
```

## Platform-Specific Considerations

### Windows

- **Requirements**: Visual Studio Build Tools, Python 3.7+
- **Native Modules**: Automatically rebuilt with `electron-rebuild`
- **Installer**: NSIS installer + portable executable
- **Icons**: `.ico` format
- **Code Signing**: Optional, configure in CI/CD

### macOS

- **Requirements**: Xcode Command Line Tools
- **Native Modules**: Automatically rebuilt for Intel and Apple Silicon
- **Installer**: DMG disk image + ZIP archive
- **Icons**: `.icns` format
- **Code Signing**: Required for distribution outside App Store
- **Notarization**: Required for macOS 10.15+

### Linux

- **Requirements**: build-essential, Python 3.7+
- **Native Modules**: Automatically rebuilt
- **Installer**: AppImage (universal) + DEB package
- **Icons**: `.png` format
- **No Code Signing**: Not required

## CI/CD Strategy

### GitHub Actions Example

Create `.github/workflows/build.yml`:

```yaml
name: Build & Release

on:
  push:
    tags: ["v*"]
  pull_request:

jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, ubuntu-latest, windows-latest]

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install

      - name: Build application
        run: pnpm build

      - name: Build distributables (macOS)
        if: matrix.os == 'macos-latest'
        run: pnpm dist:mac
        env:
          CSC_IDENTITY_AUTO_DISCOVERY: false

      - name: Build distributables (Windows)
        if: matrix.os == 'windows-latest'
        run: pnpm dist:win

      - name: Build distributables (Linux)
        if: matrix.os == 'ubuntu-latest'
        run: pnpm dist:linux

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.os }}-build
          path: release/
```

## Repository Structure

```
sqlhelper/
├── apps/
│   ├── desktop/           # Electron main process
│   └── renderer/          # React UI (shared across platforms)
├── packages/              # Shared libraries
│   ├── ai-integration/
│   ├── database-core/
│   ├── security-guardrails/
│   └── storage/
├── release/               # Built installers (gitignored)
├── dev.ps1               # Windows development script
├── start.ps1             # Windows production script
├── dev.sh                # macOS/Linux development script
├── start.sh              # macOS/Linux production script
└── CROSS_PLATFORM_SETUP.md
```

## Native Module Handling

### Automatic Rebuilding

Native modules like `better-sqlite3` are automatically rebuilt for each platform:

```json
{
  "scripts": {
    "postinstall": "electron-rebuild",
    "rebuild": "electron-rebuild -f -w better-sqlite3"
  }
}
```

### Platform-Specific Dependencies

If you need platform-specific dependencies:

```json
{
  "optionalDependencies": {
    "fsevents": "^3.0.0" // macOS only
  }
}
```

## Code Signing & Distribution

### macOS Code Signing

```bash
# Set environment variables
export CSC_LINK="path/to/certificate.p12"
export CSC_KEY_PASSWORD="certificate-password"
export APPLE_ID="developer@email.com"
export APPLE_ID_PASS="app-specific-password"

# Build with signing
pnpm dist:mac
```

### Windows Code Signing

```bash
# Set environment variables
export CSC_LINK="path/to/certificate.p12"
export CSC_KEY_PASSWORD="certificate-password"

# Build with signing
pnpm dist:win
```

## Development Best Practices

### 1. Platform Testing

- Test on the actual target platforms regularly
- Use VMs or cloud instances for platforms you don't have
- Pay attention to file path differences (`/` vs `\\`)

### 2. Native Module Management

- Always rebuild native modules when switching platforms
- Use `pnpm rebuild` after pulling changes that modify dependencies
- Test native modules work on all target platforms

### 3. UI Consistency

- Use Electron's built-in APIs for platform-specific behavior
- Test menu bars on macOS vs Windows (different positioning)
- Verify keyboard shortcuts work on all platforms

### 4. File Path Handling

```typescript
// Good: Use Node.js path module
import path from "path";
const filePath = path.join(app.getPath("userData"), "database.db");

// Bad: Hard-coded paths
const filePath = "C:\\data\\database.db"; // Windows only!
```

### 5. Environment Variables

```typescript
// Handle platform differences gracefully
const isDarwin = process.platform === "darwin";
const isWindows = process.platform === "win32";
const isLinux = process.platform === "linux";
```

## Troubleshooting

### Native Module Issues

```bash
# Clean rebuild
pnpm clean
rm -rf node_modules
pnpm install
pnpm rebuild
```

### Build Issues

```bash
# Clear electron-builder cache
npx electron-builder install-app-deps
rm -rf release/
pnpm dist:win  # or dist:mac, dist:linux
```

### Development Server Issues

```bash
# Check if ports are available
# Windows
netstat -an | findstr :5173
# macOS/Linux
lsof -i :5173

# Use different port
PORT=3000 pnpm --filter @sqlhelper/renderer dev
```

## Distribution Channels

### Automatic Updates

The app is configured for automatic updates via GitHub releases:

```json
{
  "publish": {
    "provider": "github",
    "owner": "sqlhelper",
    "repo": "sqlhelper"
  }
}
```

### Manual Distribution

- **macOS**: Upload `.dmg` to website or App Store
- **Windows**: Upload `.exe` installer to website or Microsoft Store
- **Linux**: Upload `.AppImage` and `.deb` to website or package repositories

This single-repository approach ensures consistency, reduces maintenance overhead, and provides a professional distribution strategy for all platforms.
