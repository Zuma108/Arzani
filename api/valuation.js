import express from 'express';
import cors from 'cors';
import pool from '../db.js'; // Add this import to fix the "pool is not defined" error
import valuationController from '../controllers/valuationController.js';

const router = express.Router();

// Configure CORS for API requests
router.use(cors({
  origin: true,
  credentials: true
}));

// Enable parsing JSON request bodies
router.use(express.json());

// Test endpoint for health checks
router.get('/test', (req, res) => {
  res.json({ 
    status: "valuation OK",
    timestamp: new Date().toISOString(),
    service: "valuation-api"
  });
});

// Middleware to log all valuation API requests
router.use((req, res, next) => {
  console.log('Blog API router hit:', req.method, req.path);
  next();
});

/**
 * Direct endpoint for business valuation calculations
 * No authentication required - for questionnaire flow
 */
router.post('/calculate', async (req, res) => {
  try {
    const data = req.body;
    
    // Log the request
    console.log('Valuation API request received:', {
      timestamp: new Date().toISOString(),
      clientIP: req.ip,
      dataKeys: Object.keys(data),
      headerReferer: req.headers.referer || 'none',
      anonymousId: data.anonymousId || 'none',
      email: data.email || 'none'
    });
    
    // Basic validation
    if (!data || (!data.revenue && !data.ebitda)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required financial data (revenue or EBITDA)'
      });
    }
    
    // Store the original request data for tracking/debugging
    if (data.anonymousId || data.email) {
      try {
        const trackingData = {
          anonymousId: data.anonymousId,
          email: data.email,
          requestData: data,
          requestTime: new Date()
        };
        
        // Store in a valuation_requests table or similar
        await storeValuationRequest(trackingData);
      } catch (trackingError) {
        console.error('Error tracking valuation request:', trackingError);
        // Don't fail the main request if tracking fails
      }
    }
    
    console.log('Processing valuation request: Anonymous ID: ' + (data.anonymousId || 'None') + ', Email: ' + (data.email || 'None'));
    
    // Calculate valuation by directly calling the controller method
    await valuationController.calculateValuation(req, res);
    
  } catch (error) {
    console.error('Valuation API error:', error);
    
    // Ensure we always send a response
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to process valuation request',
        error: error.message
      });
    }
  }
});

/**
 * NEW ENDPOINT: Saves valuation data without requiring authentication
 * This endpoint is specifically designed to work with the client-side valuation calculator
 */
router.post('/save-data', async (req, res) => {
  try {
    const data = req.body;
    
    // Set explicit JSON content type to ensure proper response format
    res.setHeader('Content-Type', 'application/json');
    
    // Log the save request
    console.log('Valuation save request received:', {
      timestamp: new Date().toISOString(),
      clientIP: req.ip,
      dataKeys: Object.keys(data),
      anonymousId: data.anonymousId || 'none',
      email: data.email || 'none'
    });
    
    // Basic validation
    if (!data || (!data.valuationData && !data.estimatedValue)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required valuation data'
      });
    }
    
    // Generate a unique submission ID if one doesn't exist
    const submissionId = data.submissionId || 
                         `val_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    // Insert data into the questionnaire_submissions table to store the valuation
    const query = `
      INSERT INTO questionnaire_submissions (
        submission_id,
        email,
        data,
        valuation_data,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (submission_id)
      DO UPDATE SET
        data = $3,
        valuation_data = $4,
        updated_at = NOW()
      RETURNING id, submission_id
    `;
    
    const values = [
      submissionId,
      (data.email || '').toLowerCase().trim() || null,
      JSON.stringify(data),
      JSON.stringify(data.valuationData || {}),
      'completed'
    ];
    
    // Execute the query
    const result = await pool.query(query, values);
    
    console.log(`Valuation data saved with submission ID: ${result.rows[0].submission_id}`);
    
    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Valuation data saved successfully',
      submissionId: result.rows[0].submission_id
    });
    
  } catch (error) {
    console.error('Error saving valuation data:', error);
    
    // Set explicit JSON content type again to ensure proper error response
    res.setHeader('Content-Type', 'application/json');
    
    // Return error response
    return res.status(500).json({
      success: false,
      message: 'Failed to save valuation data',
      error: error.message
    });
  }
});

// Helper function to store valuation requests for tracking
async function storeValuationRequest(data) {
  try {
    const query = `
      INSERT INTO valuation_requests (
        anonymous_id,
        email,
        request_data,
        created_at
      ) VALUES ($1, $2, $3, NOW())
      RETURNING id
    `;
    
    const values = [
      data.anonymousId || null,
      data.email || null,
      JSON.stringify(data.requestData)
    ];
    
    const result = await pool.query(query, values);
    console.log(`Stored valuation request with ID: ${result.rows[0].id}`);
    
    return result.rows[0].id;
  } catch (error) {
    console.error('Failed to store valuation request:', error);
    throw error;
  }
}

export default router;
