import express from 'express';
import postBusinessValuationController from '../controllers/postBusinessValuationController.js';

const router = express.Router();

// POST /api/post-business/calculate-valuation
router.post('/calculate-valuation', express.json(), postBusinessValuationController.calculateValuation.bind(postBusinessValuationController));

// Additional routes can be added here if needed

export default router;
