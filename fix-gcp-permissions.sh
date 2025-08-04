#!/bin/bash

# Fix GCP permissions for Cloud Run deployment
# This script fixes the IAM permission issues seen in the deployment logs

PROJECT_ID="cool-mile-437217-s2"
SERVICE_ACCOUNT="github-actions-deploy@${PROJECT_ID}.iam.gserviceaccount.com"
REGION="europe-west2"
SERVICE_NAME="arzani-marketplace"

echo "🔧 Fixing GCP permissions for Cloud Run deployment..."
echo "📋 Project ID: $PROJECT_ID"
echo "👤 Service Account: $SERVICE_ACCOUNT"
echo "🌍 Region: $REGION"

# Required roles for Cloud Run deployment with IAM policy management
REQUIRED_ROLES=(
    "roles/run.admin"
    "roles/iam.serviceAccountUser" 
    "roles/cloudsql.client"
    "roles/storage.admin"
    "roles/cloudbuild.builds.builder"
    "roles/artifactregistry.writer"
    "roles/run.invoker"
)

# Add required roles to the service account
echo "🔐 Adding required IAM roles..."
for role in "${REQUIRED_ROLES[@]}"; do
    echo "Adding role: $role"
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT" \
        --role="$role" \
        --quiet
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added role: $role"
    else
        echo "❌ Failed to add role: $role"
    fi
done

# Specifically grant setIamPolicy permission for the Cloud Run service
echo "🎯 Granting specific IAM policy permissions for Cloud Run service..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/resourcemanager.projectIamAdmin" \
    --quiet

# Grant permission to set IAM policies on Cloud Run services
echo "🔧 Granting Cloud Run IAM management permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/run.admin" \
    --quiet

# Enable required APIs if not already enabled
echo "🔌 Ensuring required APIs are enabled..."
REQUIRED_APIS=(
    "run.googleapis.com"
    "cloudbuild.googleapis.com"
    "sqladmin.googleapis.com"
    "artifactregistry.googleapis.com"
    "iam.googleapis.com"
)

for api in "${REQUIRED_APIS[@]}"; do
    echo "Enabling API: $api"
    gcloud services enable $api --project=$PROJECT_ID --quiet
done

# Verify the service account has the correct permissions
echo "🔍 Verifying service account permissions..."
gcloud projects get-iam-policy $PROJECT_ID \
    --flatten="bindings[].members" \
    --filter="bindings.members:serviceAccount:$SERVICE_ACCOUNT" \
    --format="table(bindings.role)"

echo "✅ Permission fix completed!"
echo ""
echo "📝 Next steps:"
echo "1. Wait a few minutes for IAM changes to propagate"
echo "2. Re-run your GitHub Actions deployment"
echo "3. The deployment should now have the necessary permissions"
echo ""
echo "🚨 If you still encounter permission issues, run:"
echo "   gcloud iam service-accounts describe $SERVICE_ACCOUNT"
