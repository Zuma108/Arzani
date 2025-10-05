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
    console.log('GCS upload request received:', {
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
    
    // Create a GCS key with user ID for better organization
    const gcsKey = `businesses/${req.user.userId}/${sanitizedName}`;
    
    // Get bucket from request headers or use default
    const bucket = req.headers['x-gcs-bucket'] || process.env.GCS_BUCKET_NAME || 'arzani-marketplace-files';
    
    console.log(`Uploading ${file.originalname} to GCS bucket ${bucket}/${gcsKey}`);

    // Upload to Google Cloud Storage (using the converted uploadToS3 function)
    const gcsUrl = await uploadToS3(
      file.buffer, 
      gcsKey,
      file.mimetype,
      null, // region parameter not needed for GCS
      bucket
    );
    
    console.log(`Successfully uploaded to GCS: ${gcsUrl}`);

    res.json({
      success: true,
      url: gcsUrl,
      key: gcsKey,
      fileName: file.originalname
    });
  } catch (error) {
    console.error('GCS upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error during upload'
    });
  }
});

export default router;