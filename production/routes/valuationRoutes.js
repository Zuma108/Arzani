import express from 'express';
// Import the default export which contains the methods
import valuationController from '../controllers/valuationController.js';

const router = express.Router();

// Public routes that don't require authentication, mounted under /api/business

// POST /api/business/calculate-valuation
router.post('/calculate-valuation', express.json(), (req, res) => {
  console.log('Valuation router processing /calculate-valuation');
  res.setHeader('Content-Type', 'application/json');
  // Use the calculateValuation method from the imported controller object
  return valuationController.calculateValuation(req, res);
});

// POST /api/business/save-questionnaire
router.post('/save-questionnaire', express.json(), (req, res) => {
  console.log('Valuation router processing /save-questionnaire');
  res.setHeader('Content-Type', 'application/json');
  // Use the saveQuestionnaireData method from the imported controller object
  return valuationController.saveQuestionnaireData(req, res);
});

// REMOVE the generic /valuation fallback if it exists, it's confusing
// router.post('/valuation', express.json(), (req, res) => { ... });

export default router;
