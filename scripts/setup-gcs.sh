#!/bin/bash

# Google Cloud Storage Setup Script for Arzani Marketplace
# This script helps set up GCS bucket and service account for profile picture storage

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Arzani Marketplace - Google Cloud Storage Setup${NC}"
echo "================================================="

# Check if gcloud CLI is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud CLI (gcloud) is not installed${NC}"
    echo -e "${YELLOW}Please install it from: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Google Cloud CLI found${NC}"

# Configuration
PROJECT_ID="arzani-marketplace"
BUCKET_NAME="arzani-marketplace-files"
SERVICE_ACCOUNT_NAME="arzani-storage-sa"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
KEY_FILE="gcs-service-account-key.json"

echo -e "${BLUE}📋 Configuration:${NC}"
echo "  Project ID: $PROJECT_ID"
echo "  Bucket Name: $BUCKET_NAME"
echo "  Service Account: $SERVICE_ACCOUNT_EMAIL"
echo ""

# Check if user is authenticated
echo -e "${YELLOW}🔐 Checking authentication...${NC}"
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    echo -e "${RED}❌ Not authenticated with Google Cloud${NC}"
    echo -e "${YELLOW}Please run: gcloud auth login${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Authenticated with Google Cloud${NC}"

# Set project
echo -e "${YELLOW}🔧 Setting project...${NC}"
gcloud config set project $PROJECT_ID

# Check if project exists, if not create it
if ! gcloud projects describe $PROJECT_ID &> /dev/null; then
    echo -e "${YELLOW}📝 Creating project $PROJECT_ID...${NC}"
    gcloud projects create $PROJECT_ID --name="Arzani Marketplace"
    
    # Enable billing (you'll need to do this manually in the console)
    echo -e "${YELLOW}⚠️ Please enable billing for project $PROJECT_ID in the Google Cloud Console${NC}"
    echo -e "${YELLOW}   https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID${NC}"
    read -p "Press Enter when billing is enabled..."
fi

# Enable required APIs
echo -e "${YELLOW}🔌 Enabling required APIs...${NC}"
gcloud services enable storage.googleapis.com --project=$PROJECT_ID
gcloud services enable iam.googleapis.com --project=$PROJECT_ID

# Create service account
echo -e "${YELLOW}👤 Creating service account...${NC}"
if ! gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL --project=$PROJECT_ID &> /dev/null; then
    gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
        --display-name="Arzani Storage Service Account" \
        --description="Service account for Arzani Marketplace file storage" \
        --project=$PROJECT_ID
    echo -e "${GREEN}✅ Service account created${NC}"
else
    echo -e "${GREEN}✅ Service account already exists${NC}"
fi

# Grant necessary permissions
echo -e "${YELLOW}🔐 Granting permissions...${NC}"
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/storage.admin"

# Create service account key
echo -e "${YELLOW}🔑 Creating service account key...${NC}"
if [ -f "$KEY_FILE" ]; then
    echo -e "${YELLOW}⚠️ Key file already exists. Creating backup...${NC}"
    mv "$KEY_FILE" "${KEY_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
fi

gcloud iam service-accounts keys create $KEY_FILE \
    --iam-account=$SERVICE_ACCOUNT_EMAIL \
    --project=$PROJECT_ID

echo -e "${GREEN}✅ Service account key created: $KEY_FILE${NC}"

# Create GCS bucket
echo -e "${YELLOW}🪣 Creating GCS bucket...${NC}"
if gsutil ls -b gs://$BUCKET_NAME &> /dev/null; then
    echo -e "${GREEN}✅ Bucket already exists${NC}"
else
    gsutil mb -p $PROJECT_ID -c STANDARD -l europe-west2 gs://$BUCKET_NAME
    echo -e "${GREEN}✅ Bucket created: gs://$BUCKET_NAME${NC}"
fi

# Set bucket permissions for public read access (for profile pictures)
echo -e "${YELLOW}🔓 Setting bucket permissions...${NC}"
gsutil iam ch allUsers:objectViewer gs://$BUCKET_NAME

# Enable uniform bucket-level access
gsutil uniformbucketlevelaccess set on gs://$BUCKET_NAME

# Create bucket lifecycle policy to manage old files
echo -e "${YELLOW}📋 Setting up lifecycle policy...${NC}"
cat > lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 365,
          "matchesPrefix": ["temp/"]
        }
      }
    ]
  }
}
EOF

gsutil lifecycle set lifecycle.json gs://$BUCKET_NAME
rm lifecycle.json

echo ""
echo -e "${GREEN}🎉 Google Cloud Storage setup complete!${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo "  ✅ Project: $PROJECT_ID"
echo "  ✅ Bucket: gs://$BUCKET_NAME"
echo "  ✅ Service Account: $SERVICE_ACCOUNT_EMAIL"
echo "  ✅ Key File: $KEY_FILE"
echo ""
echo -e "${YELLOW}🔧 Environment Variables:${NC}"
echo "  GOOGLE_CLOUD_PROJECT_ID=$PROJECT_ID"
echo "  GCS_BUCKET_NAME=$BUCKET_NAME"
echo "  GOOGLE_APPLICATION_CREDENTIALS=./$KEY_FILE"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "  1. The environment variables are already set in your .env file"
echo "  2. The service account key has been saved to $KEY_FILE"
echo "  3. Keep the key file secure and don't commit it to version control"
echo "  4. Your application should now be able to upload files to GCS"
echo ""
echo -e "${GREEN}✨ You're all set! Profile pictures will now be stored in Google Cloud Storage.${NC}"