#!/usr/bin/env pwsh

# SQLHelper Development Script
# This script builds and runs the application in development mode

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting SQLHelper Development Environment..." -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
if (!(Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script from the SQLHelper project root directory" -ForegroundColor Red
    exit 1
}

# If called with 'prod' or '--prod', build and start desktop app instead of dev servers
if ($args[0] -eq "prod" -or $args[0] -eq "--prod" -or $args[0] -eq "start" -or $args[0] -eq "--start") {
    Write-Host "🏗️  Building renderer..." -ForegroundColor Yellow
    pnpm -w --filter @sqlhelper/renderer build
    Write-Host "🏗️  Building desktop..." -ForegroundColor Yellow
    pnpm -w --filter @sqlhelper/desktop build
    Write-Host "🚀 Starting desktop (production)..." -ForegroundColor Green
    pnpm -w --filter @sqlhelper/desktop start
    exit $LASTEXITCODE
}

# Function to cleanup background processes
function Cleanup {
    Write-Host ""
    Write-Host "🧹 Cleaning up processes..." -ForegroundColor Yellow
    
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

Write-Host ""
Write-Host "🚀 Starting development server..." -ForegroundColor Green
Write-Host "   - Renderer will be available at http://localhost:5173" -ForegroundColor Cyan
Write-Host "   - Electron app will launch automatically" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Press Ctrl+C to stop the development server" -ForegroundColor Yellow
Write-Host ""

# Start renderer dev server first and let it choose the port
Write-Host "🚀 Starting renderer dev server..." -ForegroundColor Blue

# Start renderer dev server in the background (let Vite choose port)
$rendererJob = Start-Job -ScriptBlock {
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

# Start desktop app (dev)
$env:NODE_ENV = "development"
$env:RENDERER_URL = "http://localhost:$RENDERER_PORT"
pnpm --filter @sqlhelper/desktop dev

# This line should not be reached due to the trap, but just in case
Cleanup