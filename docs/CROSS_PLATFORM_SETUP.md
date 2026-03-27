# Cross-Platform Development Setup

This guide helps developers set up the SQLHelper application across different operating systems (macOS, Windows, Linux).

## Prerequisites

### Required Software

- **Node.js**: Version 18.0.0 or higher
- **pnpm**: Version 8.0.0 or higher
- **Git**: Latest version
- **Python**: Version 3.7+ (required for native module compilation)
- **Build tools** (platform-specific):
  - **Windows**: Visual Studio Build Tools or Visual Studio Community with C++ workload
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Linux**: build-essential package (`sudo apt-get install build-essential`)

## Common Issues and Solutions

### Native Module Compatibility

The application uses `better-sqlite3`, a native module that must be compiled for each platform and Node.js version. This is automatically handled by our setup scripts, but here are manual solutions if needed:

#### Automatic Solution (Recommended)

Our PowerShell scripts (Windows) and shell scripts (macOS/Linux) automatically rebuild native modules:

**Windows:**

```powershell
.\dev.ps1          # Development mode
.\start.ps1        # Production mode
.\dev-enhanced.ps1 # Development with preload monitoring
```

**macOS/Linux:**

```bash
./dev.sh           # Development mode
./start.sh         # Production mode
./dev-enhanced.sh  # Development with preload monitoring
```

#### Manual Solution

If you encounter native module errors:

```bash
# Rebuild all native modules for Electron
pnpm rebuild

# Or rebuild specific modules
pnpm --filter @sqlhelper/desktop rebuild
```

### Platform-Specific Setup

#### Windows Setup

1. Install Visual Studio Build Tools:

   ```powershell
   # Using Chocolatey
   choco install visualstudio2022buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools"

   # Or download from Microsoft's website
   ```

2. Install Python:

   ```powershell
   # Using Chocolatey
   choco install python
   ```

3. Verify setup:
   ```powershell
   node --version    # Should be 18.0.0+
   pnpm --version    # Should be 8.0.0+
   python --version  # Should be 3.7+
   ```

#### macOS Setup

1. Install Xcode Command Line Tools:

   ```bash
   xcode-select --install
   ```

2. Install Node.js and pnpm:

   ```bash
   # Using Homebrew
   brew install node pnpm
   ```

3. Verify setup:
   ```bash
   node --version    # Should be 18.0.0+
   pnpm --version    # Should be 8.0.0+
   ```

#### Linux Setup

1. Install build essentials:

   ```bash
   # Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install build-essential python3 python3-pip

   # RHEL/CentOS/Fedora
   sudo yum groupinstall "Development Tools"
   sudo yum install python3 python3-pip
   ```

2. Install Node.js and pnpm:
   ```bash
   # Using Node Version Manager (recommended)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   npm install -g pnpm
   ```

## Development Environment Setup

### First-Time Setup

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd sqlhelper
   ```

2. Install dependencies and build:

   ```bash
   # This will automatically rebuild native modules
   pnpm install
   ```

3. Start development:

   ```bash
   # Windows
   .\dev-enhanced.ps1

   # macOS/Linux
   ./dev-enhanced.sh
   ```

### Switching Between Platforms

When switching development between different platforms (e.g., from macOS to Windows):

1. Clean and reinstall dependencies:

   ```bash
   pnpm clean
   rm -rf node_modules
   pnpm install
   ```

2. The native modules will be automatically rebuilt for your platform.

### Environment Variables

Create a `.env` file in the root directory for platform-specific configurations:

```env
# Development settings
NODE_ENV=development
RENDERER_URL=http://localhost:5173

# Database settings (optional)
DB_PATH=./data/sqlhelper.db

# Platform-specific settings
# Windows
PYTHON_PATH=C:\Python39\python.exe

# macOS/Linux
PYTHON_PATH=/usr/bin/python3
```

## Troubleshooting

### Error: "Module was compiled against a different Node.js version"

**Cause**: Native modules were compiled for a different Node.js version.
**Solution**:

```bash
pnpm rebuild
```

### Error: "node-gyp rebuild failed"

**Cause**: Missing build tools or Python.
**Solution**: Install platform-specific build tools (see Platform-Specific Setup above).

### Error: "EPERM: operation not permitted"

**Cause**: Files are locked by running processes.
**Solution**:

```bash
# Windows
taskkill /f /im node.exe
taskkill /f /im electron.exe

# macOS/Linux
pkill -f node
pkill -f electron
```

### Port Already in Use

The development server uses port 5173 by default. If it's busy, the scripts automatically fall back to port 5174.

To manually specify a port:

```bash
PORT=3000 pnpm --filter @sqlhelper/renderer dev
```

## Scripts Reference

### PowerShell Scripts (Windows)

- `dev.ps1`: Development mode with hot reload
- `start.ps1`: Production build and run
- `dev-enhanced.ps1`: Development with automatic preload fixes

### Shell Scripts (macOS/Linux)

- `dev.sh`: Development mode with hot reload
- `start.sh`: Production build and run
- `dev-enhanced.sh`: Development with automatic preload fixes

### Package.json Scripts

- `pnpm dev`: Start development mode
- `pnpm build`: Build all packages
- `pnpm rebuild`: Rebuild native modules
- `pnpm clean`: Clean build artifacts
- `pnpm test`: Run tests
- `pnpm lint`: Lint code

## Architecture Notes

The application uses:

- **Electron**: Desktop application framework
- **Vite**: Frontend build tool and dev server
- **TypeScript**: Type-safe JavaScript
- **better-sqlite3**: High-performance SQLite database
- **Turbo**: Monorepo build system
- **pnpm**: Fast package manager with workspace support

Native modules are automatically rebuilt for the target platform during development and build processes.
