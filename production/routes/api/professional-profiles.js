import express from 'express';
import multer from 'multer';
import { authenticateToken, requireAuth } from '../../middleware/auth.js';
import { uploadToS3 } from '../../utils/s3.js';
import pool from '../../db.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get predefined services and industries for dropdown options
router.get('/options', async (req, res) => {
  try {
    const servicesQuery = 'SELECT * FROM predefined_services WHERE is_active = true ORDER BY service_category, service_name';
    const industriesQuery = 'SELECT * FROM predefined_industries WHERE is_active = true ORDER BY industry_category, industry_name';
    
    const [servicesResult, industriesResult] = await Promise.all([
      pool.query(servicesQuery),
      pool.query(industriesQuery)
    ]);

    res.json({
      success: true,
      services: servicesResult.rows,
      industries: industriesResult.rows
    });
  } catch (error) {
    console.error('Error fetching options:', error);
    res.status(500).json({ error: 'Failed to fetch options' });
  }
});

// Get professional profile
router.get('/profile/:userId?', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId || req.user.userId;
    const isOwnProfile = parseInt(userId) === req.user.userId;

    // Check if user is verified professional
    const userCheck = await pool.query(
      'SELECT is_verified_professional FROM users WHERE id = $1',
      [userId]
    );

    if (!userCheck.rows[0]?.is_verified_professional && isOwnProfile) {
      return res.status(403).json({ error: 'User is not a verified professional' });
    }

    const query = `
      SELECT 
        pp.*,
        u.username,
        u.email,
        u.professional_type,
        u.professional_verification_date,
        COALESCE(ROUND(AVG(pr.rating), 2), 0) as average_rating,
        COUNT(pr.id) as review_count
      FROM professional_profiles pp
      JOIN users u ON pp.user_id = u.id
      LEFT JOIN professional_reviews pr ON pp.user_id = pr.professional_id
      WHERE pp.user_id = $1
      GROUP BY pp.id, u.username, u.email, u.professional_type, u.professional_verification_date
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Professional profile not found' });
    }

    const profile = result.rows[0];

    // If not own profile and profile is private, don't return sensitive info
    if (!isOwnProfile && profile.profile_visibility === 'private') {
      return res.status(403).json({ error: 'Profile is private' });
    }

    // Remove sensitive data for non-own profiles
    if (!isOwnProfile) {
      delete profile.professional_contact;
      delete profile.pricing_info;
    }

    res.json({
      success: true,
      profile: profile
    });
  } catch (error) {
    console.error('Error fetching professional profile:', error);
    res.status(500).json({ error: 'Failed to fetch professional profile' });
  }
});

// Create or update professional profile
router.post('/profile', authenticateToken, upload.single('professionalPicture'), async (req, res) => {
  try {
    const userId = req.user.userId;

    // Check if user is verified professional
    const userCheck = await pool.query(
      'SELECT is_verified_professional FROM users WHERE id = $1',
      [userId]
    );

    if (!userCheck.rows[0]?.is_verified_professional) {
      return res.status(403).json({ error: 'User is not a verified professional' });
    }

    const {
      professionalBio,
      professionalTagline,
      yearsExperience,
      professionalWebsite,
      servicesOffered,
      industriesServiced,
      specializations,
      professionalContact,
      availabilitySchedule,
      preferredContactMethod,
      pricingInfo,
      serviceLocations,
      languagesSpoken,
      socialLinks,
      profileVisibility,
      allowDirectContact
    } = req.body;

    let professionalPictureUrl = null;

    // Handle professional picture upload
    if (req.file) {
      try {
        const timestamp = Date.now();
        const s3Key = `professional-pictures/${userId}/${timestamp}_${req.file.originalname}`;
        professionalPictureUrl = await uploadToS3(req.file.buffer, s3Key, req.file.mimetype);
      } catch (uploadError) {
        console.error('Error uploading professional picture:', uploadError);
        return res.status(500).json({ error: 'Failed to upload professional picture' });
      }
    }

    // Parse JSON fields
    const parseJSON = (field) => {
      if (typeof field === 'string') {
        try {
          return JSON.parse(field);
        } catch {
          return field;
        }
      }
      return field;
    };

    // Check if profile exists
    const existingProfile = await pool.query(
      'SELECT id FROM professional_profiles WHERE user_id = $1',
      [userId]
    );

    let query, values;

    if (existingProfile.rows.length > 0) {
      // Update existing profile
      query = `
        UPDATE professional_profiles SET
          professional_bio = $2,
          professional_tagline = $3,
          years_experience = $4,
          professional_website = $5,
          services_offered = $6,
          industries_serviced = $7,
          specializations = $8,
          professional_contact = $9,
          availability_schedule = $10,
          preferred_contact_method = $11,
          pricing_info = $12,
          service_locations = $13,
          languages_spoken = $14,
          social_links = $15,
          profile_visibility = $16,
          allow_direct_contact = $17,
          ${professionalPictureUrl ? 'professional_picture_url = $18,' : ''}
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
        RETURNING *
      `;

      values = [
        userId,
        professionalBio,
        professionalTagline,
        parseInt(yearsExperience) || null,
        professionalWebsite,
        parseJSON(servicesOffered) || [],
        parseJSON(industriesServiced) || [],
        parseJSON(specializations) || [],
        parseJSON(professionalContact) || {},
        parseJSON(availabilitySchedule) || {},
        preferredContactMethod || 'email',
        parseJSON(pricingInfo) || {},
        parseJSON(serviceLocations) || [],
        parseJSON(languagesSpoken) || [],
        parseJSON(socialLinks) || {},
        profileVisibility || 'public',
        allowDirectContact !== 'false'
      ];

      if (professionalPictureUrl) {
        values.push(professionalPictureUrl);
      }
    } else {
      // Create new profile
      query = `
        INSERT INTO professional_profiles (
          user_id, professional_bio, professional_tagline, years_experience,
          professional_website, services_offered, industries_serviced, specializations,
          professional_contact, availability_schedule, preferred_contact_method,
          pricing_info, service_locations, languages_spoken, social_links,
          profile_visibility, allow_direct_contact
          ${professionalPictureUrl ? ', professional_picture_url' : ''}
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
          ${professionalPictureUrl ? ', $18' : ''}
        ) RETURNING *
      `;

      values = [
        userId,
        professionalBio,
        professionalTagline,
        parseInt(yearsExperience) || null,
        professionalWebsite,
        parseJSON(servicesOffered) || [],
        parseJSON(industriesServiced) || [],
        parseJSON(specializations) || [],
        parseJSON(professionalContact) || {},
        parseJSON(availabilitySchedule) || {},
        preferredContactMethod || 'email',
        parseJSON(pricingInfo) || {},
        parseJSON(serviceLocations) || [],
        parseJSON(languagesSpoken) || [],
        parseJSON(socialLinks) || {},
        profileVisibility || 'public',
        allowDirectContact !== 'false'
      ];

      if (professionalPictureUrl) {
        values.push(professionalPictureUrl);
      }
    }

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: 'Professional profile saved successfully',
      profile: result.rows[0]
    });
  } catch (error) {
    console.error('Error saving professional profile:', error);
    res.status(500).json({ error: 'Failed to save professional profile', details: error.message });
  }
});

// Search professionals
router.get('/search', async (req, res) => {
  try {
    const {
      query: searchQuery,
      services,
      industries,
      minRating,
      minExperience,
      location,
      limit = 20,
      offset = 0
    } = req.query;

    const searchFunction = `
      SELECT * FROM search_professionals(
        $1::TEXT, $2::JSONB, $3::JSONB, $4::DECIMAL, $5::INTEGER, 
        $6::TEXT, $7::INTEGER, $8::INTEGER
      )
    `;

    const values = [
      searchQuery || null,
      services ? JSON.parse(services) : null,
      industries ? JSON.parse(industries) : null,
      minRating ? parseFloat(minRating) : null,
      minExperience ? parseInt(minExperience) : null,
      location || null,
      parseInt(limit),
      parseInt(offset)
    ];

    const result = await pool.query(searchFunction, values);

    res.json({
      success: true,
      professionals: result.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: result.rows.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error searching professionals:', error);
    res.status(500).json({ error: 'Failed to search professionals' });
  }
});

// Get portfolio items for a professional
router.get('/portfolio/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const query = `
      SELECT pp.*, u.username
      FROM professional_portfolio pp
      JOIN users u ON pp.professional_id = u.id
      WHERE pp.professional_id = $1
      ORDER BY pp.is_featured DESC, pp.display_order ASC, pp.completion_date DESC
    `;

    const result = await pool.query(query, [userId]);

    res.json({
      success: true,
      portfolio: result.rows
    });
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

// Add portfolio item
router.post('/portfolio', authenticateToken, upload.array('images', 5), async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      title,
      description,
      projectUrl,
      technologiesUsed,
      projectCategory,
      completionDate,
      clientTestimonial,
      isFeatured,
      displayOrder
    } = req.body;

    // Upload images to S3
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const timestamp = Date.now();
          const s3Key = `portfolio/${userId}/${timestamp}_${file.originalname}`;
          const imageUrl = await uploadToS3(file.buffer, s3Key, file.mimetype);
          imageUrls.push(imageUrl);
        } catch (uploadError) {
          console.error('Error uploading portfolio image:', uploadError);
        }
      }
    }

    const query = `
      INSERT INTO professional_portfolio (
        professional_id, title, description, project_url, image_urls,
        technologies_used, project_category, completion_date, client_testimonial,
        is_featured, display_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      userId,
      title,
      description,
      projectUrl,
      JSON.stringify(imageUrls),
      JSON.parse(technologiesUsed || '[]'),
      projectCategory,
      completionDate || null,
      clientTestimonial,
      isFeatured === 'true',
      parseInt(displayOrder) || 0
    ];

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: 'Portfolio item added successfully',
      portfolioItem: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding portfolio item:', error);
    res.status(500).json({ error: 'Failed to add portfolio item' });
  }
});

// Update portfolio item
router.put('/portfolio/:portfolioId', authenticateToken, async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const userId = req.user.userId;
    
    // Verify ownership
    const ownershipCheck = await pool.query(
      'SELECT professional_id FROM professional_portfolio WHERE id = $1',
      [portfolioId]
    );

    if (!ownershipCheck.rows.length || ownershipCheck.rows[0].professional_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this portfolio item' });
    }

    const {
      title,
      description,
      projectUrl,
      technologiesUsed,
      projectCategory,
      completionDate,
      clientTestimonial,
      isFeatured,
      displayOrder
    } = req.body;

    const query = `
      UPDATE professional_portfolio SET
        title = $2,
        description = $3,
        project_url = $4,
        technologies_used = $5,
        project_category = $6,
        completion_date = $7,
        client_testimonial = $8,
        is_featured = $9,
        display_order = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const values = [
      portfolioId,
      title,
      description,
      projectUrl,
      JSON.parse(technologiesUsed || '[]'),
      projectCategory,
      completionDate || null,
      clientTestimonial,
      isFeatured === 'true',
      parseInt(displayOrder) || 0
    ];

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: 'Portfolio item updated successfully',
      portfolioItem: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating portfolio item:', error);
    res.status(500).json({ error: 'Failed to update portfolio item' });
  }
});

// Delete portfolio item
router.delete('/portfolio/:portfolioId', authenticateToken, async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const userId = req.user.userId;
    
    // Verify ownership
    const ownershipCheck = await pool.query(
      'SELECT professional_id FROM professional_portfolio WHERE id = $1',
      [portfolioId]
    );

    if (!ownershipCheck.rows.length || ownershipCheck.rows[0].professional_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this portfolio item' });
    }

    await pool.query('DELETE FROM professional_portfolio WHERE id = $1', [portfolioId]);

    res.json({
      success: true,
      message: 'Portfolio item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting portfolio item:', error);
    res.status(500).json({ error: 'Failed to delete portfolio item' });
  }
});

// Get reviews for a professional
router.get('/reviews/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    const query = `
      SELECT 
        pr.*,
        u.username as reviewer_name
      FROM professional_reviews pr
      JOIN users u ON pr.reviewer_id = u.id
      WHERE pr.professional_id = $1
      ORDER BY pr.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [userId, parseInt(limit), parseInt(offset)]);

    // Get review summary
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_reviews,
        ROUND(AVG(rating), 2) as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM professional_reviews
      WHERE professional_id = $1
    `;

    const summaryResult = await pool.query(summaryQuery, [userId]);

    res.json({
      success: true,
      reviews: result.rows,
      summary: summaryResult.rows[0],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: result.rows.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Add review for a professional
router.post('/reviews', authenticateToken, async (req, res) => {
  try {
    const reviewerId = req.user.userId;
    const {
      professionalId,
      rating,
      reviewText,
      projectContext
    } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    if (parseInt(professionalId) === reviewerId) {
      return res.status(400).json({ error: 'Cannot review yourself' });
    }

    // Check if review already exists
    const existingReview = await pool.query(
      'SELECT id FROM professional_reviews WHERE professional_id = $1 AND reviewer_id = $2',
      [professionalId, reviewerId]
    );

    if (existingReview.rows.length > 0) {
      return res.status(400).json({ error: 'You have already reviewed this professional' });
    }

    const query = `
      INSERT INTO professional_reviews (
        professional_id, reviewer_id, rating, review_text, project_context
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await pool.query(query, [
      professionalId,
      reviewerId,
      rating,
      reviewText,
      projectContext
    ]);

    res.json({
      success: true,
      message: 'Review added successfully',
      review: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ error: 'Failed to add review' });
  }
});

// Get professional dashboard stats
router.get('/dashboard-stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get profile completion score and basic stats
    const profileQuery = `
      SELECT 
        profile_completion_score,
        profile_visibility,
        created_at
      FROM professional_profiles
      WHERE user_id = $1
    `;

    const reviewsQuery = `
      SELECT 
        COUNT(*) as total_reviews,
        ROUND(AVG(rating), 2) as average_rating
      FROM professional_reviews
      WHERE professional_id = $1
    `;

    const portfolioQuery = `
      SELECT COUNT(*) as portfolio_count
      FROM professional_portfolio
      WHERE professional_id = $1
    `;

    const [profileResult, reviewsResult, portfolioResult] = await Promise.all([
      pool.query(profileQuery, [userId]),
      pool.query(reviewsQuery, [userId]),
      pool.query(portfolioQuery, [userId])
    ]);

    const stats = {
      profileCompletionScore: profileResult.rows[0]?.profile_completion_score || 0,
      profileVisibility: profileResult.rows[0]?.profile_visibility || 'public',
      totalReviews: parseInt(reviewsResult.rows[0]?.total_reviews) || 0,
      averageRating: parseFloat(reviewsResult.rows[0]?.average_rating) || 0,
      portfolioCount: parseInt(portfolioResult.rows[0]?.portfolio_count) || 0,
      profileCreatedAt: profileResult.rows[0]?.created_at
    };

    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

export default router;
