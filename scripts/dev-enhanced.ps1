#!/usr/bin/env pwsh

# Enhanced SQLHelper Development Script with automatic preload fixes

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting SQLHelper Development Environment..." -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
if (!(Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script from the SQLHelper project root directory" -ForegroundColor Red
    exit 1
}

# Function to fix preload file
function Fix-Preload {
    Write-Host "🔧 Checking and fixing preload file..." -ForegroundColor Yellow
    Push-Location "apps/desktop"
    
    $preloadFile = "dist/apps/desktop/src/preload.cjs"
    $workingFile = "temp/preload.js"
    
    if (Test-Path $workingFile) {
        Copy-Item $workingFile $preloadFile -Force -ErrorAction SilentlyContinue
        Write-Host "✅ Preload file fixed!" -ForegroundColor Green
        
        # Verify the fix
        if (Test-Path $preloadFile) {
            $content = Get-Content $preloadFile -Raw -ErrorAction SilentlyContinue
            if ($content -and $content -match "createSqlTab") {
                Write-Host "✅ createSqlTab method found in preload" -ForegroundColor Green
            } else {
                Write-Host "❌ createSqlTab method still missing" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "⚠️  Working preload file not found at $workingFile - skipping preload fix" -ForegroundColor Yellow
    }
    
    Pop-Location
}

# Function to monitor and auto-fix preload
function Monitor-Preload {
    while ($true) {
        Start-Sleep -Seconds 5
        $preloadPath = "apps/desktop/dist/apps/desktop/src/preload.cjs"
        if (Test-Path $preloadPath) {
            $content = Get-Content $preloadPath -Raw -ErrorAction SilentlyContinue
            if ($content -and $content -notmatch "createSqlTab") {
                Write-Host "🔄 Preload file missing createSqlTab, auto-fixing..." -ForegroundColor Yellow
                Fix-Preload
            }
        }
    }
}

# If called with 'prod' or '--prod', build and start desktop app instead of dev servers
if ($args[0] -eq "prod" -or $args[0] -eq "--prod" -or $args[0] -eq "start" -or $args[0] -eq "--start") {
    Write-Host "🏗️  Building renderer..." -ForegroundColor Yellow
    pnpm -w --filter @sqlhelper/renderer build
    Write-Host "🏗️  Building desktop..." -ForegroundColor Yellow
    pnpm -w --filter @sqlhelper/desktop build
    Fix-Preload
    Write-Host "🚀 Starting desktop (production)..." -ForegroundColor Green
    pnpm -w --filter @sqlhelper/desktop start
    exit $LASTEXITCODE
}

# Global variables for process management
$script:monitorJob = $null
$script:rendererJob = $null

# Function to cleanup background processes
function Cleanup {
    Write-Host ""
    Write-Host "🧹 Cleaning up processes..." -ForegroundColor Yellow
    
    # Stop background jobs
    if ($script:monitorJob) {
        Stop-Job $script:monitorJob -ErrorAction SilentlyContinue
        Remove-Job $script:monitorJob -ErrorAction SilentlyContinue
    }
    
    if ($script:rendererJob) {
        Stop-Job $script:rendererJob -ErrorAction SilentlyContinue
        Remove-Job $script:rendererJob -ErrorAction SilentlyContinue
    }
    
    # Kill pnpm dev processes
    Get-Process | Where-Object { $_.ProcessName -like "*node*" -and $_.CommandLine -like "*pnpm dev*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    
    # Kill electron processes
    Get-Process | Where-Object { $_.ProcessName -like "*electron*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    
    # Kill TypeScript compiler processes
    Get-Process | Where-Object { $_.ProcessName -like "*node*" -and $_.CommandLine -like "*tsc --watch*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    
    Write-Host "✅ Cleanup complete" -ForegroundColor Green
    exit 0
}

# Set up signal handlers for graceful shutdown
try {
    $null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Cleanup }
} catch {
    # Ignore if already registered
}

# Handle Ctrl+C using trap
trap {
    Cleanup
    break
}

Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
pnpm install

Write-Host ""
Write-Host "� Rebuilding native modules for Electron..." -ForegroundColor Blue
pnpm rebuild

Write-Host ""
Write-Host "�🔨 Building all packages..." -ForegroundColor Blue
pnpm build

# Initial preload fix
Fix-Preload

Write-Host ""
Write-Host "🚀 Starting development server..." -ForegroundColor Green
Write-Host "   - Renderer will be available at http://localhost:5173" -ForegroundColor Cyan
Write-Host "   - Electron app will launch automatically" -ForegroundColor Cyan
Write-Host "   - Auto-fixing preload file every 5 seconds" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Press Ctrl+C to stop the development server" -ForegroundColor Yellow
Write-Host ""

# Start renderer dev server first and let it choose the port
Write-Host "🚀 Starting renderer dev server..." -ForegroundColor Blue

# Start preload monitoring in the background
$script:monitorJob = Start-Job -ScriptBlock ${function:Monitor-Preload}

# Start renderer dev server in the background (let Vite choose port)
$script:rendererJob = Start-Job -ScriptBlock {
    Set-Location "c:\code\K\agentfactory\SQL%20Helper"
    pnpm --filter @sqlhelper/renderer dev
}

# Wait for the renderer to start and detect the port it's using
Write-Host "⏳ Waiting for Vite dev server to start..." -ForegroundColor Yellow

$RENDERER_PORT = 3000
$portFound = $false
$maxAttempts = 30
$attempt = 0

while (!$portFound -and $attempt -lt $maxAttempts) {
    $attempt++
    Start-Sleep -Seconds 1
    
    foreach ($testPort in @(3000, 5173, 3001, 5174)) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$testPort" -TimeoutSec 1 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                $RENDERER_PORT = $testPort
                $portFound = $true
                Write-Host "✅ Found Vite dev server on port $testPort" -ForegroundColor Green
                break
            }
        } catch {
            # Port not responding, continue trying
        }
    }
    
    if (!$portFound) {
        Write-Host "⏳ Attempt $attempt/$maxAttempts - Waiting for Vite server..." -ForegroundColor Yellow
    }
}

if (!$portFound) {
    Write-Host "❌ Could not detect Vite dev server after $maxAttempts attempts." -ForegroundColor Red
    Write-Host "📋 Manual check: Is the renderer job running? Try 'pnpm --filter @sqlhelper/renderer dev' manually" -ForegroundColor Yellow
    $RENDERER_PORT = 3000
}

$env:RENDERER_URL = "http://localhost:$RENDERER_PORT"
Write-Host "🔗 Using RENDERER_URL=$($env:RENDERER_URL)" -ForegroundColor Cyan

# Fix preload before starting desktop
Fix-Preload

# Start desktop app (dev)
$env:NODE_ENV = "development"
$env:RENDERER_URL = "http://localhost:$RENDERER_PORT"
pnpm --filter @sqlhelper/desktop dev

# This line should not be reached due to the trap, but just in case
Cleanup