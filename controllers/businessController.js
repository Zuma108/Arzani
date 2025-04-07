/**
 * Business controller for business listings and management
 */

import pool from '../db.js';
import valuationService from '../services/valuationService.js';
import { uploadToS3, parsePostgresUrlArray, uploadBusinessImagesFormatted } from '../utils/s3.js';
import s3Utils from '../utils/s3.js'; // Import as a namespace instead
import { processBusinessImages } from '../utils/imageHandler.js';

/**
 * Get all business listings with pagination and filtering
 */
export const getListings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Build query conditions for filtering
    let conditions = [];
    let params = [];
    let paramCounter = 1;
    
    // Filter by industry if provided
    if (req.query.industry) {
      conditions.push(`industry = $${paramCounter}`);
      params.push(req.query.industry);
      paramCounter++;
    }
    
    // Filter by price range if provided
    if (req.query.minPrice) {
      conditions.push(`price >= $${paramCounter}`);
      params.push(parseFloat(req.query.minPrice));
      paramCounter++;
    }
    
    if (req.query.maxPrice) {
      conditions.push(`price <= $${paramCounter}`);
      params.push(parseFloat(req.query.maxPrice));
      paramCounter++;
    }
    
    // Filter by location if provided
    if (req.query.location) {
      conditions.push(`location ILIKE $${paramCounter}`);
      params.push(`%${req.query.location}%`);
      paramCounter++;
    }
    
    // Build where clause
    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) FROM businesses
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);
    
    // Add pagination parameters
    params.push(limit, offset);
    
    // Get businesses with pagination
    const query = `
      SELECT
        id,
        business_name,
        industry,
        price,
        location,
        description,
        images,
        date_listed
      FROM businesses
      ${whereClause}
      ORDER BY date_listed DESC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;
    
    const result = await pool.query(query, params);
    
    // Process each business's images
    const processedBusinesses = result.rows.map(business => processBusinessImages(business));
    
    res.json({
      success: true,
      businesses: processedBusinesses,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error getting business listings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch business listings' });
  }
};

/**
 * Get business details by ID
 */
export const getBusinessById = async (req, res) => {
  try {
    const businessId = req.params.id;
    console.log(`Fetching business details for ID: ${businessId}`);
    
    // Query the database for the business
    const result = await pool.query(
      'SELECT * FROM businesses WHERE id = $1',
      [businessId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).render('error', { 
        message: 'Business not found',
        error: { status: 404, stack: '' }
      });
    }
    
    // Get the business data and process images
    const business = processBusinessImages(result.rows[0]);
    
    // Render the business_listing page directly with processed data
    return res.render('business_listing', { business });
    
  } catch (error) {
    console.error('Error fetching business:', error);
    return res.status(500).render('error', { 
      message: 'Error loading business details',
      error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
    });
  }
};

/**
 * Submit a new business listing
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const submitBusiness = async (req, res) => {
  console.log('Submit business request received');
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    console.log('Submitting business with data:', {
      businessName: req.body.business_name,
      imageCount: req.files?.length || 0,
      userId: req.user?.userId,
    });

    // Validate required fields
    if (!req.body.business_name || !req.body.price || !req.body.industry) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: business name, price, and industry are required'
      });
    }

    // Validate images - at least 3 required
    if (!req.files || req.files.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'At least 3 images are required'
      });
    }

    // Use a transaction for better data integrity
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Create a unique business identifier for S3 path
      const businessKey = Date.now().toString();
      
      // Get S3 region and bucket from request or environment variables
      const s3Region = req.body.awsRegion || process.env.AWS_REGION || 'eu-west-2';
      const s3Bucket = req.body.awsBucket || process.env.AWS_BUCKET_NAME || 'arzani-images1';
      
      console.log(`Using S3 region: ${s3Region}, bucket: ${s3Bucket}`);
      
      // Upload images to S3 and get PostgreSQL array formatted string
      const imagesArray = await s3Utils.uploadBusinessImagesFormatted(
        req.files, 
        businessKey,
        s3Region,
        s3Bucket
      );
      
      console.log(`Received PostgreSQL formatted image array: ${imagesArray}`);
      
      // Insert the business with all fields
      const insertQuery = `
        INSERT INTO businesses (
          business_name,
          industry,
          price,
          cash_flow,
          gross_revenue,
          ebitda,
          inventory,
          sales_multiple,
          profit_margin,
          debt_service,
          cash_on_cash,
          down_payment,
          location,
          ffe,
          employees,
          reason_for_selling,
          description,
          user_id,
          years_in_operation,
          recurring_revenue_percentage,
          growth_rate,
          intellectual_property,
          website_traffic,
          social_media_followers,
          images,
          date_listed
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, NOW()
        ) RETURNING id, business_name, user_id, images;
      `;
      
      const values = [
        req.body.business_name,
        req.body.industry,
        req.body.price,
        req.body.cash_flow,
        req.body.gross_revenue,
        req.body.ebitda,
        req.body.inventory,
        req.body.sales_multiple,
        req.body.profit_margin,
        req.body.debt_service,
        req.body.cash_on_cash,
        req.body.down_payment,
        req.body.location,
        req.body.ffe,
        req.body.employees,
        req.body.reason_for_selling,
        req.body.description,
        req.user.userId,
        req.body.years_in_operation,
        req.body.recurring_revenue_percentage,
        req.body.growth_rate,
        req.body.intellectual_property,
        req.body.website_traffic,
        req.body.social_media_followers,
        imagesArray
      ];
      
      console.log('Executing SQL insert with values:', {
        businessName: req.body.business_name,
        industry: req.body.industry,
        price: req.body.price,
        userId: req.user.userId
      });
      
      const result = await client.query(insertQuery, values);
      console.log('Query result:', result.rows[0]);
      
      if (!result.rows[0]) {
        throw new Error('Database insert did not return business data');
      }
      
      // Parse the images array from PostgreSQL format for response
      const businessData = result.rows[0];
      const imageUrls = parsePostgresUrlArray(businessData.images);
      
      await client.query('COMMIT');
      
      // Return success with business data and image URLs in the format the client expects
      return res.status(201).json({
        success: true,
        message: 'Business listed successfully',
        business: {
          id: businessData.id,
          business_name: businessData.business_name,
          user_id: businessData.user_id,
          images: businessData.images
        },
        images: imageUrls
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction error in submitBusiness:', error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error submitting business:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit business',
      error: error.message
    });
  }
};

/**
 * Contact the seller of a business
 */
export const contactSeller = async (req, res) => {
  try {
    const {
      businessId,
      name,
      email,
      phone,
      message
    } = req.body;
    
    // Basic validation
    if (!businessId || !name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    // Get business owner's email
    const businessQuery = `
      SELECT
        b.business_name,
        u.email as owner_email
      FROM businesses b
      JOIN users u ON b.user_id = u.id
      WHERE b.id = $1
    `;
    
    const businessResult = await pool.query(businessQuery, [businessId]);
    
    if (businessResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }
    
    const { business_name, owner_email } = businessResult.rows[0];
    
    // Save inquiry to database
    const inquiryQuery = `
      INSERT INTO inquiries (
        business_id,
        name,
        email,
        phone,
        message,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5, NOW()
      ) RETURNING id
    `;
    
    const inquiryResult = await pool.query(inquiryQuery, [
      businessId,
      name,
      email,
      phone || null,
      message
    ]);
    
    // Send email to business owner (implementation omitted)
    
    res.json({
      success: true,
      message: 'Contact request sent successfully',
      inquiryId: inquiryResult.rows[0].id
    });
  } catch (error) {
    console.error('Error contacting seller:', error);
    res.status(500).json({ success: false, message: 'Failed to send contact request' });
  }
};

/**
 * Update a business listing
 */
export const updateBusiness = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    // Check if user owns the business
    const ownerCheckQuery = `
      SELECT user_id FROM businesses
      WHERE id = $1
    `;
    
    const ownerResult = await pool.query(ownerCheckQuery, [id]);
    
    if (ownerResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }
    
    if (ownerResult.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this business' });
    }
    
    // Extract business data from request body
    const {
      business_name,
      industry,
      price,
      description,
      location,
      gross_revenue,
      ebitda,
      cash_flow,
      inventory,
      employees,
      years_in_operation,
      reason_for_selling,
      images,
      is_active
    } = req.body;
    
    // Update business in database
    const updateQuery = `
      UPDATE businesses
      SET
        business_name = COALESCE($1, business_name),
        industry = COALESCE($2, industry),
        price = COALESCE($3, price),
        description = COALESCE($4, description),
        location = COALESCE($5, location),
        gross_revenue = COALESCE($6, gross_revenue),
        ebitda = COALESCE($7, ebitda),
        cash_flow = COALESCE($8, cash_flow),
        inventory = COALESCE($9, inventory),
        employees = COALESCE($10, employees),
        years_in_operation = COALESCE($11, years_in_operation),
        reason_for_selling = COALESCE($12, reason_for_selling),
        images = COALESCE($13, images),
        is_active = COALESCE($14, is_active),
        updated_at = NOW()
      WHERE id = $15
      RETURNING *
    `;
    
    const values = [
      business_name,
      industry,
      price ? parseFloat(price) : null,
      description,
      location,
      gross_revenue ? parseFloat(gross_revenue) : null,
      ebitda ? parseFloat(ebitda) : null,
      cash_flow ? parseFloat(cash_flow) : null,
      inventory ? parseFloat(inventory) : null,
      employees ? parseInt(employees) : null,
      years_in_operation ? parseInt(years_in_operation) : null,
      reason_for_selling,
      images,
      is_active,
      id
    ];
    
    const result = await pool.query(updateQuery, values);
    
    res.json({
      success: true,
      message: 'Business updated successfully',
      business: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating business:', error);
    res.status(500).json({ success: false, message: 'Failed to update business' });
  }
};

/**
 * Delete a business listing
 */
export const deleteBusiness = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    // Check if user owns the business
    const ownerCheckQuery = `
      SELECT user_id FROM businesses
      WHERE id = $1
    `;
    
    const ownerResult = await pool.query(ownerCheckQuery, [id]);
    
    if (ownerResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }
    
    if (ownerResult.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this business' });
    }
    
    // Delete business from database
    await pool.query(
      'DELETE FROM businesses WHERE id = $1',
      [id]
    );
    
    res.json({
      success: true,
      message: 'Business deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting business:', error);
    res.status(500).json({ success: false, message: 'Failed to delete business' });
  }
};

/**
 * Calculate business valuation
 */
export const calculateValuation = async (req, res) => {
  try {
    const businessData = req.body;
    
    // Calculate valuation using valuation service
    const valuation = await valuationService.calculateValuation(businessData);
    
    res.json({
      success: true,
      valuation
    });
  } catch (error) {
    console.error('Error calculating valuation:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate valuation' });
  }
};

/**
 * Save questionnaire data
 */
export const saveQuestionnaireData = async (req, res) => {
  try {
    const questionnaireData = req.body;
    
    // Basic validation
    if (!questionnaireData.email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    
    // Save questionnaire data to database
    const query = `
      INSERT INTO questionnaire_submissions (
        email,
        business_name,
        industry,
        description,
        revenue,
        ebitda,
        years_in_operation,
        created_at,
        anonymous_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, NOW(), $8
      ) RETURNING id
    `;
    
    const values = [
      questionnaireData.email,
      questionnaireData.businessName,
      questionnaireData.industry,
      questionnaireData.description,
      parseFloat(questionnaireData.revenueExact || 0),
      parseFloat(questionnaireData.ebitda || 0),
      parseInt(questionnaireData.yearsInOperation || 0),
      questionnaireData.anonymousId
    ];
    
    const result = await pool.query(query, values);
    
    res.json({
      success: true,
      message: 'Questionnaire data saved successfully',
      submissionId: result.rows[0].id
    });
  } catch (error) {
    console.error('Error saving questionnaire data:', error);
    res.status(500).json({ success: false, message: 'Failed to save questionnaire data' });
  }
};
