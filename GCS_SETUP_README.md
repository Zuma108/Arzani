# Google Cloud Storage Setup for Profile Pictures

## Overview
The Arzani Marketplace now uses Google Cloud Storage (GCS) instead of AWS S3 for storing profile pictures. This provides better integration and more reliable file uploads.

## What's Been Implemented

### ✅ Code Changes Completed
1. **Sidebar Display Fix**: Updated `views/partials/unified-sidebar.ejs` to show usernames and profile pictures correctly
2. **Database Integration**: Fixed authentication middleware to use correct database columns
3. **GCS Upload System**: Created `utils/gcs.js` with comprehensive file upload functionality
4. **Profile Routes Update**: Modified `routes/profile.routes.js` to use GCS instead of S3
5. **Environment Configuration**: Added GCS variables to `.env` file
6. **Security**: Updated `.gitignore` to prevent committing service account keys

### 📋 Files Created/Modified
- `utils/gcs.js` - Google Cloud Storage utility functions
- `scripts/setup-gcs.bat` - Windows setup script for GCS
- `scripts/setup-gcs.sh` - Linux/Mac setup script for GCS  
- `test-gcs.js` - Test script to verify GCS configuration
- `routes/profile.routes.js` - Updated to use GCS uploads
- `middleware/auth.js` - Fixed database queries
- `views/partials/unified-sidebar.ejs` - Updated user display
- `.env` - Added GCS configuration variables
- `.gitignore` - Added GCS key file exclusion

## Next Steps to Complete Setup

### 1. Install Google Cloud CLI
If you haven't already, install the Google Cloud CLI:
- Download from: https://cloud.google.com/sdk/docs/install
- Follow the installation instructions for Windows

### 2. Run the GCS Setup Script
Execute the setup script to create your GCS bucket and service account:

```powershell
# Option 1: Using npm script (recommended)
npm run setup:gcs

# Option 2: Direct execution
./scripts/setup-gcs.bat
```

This script will:
- ✅ Check if Google Cloud CLI is installed
- ✅ Authenticate you with Google Cloud (if needed)
- ✅ Create a new Google Cloud project "arzani-marketplace"
- ✅ Enable required APIs (Storage, IAM)
- ✅ Create a service account for file uploads
- ✅ Generate a service account key file
- ✅ Create a GCS bucket "arzani-marketplace-files"
- ✅ Set proper permissions for public read access
- ✅ Configure lifecycle policies for old files

### 3. Test the Configuration
After running the setup script, test that everything works:

```powershell
npm run test:gcs
```

This will verify:
- Environment variables are set correctly
- Service account key is valid
- GCS bucket is accessible
- File uploads work properly
- Uploaded files are publicly accessible

### 4. Start Your Application
Once the GCS setup is complete, start your application:

```powershell
npm start
```

## How It Works

### File Upload Process
1. User uploads a profile picture through the web interface
2. Multer middleware processes the file upload
3. `uploadToGCS()` function uploads the file to Google Cloud Storage
4. File is stored with a unique name based on user ID and timestamp
5. Public URL is returned and saved to the database
6. Profile picture is displayed in the sidebar and profile page

### Environment Variables
The following variables are automatically configured in your `.env` file:

```env
# Google Cloud Storage Configuration
GOOGLE_CLOUD_PROJECT_ID=arzani-marketplace
GCS_BUCKET_NAME=arzani-marketplace-files
GOOGLE_APPLICATION_CREDENTIALS=./gcs-service-account-key.json
```

### Security Considerations
- ✅ Service account key is excluded from Git commits
- ✅ Files are uploaded with unique names to prevent conflicts
- ✅ Public read access is enabled only for the storage bucket
- ✅ Lifecycle policies automatically clean up old temp files
- ✅ File type validation prevents malicious uploads

## Troubleshooting

### Common Issues

**"gcloud command not found"**
- Install Google Cloud CLI from the official website
- Restart your terminal after installation

**"Not authenticated with Google Cloud"**
- Run: `gcloud auth login`
- Follow the browser authentication flow

**"Permission denied"**
- Make sure you have owner/editor permissions on the Google Cloud project
- Check that billing is enabled for the project

**"Bucket already exists"**
- This is normal if you've run the setup before
- The script will use the existing bucket

**"Upload fails with 403 error"**
- Check that the service account key file exists
- Verify the service account has Storage Admin permissions
- Make sure the bucket name in .env matches the actual bucket

### Getting Help
If you encounter issues:
1. Check the console output for specific error messages
2. Run `npm run test:gcs` to identify configuration problems
3. Verify your `.env` file has all required variables
4. Make sure the `gcs-service-account-key.json` file exists and is valid

## File Storage Details

### Bucket Structure
```
arzani-marketplace-files/
├── profile-pictures/
│   ├── user-123-1640995200000.jpg
│   ├── user-456-1640995300000.png
│   └── ...
└── temp/
    └── (automatically cleaned after 365 days)
```

### Public URLs
Uploaded files are accessible via public URLs like:
```
https://storage.googleapis.com/arzani-marketplace-files/profile-pictures/user-123-1640995200000.jpg
```

## Cost Considerations
- Google Cloud Storage offers 5GB free tier per month
- Profile pictures are typically small (< 1MB each)
- Lifecycle policies automatically clean up old files
- Public access is read-only and limited to your bucket

---

🎉 **Your profile picture system is now ready!** Users can upload profile pictures that will be stored securely in Google Cloud Storage and displayed throughout the application.