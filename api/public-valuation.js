/**
 * Public Valuation API - Direct endpoints that bypass authentication
 * These endpoints are intended for the seller questionnaire flow
 */

import express from 'express';
import valuationController from '../controllers/valuationController.js';

const router = express.Router();

/**
 * Calculate business valuation without requiring authentication
 * POST /api/public/valuation/calculate
 */
router.post('/valuation/calculate', express.json(), async (req, res) => {
  try {
    console.log('Public valuation calculation endpoint accessed');
    res.setHeader('Content-Type', 'application/json');
    return valuationController.calculateValuation(req, res);
  } catch (error) {
    console.error('Error in public valuation calculate endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate valuation',
      error: error.message
    });
  }
});

/**
 * Save questionnaire data without requiring authentication
 * POST /api/public/valuation/save-questionnaire
 */
router.post('/valuation/save-questionnaire', express.json(), async (req, res) => {
  try {
    console.log('Public questionnaire save endpoint accessed');
    res.setHeader('Content-Type', 'application/json');
    return valuationController.saveQuestionnaireData(req, res);
  } catch (error) {
    console.error('Error in public save questionnaire endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save questionnaire data',
      error: error.message
    });
  }
});

export default router;
