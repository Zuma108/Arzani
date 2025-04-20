import express from 'express';
import session from 'express-session';
import multer from 'multer';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import dotenv from 'dotenv';
import pool from './db.js';
import bodyParser from 'body-parser'; // To parse JSON bodies       
import bcrypt from 'bcrypt';
import { sendVerificationEmail } from './utils/email.js';
import authRoutes from './routes/auth.js';
import paymentRoutes from './routes/payment.routes.js';

import Stripe from 'stripe';

// Add a simple RateLimiter class implementation
class RateLimiter {
  constructor(options = {}) {
    this.requests = new Map();
    this.windowMs = options.windowMs || 60000; // Default: 1 minute
    this.maxRequests = options.maxRequests || 100; // Default: 100 requests per window
    this.message = options.message || 'Too many requests, please try again later.';
    this.statusCode = options.statusCode || 429; // 429 Too Many Requests
  }
  
  check(key) {
    const now = Date.now();
    const requestLog = this.requests.get(key) || [];
    
    // Remove old requests outside the current window
    const validRequests = requestLog.filter(timestamp => 
      now - timestamp < this.windowMs
    );
    
    // Check if max requests is reached
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request to the log
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }
}

import { 
  createUserTable, 
  createUser, 
  getUserByEmail, 
  getUserById, 
  verifyUser, 
  authenticateUser,
  addProviderColumns // Add this import
} from './database.js';
import chatRouter from './routes/chat.js';
import sgMail from '@sendgrid/mail';
import cors from 'cors';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import BusinessMetricsService from './services/businessMetricsService.js';
import OpenAI from 'openai';
import fetch from 'node-fetch';
import { authenticateToken } from './middleware/auth.js';
import historyRoutes from './routes/historyRoutes.js';
import { createBusinessHistoryTable } from './services/history.js';
import fs from 'fs';
import savedBusinessesRoutes from './routes/savedBusinesses.js';
import marketTrendsRoutes from './routes/markettrendsroutes.js';
import trendsRoutes from './routes/trendsroutes.js';
import googleDriveRoutes from './routes/googleDriveRoutes.js';
import googleAuthRoutes from './routes/googleAuthRoutes.js';
import postBusinessValuationRoutes from './routes/postBusinessValuationRoutes.js';
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3'; // Add ListBucketsCommand
import { uploadToS3 } from './utils/s3.js';
import { adminAuth } from './middleware/adminAuth.js'; // Add this import
import profileApi from './routes/api/profileApi.js'; // New profile API
import voiceRoutes from './routes/voiceRoutes.js'; // Add this import
import stripeRoutes from './routes/stripe.js';
import printRoutes from './middleware/routeDebug.js';
import apiRoutes from './routes/api.js'; // Add this import
import blogRoutes from './routes/blogRoutes.js'; // Add this import for blog routes
import blogApiRoutes from './routes/blogApiRoutes.js'; // Add this import
import adminRoutes from './routes/adminRoutes.js'; // <-- Import admin routes
import { stripeWebhookMiddleware, handleStripeWebhook } from './middleware/webhookHandler.js';
import profileRoutes from './routes/profile.routes.js';
import apiSubRoutes from './routes/api/subscription.js';
import checkoutRoutes from './routes/checkout.js';
import subscriptionApiRoutes from './routes/api/subscription.js';

import { authenticateUser as authMiddleware, populateUser } from './middleware/auth.js'; // Add this import
import cookieParser from 'cookie-parser';
import marketplaceRoutes from './routes/marketplaceRoutes.js';
import marketTrendsApiRoutes from './routes/api/market-trends.js';
import { initializeAws, getS3Client } from './utils/awsConfig.js';
import { refreshMarketTrends, initializeMarketTrends } from './services/marketTrendsService.js'; // Add this import

// Import the assistant monitoring routes
import assistantMonitorRoutes from './routes/api/assistant-monitor.js';

// Import for AI assistant routes (if not already there)
import aiAssistantRoutes from './routes/ai-assistant.js';

// Add this import at the top with other imports
import { createAssistantTables } from './migrations/create_assistant_interactions.js';

// Import routes
import postBusinessRoutes from './routes/post-business.js';
import { debugAuth } from './middleware/authDebug.js';

import tokenDebugRoutes from './routes/api/token-debug.js'; // Add this import
import valuationApi from './api/valuation.js';

import debugApiRoutes from './routes/api/debug.js';

// Add this import near the top of the file with other imports
import { attachRootRoute } from './root-route-fix.js';
import { WebSocket } from 'ws';
import apiAuthRoutes from './routes/api/auth.js'; // Add this import

// Import WebSocket service
import WebSocketService from './services/websocket.js';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Import chat routes
import chatRoutes from './routes/chat.js';

// Import the chat socket initialization function
import { initializeChatSocket } from './socket/chatSocket.js';
import publicValuationRouter from './api/public-valuation.js';

// Import chat API routes
import chatApiRoutes from './routes/api/chat.js';

import chatDebugRouter from './routes/chat-debug.js';

import testRoutes from './routes/api/test-routes.js'; // Add this import

import postBusinessUploadRoutes from './routes/api/post-business-upload.js';
import s3TestRoutes from './routes/api/s3-test.js';
import submitBusinessRoutes from './routes/api/submit-business.js';
import businessRoutes from './routes/businessRoutes.js';
import userRoutes from './routes/userRoutes.js';
import sellerQuestionnaireRoutes from './routes/sellerQuestionnaire.js';

// Import valuation routes
import valuationRoutes from './routes/valuationRoutes.js';

// Import RDS optimization routes
import rdsOptimizationRoutes from './routes/rdsOptimizationRoutes.js';

import roleRoutes from './routes/roleRoutes.js';

// Add this with other route imports
import roleSelectionRoutes from './routes/roleSelectionRoutes.js';

// Import verification upload routes
import verificationUploadRoutes from './routes/verificationUploadRoutes.js';

// Import professional routes
import professionalRoutes from './routes/professionalRoutes.js';

const businessAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { userId: decoded.userId };
      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// 2. Configuration
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = process.env.PORT || 5000; // Update default port to 8080 for Azure

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

// Add this initialization check function near the beginning of the file
const initializeAwsConfig = () => {
  // Clean up any improperly set environment variables
  if (process.env.AWS_REGION) {
    process.env.AWS_REGION = process.env.AWS_REGION.trim().split(',')[0].trim();
    console.log(`Using AWS region: ${process.env.AWS_REGION}`);
  }
  
  if (process.env.AWS_BUCKET_NAME) {
    process.env.AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME.trim().split(',')[0].trim();
    console.log(`Using S3 bucket: ${process.env.AWS_BUCKET_NAME}`);
  }
  
  // Set defaults if not defined
  if (!process.env.AWS_REGION) {
    process.env.AWS_REGION = 'eu-west-2';
    console.log(`Setting default AWS region: ${process.env.AWS_REGION}`);
  }
  
  if (!process.env.AWS_BUCKET_NAME) {
    process.env.AWS_BUCKET_NAME = 'arzani-images1';
    console.log(`Setting default S3 bucket: ${process.env.AWS_BUCKET_NAME}`);
  }
};

// Call this right after loading environment variables
initializeAwsConfig();

// Add this right after your imports
const validateAwsConfig = () => {
  const region = process.env.AWS_REGION || 'eu-west-2';
  const bucketName = process.env.AWS_BUCKET_NAME || 'arzani-images1';
  
  // Validate region format - should be a simple string without commas
  if (region.includes(',')) {
    console.error('⚠️ WARNING: AWS_REGION contains commas, which will cause S3 errors.');
    process.env.AWS_REGION = region.split(',')[0].trim();
    console.log(`Fixed AWS_REGION to "${process.env.AWS_REGION}"`);
  }
  
  // Validate bucket name format - should be a simple string without commas
  if (bucketName.includes(',')) {
    console.error('⚠️ WARNING: AWS_BUCKET_NAME contains commas, which will cause S3 errors.');
    process.env.AWS_BUCKET_NAME = bucketName.split(',')[0].trim();
    console.log(`Fixed AWS_BUCKET_NAME to "${process.env.AWS_BUCKET_NAME}"`);
  }
  
  // Test S3 client initialization
  try {
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    console.log(`✅ S3 client initialized with region: ${process.env.AWS_REGION}`);
  } catch (error) {
    console.error('❌ Failed to initialize S3 client:', error);
  }
}

// Call validation function during server startup
validateAwsConfig();

// Initialize Express and create HTTP server

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server }); // Attach to HTTP server instead of separate port
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia; custom_checkout_beta=v1'
});


// After creating the server but before starting it, initialize the chat socket service
const chatSocketService = initializeChatSocket(server);
// Initialize Socket.IO with the server
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? 'https://arzani.co.uk' 
      : ['http://localhost:5000', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize WebSocket service
const webSocketService = new WebSocketService(io);

// IMPORTANT: Attach the root route handler before any other middleware or routes
// This ensures it takes precedence over any conflicting handlers
attachRootRoute(app);

// Verify S3 configuration early
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Test S3 connection on startup - replace this function with enhanced version
async function testS3Connection() {
  try {
    // Print all environment variables for debugging (without sensitive values)
    console.log("Environment variables scan:");
    Object.keys(process.env)
      .filter(key => key.includes('AWS'))
      .forEach(key => {
        if (key.includes('SECRET') || key.includes('KEY')) {
          console.log(`${key}=***`);
        } else {
          console.log(`${key}=${process.env[key]}`);
        }
      });
    
    // Explicitly set AWS environment variables to ensure correct values
    // This will override any incorrect values that might be coming from elsewhere
    const forcedCredentials = {
      AWS_REGION: process.env.AWS_REGION || 'eu-west-2',
      AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME || 'arzani-images1'
    };
    
    // Forcibly override with correct values
    Object.entries(forcedCredentials).forEach(([key, value]) => {
      process.env[key] = value;
    });
    
    console.log("Set AWS region and bucket name to correct values");
    
    // Now try connecting with the configured credentials
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    
    // Log the actual credentials being used (without revealing secrets)
    console.log("Using AWS credentials:", {
      region: process.env.AWS_REGION,
      bucketName: process.env.AWS_BUCKET_NAME,
      hasAccessKeyId: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
    });
    
    // Test connection
    await s3Client.send(new ListBucketsCommand({}));
    console.log('✅ Successfully connected to AWS S3');
  } catch (error) {
    console.error('❌ Error connecting to AWS S3:', error);
    console.error('This might be due to incorrect credentials in environment files.');
    console.error('Please ensure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are correct in your .env files.');
    process.exit(1); // Exit if S3 connection fails
  }
}

// Add chat-interface route - make sure it's only accessible at the exact /chat-interface path
app.get('/chat-interface', (req, res) => {
  // Redirect old URL pattern to new one
  if (req.query.conversation) {
    return res.redirect(`/chat?conversation=${req.query.conversation}`);
  }
  return res.redirect('/chat');
});

// 1. Homepage routes come first (before any static middleware or catch-all routes)
app.get('/homepage', (req, res) => {
  res.render('homepage', {
    title: 'Welcome to Our Marketplace'
  });
});

// IMPORTANT: Register public API endpoints BEFORE authentication middleware
app.use('/api/public', publicValuationRouter);

// This must come BEFORE any authentication middleware or route protection
app.use('/api/public/valuation', (req, res, next) => {
  console.log('Public valuation API accessed:', req.path);
  // Mark this explicitly as a public request
  req.isPublicRequest = true;
  // Set proper content type for the response
  res.setHeader('Content-Type', 'application/json');
  next();
}, publicValuationRouter);

app.use((req, res, next) => {
  const path = req.path;
  
  // Check if path contains an encoded S3 URL
  if (path.includes('/uploads/https://')) {
    // Extract and decode the S3 URL
    const s3Url = decodeURIComponent(path.substring(path.indexOf('https://')));
    // Redirect to the actual S3 URL
    return res.redirect(s3Url);
  }
  
  // Check for legacy /uploads/ paths
  if (path.startsWith('/uploads/')) {
    // Check if it's an S3 path - updated to check for eu-west-2
    if (path.includes('s3.eu-west-2.amazonaws.com')) {
      const s3Url = `https://${path.split('s3.eu-west-2.amazonaws.com/')[1]}`;
      return res.redirect(s3Url);
    }
    // Also handle legacy north-1 paths that might still be in the system
    if (path.includes('s3.eu-north-1.amazonaws.com')) {
      const s3Url = `https://${path.split('s3.eu-north-1.amazonaws.com/')[1]}`;
      return res.redirect(s3Url);
    }
  }
  
  next();
});

// Add this before other middleware
app.use((req, res, next) => {
  // Set COOP header to allow popups for OAuth flows
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  // Set COEP header
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  // Set CSP header
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
  next();
});

// Update the middleware section to allow Stripe.js
app.use((req, res, next) => {
  // Change COEP header to be less restrictive for Stripe.js
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  // Add CORS header for Stripe
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});
app.use('/api/admin', adminAuth, adminRoutes); // <-- Register admin API routes, protected by adminAuth
// Add specific headers for Stripe.js
app.use('/checkout-gold', (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  next();
});

app.use('/checkout-platinum', (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  next();
});

// Make sure cookie parser runs early (before session middleware)
app.use(cookieParser());

// Update session configuration - move this before any routes
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: true,
  saveUninitialized: true, // Changed to true to ensure session is always created
  rolling: true, // Resets expiry on every request
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  },
  name: 'sessionId' // Custom cookie name
}));

// Add comprehensive session debugging middleware
app.use((req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  console.log('Request debug:', {
    path: req.path,
    sessionID: req.sessionID,
    hasSession: !!req.session,
    sessionUserId: req.session?.userId,
    hasAuthHeader: !!req.headers['authorization'],
    tokenPresent: !!token
  });
  next();
});

// Add token refresh configuration
const TOKEN_EXPIRY = '4h';
const REFRESH_TOKEN_EXPIRY = '7d';

// Update the token checker middleware
app.use(async (req, res, next) => {
    // Skip token check for explicitly tagged public valuation requests
    if (req.isPublicRequest ||
        req.headers['x-skip-auth'] === 'true' ||
        req.headers['x-request-source'] === 'valuation-calculator') {
      console.log('Bypassing authentication for public or calculator request:', req.path);
      return next();
    }

    // Skip token check for public routes
    if (req.path.match(/^\/(?:login2|signup|public|css|js|images|terms)/)) {
      return next();
    }

    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
      console.log('No auth header, continuing without auth for path:', req.path);
      return next();
    }

    if (!authHeader.startsWith('Bearer ') || authHeader.split(' ').length !== 2) {
      console.log('Invalid auth header format, continuing without auth');
      return next();
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { userId: decoded.userId };
        next();
    } catch (error) {
        console.error('Token validation error:', error);
        // Don't redirect API calls
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        // For non-API calls, redirect to login
        res.redirect('/login');
    }
});

// Add JWT secret check on startup
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set in environment variables');
  process.exit(1);
}

if (!process.env.REFRESH_TOKEN_SECRET) {
  console.error('REFRESH_TOKEN_SECRET is not set in environment variables');
  process.exit(1);
}

// Update CORS configuration - remove the duplicate corsOptions and merge all options
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:5000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'stripe-signature' // Add this
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};
// Add before other middleware
app.use('/webhook', express.raw({type: 'application/json'}));
// Use the corsOptions once
app.use(cors(corsOptions));

// Add specific CORS headers for API routes
app.use('/api', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).send();
  }
  next();
});

// Middleware
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(cookieParser());

// Add a specific middleware to handle the save-questionnaire endpoint before any auth middleware
// This ensures the route is properly marked as public

app.use((req, res, next) => {
  // Specific handling for the save-questionnaire endpoint
  if ((req.path === '/api/business/save-questionnaire' || req.path === '/business/save-questionnaire') && req.method === 'POST') {
    console.log('Marking save-questionnaire endpoint as public:', req.path);
    req.isPublicRequest = true;
    return next();
  }
  next();
});

// Import diagnostic middleware
import diagnosticMiddleware from './middleware/diagnosticMiddleware.js';

// Routes
app.use('/api', diagnosticMiddleware);
app.use('/api', historyRoutes);
// IMPORTANT: Register public API endpoints BEFORE authentication middleware
app.use('/api/public', publicValuationRouter);
app.use('/api/public-valuation', publicValuationRouter);
app.use('/api/auth', apiAuthRoutes); // Add API auth routes
app.use('/api/chat', chatApiRoutes); // Use chatApiRoutes instead of chatRouter
app.use('/payment', paymentRoutes);
app.use('/auth', authRoutes); // Update this line to register auth routes
app.use('/api/market', marketTrendsRoutes);
app.use('/api/drive', googleDriveRoutes);
app.use('/api/test', testRoutes); // Add the new test routes
app.use('/api/post-business', postBusinessValuationRoutes);

// Mount the API routes - ensure these come BEFORE the authenticated routes
// Use explicit bypass for the public business API routes
app.use('/api/business', (req, res, next) => {
  // Mark these specific routes as public to bypass authentication
  if (
    (req.path === '/calculate-valuation' || 
     req.path === '/save-questionnaire' || 
     req.path === '/save-valuation') &&
    req.method === 'POST'
  ) {
    console.log('Marking business API route as public:', req.path);
    req.isPublicRequest = true;
  }
  next();
});

// Add this before any route registration that uses authenticateToken
app.use('/api/business', (req, res, next) => {
  if (req.path === '/save-questionnaire' && req.method === 'POST') {
    console.log('Bypassing authentication for public save-questionnaire endpoint');
    req.isPublicRequest = true;
    next();
    return;
  }
  // Continue to next middleware
  next();
});

// Register role management routes
app.use('/api/users/roles', roleRoutes);

// Register admin routes (protected by adminAuth middleware within the router file)
app.use('/api/admin', adminRoutes); // <-- Register admin routes

app.use('/api/profile', authenticateToken, profileApi); // Keep this one, remove the duplicate below
// app.use('/api/profile', profileApi); // REMOVE THIS DUPLICATE LINE
app.use('/api/business', businessRoutes);
app.use('/api', apiRoutes);
app.use('/api/business', savedBusinessesRoutes); 
app.use('/api/debug', debugApiRoutes);
// Add assistant monitoring routes
app.use('/api/assistant-monitor', assistantMonitorRoutes);
// Add this before other routes
app.use('/debug', chatDebugRouter);

// Apply routes
app.use('/blog', blogRoutes);  // Frontend blog routes
app.use('/api/blog', blogApiRoutes);  // API blog endpoints
app.use('/api', blogApiRoutes);  // ALSO register at /api to support both URL patterns
// Register the AI assistant routes
app.use('/api/assistant', aiAssistantRoutes);

// Use the new auth middleware where needed
app.use('/api/protected', authMiddleware);
// API endpoints
app.use('/api/valuation', (req, res, next) => {
  // Check for the special header or if it's a public endpoint
  if (
    req.headers['x-request-source'] === 'valuation-calculator' || 
    req.headers['x-skip-auth'] === 'true' ||
    req.path === '/calculate' || 
    req.path === '/save-data'
  ) {
    console.log('No auth header, continuing without auth for valuation path:', req.path);
    req.isPublicRequest = true;
    return next();
  }
  next();
}, valuationApi);
app.use('/api/valuation', valuationApi);
// Register the valuation routes WITHOUT authentication middleware
// IMPORTANT: Move these routes BEFORE any other business routes to avoid conflicts
app.use('/api/business', (req, res, next) => {
  // Mark valuation endpoints as public to bypass all authentication
  if (
    (req.path === '/calculate-valuation' || req.path === '/save-questionnaire') &&
    req.method === 'POST'
  ) {
    console.log('Public valuation endpoint accessed:', req.path);
    req.isPublicRequest = true;
  }
  next();
}, valuationRoutes);

// Register the seller questionnaire routes - removed authentication middleware
app.use('/seller-questionnaire', sellerQuestionnaireRoutes);
app.use('/api/subscription', apiSubRoutes);
// Add this before other routes
app.use('/debug', chatDebugRouter);
// Apply routes
app.use('/blog', blogRoutes);
app.use('/api/subscription', subscriptionApiRoutes);
app.use('/api/market-trends', marketTrendsApiRoutes);
// app.use('/chat', chatRoutes); // Remove authenticateToken middleware
app.use('/api/token-debug', tokenDebugRoutes); // ADD THIS LINE
app.use('/api/post-business-upload', postBusinessUploadRoutes);
app.use('/api/s3-test', s3TestRoutes);

app.use('/dashboard', authMiddleware);
app.use('/marketplace/edit', authMiddleware);
app.use('/', populateUser); // Optional: populate user for all routes
app.use('/stripe', stripeRoutes);
app.use('/profile', profileRoutes);
// Register the seller questionnaire routes - removed authentication middleware
app.use('/seller-questionnaire', sellerQuestionnaireRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/checkout-gold', (req, res) => res.redirect('/checkout/gold'));
app.use('/checkout-platinum', (req, res) => res.redirect('/checkout/platinum'));
app.use('/admin', adminAuth, adminRoutes); // <-- Register frontend admin routes
app.use('/users', userRoutes);
app.use('/auth', authRoutes);
// Make sure the API endpoints are accessible without the token validation
// Add this right after the valuation routes registration
app.post('/api/business/calculate-valuation', async (req, res) => {
  try {
    const businessData = req.body;
    console.log('Public valuation calculation request received');
    
    // Import controller only when needed (to avoid circular dependencies)
    const valuationController = (await import('./controllers/valuationController.js')).default;
    
    // Call the controller method directly
    return valuationController.calculateValuation(req, res);
  } catch (error) {
    console.error('Valuation endpoint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate valuation',
      error: error.message
    });
  }
});

// Also ensure the questionnaire data saving endpoint is accessible without authentication
app.post('/api/business/save-questionnaire', async (req, res) => {
  try {
    console.log('Public questionnaire data request received');
    
    const data = req.body;
    
    // Generate a submission ID if not provided
    const submissionId = data.submissionId || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const email = data.email || null;
    const anonymousId = data.anonymousId || `anon_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // Get a client for the transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Use a simplified query with data JSON storage to avoid column mismatch issues
      const insertQuery = `
        INSERT INTO questionnaire_submissions (
          submission_id, 
          email, 
          anonymous_id, 
          data, 
          created_at, 
          updated_at,
          status
        ) VALUES ($1, $2, $3, $4, NOW(), NOW(), $5)
        ON CONFLICT (submission_id) 
        DO UPDATE SET 
          email = EXCLUDED.email,
          data = EXCLUDED.data,
          updated_at = NOW()
        RETURNING id
      `;
      
      const result = await client.query(insertQuery, [
        submissionId,
        email,
        anonymousId,
        JSON.stringify(data),  // Store all data as JSON to avoid column mismatches
        'pending'  // Initial status
      ]);
      
      await client.query('COMMIT');
      
      return res.json({
        success: true,
        message: 'Questionnaire data saved successfully',
        submissionId: submissionId
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error during questionnaire save transaction:', error);
      throw error; // Re-throw for outer catch
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error saving questionnaire data:', error);
    // Log the data that caused the error
    console.error('Data causing error:', JSON.stringify(req.body, null, 2));
    
    return res.status(500).json({
      success: false,
      message: 'Failed to save questionnaire data',
      error: error.message
    });
  }
});

// Set view engine (ensure the public folder is included)
app.set('view engine', 'ejs');
app.set('views', [path.join(__dirname, 'views'), path.join(__dirname, 'public')]);

// Serve static files
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public')));

// Add this before your authenticated routes and AFTER middleware setup
app.get('/privacy', (req, res) => {
  try {
    res.render('privacy');
  } catch (error) {
    console.error('Error rendering privacy page:', error);
    res.status(500).send('Error loading privacy page');
  }
});

// For serving static files
app.use(express.static('public', {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// Routes
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Test route for the new homepage design
app.get('/new-homepage', (req, res) => {
  res.render('new-homepage', {
    title: 'Welcome to Arzani Marketplace - New Design'
  });
});

// Add this BEFORE your auth middleware or any other middleware that checks authentication
// Public business valuation endpoint - must be registered before auth middleware
app.post('/api/business/calculate-valuation', async (req, res) => {
  try {
    const businessData = req.body;
    console.log('Public valuation calculation request received');
    
    // Import controller only when needed (to avoid circular dependencies)
    const valuationController = (await import('./controllers/valuationController.js')).default;
    
    // Call the controller method directly
    return valuationController.calculateValuation(req, res);
  } catch (error) {
    console.error('Valuation endpoint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate valuation',
      error: error.message
    });
  }
});

// Also add an anonymous questionnaire data saving endpoint
app.post('/api/business/save-questionnaire', async (req, res) => {
  try {
    console.log('Public questionnaire data request received');
    
    // Import controller only when needed
    const valuationController = (await import('./controllers/valuationController.js')).default;
    
    // Call the save questionnaire data method
    const questionnaireData = req.body;
    const submissionId = await valuationController.saveQuestionnaireData(questionnaireData);
    
    return res.json({
      success: true,
      message: 'Questionnaire data saved successfully',
      submissionId
    });
  } catch (error) {
    console.error('Error saving questionnaire data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save questionnaire data',
      error: error.message
    });
  }
});

// Add explicit route for chat messages API to ensure proper route matching
app.get('/api/chat/messages', (req, res, next) => {
  console.log('Chat messages API route hit directly');
  // Forward to the router
  next();
});


// Add a general API verification endpoint directly
app.get('/api/verify-token', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Verify user exists in database
      const userCheck = await pool.query(
        'SELECT id FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (userCheck.rows.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Update session
      req.session.userId = decoded.userId;
      await new Promise(resolve => req.session.save(resolve));

      res.json({ valid: true, userId: decoded.userId });
    } catch (error) {
      console.error('Token validation error:', error);
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth verification error:', error);
    return res.status(500).json({ error: 'Authentication verification failed' });
  }
});

// Add route debugging middleware to log requests
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.path}`);
  next();
});

// Update multer configuration to use memory storage only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});
app.use('/', businessRoutes); // <-- Ensure this line is present
// app.use('/', chatRouter);
app.use('/', voiceRoutes); // Now this will work
app.use('/', googleAuthRoutes);

// Apply routes
app.use('/professional', professionalRoutes);
app.use('/api/professional', professionalRoutes);
app.use('/api/verification', verificationUploadRoutes); // Add the verification upload routes

// Serve static files from the 'views/partials/public' directory
app.use(express.static(path.join(__dirname, 'views/partials/public')));
app.use(express.static(path.join(__dirname, 'public')));

// Add these specific static middleware configurations before your routes
app.use('/css', express.static(path.join(__dirname, 'public/css'), {
    setHeaders: (res, path) => {
        res.setHeader('Content-Type', 'text/css');
    }
}));

// Add debug endpoint to check CSS file availability
app.get('/debug/css', (req, res) => {
    const cssPath = path.join(__dirname, 'public/css/voice-chat.css');
    res.json({
        exists: fs.existsSync(cssPath),
        path: cssPath,
        contents: fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : null
    });
});

const router = express.Router();

(async () => {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  app.post('/send-message', (req, res) => {
    const { message } = req.body;
    realtimeClient.send(message);
    res.json({ success: true });
  });

  app.use('/public', express.static(path.join(__dirname, 'public')));
  app.use('/test-realtime-api', express.static(path.join(__dirname, 'test-realtime-api')));
  app.use(express.static('public', {
    setHeaders: (res, path, stat) => {
        if (path.endsWith('.css')) {
            res.set('Content-Type', 'text/css');
        }
    }
}));
  // Serve the marketplace2.ejs file
  app.get('/homepage', (req, res) => {
    res.render('homepage', {
      title: 'Welcome to Our Marketplace'
    });
  });


  const JWT_SECRET = process.env.JWT_SECRET;
  const EMAIL_SECRET = process.env.EMAIL_SECRET;

  const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  app.use(express.static(path.join(__dirname, 'public')));
  // Add this before your authenticated routes

  // Add this before your authenticateToken middleware
app.use((req, res, next) => {
  if (req.path === '/profile') {
    console.log('Profile request debug:', {
      hasAuthHeader: !!req.headers.authorization,
      sessionUserId: req.session?.userId,
      cookies: req.cookies,
      sessionID: req.sessionID
    });
  }
  next();
});


// Add specific token middleware for post-business routes
app.use('/post-business*', (req, res, next) => {
  // If no Authorization header but we have a token cookie, use it
  if (!req.headers['authorization'] && req.cookies?.token) {
    req.headers['authorization'] = `Bearer ${req.cookies.token}`;
    console.log('Added Authorization header from token cookie for post-business');
  }
  next();
});
// Register role selection routes
app.use('/role-selection', roleSelectionRoutes)
// Standard debug middleware for post-business routes
app.use('/post-business*', (req, res, next) => {
  console.log('Post-business request debug:', {
    path: req.path,
    sessionID: req.sessionID,
    hasSession: !!req.session,
    sessionUserId: req.session?.userId,
    hasAuthHeader: !!req.headers['authorization'],
    hasCookieToken: !!req.cookies?.token
  });
  next();
});



app.get('/terms', (req, res) => {
  try {
    res.render('terms');
  } catch (error) {
    console.error('Error rendering terms page:', error);
    res.status(500).send('Error loading terms page');
  }
});

app.get('/pricing', (req, res) => {
  res.render('pricing', {
    title: 'Pricing Plans - Arzani Marketplace',
    user: req.user || null
  });
});

  app.get('/auth/verifyemail', async (req, res) => {
    try {
      const { token } = req.query;

      if (!token) {
        console.log('Missing token');
        return res.status(400).json({ message: 'Missing token' });
      }

      const decoded = jwt.verify(token, EMAIL_SECRET);
      const { userId, email } = decoded;

      let user = await getUserByEmail(email);
      if (!user || user.id !== userId) {
        console.log('Invalid verification link');
        return res.status(400).json({ message: 'Invalid verification link' });
      }

      user.verified = true;
      await updateUser(user);

      console.log('User verified:', user);
      res.status(200).json({ success: true, message: 'Email verified successfully! You can now log in.' });
    } catch (error) {
      console.error('Error during email verification:', error);
      res.status(400).json({ message: 'Invalid or expired token' });
    }
  });

app.get('/api/check-subscription', async (req, res) => {
  try {
      // Get user subscription status from database
      // This is pseudocode - implement according to your database structure
      const user = req.user;
      const subscription = await Subscription.findOne({ userId: user.id });
      
      res.json({
          subscriptionType: subscription ? subscription.type : 'none'
      });
  } catch (error) {
      res.status(500).json({ error: 'Error checking subscription' });
  }
});
app.get('/off-market-leads', async (req, res) => {
  try {
    res.render('off-market-leads', {
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
  } catch (error) {
    console.error('Error loading off market leads:', error);
    res.status(500).send('Internal Server Error');
  }
});
// Add a test route directly on the app
app.get('/api/profile-test', (req, res) => {
  res.json({ message: 'Profile test endpoint is working' });
});
app.post('/create-payment-intent', async (req, res) => {
  try {
    const { plan } = req.body;
    
    const prices = {
      gold: 3900, // £39.00
      platinum: 5000 // £50.00
    };

    const paymentIntent = await stripe.paymentIntents.create({
      amount: prices[plan],
      currency: 'gbp',
      metadata: { plan }
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Webhook handler
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    // Update user subscription
    await updateUserSubscription(paymentIntent.metadata.plan);
  }

  res.json({received: true});
});

  app.get('/', (req, res) => {
    // Redirect the root URL to the homepage
    res.redirect('/homepage');
  });

  app.get('/homepage', (req, res) => {
    res.render('homepage', {
      title: 'Arzani'
    });
  });

  app.get('/auth/marketplace', (req, res) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Missing or malformed token' });
    }

    const token = authHeader.split(' ')[1];
    console.log('Received token:', token);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded token:', decoded);

      res.status(200).json({ success: true, message: 'User authorized', data: 'Marketplace data here' });
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ success: false, message: 'Unauthorized: Invalid or expired token' });
    }
  });

  app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/signup.html'));
  });
  
  // Add comprehensive S3 test route - no authentication required for testing
  app.get('/s3-test', async (req, res) => {
    try {
      // Check if we have required AWS environment variables
      const hasRequiredEnvVars = 
        process.env.AWS_ACCESS_KEY_ID && 
        process.env.AWS_SECRET_ACCESS_KEY && 
        process.env.AWS_REGION && 
        process.env.AWS_BUCKET_NAME;

      if (!hasRequiredEnvVars) {
        return res.render('s3-test', {
          title: 'S3 Configuration Test',
          error: 'Missing required AWS environment variables',
          envStatus: {
            AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
            AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
            AWS_REGION: process.env.AWS_REGION || 'missing',
            AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME || 'missing'
          },
          testResults: null,
          user: req.user || null
        });
      }

      // Test connection to primary region (eu-west-2)
      let primaryRegionClient = new S3Client({
        region: 'eu-west-2',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });

      // Test connection to backup region (eu-north-1)
      let fallbackRegionClient = new S3Client({
        region: 'eu-north-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });

      // Test connections
      const testResults = {
        primaryRegion: { success: false, error: null },
        fallbackRegion: { success: false, error: null },
        bucketName: process.env.AWS_BUCKET_NAME || 'arzani-images1'
      };

      try {
        await primaryRegionClient.send(new ListBucketsCommand({}));
        testResults.primaryRegion.success = true;
      } catch (error) {
        testResults.primaryRegion.error = error.message;
      }

      try {
        await fallbackRegionClient.send(new ListBucketsCommand({}));
        testResults.fallbackRegion.success = true;
      } catch (error) {
        testResults.fallbackRegion.error = error.message;
      }

      // Render the test page with results
      res.render('s3-test', {
        title: 'S3 Configuration Test',
        error: null,
        envStatus: {
          AWS_ACCESS_KEY_ID: '***' + (process.env.AWS_ACCESS_KEY_ID || '').substr(-4),
          AWS_SECRET_ACCESS_KEY: '***' + (process.env.AWS_SECRET_ACCESS_KEY || '').substr(-4),
          AWS_REGION: process.env.AWS_REGION || 'eu-west-2',
          AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME || 'arzani-images1'
        },
        testResults,
        user: req.user || null
      });
    } catch (error) {
      console.error('S3 test page error:', error);
      res.render('s3-test', {
        title: 'S3 Configuration Test',
        error: error.message,
        envStatus: {
          AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
          AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
          AWS_REGION: process.env.AWS_REGION || 'missing',
          AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME || 'missing'
        },
        testResults: null,
        user: req.user || null
      });
    }
  });

  // Add a REST API endpoint for testing S3 upload
  app.post('/api/s3-test/upload', upload.single('testImage'), async (req, res) => {
    try {
      console.log('S3 test upload request received:', {
        hasFile: !!req.file,
        fileDetails: req.file ? {
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          buffer: req.file.buffer ? 'Buffer present' : 'No buffer'
        } : 'No file'
      });

      // Check if we have a file in the request
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No test image uploaded'
        });
      }

      const testImage = req.file;
      const timestamp = Date.now();
      const fileExt = path.extname(testImage.originalname) || '.jpg';
      const s3Key = `test-uploads/test-${timestamp}${fileExt}`;

      console.log('Attempting to upload file to S3:', {
        originalname: testImage.originalname,
        size: testImage.size,
        s3Key: s3Key
      });

      // First validate the bucket and get the correct region
      const region = process.env.AWS_REGION || 'eu-west-2';
      const bucket = process.env.AWS_BUCKET_NAME || 'arzani-images1';
      
      // Upload to S3 - the uploadToS3 function now handles region redirects
      try {
        const s3Url = await uploadToS3(testImage, s3Key, region, bucket);
        
        console.log('S3 upload successful:', s3Url);
        return res.json({
          success: true,
          message: 'Successfully uploaded',
          url: s3Url,
          region: region
        });
      } catch (error) {
        console.error('S3 upload error:', error);
        
        return res.status(500).json({
          success: false,
          message: 'Upload failed: ' + error.message,
          error: error.message
        });
      }
    } catch (error) {
      console.error('S3 test upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during upload test',
        error: error.message
      });
    }
  });
  
  createUserTable();

  app.set('view engine', 'ejs');
  app.set('views', [path.join(__dirname, 'views'), path.join(__dirname, 'public')]);

  // Add template debugging
  app.use((err, req, res, next) => {
    if (err.message.includes('EJS')) {
      console.error('EJS Error:', err);
      return res.status(500).send('Template Error');
    }
    next(err);
  });

  app.get('/login', (req, res) => {
    res.render('login');
  });
  app.get('/login2', (req, res) => {
    const email = req.query.email;
    let returnTo = req.query.returnTo;

    // Clean up returnTo to prevent redirect loops
    if (returnTo) {
      // Remove any nested login2 redirects
      returnTo = decodeURIComponent(returnTo);
      if (returnTo.includes('login2')) {
        // If we detect a login2 in the returnTo, just redirect to homepage
        returnTo = '/';
      }
    }

    res.render('login2', { 
      email,
      returnTo: returnTo || '/'
    });
  });
  
// Apply the same protection to the regular marketplace route
app.get('/marketplace', authDebug.enforceNonChatPage, (req, res) => {
  res.locals.isChatPage = false;
  res.redirect('/marketplace2');
});
  
  app.get('/marketplace2', async (req, res) => {
    try {
      // Explicitly mark as NOT a chat page - this is crucial
      res.locals.isChatPage = false;
      
      // Pass user data if authenticated
      let userData = null;
      if (req.user && req.user.userId) {
        // Fetch user data if available
        try {
          const user = await getUserById(req.user.userId);
          if (user) {
            userData = {
              userId: user.id,
              username: user.username,
              email: user.email,
              profile_picture: user.profile_picture || '/images/default-profile.png'
            };
          }
        } catch (error) {
          console.error('Error fetching user data for marketplace:', error);
        }
      }
      
      // Render the marketplace2 template with isChatPage explicitly set to false
      res.render('marketplace2', {
        title: 'Business Marketplace',
        isChatPage: false, // Explicitly set to false
        user: userData,
        isAuthenticated: !!userData
      });
    } catch (error) {
      console.error('Error rendering marketplace2:', error);
      res.status(500).send('Error loading marketplace');
    }
  });
  

app.get('/history', authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.redirect('/login');
    }

    const query = `
      SELECT 
        h.viewed_at,
        b.id,
        b.business_name as name,
        b.price::numeric as price,
        b.gross_revenue::numeric as revenue,
        b.ebitda::numeric as ebitda,
        b.date_listed as listed
      FROM business_history h
      JOIN businesses b ON h.business_id = b.id
      WHERE h.user_id = $1
      ORDER BY h.viewed_at DESC
    `;

    const result = await pool.query(query, [req.user.userId]);
    
    // Group by date
    const grouped = result.rows.reduce((acc, row) => {
      const date = new Date(row.viewed_at).toDateString();
      if (!acc[date]) {
        acc[date] = {
          date,
          businesses: []
        };
      }
      acc[date].businesses.push({
        id: row.id,
        name: row.name,
        viewed: row.viewed_at,
        price: row.price,
        revenue: row.revenue,
        ebitda: row.ebitda,
        listed: row.listed
      });
      return acc;
    }, {});

    // Convert to array and sort by date
    const history = Object.values(grouped).sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );

    res.render('history', { history });
  } catch (error) {
    console.error('Error in history route:', error);
    res.status(500).send('Error loading history');
  }
});

app.get('/professional-verification', authenticateToken, (req, res) => {
  res.render('professional-verification', {
    title: 'Professional Verification',
    user: req.user
  });
});

// Professional dashboard page route - only accessible to verified professionals
app.get('/professional-dashboard', authenticateToken, async (req, res) => {
  try {
    // Check if user is a verified professional
    const userQuery = await pool.query(
      'SELECT is_verified_professional, professional_type FROM users WHERE id = $1',
      [req.user.userId]
    );
    
    if (!userQuery.rows[0]?.is_verified_professional) {
      return res.redirect('/professional-verification');
    }
    
    res.render('professional-dashboard', {
      title: 'Professional Dashboard',
      user: req.user,
      professionalType: userQuery.rows[0].professional_type
    });
  } catch (error) {
    console.error('Error loading professional dashboard:', error);
    res.status(500).send('Error loading dashboard');
  }
});

  let businesses = [];

  app.post('/api/submit-business', businessAuth, upload.array('images', 5), async (req, res) => {
    try {
        // Get filenames as array
        const images = req.files.map(file => file.filename);
        console.log('Images array:', images); // Debug log

        const query = `
            INSERT INTO businesses (
                business_name,
                industry,
                price,
                cash_flow,
                gross_revenue,
                ebitda,
                inventory,
                sales_multiple,
                profit_margin,
                debt_service,
                cash_on_cash,
                down_payment,
                location,
                ffe,
                employees,
                reason_for_selling,
                description,
                images,
                date_listed
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, NOW()
            ) RETURNING id;
        `;
        
        // Pass images array directly
        const values = [
            req.body.business_name,
            req.body.industry,
            req.body.price,
            req.body.cashFlow,
            req.body.grossRevenue,
            req.body.ebitda,
            req.body.inventory,
            req.body.salesMultiple,
            req.body.profitMargin,
            req.body.debtService,
            req.body.cashOnCash,
            req.body.downPayment,
            req.body.location,
            req.body.ffE,
            req.body.employees,
            req.body.reasonForSelling,
            req.body.description,
            images  // Pass array directly, don't stringify
        ];

        const result = await pool.query(query, values);
        console.log('Query result:', result.rows[0]); // Debug log
        res.status(200).json({ success: true, businessId: result.rows[0].id });
    } catch (error) {
        console.error('Error details:', {
            message: error.message,
            detail: error.detail,
            code: error.code
        });
        res.status(500).json({ success: false, message: 'Error inserting business' });
    }
});

app.post('/stripe/webhook', stripeWebhookMiddleware, handleStripeWebhook);

app.post('/api/business/listings/filter', async (req, res) => {
  try {
    const { location, industries, priceRange } = req.body;
    
    let query = `
      SELECT * FROM businesses 
      WHERE 1=1
    `;
    const values = [];
    let valueIndex = 1;

    if (location) {
      query += ` AND location ILIKE $${valueIndex}`;
      values.push(`%${location}%`);
      valueIndex++;
    }

    if (industries && industries.length > 0) {
      query += ` AND industry = ANY($${valueIndex})`;
      values.push(industries);
      valueIndex++;
    }

    if (priceRange.min > 0) {
      query += ` AND price >= $${valueIndex}`;
      values.push(priceRange.min);
      valueIndex++;
    }

    if (priceRange.max > 0) {
      query += ` AND price <= $${valueIndex}`;
      values.push(priceRange.max);
    }

    query += ` ORDER BY date_listed DESC`;

    const result = await pool.query(query, values);
    res.json({
      businesses: result.rows,
      totalPages: Math.ceil(result.rows.length / 10)
    });
  } catch (error) {
    console.error('Filter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

   
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Error connecting to the database:', err);
    } else {
        console.log('Database connected:', res.rows[0]);
    }
  });

  app.get('/business/:id', (req, res) => {
      const business = businesses.find(b => b.id === parseInt(req.params.id));
      if (!business) {
          return res.status(404).send('Business not found');
      }
      res.render('business', { business });
  });

// API endpoint for chat messages
app.post('/api/chat', async (req, res) => {
    const userQuestion = req.body.question;

    try {
        // Fetch data from the database
        const dbQuery = 'SELECT * FROM listings'; // Adjust the query as needed
        const dbResult = await pool.query(dbQuery);
        const data = dbResult.rows;

        // Prepare the prompt for OpenAI
        const prompt = `
User question: "${userQuestion}"
Website data: ${JSON.stringify(data)}

Provide a helpful answer based on the website data.
`;

        // Call the OpenAI API
        const completion = await openai.chat.completions.create({
            model: 'gpt-4.1-nano', // Updated from gpt-3.5-turbo to gpt-4.1-nano
            messages: [{ role: 'user', content: prompt }],
        });
        res.json({ answer: aiResponse });
    } catch (error) {
        console.error('Error handling chat message:', error);
        res.status(500).json({ error: 'An error occurred' });
    }
});

const metricsService = new BusinessMetricsService(pool);
const rateLimiter = new RateLimiter();


// Add this function to filter listings
function filterListings(listings, query) {
    const queryLower = query.toLowerCase();
    return listings.filter(listing => listing.title.toLowerCase().includes(queryLower));
}


const RELAY_PORT = process.env.RELAY_SERVER_URL || 'ws://localhost:6000'; // WebSocket relay



// Add body parsing middleware
router.use(express.json());

router.post('/', async (req, res) => {
    try {
        const userMessage = req.body.message;
        
        // Verify NLP service is running
        const nlpResponse = await axios.post('http://localhost:8000/parse', {
            text: userMessage
        });

        const reply = generateReply(nlpResponse.data);
        res.json({ reply });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            reply: 'Sorry, the service is temporarily unavailable.',
            error: error.message 
        });
    }
});

// Single consolidated profile route for HTML rendering
app.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await getUserById(req.user.userId);
    if (!user) {
      return res.redirect('/login2');
    }
    
    // If JSON is requested, send JSON response
    if (req.headers.accept?.includes('application/json')) {
      return res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        profile_picture: user.profile_picture || '/images/default-profile.png',
        auth_provider: user.auth_provider,
        created_at: user.created_at,
        subscription: user.subscription_type || 'Free Plan'
      });
    }

    // Otherwise render the profile template
    res.render('profile', { 
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        profile_picture: user.profile_picture || '/images/default-profile.png',
        auth_provider: user.auth_provider,
        created_at: user.created_at,
        last_login: user.last_login
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    const errorResponse = {
      error: 'Failed to load profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    };

    // Return error in requested format
    if (req.headers.accept?.includes('application/json')) {
      return res.status(500).json(errorResponse);
    }
    res.redirect('/login2');
  }
});



// Add this route before the last export statement
app.post('/api/business/track', authenticateToken, async (req, res) => {
  try {
    const { businessId, action } = req.body;
    const userId = req.user.userId;

    console.log('Tracking request received:', { userId, businessId, action });

    if (!businessId || !userId) {
      console.error('Missing required fields:', { businessId, userId });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify business exists
    const businessCheck = await pool.query(
      'SELECT id FROM businesses WHERE id = $1',
      [businessId]
    );

    if (businessCheck.rows.length === 0) {
      console.error('Business not found:', businessId);
      return res.status(404).json({ error: 'Business not found' });
    }

    // Insert the view record
    const insertQuery = `
      INSERT INTO business_history 
        (user_id, business_id, action_type, viewed_at)
      VALUES 
        ($1, $2, $3, NOW())
      ON CONFLICT (user_id, business_id, viewed_at)
      DO UPDATE SET viewed_at = NOW()
      RETURNING id, viewed_at;
    `;
    
    const result = await pool.query(insertQuery, [userId, businessId, action]);
    console.log('Successfully tracked business view:', result.rows[0]);
    
    res.json({ 
      success: true,
      tracking: {
        id: result.rows[0].id,
        timestamp: result.rows[0].viewed_at
      }
    });
  } catch (error) {
    console.error('Error tracking business view:', error);
    res.status(500).json({ error: 'Failed to track business view', details: error.message });
  }
});

// Update the business history endpoint
app.get('/api/business/history', authenticateToken, async (req, res) => {
    // Add CORS headers for API routes
    res.header('Access-Control-Allow-Origin', 'http://localhost:5000');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    console.log('History request received:', { // Debug log
        userId: req.user?.userId,
        headers: req.headers,
        session: req.session
    });

    try {
        if (!req.user?.userId) {
            console.log('No user ID found in request'); // Debug log
            return res.status(401).json({
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        const query = `
            SELECT 
                h.viewed_at,
                h.action_type,
                b.id,
                b.business_name as name,
                b.price,
                b.gross_revenue as revenue,
                b.ebitda,
                h.user_agent,
                b.date_listed
            FROM business_history h
            JOIN businesses b ON h.business_id = b.id
            WHERE h.user_id = $1
            ORDER BY h.viewed_at DESC
        `;

        console.log('Executing query for user:', req.user.userId); // Debug log
        const result = await pool.query(query, [req.user.userId]);
        console.log('Query results:', result.rows.length); // Debug log

        // Always ensure we're sending JSON
        res.setHeader('Content-Type', 'application/json');
        
        // Group and format the data
        const grouped = result.rows.reduce((acc, item) => {
            // ...existing grouping code...
        }, {});

        const history = Object.values(grouped)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        console.log('Sending response:', { // Debug log
            historyLength: history.length,
            firstItem: history[0]
        });

        return res.json(history);

    } catch (error) {
        console.error('History fetch error:', error);
        return res.status(500).json({
            error: 'Failed to fetch history',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// LinkedIn Authentication Routes
app.get('/auth/linkedin/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    // Verify state parameter
    const savedState = req.session.linkedinState;
    if (state !== savedState) {
      throw new Error('State mismatch');
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      }),
    });

    const tokenData = await tokenResponse.json();

    // Get user profile
    const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    const profileData = await profileResponse.json();

    // Get user email
    const emailResponse = await fetch('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    const emailData = await emailResponse.json();
    const email = emailData.elements[0]['handle~'].emailAddress;

    // Create or update user
    let user = await getUserByEmail(email);
    if (!user) {
      user = await createUser({
        email,
        username: `${profileData.localizedFirstName} ${profileData.localizedLastName}`,
        linkedinId: profileData.id,
        verified: true
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '4h' }
    );

    // Set session
    req.session.userId = user.id;
    await new Promise(resolve => req.session.save(resolve));

    // Redirect with token
    res.redirect(`/marketplace?token=${token}`);
  } catch (error) {
    console.error('LinkedIn auth error:', error);
    res.redirect('/login?error=linkedin_auth_failed');
  }
});

// Update your login route to include necessary config
app.get('/login', (req, res) => {
    res.render('login', {
        googleClientId: process.env.GOOGLE_CLIENT_ID,
        microsoftClientId: process.env.MICROSOFT_CLIENT_ID,
        linkedinClientId: process.env.LINKEDIN_CLIENT_ID,
        redirectUri: process.env.SERVER_URL
    });
});


// User browsing with pagination
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const query = `
            SELECT id, username, email, profile_picture, auth_provider, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
        `;

        const countQuery = 'SELECT COUNT(*) FROM users';
        
        const [users, countResult] = await Promise.all([
            pool.query(query, [limit, offset]),
            pool.query(countQuery)
        ]);

        const totalUsers = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalUsers / limit);

        res.json({
            users: users.rows,
            pagination: {
                current: page,
                total: totalPages,
                hasMore: page < totalPages
            }
        });
    } catch (error) {
        console.error('User list error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Add these new routes
app.get('/checkout-gold', authenticateToken, (req, res) => {
    res.render('checkout-gold', {
        stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
});

app.get('/checkout-platinum', authenticateToken, (req, res) => {
    res.render('checkout-platinum', {
        stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
});

// Add API catch-all before HTML routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Add this BEFORE the catch-all route
app.get('/market-trends', authenticateToken, async (req, res) => {
    try {
        console.log('Market trends page requested, user:', req.user);
        
        // Check user authentication
        if (!req.user?.userId) {
            console.log('No user ID found, redirecting to login');
            return res.redirect('/login2?redirect=/market-trends');
        }

        // Get user data for personalization
        console.log('Fetching user data for ID:', req.user.userId);
        const userQuery = await pool.query(
            'SELECT username, subscription_type FROM users WHERE id = $1',
            [req.user.userId]
        );
        
        if (userQuery.rows.length === 0) {
            console.log('User not found in database');
            return res.redirect('/login2?redirect=/market-trends');
        }

        const user = userQuery.rows[0];
        console.log('User found:', user.username);

        // Render the market trends page
        res.render('market_trends', {
            user: {
                username: user.username,
                subscription: user.subscription_type || 'free'
            },
            title: 'Market Trends Analysis',
            chartConfig: {
                timeRanges: [
                    { value: '7', label: 'Last 7 Days' },
                    { value: '30', label: 'Last 30 Days' },
                    { value: '90', label: 'Last 90 Days' },
                    { value: '365', label: 'Last Year' }
                ]
            }
        });
    } catch (error) {
        console.error('Market trends page error:', error);
        res.status(500).render('error', { 
            message: 'Failed to load market trends',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// Remove or comment out this catch-all route
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

// Move the market trends API route here
app.use('/api/market', authenticateToken, marketTrendsRoutes);


// Modify the catch-all route to exclude /chat AND /professional-verification
app.get('*', (req, res, next) => {
  // Don't redirect specific server-rendered pages or API calls to index.html
  if (req.path.startsWith('/chat') || 
      req.path === '/market-trends' || 
      req.path === '/saved-searches' || 
      req.path === '/history' || 
      req.path === '/profile' || // Ensure profile isn't caught
      req.path === '/professional-verification' || // Exclude professional verification
      req.path.startsWith('/post-business') ||
      req.path.startsWith('/api/')) { // Exclude all API routes
    return next(); // Let specific handlers manage these
  } else {
    // For any other GET request, serve the main frontend entry point (if applicable)
    // Or handle as a 404 if it's not meant to be caught by a client-side router
    // console.log(`Catch-all serving index.html for path: ${req.path}`);
    // res.sendFile(path.join(__dirname, 'public', 'index.html')); 
    // Consider sending 404 instead if index.html isn't the desired fallback
     res.status(404).render('error', { message: 'Page not found', error: {} });
  }
});


// Update login/authentication route to include refresh token
app.post('/auth/login', async (req, res) => {
  try {
    // ... existing login logic ...

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// Add refresh token endpoint
app.post('/auth/refresh-token', async (req, res) => {
  const refreshToken = req.cookies['refreshToken'];
  
  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token not found' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    
    const newToken = jwt.sign(
      { userId: decoded.userId },
      process.env.JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    const newRefreshToken = jwt.sign(
      { userId: decoded.userId },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ token: newToken });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});



// Ensure this is after all route registrations
app.use((req, res, next) => {
    console.log('Request path:', req.path);
    next();
});

// Important: Move these routes before any catch-all routes and other business routes
// Make sure these come BEFORE the general /api/business routes
app.use('/api/business/saved', savedBusinessesRoutes);
app.use('/api/business/is-saved', savedBusinessesRoutes);




// Add middleware to handle subscription checks
app.use('/api/market/*', async (req, res, next) => {
    try {
        const subscriptionQuery = await pool.query(
            'SELECT subscription_type, subscription_end FROM users WHERE id = $1',
            [req.user.userId]
        );
        
        const subscription = subscriptionQuery.rows[0];
        
        // Check if subscription is expired
        if (subscription?.subscription_end && new Date(subscription.subscription_end) < new Date()) {
            return res.status(403).json({
                error: 'Subscription expired',
                message: 'Please renew your subscription to access this feature'
            });
        }
        
        next();
    } catch (error) {
        console.error('Subscription check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Market Trends Page Route - Add this before catch-all routes
app.get('/market-trends', authenticateToken, async (req, res) => {
    try {
        // Check user authentication
        if (!req.user?.userId) {
            return res.redirect('/login2?redirect=/market-trends');
        }

        // Get user data for personalization
        const userQuery = await pool.query(
            'SELECT username, subscription_type FROM users WHERE id = $1',
            [req.user.userId]
        );
        
        const user = userQuery.rows[0];

        // Render the market trends page
        res.render('market_trends', {
            user: {
                username: user.username,
                subscription: user.subscription_type || 'free'
            },
            title: 'Market Trends Analysis',
            chartConfig: {
                timeRanges: [
                    { value: '7', label: 'Last 7 Days' },
                    { value: '30', label: 'Last 30 Days' },
                    { value: '90', label: 'Last 90 Days' },
                    { value: '365', label: 'Last Year' }
                ]
            }
        });
    } catch (error) {
        console.error('Market trends page error:', error);
        res.status(500).render('error', { 
            message: 'Failed to load market trends',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});


// Add this with your other routes, before any catch-all routes
app.get('/privacy', (req, res) => {
  try {
    res.render('privacy');
  } catch (error) {
    console.error('Error rendering privacy page:', error);
    res.status(500).send('Error loading privacy page');
  }
});


// Add homepage route before catch-all routes
app.get('/homepage', async (req, res) => {
  try {
    // Get user ID from token or session
    const authHeader = req.headers['authorization'];
    let userId = null;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (error) {
        console.error('Token verification failed:', error);
      }
    }

    // Fallback to session if no valid token
    if (!userId && req.session?.userId) {
      userId = req.session.userId;
    }

    // Get user data if authenticated
    let userData = null;
    if (userId) {
      const user = await getUserById(userId);
      if (user) {
        userData = {
          username: user.username,
          email: user.email,
          profile_picture: user.profile_picture || '/images/default-profile.png'
        };
      }
    }

    // Always render homepage, with or without user data
    res.render('homepage', {
      user: userData,
      title: 'Welcome to Our Marketplace',
      isAuthenticated: !!userId
    });

  } catch (error) {
    console.error('Homepage error:', error);
    // Still render the homepage but without user data
    res.render('homepage', {
      user: null,
      title: 'Welcome to Our Marketplace',
      isAuthenticated: false,
      error: 'Failed to load user data'
    });
  }
});

// Remove or comment out the root redirect
// app.get('/', (req, res) => {
//   res.redirect('/homepage');
// });

// Add root route that renders homepage directly
app.get('/', (req, res) => {
  res.render('homepage', {
    title: 'Welcome to Arzani Marketplace'
  });
});

app.get('/homepage', (req, res) => {
  res.render('homepage', {
    title: 'Welcome to Our Marketplace'
  });
});



// Add this debug info to explicitly check the middleware and routes
console.log("Registering profileApi at /api/profile");

// Make sure authenticateToken middleware is correctly imported and created
const authenticateTokenMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { userId: decoded.userId };
      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};


// Add this route BEFORE your routes section and AFTER middleware setup
app.post('/api/update-profile-picture', adminAuth, async (req, res) => {
  try {
    const { userId, profilePictureUrl, originalPath } = req.body;
    
    console.log('Update profile picture request:', {
      userId,
      profilePictureUrl,
      originalPath
    });

    if (!profilePictureUrl) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        receivedData: { userId, profilePictureUrl, originalPath }
      });
    }

    if (originalPath) {
      // Update users using this image path
      const result = await pool.query(
        `UPDATE users 
         SET profile_picture = $1, 
             updated_at = NOW() 
         WHERE profile_picture = $2 OR profile_picture = $3
         RETURNING id`,
        [profilePictureUrl, originalPath, originalPath.replace('/uploads/', '/')]
      );
      
      console.log(`Updated ${result.rowCount} users from ${originalPath} to ${profilePictureUrl}`);
      return res.json({ 
        success: true, 
        message: `Updated ${result.rowCount} users`, 
        updatedIds: result.rows.map(r => r.id) 
      });
    }

    // Single user update
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId for single user update' });
    }

    const result = await pool.query(
      'UPDATE users SET profile_picture = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
      [profilePictureUrl, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: `User ${userId} not found` });
    }

    res.json({ 
      success: true, 
      message: 'Profile picture updated',
      userId: result.rows[0].id
    });
  } catch (error) {
    console.error('Update profile picture error:', error);
    res.status(500).json({ 
      error: 'Failed to update profile picture',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});




// Add these image optimization routes
app.get('/api/image-optimization/placeholder', (req, res) => {
  // Return the placeholder image
  res.sendFile(path.join(__dirname, 'public', 'images', 'placeholder.jpg'));
});

app.get('/api/image-optimization/default', (req, res) => {
  // Return the default image
  res.sendFile(path.join(__dirname, 'public', 'images', 'default-business.jpg'));
});

// Route to serve optimized images
app.get('/api/image/:businessId/:filename', async (req, res) => {
  try {
    const { businessId, filename } = req.params;
    const width = parseInt(req.query.w) || 300;
    const quality = parseInt(req.query.q) || 80;
    
    // Validate parameters
    if (!businessId || !filename) {
      return res.status(400).send('Missing required parameters');
    }

    // Check cache-control headers
    const eTag = `${businessId}-${filename}-${width}-${quality}`;
    res.setHeader('ETag', `"${eTag}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    
    // If browser sent If-None-Match header and it matches our ETag,
    // return 304 Not Modified
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch && ifNoneMatch === `"${eTag}"`) {
      return res.status(304).end();
    }

    // Determine S3 key
    const s3Key = `businesses/${businessId}/${filename}`;
    
    // Redirect to S3 URL if no processing needed
    const s3Url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    
    // Add image optimization headers
    res.setHeader('Vary', 'Accept');
    res.setHeader('Accept-CH', 'Width, Viewport-Width, DPR');
    
    // Redirect to the original image
    return res.redirect(s3Url);
  } catch (error) {
    console.error('Image optimization error:', error);
    // Redirect to default image on error
    res.redirect('/api/image-optimization/default');
  }
});

// Route to preload critical images
app.post('/api/preload-images', async (req, res) => {
  try {
    const { businessIds } = req.body;
    
    if (!businessIds || !Array.isArray(businessIds) || businessIds.length === 0) {
      return res.status(400).json({ error: 'Invalid business IDs' });
    }
    
    // Get first image for each business
    const query = `
      SELECT id, images[1] as first_image
      FROM businesses 
      WHERE id = ANY($1)
    `;
    
    const result = await pool.query(query, [businessIds]);
    
    // Format URLs for preloading
    const preloadUrls = result.rows.map(row => {
      if (!row.first_image) return null;
      
      // If it's already a full URL, use it
      if (row.first_image.startsWith('http')) {
        return row.first_image;
      }
      
      // Otherwise construct S3 URL
      return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/businesses/${row.id}/${row.first_image}`;
    }).filter(url => url !== null);
    
    res.json({ urls: preloadUrls });
  } catch (error) {
    console.error('Preload images error:', error);
    res.status(500).json({ error: 'Failed to get preload images' });
  }
});

// Add headers to optimize image loading
app.use((req, res, next) => {
  // Add cache headers for images
  if (req.path.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
    res.setHeader('Vary', 'Accept');
  }
  
  // Add additional performance headers for marketplace
  if (req.path === '/marketplace2' || req.path === '/api/business/listings') {
    res.setHeader('Link', `</images/placeholder.jpg>; rel=preload; as=image, </images/default-business.jpg>; rel=preload; as=image`);
  }
  
  next();
});

// Add this near your other routes, before any catch-all routes
app.get('/s3-test', authenticateToken, (req, res) => {
  res.render('s3-test', {
    title: 'S3 Configuration Test',
    user: req.user
  });
});


// Update the business listings API to include image data needed for optimization
app.get('/api/business/listings', async (req, res) => {
  // ...existing code...
  
  try {
    // Get listings from database
    // ...existing query code...
    
    // Add image optimization data to each business
    const businesses = result.rows.map(business => {
      // Keep the original business data
      const enhancedBusiness = { ...business };
      
      // Add optimized image information if images exist
      if (business.images && business.images.length > 0) {
        enhancedBusiness.optimizedImages = business.images.map(image => {
          // If it's already a full URL, use it as is
          if (image.startsWith('http')) {
            return {
              original: image,
              placeholder: image, // In this case the same URL
              optimized: image    // In this case the same URL
            };
          }
          
          // Otherwise construct S3 URLs
          const s3Prefix = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/businesses/${business.id}/`;
          return {
            original: s3Prefix + image,
            placeholder: '/images/placeholder.jpg', // Use local placeholder
            optimized: s3Prefix + image // Same as original for now
          };
        });
      }
      
      return enhancedBusiness;
    });
    
    // Return enhanced businesses data
    res.json({
      businesses: businesses,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      totalCount
    });
    
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// Create placeholder images directory if it doesn't exist
const placeholderDir = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(placeholderDir)) {
  fs.mkdirSync(placeholderDir, { recursive: true });
}

// Create default placeholder image if it doesn't exist
const placeholderPath = path.join(placeholderDir, 'placeholder.jpg');
if (!fs.existsSync(placeholderPath)) {
  const placeholderSvg = `
    <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="200" fill="#f0f0f0"/>
      <text x="150" y="100" font-family="Arial" font-size="16" text-anchor="middle" fill="#999">Image Loading...</text>
    </svg>`;
    
  fs.writeFileSync(placeholderPath, placeholderSvg);
  console.log('Created placeholder image at:', placeholderPath);
}

// Create default business image if it doesn't exist
const defaultImagePath = path.join(placeholderDir, 'default-business.jpg');
if (!fs.existsSync(defaultImagePath)) {
  const defaultSvg = `
    <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="200" fill="#e0e0e0"/>
      <text x="150" y="100" font-family="Arial" font-size="16" text-anchor="middle" fill="#666">No Image Available</text>
    </svg>`;
    
  fs.writeFileSync(defaultImagePath, defaultSvg);
  console.log('Created default image at:', defaultImagePath);
}

// After all routes are registered, print them
console.log("All registered routes:");
printRoutes(app);

})();

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Add this after your routes
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // If it's an API route, return JSON error
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // For non-API routes, render error page with properly formatted error data
  res.status(500).render('error', { 
    message: err.message || 'Something went wrong',
    error: process.env.NODE_ENV === 'development' ? {
      stack: err.stack,
      name: err.name,
      message: err.message
    } : {}
  });
});

// Query function to get marketplace listings
async function getMarketplaceListings() {
  const query = `
    SELECT 
      b.*,
      u.username as seller_name,
      u.email as seller_email
    FROM businesses b
    LEFT JOIN users u ON b.user_id = u.id
    ORDER BY b.date_listed DESC
  `;

  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    return [];
  }
}
async function setupBlogDatabase() {
  try {
    console.log('Setting up blog database tables...');
    
    // Read the SQL file containing blog table definitions
    const blogTablesSQL = fs.readFileSync(path.join(__dirname, 'migrations/blog_tables.sql'), 'utf8');
    
    // Execute the SQL to create blog tables
    await pool.query(blogTablesSQL);
    
    console.log('Blog database setup completed successfully');
    return { success: true };
  } catch (error) {
    console.error('Error setting up blog database:', error);
    // Don't fail server startup if blog tables can't be created
    return { success: false, error: error.message };
  }
}
// Update WebSocket connection handler to validate messages before parsing JSON
wss.on('connection', async (ws) => {
    console.log('WebSocket client connected');

    ws.on('message', async (message) => {
        console.log('Received message:', message.toString());
        try {
            // Safe parsing of JSON messages
            let data;
            try {
                // First, convert the message to a string if it's not already
                const messageStr = message.toString();
                // Then try to parse it as JSON
                data = JSON.parse(messageStr);
                console.log('Parsed message data:', data);
            } catch (parseError) {
                console.error('Error parsing message as JSON:', parseError);
                // If parsing fails, treat as plain text message
                data = { type: 'text', text: message.toString() };
                console.log('Treating as plain text:', data);
            }

            // Process the message based on type
            if (data.type === 'voice') {
                const response = await handleVoiceMessage(data, ws);
                ws.send(JSON.stringify({
                    type: 'voice_response',
                    text: response,
                    query: data.text
                }));
            } else {
                // Handle other message types or unknown types
                console.log('Processing message of type:', data.type || 'unknown');
                ws.send(JSON.stringify({
                    type: 'acknowledgment',
                    message: 'Message received'
                }));
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
            // Send error response
            try {
                ws.send(JSON.stringify({ 
                    type: 'error', 
                    message: 'Error processing your message' 
                }));
            } catch (sendError) {
                console.error('Error sending error response:', sendError);
            }
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });

    ws.on('close', () => {
        console.log('WebSocket client disconnected');
    });
});

async function handleVoiceMessage(data, ws) {
    // Get marketplace data for context
    const listings = await getMarketplaceListings();
    const listingsContext = JSON.stringify(listings);

    const completion = await openai.chat.completions.create({
        model: "gpt-4.1-nano", // Updated from gpt-4 to gpt-4.1-nano
        messages: [
            {
                role: "system",
                content: `You are Arzani, a sophisticated voice-enabled AI assistant for our UK business marketplace.
                Current marketplace data: ${listingsContext}
                Focus on: 
                - Enhanced search and filtering
                - Business inquiries and transactions
                - Appointment scheduling
                - Market insights and analytics
                Maintain a professional, luxury tone and use British English.`
            },
            {
                role: "user",
                content: data.text
            }
        ],
        temperature: 0.7,
        max_tokens: 4096
    });

    return completion.choices[0].message.content;
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
      success: false,
      message: 'Internal server error'
  });
});
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: true, // Changed to true
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Add this middleware to debug sessions
app.use((req, res, next) => {
    console.log('Session debug:', {
        sessionID: req.sessionID,
        userId: req.session?.userId,
        hasAuthHeader: !!req.headers['authorization']
    });
    next();
});

// Add session debugging middleware
app.use((req, res, next) => {
  console.log('Session ID:', req.sessionID);
  console.log('User ID in session:', req.session.userId);
  next();
});

// Add this near your other routes
app.get('/debug-static', (req, res) => {
    res.json({
        cssExists: fs.existsSync(path.join(__dirname, 'public/css/off-market-leads.css')),
        jsExists: fs.existsSync(path.join(__dirname, 'public/js/off-market-leads.js')),
        staticPath: path.join(__dirname, 'public'),
        files: fs.readdirSync(path.join(__dirname, 'public'))
    });
});

// Add fallback for unhandled /api routes to return JSON instead of HTML
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

app.use((err, req, res, next) => {
  console.error('Global error:', err);
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  res.status(500).render('error', { 
    message: 'Something went wrong',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Add debug middleware for token tracking
app.use((req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (req.path.includes('/business')) {
        console.log('Business route debug:', {
            path: req.path,
            hasToken: !!token,
            sessionId: req.sessionID,
            userId: req.session?.userId
        });
    }
    next();
});

// Update the business routes middleware
app.use('/business', businessRoutes);

// Add these routes in the correct order before any catch-all routes
app.get('/saved-searches', (req, res) => {
    res.render('saved-searches');
});

// Replace your current debug middleware with this version to exclude static file paths

app.use((req, res, next) => {
  // Skip logging for common static asset routes
  if (/^(\/css|\/js|\/images|\/uploads|\/favicon\.ico)/.test(req.path)) {
    return next();
  }
  console.log('Request debug:', {
    path: req.path,
    sessionID: req.sessionID,
    hasSession: !!req.session,
    sessionUserId: req.session?.userId,
    hasAuthHeader: !!req.headers['authorization'],
    tokenPresent: !!(req.headers['authorization'] && req.headers['authorization'].split(' ')[1])
  });
  next();
});

// Fix the startsWith method to use proper case - startsWith
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log('API route accessed:', req.path);
  }
  next();
});

// 11. Server startup
(async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('Database connected');
    
    // Log environment (but not sensitive details)
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Server starting on port ${PORT}`);
    
    // Create required tables
    await createBusinessHistoryTable();
    await addProviderColumns();
    
    // Initialize market trends materialized view
    console.log('Initializing market trends materialized view...');
    const trendsInit = await initializeMarketTrends();
    if (trendsInit.success) {
      console.log('Market trends materialized view initialized successfully');
    } else {
      console.warn('Warning: Market trends initialization had issues:', trendsInit.error);
      console.warn('Some market trend features may not work correctly');
    }
    
    // Test S3 connection only in development
    if (process.env.NODE_ENV !== 'production') {
      await testS3Connection();
    }

    // Ensure AI assistant tables exist before starting server
    try {
      console.log('Ensuring AI assistant database tables exist...');
      await createAssistantTables();
      console.log('AI assistant tables verified');
    } catch (error) {
      console.error('Warning: Error ensuring AI assistant tables:', error);
      console.error('AI assistant functionality may not work. Run scripts/fix-ai-tables.js to fix.');
      // Continue with startup - non-fatal error
    }

    // Set up blog database tables if they don't exist
    console.log('Checking blog database tables...');
    await setupBlogDatabase();

    // Start server with updated port handling
    server.listen(PORT, '0.0.0.0', () => { // Add host binding for Azure
      console.log(`Server is running on port ${PORT}`);
      console.log(`Application URL: http://0.0.0.0:${PORT}`);
      console.log('=== INSTALLATION AND STARTUP COMPLETE ==='); // Add this clear success message
      
      // Log startup information
      const now = new Date();
      console.log(`Server started at: ${now.toISOString()}`);
      console.log(`Local time: ${now.toLocaleString()}`);
    });
  } catch (error) {
    console.error('Server startup error:', error);
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
})();

// Ensure proper Socket.IO configuration
// This section should be BEFORE server.listen() but AFTER all other configuration
io.on('connection', (socket) => {
  console.log('New Socket.io client connected:', socket.id);
  
  // Handle authentication using token from handshake
  if (socket.handshake.auth && socket.handshake.auth.token) {
    try {
      const token = socket.handshake.auth.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Associate user ID with socket
      socket.userId = decoded.userId;
      socket.join(`user:${decoded.userId}`);
      
      console.log(`Socket ${socket.id} authenticated for user ${decoded.userId}`);
      
      // Emit authenticated event
      socket.emit('authenticated');
    } catch (error) {
      console.error('Socket authentication error:', error);
      socket.emit('auth_error', { message: 'Authentication failed' });
    }
  } else {
    console.log('Socket connected without authentication');
  }
  
  // Handle joining conversation rooms
  socket.on('join_conversation', (data) => {
    if (data.conversationId) {
      socket.join(`conversation:${data.conversationId}`);
      console.log(`Socket ${socket.id} joined conversation ${data.conversationId}`);
    }
  });
  
  // Handle message seen status
  socket.on('mark_seen', (data) => {
    if (data.conversationId && data.messageId && socket.userId) {
      // Broadcast to other participants in the conversation
      socket.to(`conversation:${data.conversationId}`).emit('message_seen', {
        conversationId: data.conversationId,
        messageId: data.messageId,
        userId: socket.userId
      });
    }
  });
  
  // Handle typing indicators
  socket.on('typing', (data) => {
    if (data.conversationId && socket.userId) {
      socket.to(`conversation:${data.conversationId}`).emit('typing', {
        conversationId: data.conversationId,
        userId: socket.userId,
        isTyping: data.isTyping
      });
    }
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Socket.io client disconnected:', socket.id);
  });
});

// Ensure proper Socket.IO configuration
// Add this before the server.listen call
io.on('connection', (socket) => {
  console.log('New client connected', socket.id);
  
  // Handle authentication
  socket.on('authenticate', async (data) => {
    try {
      if (!data.token) {
        socket.emit('auth_error', { message: 'No token provided' });
        return;
      }
      
      const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
      const userId = decoded.userId;
      
      // Associate socket with user ID
      socket.userId = userId;
      socket.join(`user:${userId}`);
      
      console.log(`Socket ${socket.id} authenticated for user ${userId}`);
      socket.emit('authenticated');
    } catch (error) {
      console.error('Socket auth error:', error);
      socket.emit('auth_error', { message: 'Authentication failed' });
    }
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
  });
  
  // Handle join conversation
  socket.on('join_conversation', (data) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }
    
    if (data.conversationId) {
      socket.join(`conversation:${data.conversationId}`);
      console.log(`User ${socket.userId} joined conversation ${data.conversationId}`);
    }
  });
  
  // Handle new message event (if using Socket.IO for sending messages)
  socket.on('new_message', async (data) => {
    // Implementation depends on your app's requirements
  });
});

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    pool.end();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    pool.end();
    process.exit(0);
  });
});

// Add redirect middleware to handle any remaining /uploads/ requests that contain S3 URLs
app.use('/uploads/', (req, res, next) => {
  const path = req.path;
  if (path.includes('s3.eu-north-1.amazonaws.com')) {
    // Extract the S3 URL and redirect
    const s3Url = path.substring(path.indexOf('https://'));
    return res.redirect(s3Url);
  }
  next();
});

// Replace all debug middleware with this single version
app.use((req, res, next) => {
  // Skip logging for static assets and common files
  // Only log important requests
  if (req.path.startsWith('/api/') || req.path === '/profile') {
    console.log('Request:', {
      path: req.path,
      method: req.method,
      auth: req.headers['authorization'] ? 'present' : 'none'
    });
  }
  next();
});

// Add S3 URL redirect middleware
app.use('/uploads/', (req, res, next) => {
  const path = req.path;
  
  // Direct S3 URLs should just pass through
  if (path.includes('s3.eu-west-2.amazonaws.com')) {
    return next();
  }
  
  // Handle legacy north-1 URLs
  if (path.includes('s3.eu-north-1.amazonaws.com')) {
    // Replace north-1 with west-2 in the URL
    const updatedPath = path.replace('s3.eu-north-1.amazonaws.com', 's3.eu-west-2.amazonaws.com');
    return res.redirect(updatedPath);
  }

  // For relative paths, redirect to S3 with the new region
  const s3Url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com${path}`;
  return res.redirect(s3Url);
});

// Add a utility route to update old S3 URLs stored in the database
app.get('/api/admin/update-s3-region', adminAuth, async (req, res) => {
  try {
    // Update business images
    const businessResult = await pool.query(`
      UPDATE businesses 
      SET images = array_replace(images, 
                               unnest(images), 
                               replace(unnest(images), 's3.eu-north-1.amazonaws.com', 's3.eu-west-2.amazonaws.com'))
      WHERE array_to_string(images, ',') LIKE '%s3.eu-north-1.amazonaws.com%'
      RETURNING id;
    `);
    
    // Update user profile pictures
    const userResult = await pool.query(`
      UPDATE users
      SET profile_picture = replace(profile_picture, 's3.eu-north-1.amazonaws.com', 's3.eu-west-2.amazonaws.com')
      WHERE profile_picture LIKE '%s3.eu-north-1.amazonaws.com%'
      RETURNING id;
    `);
    
    res.json({
      success: true,
      message: 'S3 region updated in database',
      updatedBusinesses: businessResult.rowCount,
      updatedUsers: userResult.rowCount
    });
  } catch (error) {
    console.error('Error updating S3 region in database:', error);
    res.status(500).json({ 
      error: 'Failed to update S3 region references',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Add migration to handle existing local files
app.get('/api/migrate-profile-pictures', adminAuth, async (req, res) => {
  try {
    // Get all users with local profile pictures
    const users = await pool.query(
      "SELECT id, profile_picture FROM users WHERE profile_picture LIKE '/uploads/%'"
    );

    for (const user of users.rows) {
      try {
        const localPath = path.join(__dirname, 'public', user.profile_picture);
        if (fs.existsSync(localPath)) {
          const fileContent = fs.readFileSync(localPath);
          const s3Key = `profiles/${user.id}/${path.basename(user.profile_picture)}`;
          const s3Url = await uploadToS3({ buffer: fileContent }, s3Key);
          
          await pool.query(
            'UPDATE users SET profile_picture = $1 WHERE id = $2',
            [s3Url, user.id]
          );
        }
      } catch (err) {
        console.error(`Failed to migrate user ${user.id}:`, err);
      }
    }

    res.json({ message: 'Migration completed' });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: 'Migration failed' });
  }
});

// After all routes are registered, print them
console.log("All registered routes:");
printRoutes(app);

// Apply routes
app.use('/post-business', postBusinessRoutes);
app.use('/api/verification', verificationUploadRoutes); // Add the verification upload routes

// Fix for post-business authentication - add fallback handler
app.get('/post-business/*', (req, res, next) => {
  // If this route is hit, it means the postBusinessRoutes didn't handle it
  // This could happen if authentication failed but didn't properly redirect
  console.log('Fallback handler for post-business route activated');
  
  const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.redirect('/login2?returnTo=' + encodeURIComponent(req.originalUrl));
  }
  
  // If we got here with a token, try the post-business routes again
  next();
});

// Apply routes
app.use('/saved-searches', savedBusinessesRoutes);

// Fix for saved-searches authentication issues
app.get('/saved-searches/*', (req, res, next) => {
  // If this route is hit, it means the savedBusinessesRoutes didn't handle it
  // This could happen if authentication failed but didn't properly redirect
  console.log('Fallback handler for saved-searches route activated');
  
  const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.redirect('/login2?returnTo=' + encodeURIComponent(req.originalUrl));
  }
  
  // If we got here with a token, try the saved-searches routes again
  next();
});

// Add these middleware functions BEFORE any route registration
app.use(cookieParser()); // Make sure cookie parser runs early

// Enhanced token debugging middleware - add this before route registrations
app.use('/post-business*', (req, res, next) => {
  console.log('POST-BUSINESS AUTH DEBUG:', {
    path: req.path,
    method: req.method,
    cookies: Object.keys(req.cookies || {}),
    hasTokenCookie: !!req.cookies?.token,
    sessionID: req.sessionID,
    sessionUserId: req.session?.userId,
    hasAuthHeader: !!req.headers['authorization'],
    authHeader: req.headers['authorization'] ? req.headers['authorization'].substring(0, 15) + '...' : 'none'
  });

  // If there's a session but no auth header, create one from the session
  if (req.session?.userId && !req.headers['authorization']) {
    console.log('Creating auth header from session userId:', req.session.userId);
    try {
      const token = jwt.sign(
        { userId: req.session.userId },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.headers['authorization'] = `Bearer ${token}`;
    } catch (err) {
      console.error('Failed to create token from session:', err);
    }
  }
  
  next();
});

// Direct post-business GET route - add before using the router
app.get('/post-business', async (req, res, next) => {
  console.log('Direct post-business GET route handler');
  
  try {
    // Find user ID from multiple sources
    let userId = null;
    
    // 1. Try session
    if (req.session?.userId) {
      userId = req.session.userId;
      console.log('User ID from session:', userId);
    }
    
    // 2. Try token in Authorization header
    if (!userId && req.headers['authorization']?.startsWith('Bearer ')) {
      const token = req.headers['authorization'].split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
        console.log('User ID from Authorization header:', userId);
      } catch (err) {
        console.error('Error decoding token from header:', err.message);
      }
    }
    
    // 3. Try token in cookie
    if (!userId && req.cookies?.token) {
      try {
        const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
        userId = decoded.userId;
        console.log('User ID from token cookie:', userId);
      } catch (err) {
        console.error('Error decoding token from cookie:', err.message);
      }
    }
    
    // If no valid user ID found, redirect to login
    if (!userId) {
      return res.redirect(`/login2?returnTo=${encodeURIComponent('/post-business')}`);
    }
    
    // User ID found, verify in database
    const userCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      console.log('User ID not found in database:', userId);
      return res.redirect(`/login2?returnTo=${encodeURIComponent('/post-business')}`);
    }
    
    // Valid user found, update session
    req.session.userId = userId;
    req.user = { userId };
    
    // Generate token for the template
    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Get Google Maps API key (log the key for debugging but don't expose in production)
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    console.log('Google Maps API key status:', googleMapsApiKey ? 'Available' : 'Missing');
    const hasGoogleMapsKey = !!googleMapsApiKey;
    
    // Render the template directly
    console.log('Rendering post-business template for user:', userId);
    res.render('post-business', {
      title: 'Post Your Business',
      user: { userId },
      token,
      googleMapsApiKey,
      hasGoogleMapsKey
    });
  } catch (error) {
    console.error('Error in direct post-business handler:', error);
    return res.redirect(`/login2?returnTo=${encodeURIComponent('/post-business')}`);
  }
});


// Add token verification endpoint - add this before existing verify-token endpoint
app.get('/api/token-debug', (req, res) => {
  const authHeader = req.headers['authorization'];
  const cookieToken = req.cookies?.token;
  const sessionUserId = req.session?.userId;
  
  let headerTokenStatus = 'missing';
  let headerTokenUserId = null;
  let headerTokenExpiry = null;
  
  let cookieTokenStatus = 'missing';
  let cookieTokenUserId = null;
  let cookieTokenExpiry = null;
  
  // Check Authorization header token
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      headerTokenStatus = 'valid';
      headerTokenUserId = decoded.userId;
      headerTokenExpiry = new Date(decoded.exp * 1000).toISOString();
    } catch (err) {
      headerTokenStatus = `invalid: ${err.message}`;
    }
  }
  
  // Check cookie token
  if (cookieToken) {
    try {
      const decoded = jwt.verify(cookieToken, process.env.JWT_SECRET);
      cookieTokenStatus = 'valid';
      cookieTokenUserId = decoded.userId;
      cookieTokenExpiry = new Date(decoded.exp * 1000).toISOString();
    } catch (err) {
      cookieTokenStatus = `invalid: ${err.message}`;
    }
  }
  
  res.json({
    authHeader: {
      present: !!authHeader,
      status: headerTokenStatus,
      userId: headerTokenUserId,
      expiry: headerTokenExpiry
    },
    cookieToken: {
      present: !!cookieToken,
      status: cookieTokenStatus,
      userId: cookieTokenUserId,
      expiry: cookieTokenExpiry
    },
    session: {
      id: req.sessionID,
      userId: sessionUserId
    },
    timestamp: new Date().toISOString()
  });
});

// Add redirect loop prevention middleware before your auth routes
app.use((req, res, next) => {
  // Check if this is a login-related route with a redirect parameter
  if ((req.path.includes('/login') || req.path.includes('/auth/login')) && 
      (req.query.returnTo || req.query.returnUrl || req.query.redirect)) {
    
    // Get the redirect URL
    let redirectUrl = req.query.returnTo || req.query.returnUrl || req.query.redirect;
    
    // Decode it
    redirectUrl = decodeURIComponent(redirectUrl);
    
    // Check for login redirect loops
    if (redirectUrl.includes('/login') || 
        redirectUrl.includes('/signup') || 
        redirectUrl.includes('/auth/login')) {
      
      console.log('Detected login redirect loop:', {
        path: req.path,
        redirectUrl: redirectUrl
      });
      
      // Replace the redirect parameter with homepage
      const newUrl = req.url.replace(
        /(returnTo|returnUrl|redirect)=([^&]+)/, 
        '$1=%2F'
      );
      
      return res.redirect(newUrl);
    }
  }
  
  next();
});

// Add redirect loop prevention middleware before your auth routes
app.use((req, res, next) => {
  // Check if the URL contains multiple nested login2 redirects
  if (req.url.includes('login2') && req.url.includes('returnTo')) {
    const redirectCount = (req.url.match(/login2/g) || []).length;
    if (redirectCount > 1) {
      // If we detect a redirect loop, send user to the base login page
      return res.redirect('/login2');
    }
  }
  next();
});


// Chat interface route
app.get('/chat', authenticateToken, async (req, res) => {
  try {
    // Import the chat helper functions
    const { getConversationsForUser, getConversationById, getTokenFromRequest } = await import('./utils/chat-helpers.js');
    
    const userId = req.user?.userId;
    
    // Get conversation ID from query parameters
    const conversationId = req.query.conversation;
    
    // Fetch conversations for sidebar
    let conversations = [];
    if (userId) {
      conversations = await getConversationsForUser(userId);
    }
    
    // Fetch current conversation if ID is provided
    let conversation = null;
    if (conversationId) {
      conversation = await getConversationById(conversationId, userId);
    }
    
    // Get token for socket authentication
    const token = getTokenFromRequest(req);
    
    // IMPORTANT: Render chat.ejs instead of chat-interface.ejs
    res.render('chat', {
      title: conversation ? `Chat with ${conversation.recipient?.name || 'User'}` : 'Chat',
      user: req.user,
      userId,
      conversations: conversations || [],
      conversation,
      activeConversationId: conversationId,
      formatTime: (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return date.toLocaleDateString();
      },
      token: token
    });
  } catch (error) {
    console.error('Error in chat route:', error);
    res.status(500).render('error', { message: 'Failed to load chat interface' });
  }
});

// Add a separate route for the enhanced chat interface if needed
app.get('/chat-interface', authenticateUser, async (req, res) => {
  try {
    // ...existing code for chat-interface...
    
    // Render chat-interface.ejs specifically for this route
    res.render('chat-interface', {
      title: 'Enhanced Chat Interface',
      // ...pass necessary data...
      user: req.user,
      userId: req.user?.userId,
      token: req.token
    });
  } catch (error) {
    console.error('Error in chat interface route:', error);
    res.status(500).render('error', { message: 'Failed to load enhanced chat interface' });
  }
});

// Import our specialized auth debugging middleware
import authDebug from './middleware/authDebug.js';

// Add this code near the top of your middleware section, before other route handlers
app.use(authDebug.routeDebugger);

// Apply the hard-blocking middleware specifically to marketplace2 routes
app.use(authDebug.enforceNonChatPage);
app.use('/marketplace2', authDebug.enforceNonChatPage);
app.use('/marketplace2/*', authDebug.enforceNonChatPage);

// Update the marketplace2 route to use our specialized error prevention
app.get('/marketplace2', authDebug.enforceNonChatPage, async (req, res) => {
  try {
    // Triple assurance this is not a chat page
    res.locals.isChatPage = false;
    
    // Pass user data if authenticated
    let userData = null;
    if (req.user && req.user.userId) {
      // Fetch user data if available
      try {
        const user = await getUserById(req.user.userId);
        if (user) {
          userData = {
            userId: user.id,
            username: user.username,
            email: user.email,
            profile_picture: user.profile_picture || '/images/default-profile.png'
          };
        }
      } catch (error) {
        console.error('Error fetching user data for marketplace:', error);
      }
    }
    
    // Create a non-writable isChatPage property
    Object.defineProperty(res.locals, 'isChatPage', {
      value: false,
      writable: false,
      configurable: false
    });
    
    // Render the marketplace2 template with guaranteed non-chat page settings
    res.render('marketplace2', {
      title: 'Business Marketplace',
      isChatPage: false, // Explicitly set to false for redundancy
      user: userData,
      isAuthenticated: !!userData,
      isMarketplacePage: true  // Add an explicit marketplace flag
    });
  } catch (error) {
    console.error('Error rendering marketplace2:', error);
    res.status(500).send('Error loading marketplace');
  }
});


// Improve API error handling to show detailed errors for debugging
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  
  // Check if headers are already sent
  if (res.headersSent) {
    return next(err);
  }
  
  // Determine status code
  const statusCode = err.statusCode || 500;
  
  // Send error response
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Server error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    details: process.env.NODE_ENV === 'development' ? err : undefined
  });
});

// Add explicit route for chat messages API to ensure proper route matching
app.get('/api/chat/messages', (req, res, next) => {
  console.log('Chat messages API route hit directly');
  // Forward to the router
  next();
});

// Add this BEFORE any middleware registration, at the very top of your server.js file
// after creating the app, but before using any middleware
app.post('/api/business/public/calculate-valuation', express.json(), async (req, res) => {
  try {
    console.log('==== PUBLIC VALUATION ENDPOINT ACCESSED ====');
    console.log('Request headers:', req.headers);
    console.log('Request body keys:', Object.keys(req.body));
    
    // Force content type to be JSON
    res.setHeader('Content-Type', 'application/json');
    
    // Pass to the valuation controller
    return valuationController.calculateValuation(req, res);
  } catch (error) {
    console.error('Error in public valuation endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Error calculating valuation',
      error: error.message
    });
  }
});

// Add this BEFORE any middleware registration, at the very top of the server.js file
app.post('/api/business/direct-valuation', express.json(), async (req, res) => {
  try {
    const { businessData, _debug } = req.body;
    
    if (!businessData || Object.keys(businessData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No business data provided'
      });
    }
    
    // Log simplified version of the data for debugging
    console.log('Processing valuation with data:', {
      industry: businessData.industry,
      revenue: businessData.revenue,
      ebitda: businessData.ebitda,
      requestId: _debug?.requestId || 'unknown'
    });
    
    // Import valuation service directly to avoid middleware issues
    const valuationService = (await import('./services/valuationService.js')).default;
    
    try {
      // Calculate valuation directly using the service
      const valuationResult = await valuationService.calculateBusinessValuation(businessData);
      
      console.log('Valuation calculated successfully:', {
        estimatedValue: valuationResult.estimatedValue,
        confidence: valuationResult.confidence,
        requestId: _debug?.requestId || 'unknown'
      });
      
      // Return success response with proper content type
      return res.status(200).json({
        success: true,
        valuation: valuationResult
      });
    } catch (calcError) {
      console.error('Error calculating valuation:', calcError);
      return res.status(500).json({
        success: false,
        message: 'Valuation calculation error: ' + calcError.message
      });
    }
  } catch (error) {
    console.error('Direct valuation endpoint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process valuation request',
      error: error.message
    });
  }
});

// Add this direct endpoint for saving valuation data specifically before other middleware
app.post('/api/business/save-valuation-data', express.json(), async (req, res) => {
  console.log('==== DIRECT SAVE VALUATION DATA ENDPOINT ====');
  console.log('Request headers:', req.headers);
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('==== END REQUEST INFO ====');
  
  try {
    const data = req.body;
    
    // Ensure email exists or use anonymous
    if (!data.email) {
      data.email = `anonymous_${Date.now()}@placeholder.com`;
      console.log('Using generated email:', data.email);
    }
    
    // Create a unique submission ID if not provided
    // Add implementation here
    
    return res.json({
      success: true,
      message: 'Valuation data saved successfully'
    });
  } catch (error) {
    console.error('Error saving valuation data:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to save valuation data',
      error: error.message
    });
  }
});

const DB_POOL_CONFIG = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  // Add connection pool optimization
  max: process.env.DB_MAX_CONNECTIONS || 10, // Reduce from default
  idleTimeoutMillis: 30000, // Timeout idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Fail fast if connection can't be established
  allowExitOnIdle: true // Allow pool to exit when idle
};

// Add pool error handler and connection management
pool.on('error', (err, client) => {
  console.error('Unexpected database error:', err);
});

// Add function to gracefully shut down the pool
async function closePool() {
  console.log('Closing database connection pool');
  await pool.end();
}

// Update shutdown handlers to properly close pool
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await closePool();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await closePool();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Apply RDS optimizations to the existing pool
(() => {
  // Apply optimization settings to existing pool if possible
  if (pool) {
    console.log('Applying database connection pool optimizations');
    
    // Note: We can't directly change pool.options in many driver implementations
    // but we can add event handlers and implement other optimizations
    
    // Add pool error handler
    pool.on('error', (err, client) => {
      console.error('Unexpected database error:', err);
    });
  }
})();

// Add RDS optimization routes - admin only
app.use('/api/rds', adminAuth, rdsOptimizationRoutes);

// Add graceful shutdown handlers for database connections
process.removeAllListeners('SIGTERM');
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  try {
    // Close database connections
    console.log('Closing database connections...');
    if (pool && typeof pool.end === 'function') {
      await pool.end();
    }
    // Close server
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

process.removeAllListeners('SIGINT');
process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  try {
    // Close database connections
    console.log('Closing database connections...');
    if (pool && typeof pool.end === 'function') {
      await pool.end();
    }
    // Close server
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});



// ...existing code...

// Customer email collection endpoint
app.post('/api/save-customer-email', async (req, res) => {
  try {
    const { email, source, anonymousId } = req.body;
    
    // Basic validation
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    
    // Check if email already exists in the customer_emails table
    const checkQuery = 'SELECT id FROM customer_emails WHERE email = $1';
    const checkResult = await pool.query(checkQuery, [email.toLowerCase().trim()]);
    
    if (checkResult.rows.length > 0) {
      // Email exists, update the entry
      const updateQuery = `
        UPDATE customer_emails 
        SET 
          last_seen_at = NOW(),
          updated_at = NOW(),
          interaction_count = interaction_count + 1,
          anonymous_id = COALESCE($2, anonymous_id)
        WHERE email = $1
        RETURNING id
      `;
      
      const result = await pool.query(updateQuery, [email.toLowerCase().trim(), anonymousId]);
      console.log(`Updated existing customer email record: ${result.rows[0].id}`);
      
      return res.json({ 
        success: true, 
        message: 'Email record updated',
        id: result.rows[0].id
      });
    } else {
      // Insert new email
      const insertQuery = `
        INSERT INTO customer_emails (
          email,
          source,
          anonymous_id,
          created_at,
          updated_at,
          last_seen_at,
          interaction_count
        ) VALUES ($1, $2, $3, NOW(), NOW(), NOW(), 1)
        RETURNING id
      `;
      
      const values = [
        email.toLowerCase().trim(),
        source || 'seller-questionnaire',
        anonymousId || null
      ];
      
      const result = await pool.query(insertQuery, values);
      console.log(`Created new customer email record: ${result.rows[0].id}`);
      
      return res.json({ 
        success: true, 
        message: 'Email successfully saved',
        id: result.rows[0].id
      });
    }
    
  } catch (error) {
    console.error('Error saving customer email:', error);
    res.status(500).json({ success: false, message: 'Error saving email' });
  }
});

// Business questionnaire submission endpoint
app.post('/api/business/save-questionnaire', async (req, res) => {
  try {
    // Extract key data from the request
    const { 
      email, 
      businessName, 
      industry, 
      description,
      valuation,
      anonymousId,
      ...otherData
    } = req.body;
    
    // Basic validation
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    
    // Check if a submission with this anonymousId already exists
    let submissionId = null;
    if (anonymousId) {
      const checkQuery = 'SELECT id FROM business_questionnaires WHERE anonymous_id = $1';
      const checkResult = await pool.query(checkQuery, [anonymousId]);
      
      if (checkResult.rows.length > 0) {
        submissionId = checkResult.rows[0].id;
      }
    }
    
    if (submissionId) {
      // Update existing submission
      const updateQuery = `
        UPDATE business_questionnaires
        SET
          email = $1,
          business_name = $2,
          industry = $3,
          description = $4,
          valuation_data = $5,
          other_data = $6,
          updated_at = NOW()
        WHERE id = $7
        RETURNING id
      `;
      
      const updateValues = [
        email.toLowerCase().trim(),
        businessName || null,
        industry || null,
        description || null,
        valuation ? JSON.stringify(valuation) : null,
        JSON.stringify(otherData),
        submissionId
      ];
      
      const result = await pool.query(updateQuery, updateValues);
      console.log(`Updated existing questionnaire: ${result.rows[0].id}`);
      
      return res.json({
        success: true,
        message: 'Questionnaire updated successfully',
        submissionId: result.rows[0].id
      });
      
    } else {
      // Create new submission
      const insertQuery = `
        INSERT INTO business_questionnaires (
          email,
          business_name,
          industry,
          description,
          anonymous_id,
          valuation_data,
          other_data,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING id
      `;
      
      const insertValues = [
        email.toLowerCase().trim(),
        businessName || null,
        industry || null,
        description || null,
        anonymousId || null,
        valuation ? JSON.stringify(valuation) : null,
        JSON.stringify(otherData)
      ];
      
      const result = await pool.query(insertQuery, insertValues);
      submissionId = result.rows[0].id;
      console.log(`Created new questionnaire: ${submissionId}`);
      
      return res.json({
        success: true,
        message: 'Questionnaire saved successfully',
        submissionId: submissionId
      });
    }
    
  } catch (error) {
    console.error('Error saving questionnaire:', error);
    res.status(500).json({ success: false, message: 'Error saving questionnaire data' });
  }
});

// Newsletter subscription endpoint
app.post('/subscribe', async (req, res) => {
  try {
    const { email, first_name, last_name, source = 'website' } = req.body;
    
    // Basic validation
    if (!email) {
      return res.status(400).redirect('/subscribe/error?message=Email is required');
    }
    
    // Check if email already exists in the newsletter_subscribers table
    const checkQuery = 'SELECT id, is_active FROM newsletter_subscribers WHERE email = $1';
    const checkResult = await pool.query(checkQuery, [email.toLowerCase().trim()]);
    
    if (checkResult.rows.length > 0) {
      // Email exists, check if already active
      if (checkResult.rows[0].is_active) {
        return res.redirect('/subscribe/thank-you?status=existing');
      } else {
        // Reactivate the subscription
        const reactivateQuery = `
          UPDATE newsletter_subscribers 
          SET is_active = TRUE, 
              unsubscribed_at = NULL,
              subscribed_at = CURRENT_TIMESTAMP,
              source = COALESCE($1, source)
          WHERE id = $2
          RETURNING id`;
        
        await pool.query(reactivateQuery, [source, checkResult.rows[0].id]);
        return res.redirect('/subscribe/thank-you?status=reactivated');
      }
    } else {
      // Insert new subscriber
      const insertQuery = `
        INSERT INTO newsletter_subscribers (
          email,
          first_name,
          last_name,
          source,
          subscribed_at,
          is_active
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, TRUE)
        RETURNING id`;
      
      const values = [
        email.toLowerCase().trim(),
        first_name || null,
        last_name || null,
        source
      ];
      
      await pool.query(insertQuery, values);
      
      // Log the subscription
      console.log(`New newsletter subscription: ${email} from source: ${source}`);
      
      return res.redirect('/subscribe/thank-you');
    }
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return res.status(500).redirect('/subscribe/error?message=An unexpected error occurred');
  }
});

// Newsletter thank you page
app.get('/subscribe/thank-you', (req, res) => {
  const status = req.query.status || 'new';
  
  res.render('subscribe/thank-you', {
    title: 'Thank You for Subscribing',
    status: status
  });
});

// Newsletter error page
app.get('/subscribe/error', (req, res) => {
  const message = req.query.message || 'An error occurred with your subscription';
  
  res.render('subscribe/error', {
    title: 'Subscription Error',
    message: message
  });
});

// Newsletter unsubscribe functionality
app.get('/unsubscribe/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Update subscriber status
    const updateQuery = `
      UPDATE newsletter_subscribers
      SET is_active = FALSE, unsubscribed_at = CURRENT_TIMESTAMP
      WHERE unsubscribe_token = $1
      RETURNING email`;
    
    const result = await pool.query(updateQuery, [token]);
    
    if (result.rows.length === 0) {
      return res.render('subscribe/unsubscribe', {
        title: 'Unsubscribe Error',
        success: false,
        message: 'Invalid or expired unsubscribe link'
      });
    }
    
    return res.render('subscribe/unsubscribe', {
      title: 'Successfully Unsubscribed',
      success: true,
      email: result.rows[0].email
    });
    
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return res.render('subscribe/unsubscribe', {
      title: 'Unsubscribe Error',
      success: false,
      message: 'An error occurred while processing your request'
    });
  }
});

// Newsletter subscription page
app.get('/subscribe', (req, res) => {
  res.render('subscribe/index', {
    title: 'Subscribe to Our Newsletter'
  });
});

export { app, server, chatSocketService };
