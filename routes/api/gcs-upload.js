import express from 'express';
import multer from 'multer';
import { uploadToGCS } from '../../utils/gcs.js';
import { authenticateToken } from '../../middleware/auth.js';
import path from 'path';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Max 5 files
  },
  fileFilter: (req, file, cb) => {
    // Only accept image files
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
    }
    cb(null, true);
  }
});

// GCS upload endpoint for business images
router.post('/', authenticateToken, upload.array('images', 5), async (req, res) => {
  try {
    console.log('GCS upload request:', {
      userId: req.user?.userId,
      fileCount: req.files?.length || 0,
      files: req.files?.map(f => ({ name: f.originalname, size: f.size, type: f.mimetype })) || []
    });

    // Check authentication
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    // Check if we have files
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No files uploaded' 
      });
    }

    const userId = req.user.userId;
    const file = req.files[0]; // Process first file

    try {
      // Validate file size
      if (file.size > 10 * 1024 * 1024) {
        return res.status(413).json({
          success: false,
          error: `File ${file.originalname} exceeds 10MB limit`
        });
      }
      
      console.log(`Processing: ${file.originalname} (${(file.size/1024/1024).toFixed(2)}MB)`);
      
      // Generate unique filename
      const timestamp = Date.now();
      const ext = path.extname(file.originalname).toLowerCase();
      const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${baseName}_${timestamp}${ext}`;
      
      // Create GCS key with user organization
      const gcsKey = `businesses/${userId}/${fileName}`;
      
      console.log(`Uploading to GCS: ${gcsKey}`);

      // Upload to GCS
      const gcsUrl = await uploadToGCS(file, gcsKey, file.mimetype);
      
      console.log(`GCS upload successful: ${gcsUrl}`);
      
      // Return success response
      return res.json({
        success: true,
        url: gcsUrl,
        fileName: fileName,
        originalName: file.originalname,
        size: file.size,
        uploadedAt: new Date().toISOString()
      });
      
    } catch (uploadError) {
      console.error('GCS upload error:', uploadError);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload to GCS',
        details: uploadError.message
      });
    }
  } catch (error) {
    console.error('GCS upload route error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during upload',
      details: error.message
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'gcs-upload',
    timestamp: new Date().toISOString(),
    bucketName: process.env.GCS_BUCKET_NAME || 'arzani-marketplace-files'
  });
});

export default router;