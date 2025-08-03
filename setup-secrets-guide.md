# Environment Variables Setup Guide

## 🔐 Required GitHub Repository Secrets

Go to: `https://github.com/zumatornado/my-marketplace-project/settings/secrets/actions`

Click "New repository secret" and add each of these:

### 1. `GCP_PROJECT_ID`
**Value:** Your Google Cloud Project ID (e.g., `cool-mile-437217-s2`)
**How to find:** 
- Go to https://console.cloud.google.com
- Look at the top of the page for your project ID

### 2. `GCP_SERVICE_ACCOUNT_KEY`
**Value:** The entire JSON content of your service account key
**How to get:**
```bash
# If you have the key file:
cat path/to/your-service-account-key.json

# Or create a new one:
gcloud iam service-accounts keys create key.json \
  --iam-account=your-service-account@your-project.iam.gserviceaccount.com
```

### 3. `DB_PASSWORD`
**Value:** Strong password for your Cloud SQL database user
**Example:** `mySecurePassword123!`

### 4. `JWT_SECRET`
**Value:** Random string for JWT token signing (32+ characters)
**Generate one:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. `STRIPE_SECRET_KEY`
**Value:** Your Stripe secret key (starts with `sk_test_` or `sk_live_`)
**Where to find:** https://dashboard.stripe.com/apikeys

### 6. `OPENAI_API_KEY`
**Value:** Your OpenAI API key (starts with `sk-`)
**Where to find:** https://platform.openai.com/api-keys

### 7. `TEST_DATABASE_URL` (Optional)
**Value:** Test database connection string
**Example:** `postgresql://test_user:test_pass@localhost:5432/test_db`

## 🚀 Cloud Run Environment Variables

**Good news!** Your GitHub Actions workflow automatically sets these in Cloud Run during deployment using the GitHub secrets above. No manual setup needed!

If you want to verify or update them manually:
1. Go to: https://console.cloud.google.com/run
2. Select your project
3. Click `arzani-marketplace` service
4. Click "Edit & Deploy New Revision"
5. Go to "Variables & Secrets" tab

## 🔍 How to Check Your Current Setup

### Check GitHub Secrets:
1. Go to: https://github.com/zumatornado/my-marketplace-project/settings/secrets/actions
2. You should see all the secret names listed (values are hidden for security)

### Check Cloud Run Environment Variables:
```bash
gcloud run services describe arzani-marketplace \
  --region=europe-west2 \
  --format="export" | grep -A 20 "env:"
```

### Test Locally (without .env.production):
```bash
npm run check:env
```

## 🛠️ Quick Setup Commands

### 1. Get your Google Cloud Project ID:
```bash
gcloud config get-value project
```

### 2. Create a service account (if needed):
```bash
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@PROJECT_ID.iam.gserviceaccount.com
```

### 3. Generate a JWT secret:
```bash
openssl rand -hex 32
```

## ✅ Verification Checklist

- [ ] All 6-7 GitHub secrets are set
- [ ] GitHub Actions workflow runs without errors
- [ ] Application deploys to Cloud Run successfully
- [ ] Environment variables are automatically set in Cloud Run
- [ ] No `.env.production` file in repository (security!)

## 🆘 Troubleshooting

**Error: "secrets.SOME_SECRET not found"**
- Make sure the secret name exactly matches (case-sensitive)
- Check that the secret is set in GitHub repository settings

**Error: "Permission denied"**
- Verify your service account has the correct roles
- Check that the service account key JSON is valid

**Error: "Environment variable missing"**
- Check the Cloud Run service environment variables
- Verify the GitHub Actions deployment step completed successfully
