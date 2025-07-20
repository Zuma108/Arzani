
import express from 'express';
import programmaticController from '../controllers/programmaticController.js';

const router = express.Router();

// Route for city and industry
router.get('/business-for-sale/:city/:industry?', programmaticController.getBusinessListings);

export default router;
