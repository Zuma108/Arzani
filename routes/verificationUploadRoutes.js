import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import { uploadToS3 } from '../utils/s3.js';
import pool from '../db.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload verification documents
router.post('/upload', authenticateToken, upload.array('documents', 5), async (req, res) => {
  try {
    const { professionalType, verificationNotes } = req.body;
    const documents = req.files;

    if (!documents || documents.length === 0) {
      return res.status(400).json({ error: 'No documents uploaded' });
    }

    if (!professionalType) {
      return res.status(400).json({ error: 'Professional type is required' });
    }

    // Upload documents to S3
    const uploadedDocuments = [];
    for (const document of documents) {
      try {
        const timestamp = Date.now();
        const s3Key = `verification-docs/${req.user.userId}/${timestamp}_${document.originalname}`;
        
        // Upload to S3 and get URL
        const s3Url = await uploadToS3(document.buffer, s3Key, document.mimetype);
        
        uploadedDocuments.push({
          filename: document.originalname,
          url: s3Url,
          uploadedAt: new Date().toISOString()
        });
      } catch (uploadError) {
        console.error('Error uploading document to S3:', uploadError);
        return res.status(500).json({ error: 'Failed to upload document', details: uploadError.message });
      }
    }

    // Create verification request record
    const verificationInsertQuery = `
      INSERT INTO professional_verification_requests (
        user_id,
        professional_type,
        verification_notes,
        verification_documents,
        status,
        request_date
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id
    `;

    const verificationResult = await pool.query(
      verificationInsertQuery,
      [
        req.user.userId,
        professionalType,
        verificationNotes,
        uploadedDocuments,
        'pending'
      ]
    );

    // Update user's professional type and set pending status
    await pool.query(
      'UPDATE users SET professional_type = $1 WHERE id = $2',
      [professionalType, req.user.userId]
    );

    res.status(201).json({
      success: true,
      message: 'Verification documents uploaded successfully',
      requestId: verificationResult.rows[0].id,
      documents: uploadedDocuments
    });
  } catch (error) {
    console.error('Error uploading verification documents:', error);
    res.status(500).json({ error: 'Failed to process verification documents' });
  }
});

// Check verification status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log(`Checking verification status for user ${userId}`);

    const query = `
      SELECT 
        id, 
        user_id, 
        professional_type, 
        status, 
        review_notes, 
        request_date, 
        review_date 
      FROM professional_verification_requests 
      WHERE user_id = $1 
      ORDER BY request_date DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [userId]);

    const userQuery = await pool.query(
      'SELECT is_verified_professional, professional_type, professional_verification_date FROM users WHERE id = $1',
      [req.user.userId]
    );

    const userData = userQuery.rows[0] || {};
    const requestData = result.rows[0] || null;

    console.log('User data:', userData);
    console.log('Request data:', requestData);

    res.json({
      success: true,
      isVerified: userData.is_verified_professional || false,
      professionalType: userData.professional_type,
      verificationDate: userData.professional_verification_date,
      latestRequest: requestData ? {
        id: requestData.id,
        status: requestData.status,
        professional_type: requestData.professional_type,
        submittedAt: requestData.request_date,
        rejectionReason: requestData.review_notes
      } : null
    });
  } catch (error) {
    console.error('Error checking verification status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check verification status',
      details: error.message 
    });
  }
});

// Admin routes for managing verification requests
router.get('/admin/requests', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const adminCheck = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (adminCheck.rows[0]?.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    // Get all pending verification requests
    const requestsQuery = await pool.query(`
      SELECT pvr.id, pvr.user_id, pvr.professional_type, pvr.status, pvr.request_date,
             pvr.verification_documents,
             u.email, u.username
      FROM professional_verification_requests pvr
      JOIN users u ON pvr.user_id = u.id
      ORDER BY 
        CASE 
          WHEN pvr.status = 'pending' THEN 0
          WHEN pvr.status = 'under_review' THEN 1
          ELSE 2
        END,
        pvr.request_date DESC
    `);

    res.json(requestsQuery.rows);
  } catch (error) {
    console.error('Error fetching verification requests:', error);
    res.status(500).json({ error: 'Failed to fetch verification requests' });
  }
});

// Process verification request (admin)
router.post('/admin/process/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, notes } = req.body;

    // Check if user is admin
    const adminCheck = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (adminCheck.rows[0]?.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    if (!['approved', 'rejected', 'under_review', 'more_info_needed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Update verification request
    await pool.query(
      `UPDATE professional_verification_requests 
       SET status = $1, review_notes = $2, reviewer_id = $3, review_date = NOW()
       WHERE id = $4`,
      [status, notes, req.user.userId, requestId]
    );

    // If approved, update user's verification status
    if (status === 'approved') {
      // Get user ID from request
      const userIdQuery = await pool.query(
        'SELECT user_id, professional_type FROM professional_verification_requests WHERE id = $1',
        [requestId]
      );
      
      if (userIdQuery.rows.length > 0) {
        const userId = userIdQuery.rows[0].user_id;
        const professionalType = userIdQuery.rows[0].professional_type;
        
        await pool.query(
          `UPDATE users 
           SET is_verified_professional = TRUE, 
               professional_verification_date = NOW(),
               professional_type = $1
           WHERE id = $2`,
          [professionalType, userId]
        );
      }
    }

    res.json({
      success: true,
      message: `Verification request marked as ${status}`
    });
  } catch (error) {
    console.error('Error processing verification request:', error);
    res.status(500).json({ error: 'Failed to process verification request' });
  }
});

export default router;