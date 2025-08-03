# GitHub Secrets Setup Guide

## Current Issue
Your deployment is failing because the `GCP_PROJECT_ID` secret is not set in GitHub, causing the Docker image URI to be malformed.

## Required GitHub Secrets

Go to: https://github.com/zumatornado/my-marketplace-project/settings/secrets/actions

Add these secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `GCP_PROJECT_ID` | `cool-mile-437217-s2` | Your Google Cloud Project ID |
| `GCP_SERVICE_ACCOUNT_KEY` | `{...json key...}` | Service account JSON key from Google Cloud |
| `DB_PASSWORD` | `your-db-password` | PostgreSQL database password |
| `JWT_SECRET` | `your-jwt-secret` | JWT signing secret (32+ characters) |
| `STRIPE_SECRET_KEY` | `sk_test_...` or `sk_live_...` | Stripe secret key |
| `OPENAI_API_KEY` | `sk-...` | OpenAI API key |

## Quick Check Commands

To verify your Google Cloud setup:

```bash
# Check your current project
gcloud config get-value project

# Check your service account
gcloud auth list

# Test Docker registry access
gcloud auth configure-docker europe-west2-docker.pkg.dev
```

## Service Account JSON Key

If you need to create a new service account key:

```bash
# Create service account
gcloud iam service-accounts create github-actions \
    --description="GitHub Actions deployment" \
    --display-name="GitHub Actions"

# Grant necessary roles
gcloud projects add-iam-policy-binding cool-mile-437217-s2 \
    --member="serviceAccount:github-actions@cool-mile-437217-s2.iam.gserviceaccount.com" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding cool-mile-437217-s2 \
    --member="serviceAccount:github-actions@cool-mile-437217-s2.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

gcloud projects add-iam-policy-binding cool-mile-437217-s2 \
    --member="serviceAccount:github-actions@cool-mile-437217-s2.iam.gserviceaccount.com" \
    --role="roles/sql.admin"

# Create and download key
gcloud iam service-accounts keys create github-key.json \
    --iam-account=github-actions@cool-mile-437217-s2.iam.gserviceaccount.com
```

Then copy the entire contents of `github-key.json` as the `GCP_SERVICE_ACCOUNT_KEY` secret.

## Test Deployment

Once secrets are set, trigger a new deployment by:

1. Making any small change to a file
2. Committing and pushing to main branch
3. Or manually trigger via GitHub Actions tab → "Deploy to Google Cloud Run" → "Run workflow"
