import express from 'express';
import voiceRoutes from './routes/voiceRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import authRoutes from './routes/auth.js';
import { authenticateUser } from './middleware/auth.js';
import path from 'path';
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
