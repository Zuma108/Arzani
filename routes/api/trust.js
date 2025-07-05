import express from 'express';
import pool from '../../db.js';
import { authenticateToken } from '../../middleware/auth.js';
import { adminAuth } from '../../middleware/adminAuth.js';

const router = express.Router();

/**
 * Get trust badges for businesses
 * GET /api/trust/badges/:businessId
 */
router.get('/badges/:businessId', async (req, res) => {
  try {
    const businessId = req.params.businessId;

    const result = await pool.query(`
      SELECT 
        seller_verified,
        id_verified,
        financials_verified,
        is_featured,
        is_premium,
        is_premium_only,
        escrow_eligible,
        verification_date,
        financial_verification_date,
        price,
        created_at
      FROM businesses 
      WHERE id = $1
    `, [businessId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const business = result.rows[0];
    const badges = [];

    // Escrow badge for high-value listings
    if (business.escrow_eligible || (business.price && business.price >= 10000)) {
      badges.push({
        type: 'escrow',
        label: 'Escrow Protected',
        verified: true,
        description: 'Secure escrow payment available'
      });
    }

    // Verified seller badge
    if (business.seller_verified || business.id_verified) {
      badges.push({
        type: 'verified',
        label: 'Verified Seller',
        verified: true,
        verifiedDate: business.verification_date,
        description: 'Seller identity verified'
      });
    }

    // Verified financials badge
    if (business.financials_verified) {
      badges.push({
        type: 'financials',
        label: 'Verified Financials',
        verified: true,
        verifiedDate: business.financial_verification_date,
        description: 'Financial documents verified'
      });
    }

    // Premium/Featured badge
    if (business.is_featured || business.is_premium) {
      badges.push({
        type: 'premium',
        label: 'Premium Listing',
        verified: true,
        description: 'Featured premium listing'
      });
    }

    res.json({ badges });
  } catch (error) {
    console.error('Error fetching trust badges:', error);
    res.status(500).json({ error: 'Failed to fetch trust badges' });
  }
});

/**
 * Get all businesses with trust information
 * GET /api/trust/businesses
 */
router.get('/businesses', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      verified_only = false,
      premium_only = false,
      escrow_only = false 
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = ['1=1'];
    let queryParams = [];

    if (verified_only === 'true') {
      whereConditions.push('(seller_verified = true OR id_verified = true)');
    }

    if (premium_only === 'true') {
      whereConditions.push('(is_featured = true OR is_premium = true)');
    }

    if (escrow_only === 'true') {
      whereConditions.push('(escrow_eligible = true OR price >= 10000)');
    }

    const result = await pool.query(`
      SELECT 
        id,
        business_name,
        location,
        price,
        seller_verified,
        id_verified,
        financials_verified,
        is_featured,
        is_premium,
        is_premium_only,
        escrow_eligible,
        verification_date,
        financial_verification_date,
        created_at,
        images
      FROM businesses 
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY 
        is_featured DESC,
        is_premium DESC,
        seller_verified DESC,
        financials_verified DESC,
        created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    // Get total count
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM businesses 
      WHERE ${whereConditions.join(' AND ')}
    `);

    const businesses = result.rows.map(business => ({
      ...business,
      trustScore: calculateTrustScore(business)
    }));

    res.json({
      businesses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching businesses with trust info:', error);
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

/**
 * Admin: Update business verification status
 * PUT /api/trust/verify/:businessId
 */
router.put('/verify/:businessId', authenticateToken, adminAuth, async (req, res) => {
  try {
    const businessId = req.params.businessId;
    const { 
      sellerVerified, 
      financialsVerified, 
      isFeatured, 
      isPremium,
      isPremiumOnly,
      escrowEligible,
      notes 
    } = req.body;

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (typeof sellerVerified === 'boolean') {
      updateFields.push(`seller_verified = $${paramCount}`);
      values.push(sellerVerified);
      paramCount++;
      
      if (sellerVerified) {
        updateFields.push(`verification_date = CURRENT_TIMESTAMP`);
      }
    }

    if (typeof financialsVerified === 'boolean') {
      updateFields.push(`financials_verified = $${paramCount}`);
      values.push(financialsVerified);
      paramCount++;
      
      if (financialsVerified) {
        updateFields.push(`financial_verification_date = CURRENT_TIMESTAMP`);
      }
    }

    if (typeof isFeatured === 'boolean') {
      updateFields.push(`is_featured = $${paramCount}`);
      values.push(isFeatured);
      paramCount++;
    }

    if (typeof isPremium === 'boolean') {
      updateFields.push(`is_premium = $${paramCount}`);
      values.push(isPremium);
      paramCount++;
    }

    if (typeof isPremiumOnly === 'boolean') {
      updateFields.push(`is_premium_only = $${paramCount}`);
      values.push(isPremiumOnly);
      paramCount++;
    }

    if (typeof escrowEligible === 'boolean') {
      updateFields.push(`escrow_eligible = $${paramCount}`);
      values.push(escrowEligible);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(businessId);

    const result = await pool.query(`
      UPDATE businesses 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Log verification action
    if (notes) {
      await pool.query(`
        INSERT INTO buyer_activity (user_id, activity_type, business_id, metadata)
        VALUES ($1, $2, $3, $4)
      `, [
        req.user.userId, 
        'admin_verification', 
        businessId, 
        JSON.stringify({ notes, timestamp: new Date() })
      ]);
    }

    res.json({ 
      business: result.rows[0],
      message: 'Verification status updated successfully' 
    });
  } catch (error) {
    console.error('Error updating verification status:', error);
    res.status(500).json({ error: 'Failed to update verification status' });
  }
});

/**
 * Get trust statistics
 * GET /api/trust/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_businesses,
        COUNT(*) FILTER (WHERE seller_verified = true OR id_verified = true) as verified_sellers,
        COUNT(*) FILTER (WHERE financials_verified = true) as verified_financials,
        COUNT(*) FILTER (WHERE escrow_eligible = true OR price >= 10000) as escrow_eligible,
        COUNT(*) FILTER (WHERE is_featured = true OR is_premium = true) as premium_listings,
        AVG(price) FILTER (WHERE price IS NOT NULL) as avg_price,
        SUM(price) FILTER (WHERE escrow_eligible = true OR price >= 10000) as total_escrow_value
      FROM businesses
    `);

    const userStats = await pool.query(`
      SELECT 
        COUNT(*) as total_buyers,
        COUNT(*) FILTER (WHERE buyer_plan = 'premium') as premium_buyers,
        SUM(meetings_booked) as total_meetings,
        SUM(due_diligence_reports_used) as total_reports
      FROM users
    `);

    res.json({
      businesses: stats.rows[0],
      buyers: userStats.rows[0]
    });
  } catch (error) {
    console.error('Error fetching trust stats:', error);
    res.status(500).json({ error: 'Failed to fetch trust stats' });
  }
});

/**
 * Get verification queue for admin
 * GET /api/trust/verification-queue
 */
router.get('/verification-queue', authenticateToken, adminAuth, async (req, res) => {
  try {
    const { type = 'all' } = req.query;

    let whereCondition = '';
    if (type === 'seller') {
      whereCondition = 'WHERE (seller_verified = false OR seller_verified IS NULL)';
    } else if (type === 'financials') {
      whereCondition = 'WHERE (financials_verified = false OR financials_verified IS NULL)';
    } else if (type === 'pending') {
      whereCondition = `WHERE (
        (seller_verified = false OR seller_verified IS NULL) OR 
        (financials_verified = false OR financials_verified IS NULL)
      )`;
    }

    const result = await pool.query(`
      SELECT 
        b.id,
        b.business_name,
        b.location,
        b.price,
        b.seller_verified,
        b.financials_verified,
        b.created_at,
        b.date_listed,
        u.first_name,
        u.last_name,
        u.email
      FROM businesses b
      JOIN users u ON b.user_id = u.id
      ${whereCondition}
      ORDER BY b.created_at DESC
      LIMIT 50
    `);

    res.json({ queue: result.rows });
  } catch (error) {
    console.error('Error fetching verification queue:', error);
    res.status(500).json({ error: 'Failed to fetch verification queue' });
  }
});

/**
 * Calculate trust score for a business
 */
function calculateTrustScore(business) {
  let score = 0;
  
  // Base score
  score += 20;
  
  // Verification bonuses
  if (business.seller_verified || business.id_verified) score += 25;
  if (business.financials_verified) score += 25;
  if (business.escrow_eligible) score += 15;
  if (business.is_featured || business.is_premium) score += 15;
  
  return Math.min(score, 100);
}

export default router;
