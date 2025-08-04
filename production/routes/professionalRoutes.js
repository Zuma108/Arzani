import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { adminAuth } from '../middleware/adminAuth.js';
import multer from 'multer';
import { uploadToS3 } from '../utils/s3.js';
import pool from '../db.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { files: 5, fileSize: 5 * 1024 * 1024 } });

// --- Public Routes ---

// Render professional verification page
router.get('/professional-verification', (req, res) => {
    res.render('professional-verification', {
        user: req.user || req.session?.user || null,
        title: 'Professional Verification'
    });
});

// --- Authenticated User Routes ---

// Render professional dashboard (requires verified status)
router.get('/professional-dashboard', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const userQuery = await pool.query(
            'SELECT is_verified_professional, professional_type FROM users WHERE id = $1',
            [userId]
        );

        const user = userQuery.rows[0];

        if (!user?.is_verified_professional) {
            return res.redirect('/professional-verification?status=not_verified');
        }

        res.render('professional-dashboard', {
            user: { ...req.user, ...user },
            title: 'Professional Dashboard',
            professionalType: user.professional_type
        });
    } catch (error) {
        console.error('Error loading professional dashboard:', error);
        res.status(500).render('error', { message: 'Error loading professional dashboard' });
    }
});

// Get current user's professional verification status
router.get('/api/verification/status', authenticateToken, async (req, res) => {
    try {
        // Get user ID from auth middleware
        const userId = req.user.userId;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'User not authenticated' });
        }
        
        console.log(`Getting verification status for user ID: ${userId}`);
        
        // Get user verification status with error handling
        const userResult = await pool.query(
            `SELECT 
                is_verified_professional, 
                professional_type, 
                professional_verification_date
             FROM users 
             WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const userData = userResult.rows[0];
        console.log('User verification data:', userData);
        
        // Get latest verification request with proper error handling
        try {
            const requestResult = await pool.query(
                `SELECT 
                    id,
                    professional_type, 
                    status, 
                    request_date,
                    review_date,
                    review_notes
                 FROM professional_verification_requests 
                 WHERE user_id = $1 
                 ORDER BY request_date DESC 
                 LIMIT 1`,
                [userId]
            );

            let latestRequest = null;
            if (requestResult.rows.length > 0) {
                const req = requestResult.rows[0];
                latestRequest = {
                    id: req.id,
                    professional_type: req.professional_type,
                    status: req.status || 'pending',
                    submittedAt: req.request_date,
                    rejectionReason: req.review_notes
                };
            }

            console.log('Latest verification request:', latestRequest);

            return res.json({
                success: true,
                isVerified: userData.is_verified_professional || false,
                professionalType: userData.professional_type,
                verificationDate: userData.professional_verification_date,
                latestRequest: latestRequest
            });
        } catch (requestError) {
            console.error('Error getting verification request:', requestError);
            
            // Still return user data even if requests query fails
            return res.json({
                success: true,
                isVerified: userData.is_verified_professional || false,
                professionalType: userData.professional_type,
                verificationDate: userData.professional_verification_date,
                latestRequest: null,
                requestError: true
            });
        }
    } catch (error) {
        console.error('Error getting professional status:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get professional status',
            details: error.message 
        });
    }
});

// Submit a new verification request
router.post('/api/users/roles/request-verification', authenticateToken, upload.array('documents', 5), async (req, res) => {
    const client = await pool.connect();
    try {
        const userId = req.user.userId;
        const { professionalType, licenseNumber, description } = req.body;
        const documents = req.files;
        
        console.log('Received verification request:', {
            userId,
            professionalType,
            licenseNumber: licenseNumber ? 'Provided' : 'Not provided',
            description: description ? 'Provided' : 'Not provided',
            documentsCount: documents?.length || 0
        });

        if (!professionalType) {
            return res.status(400).json({ success: false, error: 'Professional type is required' });
        }
        if (!documents || documents.length === 0) {
            return res.status(400).json({ success: false, error: 'Verification documents are required' });
        }

        const existingRequest = await client.query(
            `SELECT id FROM professional_verification_requests 
             WHERE user_id = $1 AND status = 'pending'`,
            [userId]
        );
        if (existingRequest.rows.length > 0) {
            return res.status(409).json({ success: false, error: 'You already have a pending verification request.' });
        }

        await client.query('BEGIN');

        const uploadedDocs = [];
        for (const doc of documents) {
            const timestamp = Date.now();
            const safeOriginalName = doc.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
            const s3Key = `verification/${userId}/${timestamp}_${safeOriginalName}`;

            try {
                // Fix: Pass parameters in the correct order (fileBuffer, key, contentType)
                const s3Url = await uploadToS3(
                    doc.buffer, 
                    s3Key, 
                    doc.mimetype || 'application/octet-stream'
                );
                
                uploadedDocs.push({
                    url: s3Url,
                    originalName: doc.originalname,
                    size: doc.size,
                    mimetype: doc.mimetype,
                    uploadDate: new Date().toISOString()
                });
                
                console.log(`Document uploaded to S3: ${s3Key}`);
            } catch (uploadError) {
                console.error(`S3 Upload Error for ${doc.originalname}:`, uploadError);
                throw new Error(`Failed to upload document: ${doc.originalname}`);
            }
        }

        // Use a simplified query with only the essential fields
        const insertQuery = `
            INSERT INTO professional_verification_requests (
                user_id, 
                professional_type, 
                verification_documents, 
                status, 
                request_date
            ) 
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING id
        `;
        
        const result = await client.query(
            insertQuery,
            [userId, professionalType, uploadedDocs, 'pending']
        );

        // Add license_number and description if those columns exist
        if (licenseNumber || description) {
            try {
                // Create a dynamic query to update any additional fields
                const updateFields = [];
                const updateValues = [userId]; // Start with userId
                let paramIndex = 2; // Start at 2 because userId is $1
                
                // Try to determine if license_number column exists
                const columnsResult = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'professional_verification_requests'
                    AND column_name IN ('license_number', 'description')
                `);
                
                const existingColumns = columnsResult.rows.map(row => row.column_name);
                console.log('Existing additional columns:', existingColumns);
                
                // Add license_number if it exists and was provided
                if (existingColumns.includes('license_number') && licenseNumber) {
                    updateFields.push(`license_number = $${paramIndex}`);
                    updateValues.push(licenseNumber);
                    paramIndex++;
                }
                
                // Add description if it exists and was provided
                if (existingColumns.includes('description') && description) {
                    updateFields.push(`description = $${paramIndex}`);
                    updateValues.push(description);
                    paramIndex++;
                }
                
                // Only run the update if we have fields to update
                if (updateFields.length > 0) {
                    const updateQuery = `
                        UPDATE professional_verification_requests
                        SET ${updateFields.join(', ')}
                        WHERE user_id = $1 AND status = 'pending'
                    `;
                    await client.query(updateQuery, updateValues);
                }
            } catch (err) {
                console.log('Error updating additional fields:', err);
                // Non-critical error, don't fail the transaction
            }
        }

        await client.query(
            'UPDATE users SET professional_type = $1 WHERE id = $2 AND (professional_type IS NULL OR professional_type != $1)',
            [professionalType, userId]
        );

        await client.query('COMMIT');
        
        console.log('Verification request submitted successfully, ID:', result.rows[0].id);

        res.status(201).json({
            success: true,
            message: 'Verification request submitted successfully.',
            requestId: result.rows[0].id
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error submitting verification request:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to submit verification request', 
            details: error.message 
        });
    } finally {
        client.release();
    }
});

// --- Admin Routes ---
// These endpoints should have both authenticateToken and adminAuth middleware

// This was previously handled in professionalRoutes.js but should be moved to adminRoutes.js
// Code moved to adminRoutes.js for better separation of concerns

export default router;
