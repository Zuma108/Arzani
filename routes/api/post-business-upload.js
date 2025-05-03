import express from 'express';
import multer from 'multer';
import { uploadToS3, sanitizeFilename } from '../../utils/s3.js';
import { authenticateToken } from '../../middleware/auth.js';
import path from 'path';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Max 5 files
  },
  fileFilter: (req, file, cb) => {
    // Only accept image files
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  }
});

// Endpoint for handling business image uploads
router.post('/', authenticateToken, upload.array('images', 5), async (req, res) => {
  try {
    console.log('Post business upload request received:', {
      userId: req.user?.userId,
      fileCount: req.files?.length || 0
    });

    // Check authentication
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Check if we have files
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No files uploaded' 
      });
    }

    // Upload each file to S3
    const uploadedFiles = [];
    const uploadErrors = [];

    for (const file of req.files) {
      try {
        // Create a timestamp to avoid filename conflicts
        const timestamp = Date.now();
        
        // Create a sanitized filename with timestamp
        const sanitizedName = sanitizeFilename(file.originalname);
        const filenameWithTimestamp = `${timestamp}-${sanitizedName}_${timestamp}`;
        
        // Create an S3 key with user ID for better organization
        const s3Key = `businesses/${req.user.userId}/${filenameWithTimestamp}`;
        
        // Get region and bucket from environment variables
        const region = process.env.AWS_REGION || 'eu-west-2';
        const bucket = process.env.AWS_BUCKET_NAME || 'arzani-images1';
        
        console.log(`Attempting to upload ${file.originalname} to ${region}/${bucket}/${s3Key}`);

        // Upload to S3
        const s3Url = await uploadToS3(file, s3Key, region, bucket);
        
        // Add to uploaded files
        uploadedFiles.push({
          originalName: file.originalname,
          s3Url,
          s3Key,
          contentType: file.mimetype,
          size: file.size
        });
      } catch (error) {
        console.error('Error uploading file to S3:', error);
        uploadErrors.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }

    // Return the results
    res.json({
      success: uploadedFiles.length > 0,
      files: uploadedFiles,
      errors: uploadErrors.length > 0 ? uploadErrors : undefined,
      message: uploadedFiles.length > 0 
        ? `Successfully uploaded ${uploadedFiles.length} files` 
        : 'No files were uploaded successfully'
    });
  } catch (error) {
    console.error('Post business upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during upload',
      error: error.message
    });
  }
});

export default router;
