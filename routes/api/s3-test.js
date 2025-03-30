import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../../middleware/auth.js';
import { uploadToS3, validateBucket, checkS3Connection } from '../../utils/s3.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

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

// Test S3 upload functionality
router.post('/s3-upload', authenticateToken, upload.single('testImage'), async (req, res) => {
    try {
        // Log request details
        console.log('S3 test upload request received:', {
            hasFile: !!req.file,
            fileDetails: req.file ? {
                fieldname: req.file.fieldname,
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                buffer: req.file.buffer ? 'Buffer present' : 'No buffer'
            } : null
        });

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Create a unique test key
        const testKey = `test-uploads/test-${Date.now()}.png`;
        
        console.log('Attempting to upload file to S3:', {
            originalname: req.file.originalname,
            size: req.file.size,
            s3Key: testKey
        });

        // First, validate the bucket in the default region
        const region = process.env.AWS_REGION || 'eu-west-2';
        const bucket = process.env.AWS_BUCKET_NAME || 'arzani-images1';
        
        const bucketCheck = await validateBucket(bucket, region);
        console.log('Bucket validation result:', bucketCheck);
        
        // Do the actual upload with explicit parameter ordering
        const url = await uploadToS3(
            req.file,           // file object 
            testKey,            // key
            region,             // explicit region
            bucket              // explicit bucket
        );
        
        // Log complete upload details
        console.log('Upload completed successfully:', {
            url,
            key: testKey,
            region,
            bucket,
            fileSize: req.file.size,
            mimeType: req.file.mimetype
        });
        
        res.json({
            success: true,
            url: url,
            key: testKey,
            region: bucketCheck.success ? bucketCheck.region : region,
            bucket: bucket,
            validationResult: bucketCheck
        });
    } catch (error) {
        console.error('S3 upload error:', error);
        res.status(500).json({
            success: false,
            message: `Upload failed: ${error.message}`,
            error: error.message
        });
    }
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
