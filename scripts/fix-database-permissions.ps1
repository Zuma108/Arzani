# Fix Database Permissions Script
# This script connects as postgres superuser and grants permissions to marketplace_user

Write-Host "🔧 Fixing database permissions for marketplace_user..." -ForegroundColor Yellow

# Get the database URL components
$env_file = ".env"
if (Test-Path $env_file) {
    Get-Content $env_file | ForEach-Object {
        if ($_ -match "DATABASE_URL=(.+)") {
            $database_url = $matches[1]
            Write-Host "Found DATABASE_URL in .env file" -ForegroundColor Green
        }
    }
} else {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    exit 1
}

if (-not $database_url) {
    Write-Host "❌ DATABASE_URL not found in .env file!" -ForegroundColor Red
    exit 1
}

# Parse the DATABASE_URL
if ($database_url -match "postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)") {
    $db_user = $matches[1]
    $db_password = $matches[2]
    $db_host = $matches[3]
    $db_port = $matches[4]
    $db_name = $matches[5]
    
    Write-Host "Database details:" -ForegroundColor Cyan
    Write-Host "  Host: $db_host" -ForegroundColor White
    Write-Host "  Port: $db_port" -ForegroundColor White
    Write-Host "  Database: $db_name" -ForegroundColor White
    Write-Host "  Current user: $db_user" -ForegroundColor White
} else {
    Write-Host "❌ Could not parse DATABASE_URL format!" -ForegroundColor Red
    exit 1
}

# Create postgres superuser connection string
$postgres_url = "postgresql://postgres:$db_password@$db_host:$db_port/$db_name"

Write-Host "`n🔄 Attempting to connect as postgres superuser..." -ForegroundColor Yellow

try {
    # Test connection as postgres
    $test_result = psql $postgres_url -c "SELECT current_user;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Successfully connected as postgres superuser" -ForegroundColor Green
        
        # Run the permission fix script
        Write-Host "🔧 Running permission fix script..." -ForegroundColor Yellow
        $result = psql $postgres_url -f "scripts/fix-database-permissions.sql"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Permissions updated successfully!" -ForegroundColor Green
            
            # Test the marketplace_user permissions
            Write-Host "`n🧪 Testing marketplace_user permissions..." -ForegroundColor Yellow
            $test_marketplace = psql $database_url -c "SELECT current_user, 'can connect' as status;" 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ marketplace_user can connect successfully" -ForegroundColor Green
                
                # Test if marketplace_user can create tables
                $create_test = psql $database_url -c "CREATE TABLE IF NOT EXISTS permission_test (id SERIAL PRIMARY KEY, test_column VARCHAR(50)); DROP TABLE IF EXISTS permission_test;" 2>&1
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "✅ marketplace_user can create/drop tables" -ForegroundColor Green
                } else {
                    Write-Host "⚠️  marketplace_user cannot create tables:" -ForegroundColor Yellow
                    Write-Host $create_test -ForegroundColor Red
                }
            } else {
                Write-Host "❌ marketplace_user connection test failed:" -ForegroundColor Red
                Write-Host $test_marketplace -ForegroundColor Red
            }
        } else {
            Write-Host "❌ Permission fix script failed!" -ForegroundColor Red
            Write-Host $result -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Cannot connect as postgres superuser:" -ForegroundColor Red
        Write-Host $test_result -ForegroundColor Red
        
        Write-Host "`n💡 Possible solutions:" -ForegroundColor Yellow
        Write-Host "1. Make sure PostgreSQL is running" -ForegroundColor White
        Write-Host "2. Check if postgres user password is correct" -ForegroundColor White
        Write-Host "3. Try connecting with different superuser credentials" -ForegroundColor White
        Write-Host "4. Run this command manually:" -ForegroundColor White
        Write-Host "   psql -h $db_host -p $db_port -U postgres -d $db_name -f scripts/fix-database-permissions.sql" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Error occurred: $_" -ForegroundColor Red
}

Write-Host "`n🔍 Current status check..." -ForegroundColor Yellow
$status_check = psql $database_url -c "
SELECT 
    current_user as connected_as,
    (SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND tableowner = current_user) as owned_tables,
    (SELECT count(*) FROM pg_tables WHERE schemaname = 'public') as total_tables;
" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Current database status:" -ForegroundColor Green
    Write-Host $status_check -ForegroundColor White
} else {
    Write-Host "Could not check current status:" -ForegroundColor Red
    Write-Host $status_check -ForegroundColor Red
}

Write-Host "`n✨ Permission fix script completed!" -ForegroundColor Green