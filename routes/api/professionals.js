import express from 'express';
import pool from '../../db.js';
import { requireAuth, authenticateToken } from '../../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/professionals
 * Get paginated list of verified professionals with filtering
 */
router.get('/professionals', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      location = '',
      services = '',
      experienceMin = '',
      experienceMax = '',
      priceRange = '',
      specializations = '',
      rating = '',
      search = ''
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build WHERE clause based on filters
    let whereConditions = [`pvr.status = 'approved'`]; // Only approved professionals
    let queryParams = [];
    let paramCount = 0;

    // Location filter
    if (location) {
      paramCount++;
      whereConditions.push(`(pp.service_locations::text ILIKE $${paramCount} OR u.business_address ILIKE $${paramCount})`);
      queryParams.push(`%${location}%`);
    }

    // Services filter
    if (services) {
      paramCount++;
      whereConditions.push(`pp.services_offered::text ILIKE $${paramCount}`);
      queryParams.push(`%${services}%`);
    }

    // Experience range filter
    if (experienceMin || experienceMax) {
      if (experienceMin) {
        paramCount++;
        whereConditions.push(`pp.years_experience >= $${paramCount}`);
        queryParams.push(parseInt(experienceMin));
      }
      if (experienceMax) {
        paramCount++;
        whereConditions.push(`pp.years_experience <= $${paramCount}`);
        queryParams.push(parseInt(experienceMax));
      }
    }

    // Specializations filter
    if (specializations) {
      paramCount++;
      whereConditions.push(`pp.specializations::text ILIKE $${paramCount}`);
      queryParams.push(`%${specializations}%`);
    }

    // Rating filter
    if (rating) {
      paramCount++;
      whereConditions.push(`COALESCE(AVG(pr.rating), 0) >= $${paramCount}`);
      queryParams.push(parseFloat(rating));
    }

    // Search filter (name, bio, tagline)
    if (search) {
      paramCount++;
      whereConditions.push(`(
        u.username ILIKE $${paramCount} OR
        pp.professional_bio ILIKE $${paramCount} OR
        pp.professional_tagline ILIKE $${paramCount}
      )`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Main query with JOIN to get user data and reviews
    const professionalsQuery = `
      SELECT 
        pp.id,
        pp.user_id,
        u.username as full_name,
        u.email,
        u.profile_picture,
        pp.professional_bio,
        pp.professional_tagline,
        pp.years_experience,
        pp.professional_website,
        pp.services_offered,
        pp.industries_serviced,
        pp.specializations,
        pp.professional_picture_url,
        pp.portfolio_items,
        pp.certifications,
        pp.professional_contact,
        pp.availability_schedule,
        pp.preferred_contact_method,
        pp.pricing_info,
        pp.service_locations,
        pp.languages_spoken,
        pp.social_links,
        pp.profile_visibility,
        pp.allow_direct_contact,
        pp.featured_professional,
        pp.profile_completion_score,
        pp.created_at,
        pp.updated_at,
        COALESCE(AVG(pr.rating), 0) as average_rating,
        COUNT(pr.id) as review_count,
        pvr.professional_type
      FROM professional_profiles pp
      JOIN users u ON pp.user_id = u.id
      JOIN professional_verification_requests pvr ON pp.user_id = pvr.user_id
      LEFT JOIN professional_reviews pr ON pp.id = pr.professional_id
      ${whereClause}
      GROUP BY pp.id, u.id, pvr.professional_type
      ORDER BY 
        pp.featured_professional DESC NULLS LAST,
        average_rating DESC,
        pp.profile_completion_score DESC,
        pp.updated_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(parseInt(limit), offset);

    // Count query for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT pp.id) as total
      FROM professional_profiles pp
      JOIN users u ON pp.user_id = u.id
      JOIN professional_verification_requests pvr ON pp.user_id = pvr.user_id
      LEFT JOIN professional_reviews pr ON pp.id = pr.professional_id
      ${whereClause}
    `;

    const [professionalsResult, countResult] = await Promise.all([
      pool.query(professionalsQuery, queryParams),
      pool.query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset for count
    ]);

    const professionals = professionalsResult.rows;
    const totalCount = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      success: true,
      professionals,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Error fetching professionals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch professionals',
      details: error.message
    });
  }
});

/**
 * GET /api/professionals/:id
 * Get detailed professional profile by ID
 */
router.get('/professionals/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const professionalQuery = `
      SELECT 
        pp.*,
        u.username as full_name,
        u.email,
        u.profile_picture,
        u.business_address as user_location,
        u.created_at as user_created_at,
        COALESCE(AVG(pr.rating), 0) as average_rating,
        COUNT(pr.id) as review_count,
        pvr.professional_type,
        pvr.license_number
      FROM professional_profiles pp
      JOIN users u ON pp.user_id = u.id
      JOIN professional_verification_requests pvr ON pp.user_id = pvr.user_id AND pvr.status = 'approved'
      LEFT JOIN professional_reviews pr ON pp.id = pr.professional_id
      WHERE pp.id = $1
      GROUP BY pp.id, u.id, pvr.professional_type, pvr.license_number
    `;

    const reviewsQuery = `
      SELECT 
        pr.*,
        COALESCE(NULLIF(u.username, ''), 'Anonymous') as reviewer_name,
        u.profile_picture as reviewer_picture
      FROM professional_reviews pr
      JOIN users u ON pr.reviewer_id = u.id
      WHERE pr.professional_id = $1
      ORDER BY pr.created_at DESC
      LIMIT 10
    `;

    const [professionalResult, reviewsResult] = await Promise.all([
      pool.query(professionalQuery, [id]),
      pool.query(reviewsQuery, [id])
    ]);

    if (professionalResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Professional not found'
      });
    }

    const professional = professionalResult.rows[0];
    const reviews = reviewsResult.rows;

    res.json({
      success: true,
      professional: {
        ...professional,
        reviews
      }
    });

  } catch (error) {
    console.error('Error fetching professional details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch professional details',
      details: error.message
    });
  }
});

/**
 * POST /api/contact-professional
 * Initiate contact with a professional (similar to contact-seller)
 */
router.post('/contact-professional', requireAuth, async (req, res) => {
  try {
    const { professionalId, message } = req.body;
    const userId = req.user.id;

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
      JOIN professional_verification_requests pvr ON pp.user_id = pvr.user_id
      WHERE pp.id = $1 AND pvr.status = 'approved'
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
        professional_name: professional.full_name
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

    // Create contact form entry (similar to business inquiries)
    const contactFormResult = await pool.query(`
      INSERT INTO contact_forms (
        user_id, 
        professional_id, 
        message, 
        created_at,
        form_type
      ) VALUES ($1, $2, $3, NOW(), 'professional_inquiry')
      RETURNING id
    `, [userId, professionalId, message || 'Interested in your professional services']);

    const formId = contactFormResult.rows[0].id;

    // If initial message provided, add it to the conversation
    if (message) {
      await pool.query(`
        INSERT INTO messages (conversation_id, sender_id, content, created_at)
        VALUES ($1, $2, $3, NOW())
      `, [conversationId, userId, message]);

      // Update conversation last message
      await pool.query(`
        UPDATE conversations 
        SET last_message = $1, last_message_at = NOW(), updated_at = NOW()
        WHERE id = $2
      `, [message, conversationId]);
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
router.get('/professional-profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const profileQuery = `
      SELECT 
        pp.*,
        pvr.status as verification_status,
        pvr.professional_type,
        COALESCE(AVG(pr.rating), 0) as average_rating,
        COUNT(pr.id) as review_count
      FROM professional_profiles pp
      JOIN professional_verification_requests pvr ON pp.user_id = pvr.user_id
      LEFT JOIN professional_reviews pr ON pp.id = pr.professional_id
      WHERE pp.user_id = $1
      GROUP BY pp.id, pvr.status, pvr.professional_type
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
      error: 'Failed to fetch professional profile',
      details: error.message
    });
  }
});

/**
 * PUT /api/professional-profile
 * Update current user's professional profile
 */
router.put('/professional-profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      professional_bio,
      professional_tagline,
      years_experience,
      professional_website,
      services_offered,
      industries_serviced,
      specializations,
      professional_contact,
      availability_schedule,
      preferred_contact_method,
      pricing_info,
      service_locations,
      languages_spoken,
      social_links,
      professional_references,
      profile_visibility,
      allow_direct_contact
    } = req.body;

    // Verify user has a professional profile
    const existingProfile = await pool.query(`
      SELECT id FROM professional_profiles WHERE user_id = $1
    `, [userId]);

    if (existingProfile.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Professional profile not found'
      });
    }

    const profileId = existingProfile.rows[0].id;

    // Calculate profile completion score
    const completionFields = [
      professional_bio, professional_tagline, years_experience,
      services_offered, specializations, pricing_info
    ];
    const completedFields = completionFields.filter(field => field && field !== '').length;
    const profile_completion_score = Math.round((completedFields / completionFields.length) * 100);

    // Update profile
    const updateQuery = `
      UPDATE professional_profiles SET
        professional_bio = COALESCE($1, professional_bio),
        professional_tagline = COALESCE($2, professional_tagline),
        years_experience = COALESCE($3, years_experience),
        professional_website = COALESCE($4, professional_website),
        services_offered = COALESCE($5, services_offered),
        industries_serviced = COALESCE($6, industries_serviced),
        specializations = COALESCE($7, specializations),
        professional_contact = COALESCE($8, professional_contact),
        availability_schedule = COALESCE($9, availability_schedule),
        preferred_contact_method = COALESCE($10, preferred_contact_method),
        pricing_info = COALESCE($11, pricing_info),
        service_locations = COALESCE($12, service_locations),
        languages_spoken = COALESCE($13, languages_spoken),
        social_links = COALESCE($14, social_links),
        professional_references = COALESCE($15, professional_references),
        profile_visibility = COALESCE($16, profile_visibility),
        allow_direct_contact = COALESCE($17, allow_direct_contact),
        profile_completion_score = $18,
        updated_at = NOW()
      WHERE id = $19
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      professional_bio,
      professional_tagline,
      years_experience,
      professional_website,
      services_offered,
      industries_serviced,
      specializations,
      professional_contact,
      availability_schedule,
      preferred_contact_method,
      pricing_info,
      service_locations,
      languages_spoken,
      social_links,
      professional_references,
      profile_visibility,
      allow_direct_contact,
      profile_completion_score,
      profileId
    ]);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating professional profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update professional profile',
      details: error.message
    });
  }
});

/**
 * POST /api/saved-professionals/toggle
 * Toggle saved status for a professional
 */
router.post('/saved-professionals/toggle', requireAuth, async (req, res) => {
  try {
    const { professionalId } = req.body;
    const userId = req.user.id;

    if (!professionalId) {
      return res.status(400).json({
        success: false,
        error: 'Professional ID is required'
      });
    }

    // Check if already saved
    const existingResult = await pool.query(`
      SELECT id FROM saved_professionals WHERE user_id = $1 AND professional_id = $2
    `, [userId, professionalId]);

    let saved = false;

    if (existingResult.rows.length > 0) {
      // Remove from saved
      await pool.query(`
        DELETE FROM saved_professionals WHERE user_id = $1 AND professional_id = $2
      `, [userId, professionalId]);
      saved = false;
    } else {
      // Add to saved
      await pool.query(`
        INSERT INTO saved_professionals (user_id, professional_id, created_at)
        VALUES ($1, $2, NOW())
      `, [userId, professionalId]);
      saved = true;
    }

    res.json({
      success: true,
      saved,
      message: saved ? 'Professional saved successfully' : 'Professional removed from saved'
    });

  } catch (error) {
    console.error('Error toggling saved professional:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle saved professional',
      details: error.message
    });
  }
});

export default router;