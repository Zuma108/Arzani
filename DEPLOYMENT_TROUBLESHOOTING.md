# Google Cloud Run Deployment Troubleshooting Guide

This guide helps you troubleshoot common issues with deploying the Arzani Marketplace to Google Cloud Run.

## 🔍 Common Issues and Solutions

### 1. Container Failed to Start - PORT Issue

**Error:** "The container failed to start and listen on PORT=8080"

**Solution:**
- ✅ **FIXED**: Updated `server.js` to use `process.env.PORT || 8080` (was 5000)
- ✅ **FIXED**: Server now binds to `0.0.0.0` (required for Cloud Run)
- ✅ **FIXED**: Added better startup logging

**Verification:**
```bash
# Check the server.js PORT configuration
grep -n "const PORT" server.js
# Should show: const PORT = process.env.PORT || 8080;
```

### 2. Production Directory Not Created

**Error:** "Production directory was not created successfully"

**Solution:**
- ✅ **FIXED**: Improved production build script in GitHub Actions
- ✅ **FIXED**: Added explicit directory creation and validation
- ✅ **FIXED**: Better error handling and logging

**What was changed:**
- More robust file copying process
- Explicit checks for required files (package.json, server.js)
- Better error messages when production build fails

### 3. Missing GitHub Secrets

**Error:** Missing required environment variables

**Solution:**
Add these secrets to your GitHub repository:

1. **DB_PASSWORD** - Your PostgreSQL database password
2. **JWT_SECRET** - Secret key for JWT tokens (use generated value)
3. **STRIPE_SECRET_KEY** - Your Stripe secret key
4. **OPENAI_API_KEY** - Your OpenAI API key

**How to add secrets:**
1. Go to: https://github.com/zumatornado/my-marketplace-project/settings/secrets/actions
2. Click "New repository secret"
3. Add each secret with the exact name above

**Quick setup:**
```powershell
# Run this to get help setting up secrets
.\setup-github-secrets.ps1
```

### 4. IAM Policy Binding Warning

**Error:** Warning about Cloud Run IAM policy

**Solution (if you want public access):**
```bash
gcloud beta run services add-iam-policy-binding \
  --region=europe-west2 \
  --member=allUsers \
  --role=roles/run.invoker \
  arzani-marketplace
```

## 🚀 Deployment Checklist

Before deploying, ensure:

- [ ] All GitHub secrets are set
- [ ] Code is pushed to `main` branch
- [ ] GitHub Actions are enabled
- [ ] Google Cloud credentials are configured
- [ ] Database is set up (handled automatically)

## 🏥 Health Check

Your app includes a health check endpoint at `/health` that provides:
- Service status
- Database connectivity
- Uptime information
- Environment details

Test it locally:
```bash
curl http://localhost:8080/health
```

## 📊 Monitoring Deployment

1. **GitHub Actions Tab:**
   - Monitor build progress
   - Check for errors in real-time
   - View detailed logs

2. **Google Cloud Console:**
   - View service status
   - Check logs and metrics
   - Monitor resource usage

3. **Cloud Run Logs:**
   ```bash
   npm run gcp:logs
   ```

## 🔧 Manual Fixes

If automated deployment fails, you can manually:

1. **Build and push image:**
   ```bash
   # Build locally
   docker build -t arzani-marketplace .
   
   # Tag for Google Cloud
   docker tag arzani-marketplace europe-west2-docker.pkg.dev/cool-mile-437217-s2/arzani-marketplace/arzani-marketplace:latest
   
   # Push
   docker push europe-west2-docker.pkg.dev/cool-mile-437217-s2/arzani-marketplace/arzani-marketplace:latest
   ```

2. **Deploy manually:**
   ```bash
   gcloud run deploy arzani-marketplace \
     --image=europe-west2-docker.pkg.dev/cool-mile-437217-s2/arzani-marketplace/arzani-marketplace:latest \
     --region=europe-west2 \
     --platform=managed \
     --allow-unauthenticated
   ```

## 🛠️ Local Testing

Test your Docker build locally:

```bash
# Build the image
docker build -t arzani-marketplace-local .

# Run locally (similar to Cloud Run)
docker run -p 8080:8080 \
  -e NODE_ENV=production \
  -e PORT=8080 \
  arzani-marketplace-local
```

## 📝 Next Steps After Successful Deployment

1. **Custom Domain:**
   - Set up custom domain in Cloud Run console
   - Update DNS records
   - SSL certificate is automatic

2. **Monitoring:**
   - Set up alerts in Google Cloud Console
   - Configure error reporting
   - Monitor performance metrics

3. **Scaling:**
   - Adjust min/max instances as needed
   - Configure autoscaling triggers
   - Monitor costs

## 🆘 Getting Help

If you're still having issues:

1. Check GitHub Actions logs for detailed error messages
2. Review Cloud Run logs: `npm run gcp:logs`
3. Verify all secrets are set correctly
4. Ensure Google Cloud CLI is properly configured

## 🎯 Success Indicators

Your deployment is successful when:
- ✅ GitHub Actions workflow completes without errors
- ✅ Health check endpoint returns HTTP 200
- ✅ Application loads in browser
- ✅ Database connectivity works
- ✅ All features function properly

The final deployment URL will be displayed in the GitHub Actions output.
