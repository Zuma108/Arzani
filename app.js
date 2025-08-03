import express from 'express';
import dotenv from 'dotenv';
import voiceRoutes from './routes/voiceRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import authRoutes from './routes/auth.js';
import path from 'path';
// import { setupWebSocketServer } from './websocket-server.js'; // COMMENTED OUT - file doesn't exist
import http from 'http';
// REMOVED: import { authMiddleware } from './utils/auth-unified.js'; - deleted file
import authDebug from './middleware/authDebug.js';
import bodyParser from 'body-parser';
import { setupScheduledTasks } from './scheduled-tasks.js';
import { authenticateToken, requireAuth } from './middleware/auth.js';
dotenv.config();

const app = express();

// Make sure you have EJS set up as your view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files with correct headers
app.use(express.static('public', {
    setHeaders: (res, path) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

// Increase request body size limit - this is crucial for handling larger uploads
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// If you're using body-parser explicitly, update those limits too
app.use(bodyParser.json({ limit: '15mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '15mb' }));

// For multer, if you're using it for file uploads
import multer from 'multer';
const upload = multer({
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB in bytes
  }
});

// Global security headers middleware
app.use((req, res, next) => {
    if (req.path.startsWith('/payment')) {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    } else {
        res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
        res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    }
    next();
});

import checkoutRouter from './routes/checkout.js';
import stripeRoutes from './routes/stripe-routes.js';
import stripeImportedRoutes from './routes/stripe.js';
import submitBusinessRoutes from './routes/api/submit-business.js';
import sitemapRoutes from './routes/sitemap.js';

// Import our new API routes
import businessApiRoutes from './routes/api/profileApi.js'; // Fixed: was businessApi.js
import debugApiRoutes from './routes/api/debug.js';
import aiApiRoutes from './routes/api/ai.js';
import analyticsApiRoutes from './routes/api/analytics.js';

// Import the verification routes
import verificationRoutes from './routes/verificationRoutes.js';

// Import routes
import businessRoutes from './routes/businessRoutes.js';
import userRoutes from './routes/userRoutes.js';
import publicValuationRouter from './api/public-valuation.js';
import valuationRouter from './api/valuation.js';
import blogRoutes from './routes/blogRoutes.js';

// Import the image routes - use ES module syntax
import imageRoutes from './routes/imageRoutes.js';

// Import direct business listings API
import businessListingsRoutes from './routes/api/businessListings.js';

// Import contact routes
import contactRoutes from './routes/contact.js';

// Debug middleware for all requests - helps trace authentication issues
app.use((req, res, next) => {
  if (!req.path.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/i)) {
    console.log(`[Request] ${req.method} ${req.path}`);
  }
  next();
});

// Public routes that don't require authentication
app.use('/', voiceRoutes);
app.use('/', chatRoutes);
app.use('/blog', blogRoutes); // Blog routes are public
app.use('/checkout', checkoutRouter);
app.use('/stripe', stripeImportedRoutes); // Use the imported ESM routes
app.use('/stripe-legacy', stripeRoutes); // Keep the CommonJS routes at a different path
app.use('/auth', authRoutes);

// Test route for Google OAuth
app.get('/test/google-oauth', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'google-oauth-test.html'));
});

// Register the API route
app.use('/api/submit-business', submitBusinessRoutes);

// Use the sitemap routes
app.use('/', sitemapRoutes);

// Add the image routes - make sure to add this before other routes
app.use('/api', imageRoutes);

// Clean up homepage routes to resolve conflicts - remove duplicates and keep one clear implementation
app.get('/new-homepage', (req, res) => {
  res.render('new-homepage', {
    title: 'Welcome to Arzani Marketplace - New Design'
  });
});

// Make sure marketplace routes are explicitly marked as non-chat pages
app.get('/homepage', authDebug.enforceNonChatPage, (req, res) => {
  res.render('homepage', {
    title: 'Welcome to Our Marketplace',
    isChatPage: false,
    isMarketplacePage: true
  });
});

// Apply the same protection to any routes that should not be treated as chat pages
app.get('/marketplace', authDebug.enforceNonChatPage, (req, res) => {
  res.locals.isChatPage = false;
  res.redirect('/marketplace2');
});

// REMOVED: Duplicate marketplace2 route - keeping only the one in server.js
// app.get('/marketplace2', authDebug.enforceNonChatPage, (req, res) => {
//   res.locals.isChatPage = false;
//   res.render('marketplace2', {
//     title: 'Business Marketplace',
//     isChatPage: false,
//     isMarketplacePage: true
//   });
// });

// Root route with option to toggle between designs
app.get('/', (req, res) => {
  const useNewVersion = req.query.version === 'new';
  
  if (useNewVersion) {
    res.render('new-homepage', {
      title: 'Welcome to Arzani Marketplace'
    });
  } else {
    res.render('homepage', {
      title: 'Welcome to Our Marketplace'
    });
  }
});

// Mount the API routes - ensure these come BEFORE the authenticated routes
// Use explicit bypass for the public business API routes
app.use('/api/business', (req, res, next) => {
  // Mark these specific routes as public to bypass authentication
  if (
    (req.path === '/calculate-valuation' || req.path === '/save-questionnaire') &&
    req.method === 'POST'
  ) {
    console.log('Marking business API route as public:', req.path);
    req.isPublicRequest = true;
  }
  next();
}, businessApiRoutes);

// Add valuation routes with explicit auth bypass
app.use('/api/valuation', (req, res, next) => {
  // Check for the special header or if it's a public endpoint
  if (
    req.headers['x-request-source'] === 'valuation-calculator' || 
    req.headers['x-skip-auth'] === 'true' ||
    req.path === '/calculate' || 
    req.path === '/save-data'
  ) {
    console.log('No auth header, continuing without auth for path:', req.path);
    req.isPublicRequest = true;
    return next();
  }
  next();
}, valuationRouter);

// Use the direct business listings API for more reliable results
app.use('/api/business', businessListingsRoutes);

app.use('/api/debug', debugApiRoutes);

// Register AI routes
app.use('/api/ai', aiApiRoutes);

// Register analytics routes (admin only)
app.use('/api/analytics', (req, res, next) => {
  // Add admin check middleware
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
}, analyticsApiRoutes);

// Register verification routes
app.use('/api/verification', verificationRoutes);

// Define public paths that should never require authentication
const publicPaths = [
  '/api/public',
  '/api/public-valuation',
  '/api/valuation/calculate',
  '/api/valuation/save-data',
  '/api/business/calculate-valuation',
  '/api/business/save-questionnaire',
  '/api/verification/business',  // Make verification endpoints public
  '/api/verification/stats',     // Make verification stats public
  '/blog',                       // Make blog publicly accessible
  '/login',
  '/login2',
  '/signup',
  '/auth/login',
  '/auth/signup',
  '/marketplace',
  '/marketplace2'
];

// Apply authentication middleware to all routes except explicitly public ones
app.use((req, res, next) => {
  // Skip authentication for static files and public paths
  if (
    req.path.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/i) ||
    publicPaths.some(path => req.path.startsWith(path)) ||
    req.isPublicRequest
  ) {
    return next();
  }
  
  // Use our standardized auth middleware with appropriate options
  return authMiddleware({ required: true })(req, res, next);
});

// Mount routes
app.use('/', businessRoutes);
app.use('/users', userRoutes);
app.use('/', contactRoutes);

// Add admin routes with admin-specific middleware
app.use('/admin', authMiddleware({ required: true, adminRequired: true }), (req, res, next) => {
  // This middleware will only be reached if the user is authenticated as an admin
  next();
});

// Set up error handler for authentication failures
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  if (err.name === 'UnauthorizedError' || err.status === 401) {
    // For API requests, return JSON
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: err.message || 'Please log in to access this resource' 
      });
    }
    
    // For regular pages, redirect to login
    return res.redirect(`/login2?returnTo=${encodeURIComponent(req.originalUrl)}`);
  }
  
  // For other errors, pass to Express's default error handler
  next(err);
});

// Set up server
const server = http.createServer(app);

// Set up WebSocket server
// setupWebSocketServer(app, server); // COMMENTED OUT - websocket-server.js doesn't exist

// Set up scheduled tasks (e.g., analytics reports)
setupScheduledTasks();

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
