#!/bin/bash

# Fix Database Configuration for Cloud Run
echo "🔧 Fixing database configuration for Cloud Run..."

PROJECT_ID="cool-mile-437217-s2"
SERVICE_NAME="arzani-marketplace"
REGION="europe-west2"
DB_INSTANCE="arzani-marketplace-db-v17"

# Correct DATABASE_URL for Cloud SQL with Unix socket
CORRECT_DATABASE_URL="postgresql://marketplace_user:Olumide123%21@localhost:5432/arzani_marketplace?host=/cloudsql/$PROJECT_ID:$REGION:$DB_INSTANCE&sslmode=disable"

echo "📝 Current DATABASE_URL issues:"
echo "❌ Using localhost without proper Cloud SQL proxy path"
echo "❌ May have SSL configuration issues"
echo ""
echo "✅ Updating to correct format..."

# Update the DATABASE_URL environment variable
gcloud run services update $SERVICE_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --set-env-vars="DATABASE_URL=$CORRECT_DATABASE_URL" \
    --quiet

# Also ensure Cloud SQL connection is properly configured
gcloud run services update $SERVICE_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --add-cloudsql-instances="$PROJECT_ID:$REGION:$DB_INSTANCE" \
    --quiet

echo "✅ Database configuration updated!"
echo ""
echo "🔍 Verification steps:"
echo "1. Database URL updated with correct Unix socket path"
echo "2. Cloud SQL connection instance added"
echo "3. SSL mode set to disable for Cloud SQL proxy"
echo ""
echo "🚀 Your service will restart automatically with new configuration"
