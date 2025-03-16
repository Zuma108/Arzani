import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth.js';  // Use your main authentication middleware
import pool from '../db.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const router = express.Router();

// Add route debugging at the top of your router
console.log('Registering post-business routes with standard authenticateToken');

// Skip the standard middleware for the root route, as we're handling it directly in server.js
// Only use middleware for sub-routes
router.use('/:subRoute', authenticateToken);

// Add middleware to handle token from cookies if not in header
router.use((req, res, next) => {
  // If already authenticated by authenticateToken, continue
  if (req.user && req.user.userId) {
    console.log('User already authenticated by middleware:', req.user.userId);
    return next();
  }
  
  // If authenticateToken didn't set user but we have a cookie token
  const cookieToken = req.cookies?.token;
  if (cookieToken) {
    try {
      const decoded = jwt.verify(cookieToken, process.env.JWT_SECRET);
      req.user = { userId: decoded.userId };
      console.log('Using token from cookie for authentication:', decoded.userId);
    } catch (error) {
      console.error('Invalid cookie token:', error.message);
    }
  } else if (req.session?.userId) {
    // If no token but we have userId in session
    req.user = { userId: req.session.userId };
    console.log('Using userId from session:', req.session.userId);
  }
  
  next();
});

// Skip the GET handler, as we now handle it directly in server.js
// The existing POST handler will still work normally

// Add a test endpoint to check authentication
router.get('/auth-check', (req, res) => {
  res.json({
    authenticated: !!req.user?.userId,
    userId: req.user?.userId,
    token: !!req.headers.authorization,
    sessionId: req.sessionID,
    timestamp: new Date().toISOString(),
    cookies: Object.keys(req.cookies || {})
  });
});

// Add enhanced debug endpoint for Google Maps API configuration
router.get('/maps-debug', (req, res) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || '';
  
  res.json({
    hasKey: !!googleMapsApiKey,
    keyLength: googleMapsApiKey ? googleMapsApiKey.length : 0,
    keyFirstChars: googleMapsApiKey ? `${googleMapsApiKey.substring(0, 8)}...` : '',
    envVars: Object.keys(process.env).filter(key => key.includes('GOOGLE')),
    host: req.get('host'),
    referrer: req.get('Referrer'),
    userAgent: req.get('User-Agent'),
    apiTestUrl: `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&callback=initMap&libraries=places`
  });
});

// Add an explicit API test endpoint
router.get('/test-places-api', async (req, res) => {
  try {
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!googleMapsApiKey) {
      return res.status(400).json({ 
        error: 'No Google Maps API key configured',
        action: 'Add GOOGLE_MAPS_API_KEY to your environment variables'
      });
    }
    
    // Test the Places API with a simple request
    const testUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=ChIJdd4hrwug2EcRmSrV3Vo6llI&fields=name&key=${googleMapsApiKey}`;
    
    const response = await fetch(testUrl);
    const data = await response.json();
    
    res.json({
      testUrl: testUrl.replace(googleMapsApiKey, '***REDACTED***'),
      status: data.status,
      success: data.status === 'OK',
      result: data,
      recommendations: data.status !== 'OK' ? [
        'Enable the Places API in your Google Cloud Console',
        'Check the API key restrictions to ensure they allow access from your domain',
        'Verify billing is enabled if required by Google'
      ] : []
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to test Places API',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ...existing code for other post-business routes...

export default router;
