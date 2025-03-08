import express from 'express';
import marketTrendsRoutes from './markettrendsroutes.js';
import trendsRoutes from './trendsroutes.js';
// Import other API route files here

const router = express.Router();

// Mount all API routes
router.use('/market-trends', marketTrendsRoutes);
router.use('/market/chat', trendsRoutes);
// Add other API routes here

// Status endpoint for debugging client-side connection issues
router.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    auth: {
      endpoints: {
        login: '/auth/login',
        login2: '/auth/login2',
        google: '/auth/google',
        microsoft: '/auth/microsoft'
      }
    },
    // Add other helpful status info without exposing sensitive details
  });
});

export default router;
