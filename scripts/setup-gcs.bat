@echo off
setlocal EnableDelayedExpansion

:: Google Cloud Storage Setup Script for Arzani Marketplace (Windows)
:: This script helps set up GCS bucket and service account for profile picture storage

echo.
echo =================================================
echo 🚀 Arzani Marketplace - Google Cloud Storage Setup
echo =================================================
echo.

:: Configuration
set PROJECT_ID=arzani-marketplace
set BUCKET_NAME=arzani-marketplace-files
set SERVICE_ACCOUNT_NAME=arzani-storage-sa
set SERVICE_ACCOUNT_EMAIL=%SERVICE_ACCOUNT_NAME%@%PROJECT_ID%.iam.gserviceaccount.com
set KEY_FILE=gcs-service-account-key.json

echo 📋 Configuration:
echo   Project ID: %PROJECT_ID%
echo   Bucket Name: %BUCKET_NAME%
echo   Service Account: %SERVICE_ACCOUNT_EMAIL%
echo.

:: Check if gcloud CLI is installed
gcloud version >nul 2>&1
if errorlevel 1 (
    echo ❌ Google Cloud CLI (gcloud) is not installed
    echo Please install it from: https://cloud.google.com/sdk/docs/install
    pause
    exit /b 1
)

echo ✅ Google Cloud CLI found
echo.

:: Check if user is authenticated
echo 🔐 Checking authentication...
gcloud auth list --filter=status:ACTIVE --format="value(account)" | findstr "@" >nul
if errorlevel 1 (
    echo ❌ Not authenticated with Google Cloud
    echo Please run: gcloud auth login
    pause
    exit /b 1
)

echo ✅ Authenticated with Google Cloud
echo.

:: Set project
echo 🔧 Setting project...
gcloud config set project %PROJECT_ID%

:: Check if project exists
gcloud projects describe %PROJECT_ID% >nul 2>&1
if errorlevel 1 (
    echo 📝 Creating project %PROJECT_ID%...
    gcloud projects create %PROJECT_ID% --name="Arzani Marketplace"
    
    echo ⚠️ Please enable billing for project %PROJECT_ID% in the Google Cloud Console
    echo    https://console.cloud.google.com/billing/linkedaccount?project=%PROJECT_ID%
    pause
)

:: Enable required APIs
echo 🔌 Enabling required APIs...
gcloud services enable storage.googleapis.com --project=%PROJECT_ID%
gcloud services enable iam.googleapis.com --project=%PROJECT_ID%

:: Create service account
echo 👤 Creating service account...
gcloud iam service-accounts describe %SERVICE_ACCOUNT_EMAIL% --project=%PROJECT_ID% >nul 2>&1
if errorlevel 1 (
    gcloud iam service-accounts create %SERVICE_ACCOUNT_NAME% --display-name="Arzani Storage Service Account" --description="Service account for Arzani Marketplace file storage" --project=%PROJECT_ID%
    echo ✅ Service account created
) else (
    echo ✅ Service account already exists
)

:: Grant necessary permissions
echo 🔐 Granting permissions...
gcloud projects add-iam-policy-binding %PROJECT_ID% --member="serviceAccount:%SERVICE_ACCOUNT_EMAIL%" --role="roles/storage.admin"

:: Create service account key
echo 🔑 Creating service account key...
if exist "%KEY_FILE%" (
    echo ⚠️ Key file already exists. Creating backup...
    set TIMESTAMP=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
    set TIMESTAMP=!TIMESTAMP: =0!
    move "%KEY_FILE%" "%KEY_FILE%.backup.!TIMESTAMP!"
)

gcloud iam service-accounts keys create %KEY_FILE% --iam-account=%SERVICE_ACCOUNT_EMAIL% --project=%PROJECT_ID%
echo ✅ Service account key created: %KEY_FILE%

:: Create GCS bucket
echo 🪣 Creating GCS bucket...
gsutil ls -b gs://%BUCKET_NAME% >nul 2>&1
if errorlevel 1 (
    gsutil mb -p %PROJECT_ID% -c STANDARD -l europe-west2 gs://%BUCKET_NAME%
    echo ✅ Bucket created: gs://%BUCKET_NAME%
) else (
    echo ✅ Bucket already exists
)

:: Set bucket permissions for public read access
echo 🔓 Setting bucket permissions...
gsutil iam ch allUsers:objectViewer gs://%BUCKET_NAME%

:: Enable uniform bucket-level access
gsutil uniformbucketlevelaccess set on gs://%BUCKET_NAME%

:: Create bucket lifecycle policy
echo 📋 Setting up lifecycle policy...
echo { > lifecycle.json
echo   "lifecycle": { >> lifecycle.json
echo     "rule": [ >> lifecycle.json
echo       { >> lifecycle.json
echo         "action": {"type": "Delete"}, >> lifecycle.json
echo         "condition": { >> lifecycle.json
echo           "age": 365, >> lifecycle.json
echo           "matchesPrefix": ["temp/"] >> lifecycle.json
echo         } >> lifecycle.json
echo       } >> lifecycle.json
echo     ] >> lifecycle.json
echo   } >> lifecycle.json
echo } >> lifecycle.json

gsutil lifecycle set lifecycle.json gs://%BUCKET_NAME%
del lifecycle.json

echo.
echo 🎉 Google Cloud Storage setup complete!
echo.
echo 📋 Summary:
echo   ✅ Project: %PROJECT_ID%
echo   ✅ Bucket: gs://%BUCKET_NAME%
echo   ✅ Service Account: %SERVICE_ACCOUNT_EMAIL%
echo   ✅ Key File: %KEY_FILE%
echo.
echo 🔧 Environment Variables:
echo   GOOGLE_CLOUD_PROJECT_ID=%PROJECT_ID%
echo   GCS_BUCKET_NAME=%BUCKET_NAME%
echo   GOOGLE_APPLICATION_CREDENTIALS=./%KEY_FILE%
echo.
echo 📝 Next Steps:
echo   1. The environment variables are already set in your .env file
echo   2. The service account key has been saved to %KEY_FILE%
echo   3. Keep the key file secure and don't commit it to version control
echo   4. Your application should now be able to upload files to GCS
echo.
echo ✨ You're all set! Profile pictures will now be stored in Google Cloud Storage.
echo.
pause