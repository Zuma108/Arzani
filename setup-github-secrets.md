# GitHub Secrets Setup Guide

Go to: https://github.com/zumatornado/my-marketplace-project/settings/secrets/actions

Add these secrets by clicking "New repository secret":

## Required Secrets

### 1. GCP_PROJECT_ID
```
cool-mile-437217-s2
```

### 2. DB_PASSWORD  
```
Olumide123!
```

### 3. JWT_SECRET
```
your-secure-secret-key-here123321123
```

### 4. STRIPE_SECRET_KEY
```
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
```

### 5. OPENAI_API_KEY
```
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
```

### 6. GCP_SERVICE_ACCOUNT_KEY
You need to create a service account key for this. Follow these steps:

1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=cool-mile-437217-s2
2. Click "Create Service Account"
3. Name: `github-actions-deployer`
4. Grant these roles:
   - Cloud Run Admin
   - Cloud SQL Admin
   - Artifact Registry Writer
   - Storage Admin
5. Click "Create Key" → "JSON"
6. Copy the entire JSON content and paste as the secret value

## Optional Secrets (for testing)

### TEST_DATABASE_URL
```
postgresql://marketplace_user:Olumide123!@localhost:5432/arzani_marketplace_test
```

## Verification

After adding all secrets, they should appear in your repository secrets list. Then push your code changes to trigger the deployment.
