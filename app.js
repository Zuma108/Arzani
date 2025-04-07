import express from 'express';
import voiceRoutes from './routes/voiceRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import authRoutes from './routes/auth.js';
import { authenticateUser } from './middleware/auth.js';
import path from 'path';
import { setupWebSocketServer } from './websocket-server.js';
import http from 'http';
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

const checkoutRouter = require('./routes/checkout');
const stripeRoutes = require('./routes/stripe-routes');
import stripeImportedRoutes from './routes/stripe.js';
import submitBusinessRoutes from './routes/api/submit-business.js';
import sitemapRoutes from './routes/sitemap.js';

// Import our new API routes
import businessApiRoutes from './routes/api/businessApi.js';
import debugApiRoutes from './routes/api/debug.js';

// Import routes
import businessRoutes from './routes/businessRoutes.js';
import userRoutes from './routes/userRoutes.js';
import publicValuationRouter from './api/public-valuation.js';

// Import the image routes - use ES module syntax
import imageRoutes from './routes/imageRoutes.js';

// Import direct business listings API
import businessListingsRoutes from './routes/api/businessListings.js';

app.use('/', voiceRoutes);
app.use('/', chatRoutes);
app.use('/checkout', checkoutRouter);
app.use('/stripe', stripeImportedRoutes); // Use the imported ESM routes
app.use('/stripe-legacy', stripeRoutes); // Keep the CommonJS routes at a different path
app.use('/auth', authRoutes);
app.use('/chat', chatRoutes); // Add chat routes

// Register the API route
app.use('/api/submit-business', submitBusinessRoutes);

// Use the sitemap routes
app.use('/', sitemapRoutes);

// Add the image routes - make sure to add this before other routes
app.use('/api', imageRoutes);

// Add pricing route
  

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

app.get('/marketplace2', authDebug.enforceNonChatPage, (req, res) => {
  res.locals.isChatPage = false;
  res.render('marketplace2', {
    title: 'Business Marketplace',
    isChatPage: false,
    isMarketplacePage: true
  });
});

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

// Use the direct business listings API for more reliable results
app.use('/api/business', businessListingsRoutes);

app.use('/api/debug', debugApiRoutes);

// IMPORTANT: Register public API endpoints BEFORE authentication middleware
app.use('/api/public', publicValuationRouter);

// Then apply authentication middleware (if you have global auth middleware)
// app.use(authenticateToken); // This line would be your global auth middleware if you have one

// Mount routes
app.use('/', businessRoutes);
app.use('/users', userRoutes);
app.use('/auth', authRoutes);

// Mount the public valuation API - No authentication middleware
app.use('/api/public-valuation', publicValuationRouter);

// Protect routes that need authentication
const protectedRoutes = [
  '/api/user/profile',
  '/api/listings/create',
  '/api/listings/edit',
  '/dashboard'
];

// Apply authentication middleware to protected routes
protectedRoutes.forEach(route => {
  app.use(route, authenticateUser);
});

// Set up server
const server = http.createServer(app);

// Set up WebSocket server
setupWebSocketServer(app, server);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
