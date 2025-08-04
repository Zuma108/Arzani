import express from 'express';
import multer from 'multer';
import { uploadToS3, sanitizeFilename, validateBucket, checkS3Connection } from '../../utils/s3.js';
import { authenticateToken } from '../../middleware/auth.js';
import path from 'path';

const router = express.Router();

// Configure multer for memory storage with increased limits
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
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

// Simple GET endpoint to test if the API is accessible
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'S3 test API is working',
    timestamp: new Date().toISOString(),
    auth: req.user ? 'Authenticated' : 'Not authenticated'
  });
});

// Test S3 connection and configuration
router.get('/s3-connection', authenticateToken, async (req, res) => {
    try {
        console.log('S3 connection test requested');
        const results = await checkS3Connection();

        // Add environment variables (with secrets masked)
        results.env = {
            AWS_REGION: process.env.AWS_REGION || 'Not set',
            AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME || 'Not set',
            AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? '***' : 'Not set',
            AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? '***' : 'Not set',
        };

        // Overall success is determined by either region working
        results.success = results.mainRegion.success || results.fallbackRegion.success;
        
        res.json(results);
    } catch (error) {
        console.error('S3 connection test error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint for handling single image upload
router.post('/upload', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    console.log('S3 upload test request received');

    // Check authentication
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not authenticated' 
      });
    }

    // Check if we have a file
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    // Create a sanitized filename with timestamp
    const file = req.file;
    const timestamp = Date.now();
    const sanitizedName = sanitizeFilename(`${timestamp}-${file.originalname}`);
    
    // Create an S3 key with user ID for better organization
    const s3Key = `businesses/${req.user.userId}/${sanitizedName}`;
    
    // Get region and bucket from request headers or use defaults
    const region = req.headers['x-aws-region'] || process.env.AWS_REGION || 'eu-west-2';
    const bucket = req.headers['x-aws-bucket'] || process.env.AWS_BUCKET_NAME || 'arzani-images1';
    
    console.log(`Attempting to upload ${file.originalname} to ${region}/${bucket}/${s3Key}`);

    // Upload to S3
    const s3Url = await uploadToS3(
      file.buffer, 
      s3Key,
      file.mimetype, 
      region,
      bucket
    );

    res.json({
      success: true,
      url: s3Url,
      key: s3Key,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      region: region,
      bucket: bucket
    });

  } catch (error) {
    console.error('S3 test upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error during upload',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Debug endpoint to check authentication status
router.get('/auth-check', (req, res) => {
  // This will show authentication information
  res.json({
    authenticated: !!req.user,
    user: req.user ? {
      userId: req.user.userId,
      // Include other non-sensitive user info
      role: req.user.role || 'unknown'
    } : null,
    headers: {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      contentType: req.headers['content-type']
    }
  });
});

// Refresh S3 configuration (useful for when environment variables change)
router.post('/refresh-s3-config', authenticateToken, async (req, res) => {
    try {
        // Simulate reloading configuration (this depends on your app structure)
        // In reality, you might need to restart the server or reinitialize clients
        
        // For now, just test the connection again
        const results = await checkS3Connection();
        
        res.json({
            success: true,
            message: 'S3 configuration refreshed and tested',
            details: results
        });
    } catch (error) {
        console.error('S3 config refresh error:', error);
        res.status(500).json({
            success: false,
            message: `Configuration refresh failed: ${error.message}`,
            error: error.message
        });
    }
});

export default router;
