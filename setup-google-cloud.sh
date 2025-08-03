#!/bin/bash

# Google Cloud Setup Script for Arzani Marketplace
# This script helps set up Google Cloud resources for deployment

echo "🚀 Google Cloud Setup for Arzani Marketplace"
echo "============================================="

# Check if gcloud CLI is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI not found!"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1 &> /dev/null; then
    echo "🔐 Please authenticate with Google Cloud:"
    gcloud auth login
fi

# Get project ID
echo "📋 Enter your Google Cloud Project ID:"
read -p "Project ID: " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Project ID is required"
    exit 1
fi

# Set project
gcloud config set project $PROJECT_ID

echo "✅ Using project: $PROJECT_ID"

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sql-component.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# Create Artifact Registry repository
REGION="europe-west2"
REPO_NAME="arzani-marketplace"

echo "📦 Creating Artifact Registry repository..."
gcloud artifacts repositories create $REPO_NAME \
    --repository-format=docker \
    --location=$REGION \
    --description="Arzani Marketplace container images" || echo "Repository may already exist"

# Create service account for GitHub Actions
SERVICE_ACCOUNT_NAME="github-actions-deploy"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "👤 Creating service account for GitHub Actions..."
gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
    --display-name="GitHub Actions Deployment Service Account" \
    --description="Service account for deploying from GitHub Actions" || echo "Service account may already exist"

# Grant necessary permissions
echo "🔐 Granting permissions to service account..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/run.developer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/cloudsql.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/storage.admin"

# Generate service account key
echo "🔑 Generating service account key..."
mkdir -p ./gcp-setup
gcloud iam service-accounts keys create ./gcp-setup/service-account-key.json \
    --iam-account=$SERVICE_ACCOUNT_EMAIL

# Create Cloud SQL instance (optional - can be done in workflow)
echo "🗄️ Do you want to create the Cloud SQL instance now? (y/n)"
read -p "Create Cloud SQL: " CREATE_DB

if [ "$CREATE_DB" = "y" ] || [ "$CREATE_DB" = "Y" ]; then
    echo "📝 Enter database password:"
    read -s -p "Password: " DB_PASSWORD
    echo ""
    
    if [ -z "$DB_PASSWORD" ]; then
        echo "❌ Password is required"
        exit 1
    fi
    
    echo "🗄️ Creating Cloud SQL instance (this may take a few minutes)..."
    gcloud sql instances create arzani-marketplace-db \
        --database-version=POSTGRES_14 \
        --tier=db-f1-micro \
        --region=$REGION \
        --storage-type=SSD \
        --storage-size=10GB \
        --backup-start-time=03:00 \
        --maintenance-window-day=SUN \
        --maintenance-window-hour=04
    
    echo "📋 Creating database and user..."
    gcloud sql databases create arzani_marketplace --instance=arzani-marketplace-db
    gcloud sql users create marketplace_user \
        --instance=arzani-marketplace-db \
        --password=$DB_PASSWORD
    
    echo "✅ Cloud SQL instance created successfully"
fi

# Generate GitHub Secrets documentation
echo "📋 Creating GitHub Secrets documentation..."
cat > ./gcp-setup/github-secrets.md << EOF
# GitHub Secrets Configuration

Add these secrets to your GitHub repository:
Settings > Secrets and variables > Actions > New repository secret

## Required Secrets:

\`\`\`
GCP_PROJECT_ID: $PROJECT_ID
GCP_SERVICE_ACCOUNT_KEY: [Contents of ./gcp-setup/service-account-key.json]
DB_PASSWORD: [Your database password]
JWT_SECRET: [Your JWT secret - keep existing or generate new]
STRIPE_SECRET_KEY: [Your Stripe secret key]
OPENAI_API_KEY: [Your OpenAI API key]
TEST_DATABASE_URL: [Your test database URL]
\`\`\`

## Service Account Key:
Copy the entire contents of ./gcp-setup/service-account-key.json into the GCP_SERVICE_ACCOUNT_KEY secret.

## Database Connection:
Your Cloud SQL instance connection string will be:
\`postgresql://marketplace_user:[DB_PASSWORD]@localhost:5432/arzani_marketplace?host=/cloudsql/$PROJECT_ID:$REGION:arzani-marketplace-db\`

## Next Steps:
1. Add all secrets to GitHub repository
2. Push code to trigger deployment
3. Check Cloud Run console for deployment status
4. Configure custom domain if needed

## Useful Commands:
\`\`\`bash
# View logs
gcloud run services logs read arzani-marketplace --region=$REGION

# Update service
gcloud run services update arzani-marketplace --region=$REGION

# Delete service
gcloud run services delete arzani-marketplace --region=$REGION
\`\`\`
EOF

echo ""
echo "✅ Google Cloud setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Add the GitHub secrets (see ./gcp-setup/github-secrets.md)"
echo "2. Commit and push your code to trigger deployment"
echo "3. Monitor deployment in GitHub Actions"
echo ""
echo "📁 Setup files created in ./gcp-setup/"
echo "   • service-account-key.json (add to GitHub secrets)"
echo "   • github-secrets.md (setup instructions)"
echo ""
echo "🌐 Useful links:"
echo "   • Cloud Run Console: https://console.cloud.google.com/run"
echo "   • Cloud SQL Console: https://console.cloud.google.com/sql"
echo "   • Artifact Registry: https://console.cloud.google.com/artifacts"
echo ""
echo "💰 Cost benefits vs AWS:"
echo "   • Pay per request (no idle costs)"
echo "   • Automatic scaling to zero"
echo "   • Managed database with automatic backups"
echo "   • No server management required"
