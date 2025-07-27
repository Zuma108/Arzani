# Mobile Navbar Fix Deployment Script (PowerShell)
# This script ensures the mobile navbar fixes are properly deployed

Write-Host "🔧 Applying Mobile Navbar Fixes..." -ForegroundColor Cyan

# Test if files exist
if (Test-Path "public\css\mobile-navbar-fix.css") {
    Write-Host "✅ mobile-navbar-fix.css exists" -ForegroundColor Green
} else {
    Write-Host "❌ mobile-navbar-fix.css missing" -ForegroundColor Red
}

if (Test-Path "public\js\mobile-navbar-fix.js") {
    Write-Host "✅ mobile-navbar-fix.js exists" -ForegroundColor Green
} else {
    Write-Host "❌ mobile-navbar-fix.js missing" -ForegroundColor Red
}

# Clear any cached CSS/JS files by updating timestamps
Write-Host "🧹 Clearing CSS/JS cache..." -ForegroundColor Yellow
Get-ChildItem "public\css\*.css" | ForEach-Object { $_.LastWriteTime = Get-Date }
Get-ChildItem "public\js\*.js" | ForEach-Object { $_.LastWriteTime = Get-Date }

# Restart the application if using PM2
if (Get-Command pm2 -ErrorAction SilentlyContinue) {
    Write-Host "🔄 Restarting PM2 processes..." -ForegroundColor Yellow
    pm2 restart all
}

Write-Host "✅ Mobile Navbar Fix deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 To test the fix:" -ForegroundColor Cyan
Write-Host "1. Open the site on mobile/tablet"
Write-Host "2. Tap the hamburger menu button"
Write-Host "3. The dropdown should show with dark text on white background"
Write-Host "4. If still broken, open browser console and run: debugMobileMenu()"
