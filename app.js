import express from 'express';
import voiceRoutes from './routes/voiceRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import authRoutes from './routes/auth.js';
import { authenticateUser } from './middleware/auth.js';

const app = express();

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
const stripeRoutes = require('./routes/stripe');

app.use('/', voiceRoutes);
app.use('/', chatRoutes);
app.use('/checkout', checkoutRouter);
app.use('/stripe', stripeRoutes);
app.use('/auth', authRoutes);

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
