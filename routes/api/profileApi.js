import express from 'express';
import multer from 'multer';
import { uploadToS3 } from '../../utils/s3.js';
import pool from '../../db.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Enhanced debug middleware
router.use((req, res, next) => {
    console.log('Profile API Request:', {
        path: req.path,
        method: req.method,
        url: req.originalUrl,
        userId: req.user?.userId,
        hasFile: !!req.file
    });
    next();
});

// GET /api/profile - Fetch user profile
router.get('/', async (req, res) => {
    try {
        console.log('Getting profile for user:', req.user?.userId);
        
        if (!req.user || !req.user.userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        const result = await pool.query(
            'SELECT id, username, email, profile_picture, created_at FROM users WHERE id = $1',
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const profile = {
            ...result.rows[0],
            profile_picture: result.rows[0].profile_picture || '/images/default-profile.png'
        };

        res.json(profile);
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// POST /api/profile/upload-picture - Upload profile picture
router.post('/upload-picture', upload.single('profile_picture'), async (req, res) => {
    try {
        console.log('Uploading profile picture for user:', req.user?.userId);

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const timestamp = Date.now();
        const s3Key = `profiles/${req.user.userId}/${timestamp}-${req.file.originalname}`;
        
        const s3Url = await uploadToS3(req.file, s3Key);
        console.log('File uploaded to S3:', s3Url);

        const result = await pool.query(
            'UPDATE users SET profile_picture = $1, updated_at = NOW() WHERE id = $2 RETURNING profile_picture',
            [s3Url, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            profile_picture: result.rows[0].profile_picture
        });

    } catch (error) {
        console.error('Profile picture upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Add this route for testing
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Profile API is working' });
});

console.log('Profile API routes registered');
export default router;
