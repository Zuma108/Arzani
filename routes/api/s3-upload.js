import express from 'express';
import multer from 'multer';
import { uploadToS3, sanitizeFilename } from '../../utils/s3.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB limit
    files: 1 // One file at a time
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
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    console.log('S3 upload request received:', {
      userId: req.user?.userId,
      fileName: req.file?.originalname,
      fileSize: req.file?.size
    });

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

    const file = req.file;
    
    // Create a sanitized filename with timestamp
    const timestamp = Date.now();
    const sanitizedName = sanitizeFilename(`${timestamp}-${file.originalname}`);
    
    // Create an S3 key with user ID for better organization
    const s3Key = `businesses/${req.user.userId}/${sanitizedName}`;
    
    // Get region and bucket from request headers or use defaults
    const region = req.headers['x-aws-region'] || process.env.AWS_REGION || 'eu-west-2';
    const bucket = req.headers['x-aws-bucket'] || process.env.AWS_BUCKET_NAME || 'arzani-images1';
    
    console.log(`Uploading ${file.originalname} to ${region}/${bucket}/${s3Key}`);

    // Upload to S3
    const s3Url = await uploadToS3(
      file.buffer, 
      s3Key,
      file.mimetype, 
      region,
      bucket
    );
    
    console.log(`Successfully uploaded to S3: ${s3Url}`);

    res.json({
      success: true,
      url: s3Url,
      key: s3Key,
      fileName: file.originalname
    });
  } catch (error) {
    console.error('S3 upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error during upload'
    });
  }
});

export default router;