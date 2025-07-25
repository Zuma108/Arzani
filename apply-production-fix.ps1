# Production Database Fix Script for Windows
# This script applies the materialized view fix to your AWS RDS production database

Write-Host "🚀 Applying production database fix..." -ForegroundColor Green
Write-Host "📍 Target: my-marketplace.cfwmyg8aso0q.eu-west-2.rds.amazonaws.com" -ForegroundColor Cyan
Write-Host "🔧 Fix: Replace concurrent refresh with safe non-concurrent version" -ForegroundColor Cyan
Write-Host ""

# Database connection details
$DB_HOST = "my-marketplace.cfwmyg8aso0q.eu-west-2.rds.amazonaws.com"
$DB_PORT = "5432"
$DB_NAME = "my_marketplace"
$DB_USER = "marketplace_user"

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "❌ ERROR: psql is not installed or not in PATH" -ForegroundColor Red
    Write-Host "📥 Please install PostgreSQL client tools first" -ForegroundColor Yellow
    Write-Host "💡 Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

Write-Host "🔑 Connecting to production database..." -ForegroundColor Yellow
Write-Host "⚠️  You will be prompted for the database password: Olumide123!" -ForegroundColor Yellow
Write-Host ""

# Apply the fix
& psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER -f "PRODUCTION-DATABASE-FIX.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ SUCCESS: Production database fix applied!" -ForegroundColor Green
    Write-Host "🎉 Your business submission 500 errors should now be resolved!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🧪 Test by submitting a business at: https://www.arzani.co.uk/post-business" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ ERROR: Failed to apply fix to production database" -ForegroundColor Red
    Write-Host "🔍 Please check the connection details and try again" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Manual connection command:" -ForegroundColor Yellow
    Write-Host "psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER" -ForegroundColor White
}

# Pause to keep window open
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
