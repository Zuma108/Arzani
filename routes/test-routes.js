import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { checkS3Connection, validateBucket, uploadToS3 } from '../utils/s3.js';
import multer from 'multer';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Configure multer for memory storage
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// S3 connection test endpoint
router.get('/s3-connection', authenticateToken, async (req, res) => {
    try {
        // Get S3 connection status for all regions
        const connectionStatus = await checkS3Connection();
        
        // Add environment variables (with sensitive values masked)
        const envVars = {
            AWS_REGION: process.env.AWS_REGION || 'not set',
            AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME || 'not set',
            AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? 'set' : 'not set',
            AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? 'set' : 'not set'
        };
        
        // Determine overall success
        const success = connectionStatus.mainRegion.success || connectionStatus.fallbackRegion.success;
        
        res.json({
            ...connectionStatus,
            env: envVars,
            success: success,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('S3 connection test error:', error);
        res.status(500).json({ 
            error: 'Failed to test S3 connection',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Test uploading a file to S3
router.post('/s3-upload', authenticateToken, upload.single('testImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        // Generate a unique key for test upload
        const timestamp = Date.now();
        const userId = req.user?.userId || 'anonymous';
        const filename = req.file.originalname || 'test-image.png';
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        
        const s3Key = `test-uploads/${userId}/${timestamp}-${sanitizedFilename}`;
        const region = process.env.AWS_REGION || 'eu-west-2';
        const bucket = process.env.AWS_BUCKET_NAME || 'arzani-images1';
        
        // Test the primary region first
        let uploadSuccess = false;
        let uploadUrl = '';
        let uploadRegion = region;
        
        try {
            // Verify bucket accessibility
            const isValid = await validateBucket(bucket, region);
            
            if (isValid) {
                // Upload file to the primary region
                uploadUrl = await uploadToS3(req.file, s3Key, region, bucket);
                uploadSuccess = true;
            } else {
                // Try fallback region
                const fallbackRegion = region === 'eu-west-2' ? 'eu-north-1' : 'eu-west-2';
                const fallbackValid = await validateBucket(bucket, fallbackRegion);
                
                if (fallbackValid) {
                    uploadUrl = await uploadToS3(req.file, s3Key, fallbackRegion, bucket);
                    uploadSuccess = true;
                    uploadRegion = fallbackRegion;
                } else {
                    throw new Error('Both primary and fallback regions failed');
                }
            }
            
            res.json({
                success: uploadSuccess,
                url: uploadUrl,
                key: s3Key,
                region: uploadRegion,
                bucket: bucket,
                fileType: req.file.mimetype,
                fileSize: req.file.size
            });
            
        } catch (error) {
            console.error('Test upload error:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                bucket: bucket,
                region: region
            });
        }
    } catch (error) {
        console.error('S3 upload test error:', error);
        res.status(500).json({ error: 'Failed to test S3 upload' });
    }
});

// Refresh S3 configuration
router.post('/refresh-s3-config', authenticateToken, async (req, res) => {
    try {
        // This would typically interact with your environment configuration
        // For demo purposes, we'll just validate current settings
        
        const mainRegion = process.env.AWS_REGION || 'eu-west-2';
        const bucket = process.env.AWS_BUCKET_NAME || 'arzani-images1';
        
        // Check main region
        const mainRegionValid = await validateBucket(bucket, mainRegion);
        
        // Check fallback region
        const fallbackRegion = mainRegion === 'eu-west-2' ? 'eu-north-1' : 'eu-west-2';
        const fallbackRegionValid = await validateBucket(bucket, fallbackRegion);
        
        if (!mainRegionValid && !fallbackRegionValid) {
            return res.status(500).json({
                success: false,
                message: 'Both primary and fallback regions are inaccessible. Check your AWS credentials and bucket configuration.',
                details: {
                    mainRegion: { region: mainRegion, valid: mainRegionValid },
                    fallbackRegion: { region: fallbackRegion, valid: fallbackRegionValid }
                }
            });
        }
        
        // Return success with current status
        res.json({
            success: true,
            message: 'S3 configuration validated successfully',
            details: {
                mainRegion: { region: mainRegion, valid: mainRegionValid },
                fallbackRegion: { region: fallbackRegion, valid: fallbackRegionValid },
                bucket: bucket,
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID ? '***' : 'not set',
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ? '***' : 'not set'
                }
            }
        });
    } catch (error) {
        console.error('S3 config refresh error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to refresh S3 configuration',
            error: error.message
        });
    }
});

// Route to serve the S3 test page
router.get('/s3-test-page', authenticateToken, (req, res) => {
    res.render('s3-test', {
        user: req.user,
        title: 'S3 Configuration Test'
    });
});

export default router;
