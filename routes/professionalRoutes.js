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

// --- Professional Marketplace API Routes ---

/**
 * GET /api/professionals
 * Get list of verified professionals with pagination and filtering
 */
router.get('/api/professionals', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const service = req.query.service || '';
    const location = req.query.location || '';

    let queryConditions = `
      WHERE u.is_verified_professional = true 
      AND pp.profile_visibility = 'public'
      AND pp.allow_direct_contact = true
    `;
    const queryParams = [];
    let paramIndex = 1;

    // Add search filter
    if (search) {
      queryConditions += ` AND (
        pp.professional_tagline ILIKE $${paramIndex} OR
        pp.professional_bio ILIKE $${paramIndex} OR
        u.username ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Add service filter
    if (service) {
      queryConditions += ` AND pp.services_offered::text ILIKE $${paramIndex}`;
      queryParams.push(`%${service}%`);
      paramIndex++;
    }

    // Add location filter
    if (location) {
      queryConditions += ` AND pp.service_locations::text ILIKE $${paramIndex}`;
      queryParams.push(`%${location}%`);
      paramIndex++;
    }

    const professionalQuery = `
      SELECT 
        pp.id,
        pp.user_id,
        u.username,
        u.profile_picture,
        pp.professional_tagline,
        pp.professional_bio,
        pp.years_experience,
        pp.services_offered,
        pp.specializations,
        pp.pricing_info,
        pp.service_locations,
        pp.professional_picture_url,
        pp.allow_direct_contact,
        pp.featured_professional,
        pp.profile_completion_score,
        COALESCE(AVG(pr.rating), 0) as average_rating,
        COUNT(pr.id) as review_count
      FROM professional_profiles pp
      JOIN users u ON pp.user_id = u.id
      LEFT JOIN professional_reviews pr ON pp.id = pr.professional_id
      ${queryConditions}
      GROUP BY pp.id, u.id
      ORDER BY pp.featured_professional DESC, pp.profile_completion_score DESC, pp.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const result = await pool.query(professionalQuery, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT pp.id) as total
      FROM professional_profiles pp
      JOIN users u ON pp.user_id = u.id
      ${queryConditions}
    `;

    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const totalCount = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      professionals: result.rows,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalCount: totalCount,
        hasMore: page < totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching professionals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch professionals'
    });
  }
});

/**
 * POST /api/contact-professional
 * Initiate contact with a professional (creates conversation)
 */
router.post('/api/contact-professional', authenticateToken, async (req, res) => {
  try {
    const { professionalId, message, service, businessId } = req.body;
    const userId = req.user.userId;

    if (!professionalId) {
      return res.status(400).json({
        success: false,
        error: 'Professional ID is required'
      });
    }

    // Get professional details
    const professionalQuery = `
      SELECT 
        pp.id,
        pp.user_id,
        u.username as full_name,
        pp.professional_tagline,
        pp.allow_direct_contact
      FROM professional_profiles pp
      JOIN users u ON pp.user_id = u.id
      WHERE pp.id = $1 AND u.is_verified_professional = true
    `;

    const professionalResult = await pool.query(professionalQuery, [professionalId]);

    if (professionalResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Professional not found or not verified'
      });
    }

    const professional = professionalResult.rows[0];

    // Check if user is trying to contact themselves
    if (professional.user_id === userId) {
      return res.status(400).json({
        success: false,
        error: 'You cannot contact yourself'
      });
    }

    // Check if professional allows direct contact
    if (!professional.allow_direct_contact) {
      return res.status(403).json({
        success: false,
        error: 'This professional is not accepting direct contact at the moment'
      });
    }

    // Check for existing conversation using metadata since professional_id column doesn't exist
    let conversationResult = await pool.query(`
      SELECT c.id 
      FROM conversations c
      JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = $1
      JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = $2
      WHERE c.metadata->>'professional_id' = $3
      LIMIT 1
    `, [userId, professional.user_id, professionalId.toString()]);

    let conversationId;

    if (conversationResult.rows.length > 0) {
      // Existing conversation found
      conversationId = conversationResult.rows[0].id;
    } else {
      // Create new conversation with professional context in metadata
      const professionalMetadata = {
        professional_id: professionalId,
        conversation_type: 'professional',
        professional_name: professional.full_name,
        business_context: businessId || null
      };

      const newConversationResult = await pool.query(`
        INSERT INTO conversations (metadata, is_group_chat, created_at, updated_at, conversation_type)
        VALUES ($1, false, NOW(), NOW(), 'professional')
        RETURNING id
      `, [JSON.stringify(professionalMetadata)]);

      conversationId = newConversationResult.rows[0].id;

      // Add participants
      await Promise.all([
        pool.query(`
          INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
          VALUES ($1, $2, NOW())
        `, [conversationId, userId]),
        pool.query(`
          INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
          VALUES ($1, $2, NOW())
        `, [conversationId, professional.user_id])
      ]);
    }

    // Create contact form entry
    const contactFormResult = await pool.query(`
      INSERT INTO contact_forms (
        user_id, 
        message, 
        created_at,
        form_type
      ) VALUES ($1, $2, NOW(), 'professional_inquiry')
      RETURNING id
    `, [userId, message || 'Interested in your professional services']);

    const formId = contactFormResult.rows[0].id;

    // If initial message provided, add it to the conversation
    if (message) {
      const contextualMessage = service 
        ? `Hi! I'm interested in your ${service} services. ${message}`
        : message;

      await pool.query(`
        INSERT INTO messages (conversation_id, sender_id, content, created_at)
        VALUES ($1, $2, $3, NOW())
      `, [conversationId, userId, contextualMessage]);

      // Update conversation last message
      await pool.query(`
        UPDATE conversations 
        SET last_message = $1, last_message_at = NOW(), updated_at = NOW()
        WHERE id = $2
      `, [contextualMessage, conversationId]);
    }

    res.json({
      success: true,
      message: 'Contact initiated successfully',
      conversationId,
      otherUserId: professional.user_id,
      formId,
      professionalName: professional.full_name
    });

  } catch (error) {
    console.error('Error contacting professional:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to contact professional',
      details: error.message
    });
  }
});

/**
 * GET /api/professional-profile
 * Get current user's professional profile (for verified professionals)
 */
router.get('/api/professional-profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const profileQuery = `
      SELECT 
        pp.*,
        u.is_verified_professional,
        COALESCE(AVG(pr.rating), 0) as average_rating,
        COUNT(pr.id) as review_count
      FROM professional_profiles pp
      JOIN users u ON pp.user_id = u.id
      LEFT JOIN professional_reviews pr ON pp.id = pr.professional_id
      WHERE pp.user_id = $1
      GROUP BY pp.id, u.is_verified_professional
    `;

    const result = await pool.query(profileQuery, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Professional profile not found'
      });
    }

    res.json({
      success: true,
      profile: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching professional profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch professional profile'
    });
  }
});

/**
 * PUT /api/professional-profile
 * Update current user's professional profile
 */
router.put('/api/professional-profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      professional_tagline,
      professional_bio,
      years_experience,
      professional_website,
      services_offered,
      specializations,
      pricing_info,
      service_locations,
      allow_direct_contact,
      profile_visibility,
      portfolio_items
    } = req.body;

    // Update professional profile
    const updateQuery = `
      UPDATE professional_profiles 
      SET 
        professional_tagline = $1,
        professional_bio = $2,
        years_experience = $3,
        professional_website = $4,
        services_offered = $5,
        specializations = $6,
        pricing_info = $7,
        service_locations = $8,
        allow_direct_contact = $9,
        profile_visibility = $10,
        portfolio_items = $11,
        updated_at = NOW()
      WHERE user_id = $12
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      professional_tagline,
      professional_bio,
      years_experience,
      professional_website,
      services_offered,
      specializations,
      pricing_info,
      service_locations,
      allow_direct_contact,
      profile_visibility,
      portfolio_items,
      userId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Professional profile not found'
      });
    }

    res.json({
      success: true,
      profile: result.rows[0],
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating professional profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update professional profile'
    });
  }
});

// --- Admin Routes ---
// These endpoints should have both authenticateToken and adminAuth middleware

// This was previously handled in professionalRoutes.js but should be moved to adminRoutes.js
// Code moved to adminRoutes.js for better separation of concerns

export default router;
