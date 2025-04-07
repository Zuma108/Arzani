import express from 'express';
import pool from '../../db.js';

const router = express.Router();

/**
 * GET /api/business/listings
 * Returns paginated business listings with optional filters
 */
router.get('/listings', async (req, res) => {
  try {
    console.log('Fetching business listings with query params:', req.query);
    
    // Get pagination parameters with defaults
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;
    
    // Simple query with pagination but no filters for direct database testing
    const query = `
      SELECT * FROM businesses 
      ORDER BY id DESC
      LIMIT $1 OFFSET $2
    `;
    
    console.log('Executing database query with:', { limit, offset });
    
    const result = await pool.query(query, [limit, offset]);
    console.log(`Retrieved ${result.rows.length} businesses from database`);
    
    // Get total count for pagination info
    const countResult = await pool.query('SELECT COUNT(*) FROM businesses');
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);
    
    console.log(`Total businesses in database: ${totalCount}, Total pages: ${totalPages}`);
    
    // Process each business to ensure consistent structure
    const businesses = result.rows.map(business => {
      // Ensure images is an array
      if (business.images) {
        // Handle PostgreSQL array format if needed
        if (typeof business.images === 'string' && business.images.startsWith('{') && business.images.endsWith('}')) {
          const arrayContent = business.images.substring(1, business.images.length - 1);
          business.images = arrayContent ? arrayContent.split(',') : [];
          console.log(`Processed images for business #${business.id}: ${business.images.length} images found`);
        }
      } else {
        business.images = [];
      }
      
      return {
        ...business,
        // Ensure numeric fields are numbers, not strings
        price: parseFloat(business.price) || 0,
        cash_flow: business.cash_flow ? parseFloat(business.cash_flow) : null,
        gross_revenue: business.gross_revenue ? parseFloat(business.gross_revenue) : null,
      };
    });
    
    return res.status(200).json({
      success: true,
      message: 'Businesses retrieved successfully',
      businesses: businesses,
      totalCount: totalCount,
      totalPages: totalPages,
      currentPage: page
    });
    
  } catch (error) {
    console.error('Error in /api/business/listings:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching business listings',
      error: error.message
    });
  }
});

export default router;
