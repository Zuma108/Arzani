#!/bin/bash

# Production Database Fix Script
# This script applies the materialized view fix to your AWS RDS production database

echo "🚀 Applying production database fix..."
echo "📍 Target: my-marketplace.cfwmyg8aso0q.eu-west-2.rds.amazonaws.com"
echo "🔧 Fix: Replace concurrent refresh with safe non-concurrent version"
echo ""

# Database connection details
DB_HOST="my-marketplace.cfwmyg8aso0q.eu-west-2.rds.amazonaws.com"
DB_PORT="5432"
DB_NAME="my_marketplace"
DB_USER="marketplace_user"

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ ERROR: psql is not installed or not in PATH"
    echo "📥 Please install PostgreSQL client tools first"
    exit 1
fi

echo "🔑 Connecting to production database..."
echo "⚠️  You will be prompted for the database password"
echo ""

# Apply the fix
psql -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER" -f "PRODUCTION-DATABASE-FIX.sql"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS: Production database fix applied!"
    echo "🎉 Your business submission 500 errors should now be resolved!"
    echo ""
    echo "🧪 Test by submitting a business at: https://www.arzani.co.uk/post-business"
else
    echo ""
    echo "❌ ERROR: Failed to apply fix to production database"
    echo "🔍 Please check the connection details and try again"
    echo ""
    echo "Manual connection command:"
    echo "psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER"
fi
