import express from 'express';
import multer from 'multer';
import { uploadToS3, sanitizeFilename } from '../../utils/s3.js';
import { authenticateToken } from '../../middleware/auth.js';
import path from 'path';

const router = express.Router();

// Configure multer for memory storage with increased limits
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // Increased to 10MB limit
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
      fileCount: req.files?.length || 0,
      fileNames: req.files?.map(f => f.originalname).join(', ') || 'none',
      fileSizes: req.files?.map(f => f.size).join(', ') || 'none'
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
    const userId = req.user.userId;

    // Process just the first file if multiple were sent
    const file = req.files[0];
    try {
      // Check file size
      if (file.size > 10 * 1024 * 1024) {
        return res.status(413).json({
          success: false,
          message: `File ${file.originalname} exceeds the maximum size limit of 10MB`
        });
      }
      
      // Log file information
      console.log(`Processing file: ${file.originalname}, size: ${file.size} bytes, type: ${file.mimetype}`);
      
      // Create a timestamp to avoid filename conflicts
      const timestamp = Date.now();
      
      // Create a sanitized filename with timestamp
      const originalName = file.originalname;
      const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filenameWithTimestamp = `${timestamp}-${sanitizedName}`;
      
      // Create an S3 key with user ID for better organization
      const s3Key = `businesses/${userId}/${filenameWithTimestamp}`;
      
      // Get region and bucket from environment variables
      const region = process.env.AWS_REGION || 'eu-west-2';
      const bucket = process.env.AWS_BUCKET_NAME || 'arzani-images1';
      
      console.log(`Attempting to upload ${originalName} to ${region}/${bucket}/${s3Key}`);

      // Upload to S3
      const s3Url = await uploadToS3(file, s3Key, region, bucket);
      console.log(`Successfully uploaded ${originalName} to S3: ${s3Url}`);
      
      // Add to uploaded files with the structure the client expects
      uploadedFiles.push({
        originalName: originalName,
        s3Url,
        s3Key
      });
      
      // Return success response immediately with the format client expects
      return res.json({
        success: true,
        files: uploadedFiles,
        url: s3Url // Important: Add this for backward compatibility
      });
      
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload file to S3',
        error: error.message
      });
    }
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
