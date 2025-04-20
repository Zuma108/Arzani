import express from 'express';
import * as businessController from '../controllers/businessController.js';
import { authenticateToken } from '../middleware/auth.js';
import multer from 'multer';
import pool from '../db.js';
import { v4 as uuidv4 } from 'uuid';
import { uploadBusinessImagesFormatted } from '../utils/s3.js';
const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Max 5 files
  }
});

// Public business routes
router.get('/listings', async (req, res) => {
  try {
    console.log('Business listings request received with query:', req.query);
    
    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12; // Default to 12 items per page
    const offset = (page - 1) * limit;
    
    // Build filter conditions
    let conditions = [];
    let params = [];
    let paramIndex = 1;
    
    // Filter by location if provided
    if (req.query.location && req.query.location.trim() !== '') {
      conditions.push(`location ILIKE $${paramIndex}`);
      params.push(`%${req.query.location.trim()}%`);
      paramIndex++;
    }
    
    // Filter by industry if provided
    if (req.query.industries && req.query.industries.trim() !== '') {
      const industries = req.query.industries.split(',').map(i => i.trim());
      if (industries.length > 0) {
        const industryConditions = industries.map(industry => {
          params.push(`%${industry}%`);
          return `industry ILIKE $${paramIndex++}`;
        });
        conditions.push(`(${industryConditions.join(' OR ')})`);
      }
    }
    
    // Filter by price range if provided
    if (req.query.priceMin && !isNaN(req.query.priceMin)) {
      conditions.push(`price >= $${paramIndex}`);
      params.push(parseFloat(req.query.priceMin));
      paramIndex++;
    }
    
    if (req.query.priceMax && !isNaN(req.query.priceMax)) {
      conditions.push(`price <= $${paramIndex}`);
      params.push(parseFloat(req.query.priceMax));
      paramIndex++;
    }
    
    // Build the WHERE clause
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) FROM businesses ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);
    
    console.log(`Total businesses found: ${totalCount}, Total pages: ${totalPages}`);
    
    // Main query for businesses with pagination
    const query = `
      SELECT * FROM businesses 
      ${whereClause}
      ORDER BY id DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit);
    params.push(offset);
    
    console.log('Executing SQL query:', query);
    console.log('With parameters:', params);
    
    const result = await pool.query(query, params);
    console.log(`Retrieved ${result.rows.length} businesses`);
    
    // Process images for each business
    const businesses = result.rows.map(business => {
      // Handle image URLs if available
      if (business.images) {
        // Parse PostgreSQL array format if needed
        if (typeof business.images === 'string' && business.images.startsWith('{') && business.images.endsWith('}')) {
          business.images = business.images.substring(1, business.images.length - 1).split(',');
        }
      } else {
        business.images = []; // Ensure images is at least an empty array
      }
      return business;
    });
    
    return res.status(200).json({
      success: true,
      businesses: businesses,
      totalCount,
      totalPages,
      currentPage: page
    });
    
  } catch (error) {
    console.error('Error fetching business listings:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching business listings',
      error: error.message
    });
  }
});

router.get('/business/:id', businessController.getBusinessById);

// Add the missing contact-seller endpoint
router.post('/api/contact-seller', businessController.contactSeller);
router.post('/contact-seller', businessController.contactSeller);

// Protected business routes
router.post('/submit-business', authenticateToken, upload.array('images', 5), businessController.submitBusiness);
router.post('/business/:id/update', authenticateToken, businessController.updateBusiness);
router.delete('/business/:id', authenticateToken, businessController.deleteBusiness);

// Add this route specifically for image uploads
router.post('/submit-business-images', authenticateToken, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images provided'
      });
    }
    
    console.log(`Processing ${req.files.length} images for upload`);
    
    // Get S3 configuration from request or environment
    const s3Region = req.headers['x-aws-region'] || req.body.awsRegion || process.env.AWS_REGION || 'eu-west-2';
    const s3Bucket = req.headers['x-aws-bucket'] || req.body.awsBucket || process.env.AWS_BUCKET_NAME || 'arzani-images1';
    
    // Create a unique business key based on timestamp
    const businessKey = Date.now().toString();
    
    // Import S3 utility functions directly - fixed to avoid duplicate declarations

    
    // Upload images to S3 and get PostgreSQL array formatted string
    const imagesArrayString = await uploadBusinessImagesFormatted(
      req.files,
      businessKey,
      s3Region,
      s3Bucket
    );
    
    // Parse the array string back to a JavaScript array for the response
    let imageUrls = [];
    if (imagesArrayString && imagesArrayString.length > 2) {
      // Extract content between { and }
      const content = imagesArrayString.substring(1, imagesArrayString.length - 1);
      // Split by comma
      imageUrls = content.split(',');
    }
    
    // Return success with the image URLs and formatted array string
    res.json({
      success: true,
      message: `Successfully uploaded ${req.files.length} images`,
      images: imageUrls,
      imagesArray: imagesArrayString,
      businessKey: businessKey
    });
    
  } catch (error) {
    console.error('Error uploading business images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload images',
      error: error.message
    });
  }
});

// Business valuation route - Create a separate route handler that comes BEFORE any auth middleware
// and doesn't use authenticateToken middleware
router.post('/api/business/calculate-valuation', async (req, res) => {
  try {
    // Debug log incoming headers
    console.log('Valuation endpoint called with headers:', {
      'x-request-source': req.headers['x-request-source'],
      'x-skip-auth': req.headers['x-skip-auth'],
      'content-type': req.headers['content-type'],
      referrer: req.headers.referer || req.headers.referrer
    });
    
    // IMPORTANT: Log authentication bypass for debugging
    console.log('Public valuation endpoint accessed (no auth required)');
    
    // Log incoming data for debugging
    console.log('Received business data for valuation:', {
      hasData: !!req.body,
      fields: req.body ? Object.keys(req.body) : 'none',
      industry: req.body?.industry,
      revenue: req.body?.gross_revenue || req.body?.grossRevenue,
      ebitda: req.body?.ebitda,
      headers: {
        requestSource: req.headers['x-request-source'],
        skipAuth: req.headers['x-skip-auth'],
        directAccess: req.headers['x-direct-access']
      }
    });

    // If the calculation method exists in the controller, use it
    if (businessController.calculateValuation) {
      // Prepare the data to ensure consistent format before passing to controller
      const businessData = standardizeBusinessData(req.body);
      
      // Store standardized data in request for controller to use
      req.body = businessData;
      
      return businessController.calculateValuation(req, res);
    } else {
      // Fallback implementation if controller method doesn't exist
      const businessData = standardizeBusinessData(req.body);
      
      // Validate required fields
      if (!businessData.revenue && !businessData.ebitda) {
        return res.status(400).json({
          success: false,
          message: 'Missing required financial data (revenue or EBITDA)'
        });
      }
      
      // Fetch the appropriate industry multiplier from the database
      const industry = businessData.industry || 'Other';
      let multiplierData;
      
      try {
        const query = `
          SELECT * FROM industry_multipliers 
          WHERE industry = $1
        `;
        
        const result = await pool.query(query, [industry]);
        
        if (result.rows.length > 0) {
          multiplierData = result.rows[0];
          console.log(`Found industry multipliers for ${industry}:`, multiplierData);
        } else {
          // If no match found, try to get the "Other" category
          const defaultResult = await pool.query(`
            SELECT * FROM industry_multipliers 
            WHERE industry = 'Other'
          `);
          
          if (defaultResult.rows.length > 0) {
            multiplierData = defaultResult.rows[0];
            console.log(`Using default multipliers for ${industry}:`, multiplierData);
          } else {
            throw new Error('No industry multipliers found');
          }
        }
      } catch (dbError) {
        console.error('Error fetching industry multipliers:', dbError);
        
        // Fallback to hardcoded values if database query fails
        multiplierData = {
          min_revenue_multiplier: 0.5,
          max_revenue_multiplier: 1.5,
          ebitda_multiplier: 3.0,
          industry: industry
        };
        
        console.log('Using hardcoded fallback multipliers:', multiplierData);
      }
      
      // Calculate valuation based on available financial data and multipliers
      let estimatedValue, valuationMin, valuationMax, multipleUsed, multipleType;
      
      if (businessData.ebitda > 0) {
        // EBITDA-based valuation (preferred if EBITDA data is available)
        multipleUsed = multiplierData.ebitda_multiplier;
        multipleType = 'ebitda';
        estimatedValue = Math.round(businessData.ebitda * multipleUsed);
        
        // Use revenue multipliers for the range
        valuationMin = Math.round(businessData.revenue * multiplierData.min_revenue_multiplier);
        valuationMax = Math.round(Math.max(
          businessData.revenue * multiplierData.max_revenue_multiplier,
          estimatedValue * 1.2 // Ensure max is at least 20% above estimate
        ));
      } else {
        // Revenue-based valuation (fallback)
        const avgRevenueMultiplier = (multiplierData.min_revenue_multiplier + multiplierData.max_revenue_multiplier) / 2;
        multipleUsed = avgRevenueMultiplier;
        multipleType = 'revenue';
        estimatedValue = Math.round(businessData.revenue * avgRevenueMultiplier);
        
        // Use revenue multipliers directly for the range
        valuationMin = Math.round(businessData.revenue * multiplierData.min_revenue_multiplier);
        valuationMax = Math.round(businessData.revenue * multiplierData.max_revenue_multiplier);
      }
      
      // Add growth adjustment if growth rate is provided
      if (businessData.growth_rate && businessData.growth_rate > 0) {
        const growthFactor = 1 + (Math.min(businessData.growth_rate, 50) / 100);
        estimatedValue = Math.round(estimatedValue * growthFactor);
        valuationMax = Math.round(valuationMax * growthFactor);
      }
      
      return res.json({
        success: true,
        valuation: {
          estimatedValue: estimatedValue,
          valuationRange: {
            min: valuationMin,
            max: valuationMax
          },
          confidence: 85,
          multiple: multipleUsed,
          multipleType: multipleType,
          summary: `Based on ${industry} industry standards, with a ${multipleUsed.toFixed(1)}x ${multipleType.toUpperCase()} multiple.`,
          factors: {
            industry: {
              impact: 5,
              analysis: `${industry} businesses typically sell for ${multiplierData.min_revenue_multiplier}x-${multiplierData.max_revenue_multiplier}x revenue or ${multiplierData.ebitda_multiplier}x EBITDA.`
            },
            growth: {
              impact: businessData.growth_rate > 10 ? 10 : (businessData.growth_rate || 0),
              analysis: businessData.growth_rate ? `Your ${businessData.growth_rate}% growth rate positively impacts valuation.` : 'Growth rate was not provided.'
            }
          },
          industryData: {
            industry: multiplierData.industry,
            revenueMultiplierMin: multiplierData.min_revenue_multiplier,
            revenueMultiplierMax: multiplierData.max_revenue_multiplier,
            ebitdaMultiplier: multiplierData.ebitda_multiplier
          }
        }
      });
    }
  } catch (error) {
    console.error('Error calculating valuation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate valuation',
      error: error.message
    });
  }
});

// Add a helper function to standardize business data format
function standardizeBusinessData(data) {
  if (!data) return {};
  
  const standardized = { ...data };
  
  // Map camelCase to snake_case if needed
  const fieldMappings = {
    'businessName': 'business_name',
    'cashFlow': 'cash_flow',
    'grossRevenue': 'gross_revenue',
    'salesMultiple': 'sales_multiple',
    'profitMargin': 'profit_margin',
    'debtService': 'debt_service',
    'cashOnCash': 'cash_on_cash',
    'downPayment': 'down_payment',
    'ffE': 'ffe',
    'yearsInOperation': 'years_in_operation',
    'reasonForSelling': 'reason_for_selling',
    'recurringRevenue': 'recurring_revenue',
    'growthRate': 'growth_rate',
    'websiteTraffic': 'website_traffic',
    'socialFollowers': 'social_media_followers',
    'intellectualProperty': 'intellectual_property'
  };
  
  // Ensure all fields have snake_case versions
  for (const [camelCase, snakeCase] of Object.entries(fieldMappings)) {
    if (standardized[camelCase] !== undefined && standardized[snakeCase] === undefined) {
      standardized[snakeCase] = standardized[camelCase];
    }
  }
  
  // Ensure numeric fields are actually numbers
  const numericFields = [
    'price', 'cash_flow', 'gross_revenue', 'ebitda', 'inventory', 
    'sales_multiple', 'profit_margin', 'debt_service', 'cash_on_cash', 
    'down_payment', 'ffe', 'employees', 'years_in_operation',
    'recurring_revenue', 'growth_rate', 'website_traffic', 
    'social_media_followers'
  ];
  
  for (const field of numericFields) {
    if (standardized[field] !== undefined) {
      // Convert string values to numbers
      if (typeof standardized[field] === 'string') {
        standardized[field] = parseFloat(standardized[field].replace(/[^0-9.-]+/g, '')) || 0;
      }
    }
  }
  
  // Add common aliases for convenience
  standardized.revenue = standardized.gross_revenue || standardized.revenue || 0;
  
  return standardized;
}

// Add route for advanced valuation
router.post('/api/business/calculate-advanced-valuation', async (req, res) => {
  try {
    console.log('Received business data for advanced valuation:', {
      hasData: !!req.body,
      fields: req.body ? Object.keys(req.body) : 'none',
      industry: req.body?.industry,
      revenue: req.body?.gross_revenue || req.body?.grossRevenue,
      ebitda: req.body?.ebitda
    });
    
    // Standardize incoming data
    const businessData = standardizeBusinessData(req.body);
    
    // If the advanced calculation method exists in the controller, use it
    if (businessController.calculateAdvancedValuation) {
      req.body = businessData;
      return businessController.calculateAdvancedValuation(req, res);
    } else {
      // Simple fallback implementation if controller method doesn't exist
      const baseValue = businessData.ebitda > 0 ? businessData.ebitda : businessData.revenue * 0.2;
      const industry = businessData.industry || 'Other';
      
      // More sophisticated multipliers for advanced valuation
      const multipliers = {
        'Financial Services': 5.0,
        'Online & Technology': 6.0,
        'Retail': 3.5,
        'Service Businesses': 4.0,
        'Other': 4.0
      };
      
      const multiplier = multipliers[industry] || multipliers['Other'];
      const estimatedValue = Math.round(baseValue * multiplier);
      
      // Add risk adjustment based on years in operation
      const yearsInOperation = businessData.years_in_operation || 0;
      const riskFactor = Math.min(1, 0.7 + (yearsInOperation * 0.05));
      
      // Add growth adjustment
      const growthRate = businessData.growth_rate || 0;
      const growthFactor = 1 + (growthRate / 100);
      
      // Calculate final value with adjustments
      const adjustedValue = Math.round(estimatedValue * riskFactor * growthFactor);
      
      return res.json({
        success: true,
        advancedValuation: {
          estimatedValue: adjustedValue,
          min: Math.round(adjustedValue * 0.85),
          max: Math.round(adjustedValue * 1.15),
          confidence: 90,
          multiple: multiplier,
          multipleType: businessData.ebitda > 0 ? 'ebitda' : 'revenue',
          riskFactor,
          growthFactor,
          explanation: `Advanced valuation considers your ${yearsInOperation} years in operation and ${growthRate}% growth rate, applying industry-specific multipliers for ${industry}.`
        }
      });
    }
  } catch (error) {
    console.error('Error calculating advanced valuation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate advanced valuation',
      error: error.message
    });
  }
});

// Add a dedicated route to serve the business listing page directly without redirects
router.get('/business/:id', async (req, res) => {
  try {
    const businessId = req.params.id;
    console.log(`Fetching business details for ID: ${businessId}`);
    
    // Fetch business data from database
    const business = await businessController.getBusinessById(req, res, businessId);
    
    if (!business) {
      return res.status(404).render('error', { 
        message: 'Business not found',
        error: { status: 404, stack: '' }
      });
    }
    
    // Process image URLs to ensure proper S3 region handling
    if (business.images) {
      // Check if images is a PostgreSQL array string
      if (typeof business.images === 'string' && business.images.startsWith('{') && business.images.endsWith('}')) {
        // Parse PostgreSQL array string
        const imageUrls = business.images.substring(1, business.images.length - 1).split(',');
        business.images = imageUrls;
      }
      
      // Ensure all URLs are properly formed
      business.images = business.images.map(img => {
        if (!img) return null;
        
        // If already a full URL, return it
        if (img.startsWith('http')) return img;
        
        // Check for region hints in the path
        const region = img.includes('eu-north-1') ? 'eu-north-1' : 'eu-west-2';
        const bucket = process.env.AWS_BUCKET_NAME || 'arzani-images1';
        
        // Return full URL
        return `https://${bucket}.s3.${region}.amazonaws.com/businesses/${businessId}/${img}`;
      }).filter(Boolean); // Remove any nulls
    }
    
    // Render the business listing page directly
    res.render('business_listing', { business });
    
  } catch (error) {
    console.error('Error fetching business:', error);
    res.status(500).render('error', { 
      message: 'Error loading business details',
      error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
    });
  }
});

// Update the isSaved endpoint to remove excessive logging
router.get('/is-saved/:businessId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const businessId = req.params.businessId;
    
    // Remove the debug log
    // console.log('Checking saved status:', { businessId });
    
    const savedBusiness = await pool.query(
      'SELECT * FROM saved_businesses WHERE user_id = $1 AND business_id = $2',
      [userId, businessId]
    );
    
    const exists = savedBusiness.rows.length > 0;
    
    // Remove the debug log
    // console.log('Save check result:', { exists });
    
    return res.json({ isSaved: exists });
  } catch (error) {
    console.error('Error checking saved status:', error);
    return res.status(500).json({ error: 'Server error checking saved status' });
  }
});

// Add a public route for saving questionnaires without requiring authentication
router.post('/save-questionnaire', async (req, res) => {
  console.log('Public save-questionnaire endpoint accessed');
  const client = await pool.connect(); // Get a client from the pool for transaction

  try {
    await client.query('BEGIN'); // Start transaction

    const data = req.body;
    console.log('Questionnaire data to save:', {
      email: data.email,
      businessName: data.businessName,
      industry: data.industry,
      hasValuation: !!data.valuation
    });

    // Generate a submission ID if not provided
    const submissionId = data.submissionId || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const email = data.email || null;
    const anonymousId = data.anonymousId || `anon_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // First check if the anonymous_id already exists to avoid unique constraint violation
    if (anonymousId && data.anonymousId) {  // Only check if client provided an anonymousId
      const checkQuery = 'SELECT submission_id FROM questionnaire_submissions WHERE anonymous_id = $1';
      const checkResult = await client.query(checkQuery, [anonymousId]);
      
      if (checkResult.rows.length > 0) {
        // If anonymousId exists, use its submission_id for the update
        const existingSubmissionId = checkResult.rows[0].submission_id;
        console.log(`Found existing submission with anonymous_id ${anonymousId}: ${existingSubmissionId}`);
        
        // Update the existing record
        const updateQuery = `
          UPDATE questionnaire_submissions 
          SET 
            email = COALESCE($1, email),
            data = $2,
            updated_at = NOW()
          WHERE anonymous_id = $3
          RETURNING id, submission_id
        `;

        const updateResult = await client.query(updateQuery, [
          email,
          JSON.stringify(data),
          anonymousId
        ]);
        
        await client.query('COMMIT');
        
        // Set cache control headers to prevent loop
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('X-Submission-Status', 'updated');
        
        // Return the existing submission ID
        return res.status(200).json({
          success: true,
          message: 'Questionnaire data updated successfully',
          submissionId: updateResult.rows[0].submission_id,
          updated: true
        });
      }
    }
    
    // If no existing anonymousId or we didn't provide one, proceed with insert
    // Store complete data as JSON to avoid column mismatch issues
    const insertQuery = `
      INSERT INTO questionnaire_submissions (
        submission_id, 
        email, 
        anonymous_id, 
        data, 
        created_at, 
        updated_at,
        status
      ) VALUES ($1, $2, $3, $4, NOW(), NOW(), $5)
      ON CONFLICT (submission_id) 
      DO UPDATE SET 
        email = EXCLUDED.email,
        data = EXCLUDED.data,
        updated_at = NOW()
      RETURNING id
    `;

    const result = await client.query(insertQuery, [
      submissionId,
      email,
      anonymousId,
      JSON.stringify(data),  // Store all data as JSON to avoid column mismatches
      'pending'  // Initial status
    ]);

    // If we also have valuation data, store it separately
    if (data.valuation || data.valuationData) {
      const valuation = data.valuation || data.valuationData;

      // Insert into business_valuations table if needed
      console.log('Storing valuation data for submission:', submissionId);
      
      // Any valuation-specific storage logic would go here
    }

    await client.query('COMMIT');
    
    // Set cache control headers to prevent loop
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('X-Submission-Status', 'created');
    
    // Return with clear properties that client code can check
    res.status(200).json({
      success: true,
      message: 'Questionnaire data saved successfully',
      submissionId: submissionId,
      created: true
    });

  } catch (error) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK');
    console.error('Database error saving questionnaire data:', error);

    // Provide detailed error for debugging
    console.error('Request body causing error:', req.body);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to save questionnaire data',
      error: error.message,
      errorCode: error.code
    });
  } finally {
    // Release the client back to the pool
    client.release();
    console.log('Database client released.');
  }
});

// Export the router
export { router };
export default router;
