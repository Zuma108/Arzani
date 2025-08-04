# Cloud Run Deployment Issues - Comprehensive Fix

## Issues Identified

Based on the Google Cloud Run deployment errors, we identified several critical issues:

### 1. Database Connection Issue (Primary Cause)
- **Error**: `Error: connect ECONNREFUSED 127.0.0.1:5432`
- **Root Cause**: The application was not properly configured to use Cloud SQL proxy connection
- **Impact**: Container failed to start within the allocated timeout

### 2. IAM Permission Issue
- **Error**: `Permission 'run.services.setIamPolicy' denied`
- **Root Cause**: The GitHub Actions service account lacks necessary permissions
- **Impact**: Deployment fails when trying to set IAM policies (--allow-unauthenticated)

### 3. Container Startup Timeout
- **Error**: `Container failed to start and listen on port 8080 within allocated timeout`
- **Root Cause**: Database connection failures preventing proper startup
- **Impact**: Health checks fail, service marked as unhealthy

## Solutions Implemented

### 1. Fixed Database Connection Configuration

**File**: `db.js`
- Updated to properly parse `DATABASE_URL` for Cloud SQL proxy connections
- Added comprehensive SSL configuration handling
- Enhanced error logging for better debugging

**Key Changes**:
```javascript
// Now properly handles DATABASE_URL with Cloud SQL proxy format
if (process.env.DATABASE_URL) {
  connectionConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: useSSL ? { rejectUnauthorized: false } : false
  };
}
```

### 2. Enhanced Container Startup

**File**: `startup.sh` (New)
- Pre-validates environment variables and files
- Tests database configuration before app start
- Provides detailed logging for debugging

**File**: `container-startup-diagnostic.js` (Enhanced)
- Comprehensive environment and configuration analysis
- Database connection validation
- File system integrity checks

### 3. Updated Dockerfile

**Key Improvements**:
- Added startup script with validation
- Included diagnostic tools
- Extended health check timeout to 120s
- Enhanced error reporting in health checks

### 4. IAM Permission Fix Script

**File**: `fix-gcp-permissions.sh` (New)
- Grants necessary IAM roles to deployment service account
- Enables required APIs
- Provides verification steps

## Required Actions

### 1. Fix IAM Permissions (Run Once)

```bash
# Make the script executable
chmod +x fix-gcp-permissions.sh

# Run the permission fix script
./fix-gcp-permissions.sh
```

This will add the following roles to the GitHub Actions service account:
- `roles/run.admin`
- `roles/iam.serviceAccountUser`
- `roles/cloudsql.client`
- `roles/storage.admin`
- `roles/cloudbuild.builds.builder`
- `roles/artifactregistry.writer`
- `roles/run.invoker`
- `roles/resourcemanager.projectIamAdmin`

### 2. Verify Environment Variables

Ensure these environment variables are correctly set in Cloud Run:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://marketplace_user:PASSWORD@localhost:5432/arzani_marketplace?host=/cloudsql/PROJECT:REGION:INSTANCE
JWT_SECRET=your-secret-key
DATABASE_SSL=false
PORT=8080
```

### 3. Deploy Updated Configuration

The next deployment should now:
1. Pass IAM permission checks
2. Successfully connect to Cloud SQL via proxy
3. Start within the allocated timeout
4. Pass health checks

## Verification Steps

After deployment, verify the fix by:

1. **Check Cloud Run Logs**:
```bash
gcloud run services logs read arzani-marketplace --region=europe-west2 --limit=50
```

2. **Test Health Endpoint**:
```bash
curl -f https://YOUR_SERVICE_URL/health
```

3. **Verify Database Connection**:
```bash
# Look for successful database connection messages in logs
gcloud run services logs read arzani-marketplace --region=europe-west2 --filter="textPayload:Database connected"
```

## Monitoring and Debugging

### Key Log Messages to Look For

**Successful Startup**:
- `✅ Required environment variables are set`
- `✅ Cloud SQL configuration detected`
- `Database connected successfully`
- `🚀 Container ready to receive traffic`

**Common Issues**:
- `DATABASE_URL is not set` → Environment variable issue
- `Cloud SQL proxy socket directory not found` → Cloud SQL configuration issue
- `Permission denied` → IAM permissions issue

### Health Check Endpoint

The application includes a `/health` endpoint that returns:
```json
{
  "status": "ok",
  "timestamp": "2025-08-04T22:37:01.632Z",
  "database": "connected",
  "environment": "production"
}
```

## Additional Improvements

### 1. Enhanced Error Handling
- Database connection retries
- Graceful fallback for non-critical features
- Detailed error logging

### 2. Performance Optimizations
- Startup time optimization
- Health check improvements
- Resource usage monitoring

### 3. Security Enhancements
- Proper SSL configuration
- Environment variable validation
- Secure credential handling

## Troubleshooting Guide

### If Database Connection Still Fails

1. **Verify Cloud SQL Instance**: Ensure the instance is running and accessible
2. **Check Connection String**: Verify the DATABASE_URL format
3. **Test Cloud SQL Proxy**: Ensure the proxy is properly configured
4. **Review IAM Permissions**: Verify the compute service account has Cloud SQL client permissions

### If Container Still Times Out

1. **Increase Timeout**: Consider increasing the startup probe timeout
2. **Check Dependencies**: Verify all npm dependencies are properly installed
3. **Review Resource Limits**: Ensure adequate CPU and memory allocation
4. **Monitor Startup Time**: Use the diagnostic script to identify bottlenecks

### If IAM Issues Persist

1. **Wait for Propagation**: IAM changes can take up to 5 minutes to propagate
2. **Verify Service Account**: Ensure you're using the correct service account
3. **Check Project Permissions**: Verify you have the necessary project-level permissions
4. **Review Policy Bindings**: Use `gcloud projects get-iam-policy` to verify

This comprehensive fix addresses all identified issues and provides tools for ongoing monitoring and debugging.

## Summary of Files Modified

- ✅ `db.js` - Fixed database connection configuration
- ✅ `startup.sh` - Added container startup validation script
- ✅ `container-startup-diagnostic.js` - Enhanced diagnostic capabilities
- ✅ `Dockerfile` - Updated with startup script and extended timeouts
- ✅ `fix-gcp-permissions.sh` - IAM permission fix script
- ✅ `CONTAINER_STARTUP_FIX.md` - This comprehensive documentation
