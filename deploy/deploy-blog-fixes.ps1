# Blog Content Fixes - PowerShell Deployment Script
# Run this script to apply all blog content fixes to the database

param(
    [string]$DatabaseUrl = $env:DATABASE_URL,
    [switch]$DryRun = $false
)

Write-Host "Blog Content Fixes Deployment Script" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

# Check if we have database URL
if (-not $DatabaseUrl) {
    Write-Host "DATABASE_URL environment variable not found" -ForegroundColor Red
    Write-Host "Please set DATABASE_URL or provide it as a parameter" -ForegroundColor Yellow
    exit 1
}

# Check if PostgreSQL client is available
$pgVersion = psql --version 2>$null
if (-not $pgVersion) {
    Write-Host "PostgreSQL client (psql) not found" -ForegroundColor Red
    Write-Host "Please install PostgreSQL client tools" -ForegroundColor Yellow
    exit 1
}

Write-Host "PostgreSQL client found: $pgVersion" -ForegroundColor Green

$sqlFile = "fix-blog-content-issues-fixed.sql"
$scriptPath = Join-Path (Get-Location) $sqlFile

if (-not (Test-Path $scriptPath)) {
    Write-Host "SQL script not found: $scriptPath" -ForegroundColor Red
    exit 1
}

Write-Host "Found SQL script: $scriptPath" -ForegroundColor Green

if ($DryRun) {
    Write-Host "DRY RUN MODE - No changes will be made" -ForegroundColor Yellow
    Write-Host "SQL script contents:" -ForegroundColor Cyan
    Get-Content $scriptPath | Write-Host -ForegroundColor Gray
    exit 0
}

Write-Host "Applying blog content fixes..." -ForegroundColor Blue

try {
    # Run the SQL script using the DATABASE_URL
    
    $result = psql "$DatabaseUrl" -f "$scriptPath" --set ON_ERROR_STOP=1 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Database fixes applied successfully!" -ForegroundColor Green
        Write-Host "Results:" -ForegroundColor Cyan
        $result | Where-Object { $_ -match "check_type|count" } | Write-Host -ForegroundColor White
    } else {
        Write-Host "Error applying database fixes:" -ForegroundColor Red
        $result | Write-Host -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "Exception occurred: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "" 
Write-Host "Next Steps:" -ForegroundColor Green
Write-Host "1. Restart the blog automation system:" -ForegroundColor White
Write-Host "   node start-blog-automation.js" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Monitor the system:" -ForegroundColor White  
Write-Host "   node monitor-blog-automation.js" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Access the admin dashboard:" -ForegroundColor White
Write-Host "   http://localhost:3000/admin/blog-automation" -ForegroundColor Gray
Write-Host ""
Write-Host "All blog content issues have been resolved!" -ForegroundColor Green
