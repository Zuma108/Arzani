import express from 'express';
import marketTrendsRoutes from './api/market-trends.js';
// ...other route imports...

const router = express.Router();

// Register API routes
router.use('/market-trends', marketTrendsRoutes);
// ...other route registrations...

export default router;
