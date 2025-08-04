import path from 'path';
import express from 'express';
import { uploadMiddleware, optimizeImages } from '../../middleware/imageOptimization.js';
import { uploadToS3 } from '../../utils/s3.js';
import pool from '../../db.js';

const router = express.Router();

// Endpoint to upload images and submit business data
router.post('/', uploadMiddleware.array('images', 5), optimizeImages, async (req, res) => {
  try {
    // Get user ID from token
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    
    // Handle JSON-formatted business data
    let businessData = req.body;
    
    // If we receive JSON string instead of parsed object
    if (typeof businessData === 'string') {
      try {
        businessData = JSON.parse(businessData);
      } catch (err) {
        console.error('Failed to parse business data:', err);
        return res.status(400).json({
          success: false,
          error: 'Invalid business data format'
        });
      }
    }
    
    // Log the request for debugging
    console.log('Business submission request received:', {
      userId,
      businessName: businessData.business_name,
      imageCount: req.files?.length,
      hasStockImages: Array.isArray(businessData.images) && businessData.images.length > 0
    });
    
    // Process uploaded images or use stock images
    let imageUrls = [];
    
    // If using stock images directly
    if (businessData.useStockImages && Array.isArray(businessData.images)) {
      imageUrls = businessData.images;
      console.log(`Using ${imageUrls.length} stock images:`, imageUrls);
    }
    // If we have file uploads
    else if (req.files && req.files.length > 0) {
      // Upload each file to S3
      const uploadPromises = req.files.map(async (file) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname) || '.jpg';
        const filename = `business_${userId}_${timestamp}${ext}`;
        const s3Key = `businesses/${userId}/${filename}`;
        
        try {
          const s3Url = await uploadToS3(file, s3Key);
          console.log(`Uploaded ${file.originalname} to S3: ${s3Url}`);
          return s3Url;
        } catch (err) {
          console.error(`Failed to upload ${file.originalname}:`, err);
          return null;
        }
      });
      
      // Wait for all uploads to complete
      const results = await Promise.all(uploadPromises);
      imageUrls = results.filter(url => url !== null);
      
      console.log(`Successfully uploaded ${imageUrls.length} images to S3`);
    }
    // If we have image URLs from previous uploads
    else if (Array.isArray(businessData.images) && businessData.images.length > 0) {
      imageUrls = businessData.images;
      console.log(`Using ${imageUrls.length} pre-uploaded image URLs`);
    }
    
    // Ensure we have enough images
    if (imageUrls.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'At least 3 images are required'
      });
    }
    
    // Save business data to database
    const query = `
      INSERT INTO businesses (
        user_id,
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
        images,
        date_listed
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW()
      ) RETURNING id, business_name, user_id, images;
    `;
    
    const values = [
      userId,
      businessData.business_name,
      businessData.industry,
      businessData.price,
      businessData.cash_flow || businessData.cashFlow,
      businessData.gross_revenue || businessData.grossRevenue,
      businessData.ebitda,
      businessData.inventory,
      businessData.sales_multiple || businessData.salesMultiple,
      businessData.profit_margin || businessData.profitMargin,
      businessData.debt_service || businessData.debtService,
      businessData.cash_on_cash || businessData.cashOnCash,
      businessData.down_payment || businessData.downPayment,
      businessData.location,
      businessData.ffe || businessData.ffE,
      businessData.employees,
      businessData.reason_for_selling || businessData.reasonForSelling,
      businessData.description,
      imageUrls  // Use array of image URLs
    ];
    
    const result = await pool.query(query, values);
    const business = result.rows[0];
    
    console.log('Business created successfully:', business);
    
    res.status(200).json({ 
      success: true, 
      message: 'Business listed successfully',
      business
    });
  } catch (error) {
    console.error('Error submitting business:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to submit business', 
      message: error.message 
    });
  }
});

export default router;
