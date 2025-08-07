@echo off
REM Fix Database Configuration for Cloud Run

echo 🔧 Fixing database configuration for Cloud Run...

REM Update DATABASE_URL with correct format for Cloud SQL
echo 📝 Updating DATABASE_URL environment variable...
gcloud run services update arzani-marketplace --region=europe-west2 --project=cool-mile-437217-s2 --set-env-vars="DATABASE_URL=postgresql://marketplace_user:Olumide123%%21@localhost:5432/arzani_marketplace?host=/cloudsql/cool-mile-437217-s2:europe-west2:arzani-marketplace-db-v17&sslmode=disable" --quiet

REM Ensure Cloud SQL connection is properly configured
echo 🔗 Adding Cloud SQL instance connection...
gcloud run services update arzani-marketplace --region=europe-west2 --project=cool-mile-437217-s2 --add-cloudsql-instances="cool-mile-437217-s2:europe-west2:arzani-marketplace-db-v17" --quiet

echo ✅ Database configuration updated!
echo.
echo 🔍 Changes made:
echo 1. DATABASE_URL updated with correct Unix socket path
echo 2. Cloud SQL connection instance added  
echo 3. SSL mode set to disable for Cloud SQL proxy
echo.
echo 🚀 Your service will restart automatically with new configuration
