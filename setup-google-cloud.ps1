# Google Cloud Setup Script for Arzani Marketplace (PowerShell)
# This script helps set up Google Cloud resources for deployment

Write-Host "🚀 Google Cloud Setup for Arzani Marketplace" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Check if gcloud CLI is installed
if (!(Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Google Cloud CLI not found!" -ForegroundColor Red
    Write-Host "Please install it from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Check if user is authenticated
$authCheck = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
if (!$authCheck) {
    Write-Host "🔐 Please authenticate with Google Cloud:" -ForegroundColor Yellow
    gcloud auth login
}

# Get project ID
$PROJECT_ID = Read-Host "📋 Enter your Google Cloud Project ID"

if ([string]::IsNullOrEmpty($PROJECT_ID)) {
    Write-Host "❌ Project ID is required" -ForegroundColor Red
    exit 1
}

# Set project
gcloud config set project $PROJECT_ID

Write-Host "✅ Using project: $PROJECT_ID" -ForegroundColor Green

# Enable required APIs
Write-Host "🔧 Enabling required APIs..." -ForegroundColor Yellow
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sql-component.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# Create Artifact Registry repository
$REGION = "europe-west2"
$REPO_NAME = "arzani-marketplace"

Write-Host "📦 Creating Artifact Registry repository..." -ForegroundColor Yellow
gcloud artifacts repositories create $REPO_NAME `
    --repository-format=docker `
    --location=$REGION `
    --description="Arzani Marketplace container images" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Repository may already exist" -ForegroundColor Yellow
}

# Create service account for GitHub Actions
$SERVICE_ACCOUNT_NAME = "github-actions-deploy"
$SERVICE_ACCOUNT_EMAIL = "${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

Write-Host "👤 Creating service account for GitHub Actions..." -ForegroundColor Yellow
gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME `
    --display-name="GitHub Actions Deployment Service Account" `
    --description="Service account for deploying from GitHub Actions" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Service account may already exist" -ForegroundColor Yellow
}

# Grant necessary permissions
Write-Host "🔐 Granting permissions to service account..." -ForegroundColor Yellow
gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" `
    --role="roles/run.developer"

gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" `
    --role="roles/cloudsql.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" `
    --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" `
    --role="roles/storage.admin"

# Generate service account key
Write-Host "🔑 Generating service account key..." -ForegroundColor Yellow
if (!(Test-Path "./gcp-setup")) {
    New-Item -ItemType Directory -Path "./gcp-setup"
}
gcloud iam service-accounts keys create ./gcp-setup/service-account-key.json `
    --iam-account=$SERVICE_ACCOUNT_EMAIL

# Create Cloud SQL instance (optional)
$CREATE_DB = Read-Host "🗄️ Do you want to create the Cloud SQL instance now? (y/n)"

if ($CREATE_DB -eq "y" -or $CREATE_DB -eq "Y") {
    $DB_PASSWORD = Read-Host "📝 Enter database password" -AsSecureString
    $DB_PASSWORD_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD))
    
    if ([string]::IsNullOrEmpty($DB_PASSWORD_PLAIN)) {
        Write-Host "❌ Password is required" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "🗄️ Creating Cloud SQL instance (this may take a few minutes)..." -ForegroundColor Yellow
    gcloud sql instances create arzani-marketplace-db `
        --database-version=POSTGRES_14 `
        --tier=db-f1-micro `
        --region=$REGION `
        --storage-type=SSD `
        --storage-size=10GB `
        --backup-start-time=03:00 `
        --maintenance-window-day=SUN `
        --maintenance-window-hour=04
    
    Write-Host "📋 Creating database and user..." -ForegroundColor Yellow
    gcloud sql databases create arzani_marketplace --instance=arzani-marketplace-db
    gcloud sql users create marketplace_user `
        --instance=arzani-marketplace-db `
        --password=$DB_PASSWORD_PLAIN
    
    Write-Host "✅ Cloud SQL instance created successfully" -ForegroundColor Green
}

# Generate GitHub Secrets documentation
Write-Host "Creating GitHub Secrets documentation..." -ForegroundColor Yellow
$secretsContent = @"
# GitHub Secrets Configuration

Add these secrets to your GitHub repository:
Settings - Secrets and variables - Actions - New repository secret

## Required Secrets:

GCP_PROJECT_ID: $PROJECT_ID
GCP_SERVICE_ACCOUNT_KEY: [Contents of ./gcp-setup/service-account-key.json]
DB_PASSWORD: [Your database password]
JWT_SECRET: [Your JWT secret - keep existing or generate new]
STRIPE_SECRET_KEY: [Your Stripe secret key]
OPENAI_API_KEY: [Your OpenAI API key]
TEST_DATABASE_URL: [Your test database URL]

## Service Account Key:
Copy the entire contents of ./gcp-setup/service-account-key.json into the GCP_SERVICE_ACCOUNT_KEY secret.

## Database Connection:
Your Cloud SQL instance connection string will be:
postgresql://marketplace_user:[DB_PASSWORD]@localhost:5432/arzani_marketplace?host=/cloudsql/${PROJECT_ID}:${REGION}:arzani-marketplace-db

## Next Steps:
- Add all secrets to GitHub repository
- Push code to trigger deployment  
- Check Cloud Run console for deployment status
- Configure custom domain if needed

## Useful Commands:
# View logs
gcloud run services logs read arzani-marketplace --region=$REGION

# Update service
gcloud run services update arzani-marketplace --region=$REGION

# Delete service
gcloud run services delete arzani-marketplace --region=$REGION
"@

$secretsContent | Out-File -FilePath "gcp-setup/github-secrets.md" -Encoding UTF8

Write-Host ""
Write-Host "Google Cloud setup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Add the GitHub secrets (see ./gcp-setup/github-secrets.md)"
Write-Host "2. Commit and push your code to trigger deployment"
Write-Host "3. Monitor deployment in GitHub Actions"
Write-Host ""
Write-Host "Setup files created in ./gcp-setup/" -ForegroundColor Cyan
Write-Host "   • service-account-key.json (add to GitHub secrets)"
Write-Host "   • github-secrets.md (setup instructions)"
Write-Host ""
Write-Host "Useful links:" -ForegroundColor Cyan
Write-Host "   • Cloud Run Console: https://console.cloud.google.com/run"
Write-Host "   • Cloud SQL Console: https://console.cloud.google.com/sql"
Write-Host "   • Artifact Registry: https://console.cloud.google.com/artifacts"
Write-Host ""
Write-Host "Cost benefits vs AWS:" -ForegroundColor Green
Write-Host "   • Pay per request (no idle costs)"
Write-Host "   • Automatic scaling to zero"
Write-Host "   • Managed database with automatic backups"
Write-Host "   • No server management required"
