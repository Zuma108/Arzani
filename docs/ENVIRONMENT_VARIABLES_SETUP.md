# Environment Variables Setup Guide

## 🔒 Security First: No .env.production in Git

This project follows security best practices by **never committing production environment variables to git**. Instead, we use:

- **GitHub Secrets** for CI/CD pipeline
- **Cloud Run Environment Variables** for production runtime
- **Local .env file** for development (gitignored)

## Required Environment Variables

### Production Deployment (GitHub Secrets)

Set these in your GitHub repository settings → Secrets and variables → Actions:

```bash
# Database
DB_PASSWORD=your_cloud_sql_password

# Authentication
JWT_SECRET=your_jwt_secret_key

# Payment Processing
STRIPE_SECRET_KEY=sk_live_your_stripe_key

# AI Services
OPENAI_API_KEY=your_openai_api_key

# Google Cloud
GCP_PROJECT_ID=your_gcp_project_id
GCP_SERVICE_ACCOUNT_KEY=your_service_account_json
```

### Local Development (.env file)

Create a `.env` file in your project root (this is gitignored):

```bash
# Development Environment
NODE_ENV=development
PORT=3000

# Database (local or development)
DATABASE_URL=postgresql://username:password@localhost:5432/arzani_marketplace

# Authentication
JWT_SECRET=your_local_jwt_secret

# APIs (use test keys for development)
STRIPE_SECRET_KEY=sk_test_your_stripe_test_key
OPENAI_API_KEY=your_openai_api_key

# Optional: A2A Configuration
A2A_AUTH_ENABLED=false
DATABASE_SSL=false

# Optional: AWS (if using S3)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret

# Optional: Email
SENDGRID_API_KEY=your_sendgrid_key

# Optional: OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## Environment Variable Validation

### Check Local Environment

```bash
npm run check:env
```

This script will verify that all required environment variables are present and help you identify any missing ones.

### Pre-deployment Check

```bash
npm run deploy:check
```

This runs both environment validation and build checks before deployment.

## Production Runtime

In Cloud Run, environment variables are automatically set from:

1. **GitHub Secrets** → Passed to the deployment command
2. **Cloud Run Environment Variables** → Set during `gcloud run deploy`
3. **Cloud SQL Connection** → Automatically configured via Cloud SQL proxy

## Security Benefits

✅ **No secrets in git history**
✅ **Encrypted storage in GitHub Secrets**
✅ **Environment-specific configurations**
✅ **Easy secret rotation without code changes**
✅ **Audit trail for secret access**

## Troubleshooting

### Missing Environment Variables in Production

1. Check GitHub repository secrets are set correctly
2. Verify the deployment workflow passes secrets to Cloud Run
3. Use `gcloud run services describe` to check environment variables

### Local Development Issues

1. Ensure `.env` file exists in project root
2. Check `.env` file has all required variables
3. Restart your development server after changing `.env`

### Environment Variable Precedence

1. **Cloud Run environment variables** (highest priority)
2. **GitHub Secrets** (deployment time)
3. **Local .env file** (development only)
4. **Default values** (if any, lowest priority)

## Best Practices

- ✅ Use different secrets for development/staging/production
- ✅ Rotate secrets regularly
- ✅ Use least-privilege principle for API keys
- ✅ Monitor secret usage and access
- ❌ Never commit `.env.production` or any production secrets
- ❌ Never share secrets in chat/email/documentation
- ❌ Never log or expose secrets in application code
