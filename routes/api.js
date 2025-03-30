import express from 'express';
import marketTrendsRoutes from './markettrendsroutes.js';
import trendsRoutes from './trendsroutes.js';
// Import other API route files here
import jwt from 'jsonwebtoken';

const router = express.Router();

// Mount all API routes
router.use('/market-trends', marketTrendsRoutes);
router.use('/market/chat', trendsRoutes);
// Add other API routes here

// Helper function to get userId from token
async function getUserIdFromToken(token) {
  try {
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId;
  } catch (error) {
    console.error('Error verifying token:', error.message);
    return null;
  }
}

// Token validation endpoint
router.get('/verify-token', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    
    // Get userId from token
    const userId = await getUserIdFromToken(token);
    
    if (!userId) {
      return res.status(401).json({ 
        valid: false, 
        error: 'Invalid token'
      });
    }
    
    // Return success with userId
    res.json({ 
      valid: true, 
      userId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ 
      valid: false, 
      error: 'Token verification failed'
    });
  }
});

// Token debug endpoint - enhanced to provide more details
router.get('/token-debug', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const cookieToken = req.cookies?.token;
    const sessionToken = req.session?.token;
    
    // Try to get userId from each source
    const headerUserId = await getUserIdFromToken(token);
    const cookieUserId = await getUserIdFromToken(cookieToken);
    const sessionUserId = req.session?.userId;
    
    res.json({
      time: new Date().toISOString(),
      authHeader: token ? {
        status: headerUserId ? 'valid' : 'invalid',
        token: headerUserId ? token.substring(0, 10) + '...' : null,
        userId: headerUserId
      } : { status: 'missing' },
      cookie: cookieToken ? {
        status: cookieUserId ? 'valid' : 'invalid',
        userId: cookieUserId
      } : { status: 'missing' },
      session: {
        id: req.sessionID,
        userId: sessionUserId || null,
        authenticated: !!sessionUserId
      }
    });
  } catch (error) {
    console.error('Token debug error:', error);
    res.status(500).json({ error: 'Token debug failed' });
  }
});

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
