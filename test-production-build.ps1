# Local Production Build Test Script (PowerShell)
# This script tests the production build process locally to verify it works

Write-Host "🧪 LOCAL PRODUCTION BUILD TEST" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (!(Test-Path "package.json") -or !(Test-Path "server.js")) {
    Write-Host "❌ Error: Must run from project root directory with package.json and server.js" -ForegroundColor Red
    exit 1
}

Write-Host "📂 Current directory: $(Get-Location)" -ForegroundColor Blue
Write-Host ""

# Clean up any existing production directory
if (Test-Path "production") {
    Write-Host "🧹 Cleaning up existing production directory..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "production"
}

Write-Host "🔨 Starting local production build test..." -ForegroundColor Green
Write-Host ""

# Create production directory
New-Item -ItemType Directory -Path "production" -Force | Out-Null
Write-Host "✅ Created production directory" -ForegroundColor Green

# Copy essential files
Write-Host "📦 Copying package files..." -ForegroundColor Blue
Copy-Item "package*.json" -Destination "production/" -Force
Write-Host "✅ Copied package*.json files" -ForegroundColor Green

Write-Host "🖥️ Copying server.js..." -ForegroundColor Blue
Copy-Item "server.js" -Destination "production/" -Force
Write-Host "✅ Copied server.js" -ForegroundColor Green

# Copy other essential files
Write-Host "📄 Copying other essential files..." -ForegroundColor Blue
$optionalFiles = @("app.js", "db.js", "config.js")
foreach ($file in $optionalFiles) {
    if (Test-Path $file) {
        Copy-Item $file -Destination "production/" -Force
        Write-Host "✅ Copied $file" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Optional file $file not found, skipping" -ForegroundColor Yellow
    }
}

# Copy application directories
Write-Host "📁 Copying application directories..." -ForegroundColor Blue
$directories = @("public", "views", "routes", "middleware", "libs", "services", "scripts", "migrations", "utils", "socket")
foreach ($dir in $directories) {
    if (Test-Path $dir -PathType Container) {
        Copy-Item $dir -Destination "production/" -Recurse -Force
        Write-Host "✅ Copied $dir directory" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Directory $dir not found, skipping" -ForegroundColor Yellow
    }
}

# Verify production build
Write-Host ""
Write-Host "🔍 Verifying production build..." -ForegroundColor Blue

if (!(Test-Path "production" -PathType Container)) {
    Write-Host "❌ Production directory was not created" -ForegroundColor Red
    exit 1
}

if (!(Test-Path "production/package.json")) {
    Write-Host "❌ package.json not found in production directory" -ForegroundColor Red
    exit 1
}

if (!(Test-Path "production/server.js")) {
    Write-Host "❌ server.js not found in production directory" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Production build verification successful!" -ForegroundColor Green
Write-Host ""

Write-Host "📊 Production directory contents:" -ForegroundColor Blue
Get-ChildItem "production/" | Select-Object -First 20 | Format-Table
Write-Host ""

Write-Host "📏 File sizes:" -ForegroundColor Blue
$packageSize = (Get-Item "production/package.json").Length
$serverSize = (Get-Item "production/server.js").Length
Write-Host "package.json: $packageSize bytes"
Write-Host "server.js: $serverSize bytes"
Write-Host ""

# Test npm install in production directory
Set-Location "production"
Write-Host "📦 Testing npm install in production directory..." -ForegroundColor Blue
try {
    $npmOutput = npm install --production --silent 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ npm install successful" -ForegroundColor Green
    } else {
        Write-Host "❌ npm install failed" -ForegroundColor Red
        Write-Host "Error: $npmOutput" -ForegroundColor Red
        Set-Location ".."
        exit 1
    }
} catch {
    Write-Host "❌ npm install failed with exception: $($_.Exception.Message)" -ForegroundColor Red
    Set-Location ".."
    exit 1
}

Set-Location ".."

Write-Host ""
Write-Host "🎉 LOCAL PRODUCTION BUILD TEST PASSED!" -ForegroundColor Green
Write-Host "Your files are correctly structured for GitHub Actions deployment." -ForegroundColor Green
Write-Host ""

# Cleanup
Write-Host "🧹 Cleaning up test production directory..." -ForegroundColor Yellow
Remove-Item -Recurse -Force "production"
Write-Host "✅ Cleanup complete" -ForegroundColor Green
Write-Host ""
Write-Host "✅ Ready for GitHub Actions deployment!" -ForegroundColor Cyan

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
