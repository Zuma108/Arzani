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
