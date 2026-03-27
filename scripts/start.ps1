#!/usr/bin/env pwsh

# SQLHelper Production Build and Run Script
# This script builds and runs the application in production mode

$ErrorActionPreference = "Stop"

Write-Host "🏗️  Starting SQLHelper Production Build..." -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
if (!(Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script from the SQLHelper project root directory" -ForegroundColor Red
    exit 1
}

# Function to cleanup background processes
function Cleanup {
    Write-Host ""
    Write-Host "🧹 Cleaning up processes..." -ForegroundColor Yellow
    
    # Kill electron production processes
    Get-Process | Where-Object { $_.ProcessName -like "*electron*" -and $_.CommandLine -like "*dist/main.js*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    
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
Write-Host "�🔨 Building all packages for production..." -ForegroundColor Blue
pnpm build

Write-Host ""
Write-Host "🚀 Starting production application..." -ForegroundColor Green
Write-Host ""
Write-Host "💡 Press Ctrl+C to stop the application" -ForegroundColor Yellow
Write-Host ""

# Start production mode
Set-Location "apps/desktop"
pnpm start

# This line should not be reached due to the trap, but just in case
Cleanup