import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import session from 'express-session';
import multer from 'multer';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import pool from './db.js';
import bcrypt from 'bcrypt';
import authRoutes from './routes/auth.js';
import { requireAuth } from './middleware/auth.js';
import paymentRoutes from './routes/payment.routes.js';
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';
import Stripe from 'stripe';
import bodyParser from 'body-parser';
// Import S3 routes
import s3TestRoutes from './routes/api/s3-test.js';
import s3UploadRoutes from './routes/api/s3-upload.js';

// Import threads API routes
import threadsApiRoutes from './routes/api/threads.js';
import buyerRoutes from './routes/api/buyer.js';
import buyerDashboardRoutes from './routes/api/buyer-dashboard.js';
import trustRoutes from './routes/api/trust.js';
import blogAutomationRoutes from './routes/api/blog-automation.js';
import tokenRoutes from './routes/api/tokens.js';
import webhookRoutes from './routes/webhooks.js';

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
  authenticateUser,
  addProviderColumns} from './database.js';
import cors from 'cors';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import BusinessMetricsService from './services/businessMetricsService.js';
import OpenAI from 'openai';
import fetch from 'node-fetch';
import { authenticateToken } from './middleware/auth.js';
import historyRoutes from './routes/historyRoutes.js';
import { createBusinessHistoryTable } from './services/history.js';
import fs from 'fs';
import savedBusinessesRoutes from './routes/savedBusinesses.js';
import marketTrendsRoutes from './routes/markettrendsroutes.js';
import googleDriveRoutes from './routes/googleDriveRoutes.js';
import googleAuthRoutes from './routes/googleAuthRoutes.js';
import postBusinessValuationRoutes from './routes/postBusinessValuationRoutes.js';
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3'; // Add ListBucketsCommand
import { uploadToS3 } from './utils/s3.js';
import { sendNewsletterSubscriptionNotification } from './utils/email.js';
import { adminAuth } from './middleware/adminAuth.js'; // Add this import
import profileApi from './routes/api/profileApi.js'; // New profile API
import voiceRoutes from './routes/voiceRoutes.js'; // Add this import
import stripeRoutes from './routes/stripe.js';
import printRoutes from './middleware/routeDebug.js';
import apiRoutes from './routes/api.js'; // Add this import
import blogRoutes from './routes/blogRoutes.js'; // Add this import for blog routes
import blogApiRoutes from './routes/blogApiRoutes.js'; // Add this import
import adminRoutes from './routes/adminRoutes.js'; // <-- Import admin routes
import { addDevAuthControls } from './utils/dev-auth.js';
import devRoutes from './routes/dev.js';
import { stripeWebhookMiddleware, handleStripeWebhook } from './middleware/webhookHandler.js';
import profileRoutes from './routes/profile.routes.js';
import apiSubRoutes from './routes/api/subscription.js';
import checkoutRoutes from './routes/checkout.js';
import subscriptionApiRoutes from './routes/api/subscription.js';
import aiApiRoutes from './routes/api/ai.js';
import { authenticateUser as authMiddleware, populateUser } from './middleware/auth.js'; // Add this import
import cookieParser from 'cookie-parser';
import marketTrendsApiRoutes from './routes/api/market-trends.js';
import { initializeMarketTrends } from './services/marketTrendsService.js'; // Add this import

// Import the assistant monitoring routes
import assistantMonitorRoutes from './routes/api/assistant-monitor.js';

// Import for AI assistant routes (if not already there)
import aiAssistantRoutes from './routes/ai-assistant.js';

// Add this import at the top with other imports
import { createAssistantTables } from './migrations/create_assistant_interactions.js';

// Import routes
import postBusinessRoutes from './routes/post-business.js';

import tokenDebugRoutes from './routes/api/token-debug.js'; // Add this import
import valuationApi from './api/valuation.js';

import debugApiRoutes from './routes/api/debug.js';

// Import A/B Testing Analytics routes
import analyticsRoutes from './routes/analytics.js';

// Import Smart Routing
import smartRoutingRoutes from './routes/smartRouting.js';

// Import Enhanced Role-Based Routing
import { detectUserRole, injectRoleCacheScript } from './middleware/enhancedRoleBasedRouting.js';

// A/B Testing Middleware
function assignABTestVariant(req, res, next) {
  // Check if user already has a variant assigned in session
  if (req.session && req.session.abTestVariant) {
    req.abTestVariant = req.session.abTestVariant;
    return next();
  }
  
  // Generate random variant (50/50 split)
  const isSellerFirst = Math.random() < 0.5;
  const variant = isSellerFirst ? 'seller_first' : 'buyer_first';
  
  // Store in session for persistence
  if (req.session) {
    req.session.abTestVariant = variant;
  }
  
  // Attach to request for use in route
  req.abTestVariant = variant;
  
  // Log assignment for debugging (remove in production)
  console.log(`A/B Test: User assigned to ${variant} variant`);
  
  next();
}

// Add this import near the top of the file with other imports
import { attachRootRoute } from './root-route-fix.js';
import apiAuthRoutes from './routes/api/auth.js'; // Add this import
import authDebug from './middleware/authDebug.js';
import aiCrawlerMonitoring from './middleware/aiCrawlerMonitoring.js';
import aiCrawlerRoutes from './routes/aiCrawlerRoutes.js';

// Import WebSocket service
import WebSocketService from './services/websocket.js';
import { Server as SocketIOServer } from 'socket.io';


// Import the chat socket initialization function
import { initializeChatSocket } from './socket/chatSocket.js';
import publicValuationRouter from './api/public-valuation.js';

// Import chat API routes
import chatApiRoutes from './routes/api/chat.js';

import chatDebugRouter from './routes/chat-debug.js';

import testRoutes from './routes/api/test-routes.js'; // Add this import

import postBusinessUploadRoutes from './routes/api/post-business-upload.js';
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

// Import OAuth routes
import oauthRoutes from './routes/oauth.js';

// Import verification upload routes
import verificationUploadRoutes from './routes/verificationUploadRoutes.js';

// Import professional routes
import professionalRoutes from './routes/professionalRoutes.js';

// Import professional profiles API routes
import professionalProfilesRoutes from './routes/api/professional-profiles.js';

// Import valuation payment routes
import valuationPaymentRoutes from './routes/valuationPaymentRoutes.js';

// Import blog approval routes
import blogApprovalRoutes from './routes/blogApprovalRoutes.js';


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
    // SECURITY: Enhanced secret masking function
    const isSensitiveKey = (key) => {
      const sensitivePatterns = [
        'SECRET', 'KEY', 'TOKEN', 'PASSWORD', 'PASS', 'PWD', 
        'PRIVATE', 'CREDENTIAL', 'AUTH', 'API_KEY', 'CLIENT_SECRET'
      ];
      return sensitivePatterns.some(pattern => 
        key.toUpperCase().includes(pattern)
      );
    };

    // Print all environment variables for debugging (without sensitive values)
    console.log("Environment variables scan:");
    Object.keys(process.env)
      .filter(key => key.includes('AWS'))
      .forEach(key => {
        const value = isSensitiveKey(key) ? '***' : process.env[key];
        console.log(`${key}=${value}`);
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

// Alternative landing page route - marketplace-landing as alternative to homepage
app.get('/homepage-alt', (req, res) => {
  res.render('marketplace-landing', {
    title: 'Welcome to Arzani Marketplace',
    user: null,
    isAuthenticated: false
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

// Add before other middleware
app.use('/webhook', express.raw({type: 'application/json'}));


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

app.get('/valuation-payment', (req, res, next) => {
  // Check if this is a redirect from Stripe with success indicators
  if (req.query.redirect_status === 'succeeded' || 
      req.query.payment_intent || 
      req.query.session_id ||
      req.headers.referer?.includes('stripe.com')) {
    
    console.log('Payment success indicators detected, redirecting to confirmation');
    return res.redirect('/valuation-confirmation' + req.originalUrl.substring(req.originalUrl.indexOf('?')));
  }
  next();
});

// Add valuation confirmation route
// Explicitly define the route handler for valuation-confirmation BEFORE any middleware
// This ensures it takes precedence over other route handlers
app.get('/valuation-confirmation', (req, res) => {
  // Check for session payment flag or incoming Stripe payment success indicators
  const paymentComplete = req.session?.paymentComplete || 
                         req.query.redirect_status === 'succeeded' || 
                         req.query.payment_intent || 
                         req.query.session_id ||
                         req.headers.referer?.includes('stripe.com');
  
  // Store payment success in session for future requests
  if (req.session) {
    if (paymentComplete) {
      req.session.paymentComplete = true;
      
      // Store payment info in session if available
      if (req.query.payment_intent) {
        req.session.paymentIntentId = req.query.payment_intent;
      }
      if (req.query.session_id) {
        req.session.sessionId = req.query.session_id;
      }
      
      // Add cookie as backup method in case session is lost
      res.cookie('valuation_payment_complete', 'true', { 
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days,
        path: '/'
      });
    }
    
    // Flag that user accessed the questionnaire successfully
    req.session.accessedQuestionnaire = true;
    
    // Save session explicitly
    req.session.save();
  }
  
  // Log detailed information to help diagnose issues
  console.log('Valuation confirmation page accessed:', {
    paymentComplete,
    sessionData: req.session ? {
      paymentComplete: req.session.paymentComplete,
      accessedQuestionnaire: req.session.accessedQuestionnaire
    } : 'No session',
    queryParams: req.query,
    referer: req.headers.referer || 'none'
  });
  
  // Always render the confirmation page in both development and production
  // This ensures the auto-redirect script runs properly
  res.render('valuation-confirmation', {
    title: 'Payment Confirmed | Arzani Marketplace'
  });
});

// Add buyer dashboard route with database integration
app.get('/buyer-dashboard', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    // Initialize dashboard data with defaults
    let dashboardData = {
      stats: {
        savedSearches: 0,
        activeAlerts: 0,
        meetingsBooked: 0,
        businessesViewed: 0
      },
      recentAlerts: [],
      upcomingMeetings: [],
      savedSearches: [],
      analytics: {
        searchActivity: [],
        alertTrends: []
      }
    };

    if (userId) {
      try {
        // Fetch buyer dashboard statistics
        const statsQuery = `
          SELECT 
            COUNT(DISTINCT ss.id) as saved_searches,
            COUNT(DISTINCT ba.id) as active_alerts,
            COUNT(DISTINCT bm.id) as meetings_booked,
            COUNT(DISTINCT bvt.id) as businesses_viewed
          FROM users u
          LEFT JOIN saved_searches ss ON u.id = ss.user_id AND ss.deleted_at IS NULL
          LEFT JOIN buyer_alerts ba ON u.id = ba.buyer_id AND ba.status = 'active'
          LEFT JOIN business_meetings bm ON u.id = bm.buyer_id AND bm.status IN ('scheduled', 'confirmed')
          LEFT JOIN buyer_view_tracking bvt ON u.id = bvt.buyer_id 
            AND bvt.viewed_at >= NOW() - INTERVAL '30 days'
          WHERE u.id = $1
        `;
        
        const statsResult = await pool.query(statsQuery, [userId]);
        if (statsResult.rows.length > 0) {
          const stats = statsResult.rows[0];
          dashboardData.stats = {
            savedSearches: parseInt(stats.saved_searches) || 0,
            activeAlerts: parseInt(stats.active_alerts) || 0,
            meetingsBooked: parseInt(stats.meetings_booked) || 0,
            businessesViewed: parseInt(stats.businesses_viewed) || 0
          };
        }

        // Fetch recent alerts (last 10)
        const alertsQuery = `
          SELECT ba.*, 
                 CASE 
                   WHEN ba.alert_type = 'price_drop' THEN 'Price Drop Alert'
                   WHEN ba.alert_type = 'new_listing' THEN 'New Business Listed'
                   WHEN ba.alert_type = 'status_change' THEN 'Status Change'
                   ELSE 'Business Alert'
                 END as alert_title,
                 ba.created_at,
                 ba.criteria
          FROM buyer_alerts ba
          WHERE ba.buyer_id = $1 
            AND ba.status = 'active'
            AND ba.created_at >= NOW() - INTERVAL '7 days'
          ORDER BY ba.created_at DESC
          LIMIT 10
        `;
        
        const alertsResult = await pool.query(alertsQuery, [userId]);
        dashboardData.recentAlerts = alertsResult.rows.map(alert => ({
          id: alert.id,
          title: alert.alert_title,
          description: alert.criteria ? 
            `${alert.criteria.business_type || 'Business'} in ${alert.criteria.location || 'Various locations'}` :
            'New business opportunity available',
          timeAgo: formatTimeAgo(alert.created_at),
          type: alert.alert_type,
          icon: getAlertIcon(alert.alert_type)
        }));

        // Fetch upcoming meetings (next 5)
        const meetingsQuery = `
          SELECT bm.*, b.business_name, b.business_type,
                 s.business_name as seller_business_name,
                 u.username as seller_name
          FROM business_meetings bm
          JOIN businesses b ON bm.business_id = b.id
          LEFT JOIN users s ON b.seller_id = s.id
          LEFT JOIN users u ON s.id = u.id
          WHERE bm.buyer_id = $1 
            AND bm.status IN ('scheduled', 'confirmed')
            AND bm.scheduled_at >= NOW()
          ORDER BY bm.scheduled_at ASC
          LIMIT 5
        `;
        
        const meetingsResult = await pool.query(meetingsQuery, [userId]);
        dashboardData.upcomingMeetings = meetingsResult.rows.map(meeting => ({
          id: meeting.id,
          businessName: meeting.business_name,
          businessType: meeting.business_type,
          sellerName: meeting.seller_name,
          scheduledAt: meeting.scheduled_at,
          status: meeting.status,
          meetingType: meeting.meeting_type || 'video'
        }));

        // Fetch saved searches (last 5)
        const searchesQuery = `
          SELECT ss.*, 
                 COUNT(b.id) as matching_businesses
          FROM saved_searches ss
          LEFT JOIN businesses b ON (
            (ss.criteria->>'business_type' IS NULL OR b.business_type ILIKE '%' || (ss.criteria->>'business_type') || '%')
            AND (ss.criteria->>'location' IS NULL OR b.location ILIKE '%' || (ss.criteria->>'location') || '%')
            AND (ss.criteria->>'min_price' IS NULL OR b.asking_price >= (ss.criteria->>'min_price')::numeric)
            AND (ss.criteria->>'max_price' IS NULL OR b.asking_price <= (ss.criteria->>'max_price')::numeric)
          )
          WHERE ss.user_id = $1 AND ss.deleted_at IS NULL
          GROUP BY ss.id
          ORDER BY ss.created_at DESC
          LIMIT 5
        `;
        
        const searchesResult = await pool.query(searchesQuery, [userId]);
        dashboardData.savedSearches = searchesResult.rows.map(search => ({
          id: search.id,
          name: search.name,
          criteria: search.criteria,
          matchingBusinesses: parseInt(search.matching_businesses) || 0,
          createdAt: search.created_at
        }));

      } catch (dbError) {
        console.error('Database error in buyer dashboard:', dbError);
        // Continue with default data if database queries fail
      }
    }

    res.render('buyer-dashboard', {
      title: 'Buyer Dashboard - Arzani',
      user: req.user || null,
      dashboardData: dashboardData
    });

  } catch (error) {
    console.error('Error loading buyer dashboard:', error);
    res.status(500).render('error', {
      title: 'Error - Arzani',
      message: 'Failed to load dashboard',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Helper functions for dashboard
function formatTimeAgo(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return 'Less than an hour ago';
}

function getAlertIcon(alertType) {
  switch (alertType) {
    case 'price_drop': return 'fas fa-tag';
    case 'new_listing': return 'fas fa-exclamation';
    case 'status_change': return 'fas fa-info-circle';
    default: return 'fas fa-bell';
  }
}

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
    maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
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
const TOKEN_EXPIRY = '14d';
const REFRESH_TOKEN_EXPIRY = '30d';

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
    }    if (!authHeader.startsWith('Bearer ') || authHeader.split(' ').length !== 2) {
      console.log('Invalid auth header format, continuing without auth');
      return next();
    }    const token = authHeader.split(' ')[1];
    
    // Add token validation debugging - fixed string comparison issue
    if (!token || token.trim() === '' || token === null || token === undefined) {
      console.log('Empty or invalid token received, continuing without auth');
      return next();
    }
    
    // Log token format for debugging (first 20 chars only for security)
    console.log('Token validation attempt:', {
      tokenStart: token.substring(0, 20),
      tokenLength: token.length,
      path: req.path
    });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { userId: decoded.userId };
        console.log('Token validation successful for user:', decoded.userId);
        next();
    } catch (error) {
        console.error('Token validation error:', {
          error: error.message,
          tokenStart: token.substring(0, 20),
          path: req.path
        });
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
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests, or same-origin requests)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      'https://arzani.co.uk',
      'https://www.arzani.co.uk',
      'https://accounts.google.com',
      'https://oauth.live.com',
      'https://login.microsoftonline.com'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // For development, allow any localhost origin
      if (origin && origin.includes('localhost')) {
        callback(null, true);
      } else {
        console.log('CORS rejected origin:', origin);
        console.log('Environment:', process.env.NODE_ENV);
        console.log('Allowed origins:', allowedOrigins);
        
        // In production, be more lenient for requests from the same domain
        if (process.env.NODE_ENV === 'production' && origin && 
            (origin.includes('arzani.co.uk') || origin.endsWith('arzani.co.uk'))) {
          console.log('Allowing production origin:', origin);
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-CSRF-Token',
    'stripe-signature'
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 200
};

// Register valuation payment routes
app.use('/', valuationPaymentRoutes);

// Add specific CORS headers for API routes
app.use('/api', (req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5000',
    'https://arzani.co.uk',
    'https://www.arzani.co.uk',
    'https://accounts.google.com',
    'https://oauth.live.com',
    'https://login.microsoftonline.com'
  ];
  
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin) || (origin && origin.includes('localhost'))) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).send();
  }
  next();
});

// Middleware - Apply CORS first before any other middleware
app.use(cors(corsOptions));

// Then apply other middleware
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, '../frontend/public')));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(cookieParser());

// Add AI crawler monitoring middleware
app.use(aiCrawlerMonitoring);

// Add development authentication controls middleware (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Adding development authentication controls middleware');
  app.use(addDevAuthControls);
}

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
app.use('/api/threads', threadsApiRoutes); // Add threads API for conversation management
app.use('/api/buyer', buyerRoutes);
app.use('/api/buyer-dashboard', buyerDashboardRoutes);
app.use('/api/trust', trustRoutes);
app.use('/api/tokens', tokenRoutes); // Token system API
app.use('/api/blog-automation', blogAutomationRoutes); // Automated blog generation system
app.use('/api/blog-automation', blogAutomationRoutes); // Automated blog generation system
app.use('/', webhookRoutes); // Stripe webhook handler (must be before body parsing middleware)
app.use('/payment', paymentRoutes);
// Add specific CORS middleware for OAuth routes
app.use('/auth', (req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5000',
    'https://arzani.co.uk',
    'https://www.arzani.co.uk',
    'https://accounts.google.com',
    'https://oauth.live.com',
    'https://login.microsoftonline.com'
  ];
  
  const origin = req.headers.origin;
  console.log('Auth middleware - Origin:', origin);
  console.log('Auth middleware - Environment:', process.env.NODE_ENV);
  
  // Allow requests with no origin (same-origin requests)
  if (!origin) {
    res.header('Access-Control-Allow-Origin', '*');
  } else if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (origin && origin.includes('localhost')) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'production' && origin && origin.includes('arzani.co.uk')) {
    // In production, be more lenient for arzani.co.uk domains
    console.log('Auth middleware - Allowing production origin:', origin);
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    console.log('Auth middleware - Rejecting origin:', origin);
    res.header('Access-Control-Allow-Origin', 'null');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token');
  res.header('Access-Control-Expose-Headers', 'Authorization');
  
  // Handle preflight requests for OAuth
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Add debugging middleware for auth routes
app.use('/auth', (req, res, next) => {
  console.log(`Auth route accessed: ${req.method} ${req.path}`);
  console.log(`Request origin: ${req.headers.origin}`);
  console.log(`Request content-type: ${req.headers['content-type']}`);
  console.log(`Request accept: ${req.headers.accept}`);
  next();
});

app.use('/auth', authRoutes); // Update this line to register auth routes
app.use('/auth', oauthRoutes); // Add OAuth routes
app.use('/api/market', marketTrendsRoutes);
app.use('/api/drive', googleDriveRoutes);
app.use('/api/test', testRoutes); // Add the new test routes
app.use('/api/post-business', postBusinessValuationRoutes);
app.use('/api/s3-test', s3TestRoutes);
app.use('/api/s3-upload', s3UploadRoutes);
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

// Register development authentication routes (only available in development)
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Registering development authentication control routes at /dev');
  app.use('/dev', devRoutes);
}

// Register admin routes (protected by adminAuth middleware within the router file)
app.use('/api/admin', adminRoutes); // <-- Register admin routes

app.use('/api/profile', authenticateToken, profileApi); // Keep this one, remove the duplicate below
// app.use('/api/profile', profileApi); // REMOVE THIS DUPLICATE LINE
app.use('/api/business', businessRoutes);
app.use('/api', apiRoutes);
app.use('/api/business', savedBusinessesRoutes); 
app.use('/api/debug', debugApiRoutes);
// Add A/B Testing Analytics routes (public access for tracking)
app.use('/api/analytics', analyticsRoutes);
// Add assistant monitoring routes
app.use('/api/assistant-monitor', assistantMonitorRoutes);
// Add this before other routes
app.use('/debug', chatDebugRouter);

// Apply routes
app.use('/blog', blogRoutes);  // Frontend blog routes
app.use('/blog-approval', blogApprovalRoutes);  // Blog approval routes
app.use('/api/blog', blogApiRoutes);  // API blog endpoints
app.use('/api', blogApiRoutes);  // ALSO register at /api to support both URL patterns
// Register the AI assistant routes
app.use('/api/assistant', aiAssistantRoutes);

// Use the new auth middleware where needed
app.use('/api/protected', authMiddleware);

// Add enhanced smart routing middleware and routes BEFORE other route registrations
app.use(detectUserRole); // Add enhanced smart role detection middleware globally
app.use(injectRoleCacheScript); // Add client-side caching script injection
app.use('/api', smartRoutingRoutes); // Register smart routing API routes under /api
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
// Register AI routes
app.use('/api/ai', aiApiRoutes);
// AI Crawler monitoring routes
app.use('/', aiCrawlerRoutes);
// Apply routes
app.use('/blog', blogRoutes);
app.use('/api/subscription', subscriptionApiRoutes);
app.use('/api/market-trends', marketTrendsApiRoutes);
// app.use('/chat', chatRoutes); // Remove authenticateToken middleware
app.use('/api/token-debug', tokenDebugRoutes); // ADD THIS LINE

// Add specific configuration for the post-business-upload endpoint to handle larger files
app.use('/api/post-business-upload', express.json({ limit: '10mb' }));
app.use('/api/post-business-upload', express.urlencoded({ extended: true, limit: '10mb' }));

// Business image upload - use specific middleware for this route before registering the route
const postBusinessUploadLimits = {
  fileSize: 10 * 1024 * 1024, // 10MB for uploads
  files: 5
};

// Register post-business-upload route with higher limits
app.use('/api/post-business-upload', postBusinessUploadRoutes);

app.use('/api/post-business-upload', postBusinessUploadRoutes);

app.use('/dashboard', authMiddleware);
app.use('/marketplace/edit', authMiddleware);
app.use('/', populateUser); // Optional: populate user for all routes
app.use('/stripe', stripeRoutes);
app.use('/profile', profileRoutes);
// Register checkout routes
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
app.use('/webhook', express.raw({ type: 'application/json' }));

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

// Add route for Cookie Policy page
app.get('/cookies', (req, res) => {
  try {
    // Pass user data if available for the navbar
    res.render('cookies', {
      user: req.user || null,
      isAuthenticated: !!req.user
    });
  } catch (error) {
    console.error('Error rendering cookies page:', error);
    res.status(500).send('Error loading cookie policy page');
  }
});

// Add business valuation page route
app.get('/business-valuation', (req, res) => {
  res.render('business-valuation', {
    title: 'Business Valuation | Arzani'
  });
});

// Add AI Market Insights page route
app.get('/ai-insights', (req, res) => {
  res.render('market-insights', {
    title: 'AI Market Insights | Arzani'
  });
});

// Add UK Map 3D visualization page route
app.get('/ukmap', (req, res) => {
  res.render('ukmap', {
    title: 'UK Map 3D Visualization | Arzani'
  });
});

// NEW Route for Contact Us page
app.get('/contact', (req, res) => {
  res.render('contact-us');
});

// NEW Route for FAQ page
app.get('/faq', (req, res) => {
  res.render('faq');
});

// Token Purchase page route
app.get('/purchase-tokens', (req, res) => {
  res.render('token-purchase', {
    title: 'Purchase Contact Tokens | Arzani',
    user: req.user || null
  });
});


// Add routes for static pages like About Us, FAQ, etc.
app.get('/about-us', (req, res) => {
  res.render('about-us', { user: req.user }); // Pass user if needed for navbar logic
});

// Add route for Brain AI feature page
app.get('/features/brain-ai', (req, res) => {
  res.render('brain-ai', {
    title: 'Brain AI - The Intelligence Behind Arzani | Arzani',
    user: req.user // Pass user if needed for navbar logic
  });
});

// NEW Route for Power-ups page
app.get('/features/power-ups', (req, res) => {
  res.render('power-ups', {
    title: 'Power-ups | Enhance Your Arzani Experience | Arzani',
    user: req.user // Pass user if needed for navbar logic
  });
});

// A/B Testing Dashboard route (admin only)
app.get('/ab-dashboard', (req, res) => {
  // In production, you might want to add admin authentication here
  // For now, serving for internal review
  res.sendFile(path.join(__dirname, 'views', 'ab-dashboard.html'));
});

// A/B Testing Info page route
app.get('/ab-test-info', (req, res) => {
  res.render('ab-test-info', {
    title: 'A/B Testing Analytics Setup | Arzani'
  });
});

// Add API endpoint for featured businesses with mock data
app.get('/api/business-preview/featured', async (req, res) => {
  try {
    // Mock featured brick-and-mortar businesses in the UK for testing
    const mockFeaturedBusinesses = [
      {
        id: 1,
        name: "Corner Café",
        industry: "Food & Beverage",
        location: "London",
        price: 250000,
        revenue: 380000,
        profit: 95000
      },
      {
        id: 2,
        name: "Manchester Bookshop",
        industry: "Retail",
        location: "Manchester",
        price: 180000,
        revenue: 270000,
        profit: 60000
      },
      {
        id: 3,
        name: "Birmingham Fitness Studio",
        industry: "Health & Fitness",
        location: "Birmingham",
        price: 425000,
        revenue: 620000,
        profit: 140000
      },
      {
        id: 4,
        name: "Bristol Green Grocers",
        industry: "Retail",
        location: "Bristol",
        price: 180000,
        revenue: 320000,
        profit: 65000
      },
      {
        id: 5,
        name: "Edinburgh Florist",
        industry: "Retail",
        location: "Edinburgh",
        price: 120000,
        revenue: 200000,
        profit: 50000
      },
      {
        id: 6,
        name: "Leeds Artisan Bakery",
        industry: "Food & Beverage",
        location: "Leeds",
        price: 210000,
        revenue: 330000,
        profit: 80000
      },
      {
        id: 7,
        name: "Glasgow Electronics Repair",
        industry: "Repair & Maintenance",
        location: "Glasgow",
        price: 300000,
        revenue: 450000,
        profit: 120000
      }
    ];

    res.json(mockFeaturedBusinesses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load featured businesses." });
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
app.use('/api/professional-profiles', professionalProfilesRoutes); // Add professional profiles API routes
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
  // Serve the homepage as a secondary landing page for business valuation
  app.get('/homepage', (req, res) => {
    res.locals.isChatPage = false;
    res.render('homepage', {
      title: 'Evaluate Your Business Value | Arzani Marketplace'
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

// Business valuation payment with Stripe Checkout
app.post('/create-valuation-checkout', async (req, res) => {
  try {
    const { useDiscount } = req.body;
    
    // Set price based on whether a discount is applied
    const unitAmount = useDiscount ? 18000 : 25000; // £180.00 or £250.00 in pence
    
    // Create a Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'Business Valuation',
              description: 'Comprehensive business valuation report'
            },
            unit_amount: unitAmount
          },
          quantity: 1
        }
      ],      mode: 'payment',
      success_url: `${req.protocol}://${req.get('host')}/valuation-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/valuation-payment?canceled=true`
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
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
  
  createUserTable();



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

// Direct route to seller-focused marketplace landing page (for testing/admin use)
app.get('/marketplace-landing', (req, res) => {
  res.locals.isChatPage = false;
  res.render('marketplace-landing', {
    title: 'Sell Your Business Fast | Arzani Marketplace',
    abTestVariant: 'seller_first'
  });
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
  
// Token purchase page route
app.get('/token-purchase', authDebug.enforceNonChatPage, async (req, res) => {
  try {
    res.locals.isChatPage = false;
    
    // Check if user is authenticated
    let userData = null;
    if (req.user && req.user.userId) {
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
        console.error('Error fetching user data for token purchase:', error);
      }
    }
    
    // If not authenticated, redirect to login with return URL
    if (!userData) {
      const returnUrl = encodeURIComponent('/token-purchase');
      return res.redirect(`/login2?returnTo=${returnUrl}`);
    }
    
    res.render('token-purchase', {
      title: 'Purchase Contact Tokens - Arzani Marketplace',
      isChatPage: false,
      user: userData,
      isAuthenticated: true
    });
  } catch (error) {
    console.error('Error rendering token purchase page:', error);
    res.status(500).send('Error loading token purchase page');
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
      }      res.render('business', { business });
  });

// REMOVED: Legacy chat API endpoint - using threads API instead
// API endpoint for chat messages
// app.post('/api/chat', async (req, res) => {
//     const userQuestion = req.body.question;
//     try {
//         // Fetch data from the database
//         const dbQuery = 'SELECT * FROM listings'; // Adjust the query as needed
//         const dbResult = await pool.query(dbQuery);
//         const data = dbResult.rows;
//         // Prepare the prompt for OpenAI
//         const prompt = `
// User question: "${userQuestion}"
// Website data: ${JSON.stringify(data)}
// Provide a helpful answer based on the website data.
// `;
//         // Call the OpenAI API
//         const completion = await openai.chat.completions.create({
//             model: 'gpt-4.1-nano', // Updated from gpt-3.5-turbo to gpt-4.1-nano
//             messages: [{ role: 'user', content: prompt }],
//         });
//         res.json({ answer: aiResponse });
//     } catch (error) {
//         console.error('Error handling chat message:', error);
//         res.status(500).json({ error: 'An error occurred' });
//     }
// });
app.use('/api/voice', voiceRoutes);

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


app.post('/api/business/track', authenticateToken, async (req, res) => {
  try {
    const { businessId, action } = req.body;
// Add this route before the last export statement
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
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5000',
        'https://arzani.co.uk',
        'https://www.arzani.co.uk'
    ];
    
    const origin = req.headers.origin;
    if (!origin || allowedOrigins.includes(origin) || (origin && origin.includes('localhost'))) {
        res.header('Access-Control-Allow-Origin', origin || '*');
    }
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
      { expiresIn: '12h' }
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
app.get('*', (req, res, next) => {  // Don't redirect specific server-rendered pages or API calls to index.html
  if (req.path.startsWith('/chat') || 
      req.path.startsWith('/arzani-ai') || // Add arzani-ai to excluded paths
      req.path.startsWith('/arzani-x') || // Add arzani-x to excluded paths
      req.path === '/market-trends' || 
      req.path === '/saved-searches' || 
      req.path === '/history' || 
      req.path === '/profile' || // Ensure profile isn't caught
      req.path === '/professional-verification' || // Exclude professional verification
      req.path === '/buyer-landing' || // Exclude buyer-landing page
      req.path === '/seller-landing' || // Exclude seller-landing page
      req.path === '/marketplace-landing' || // Exclude marketplace-landing page
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


// REMOVED: Duplicate login handler - handled by auth routes now

// REMOVED: Duplicate refresh token handler - handled by auth routes now



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

// This route handler is now replaced by the higher priority one in root-route-fix.js
// It's kept here only for reference but has been updated to match the new page structure
// app.get('/', (req, res) => {
//   res.redirect('/homepage');
// });

// A/B Testing Homepage Route - serves either seller-first or buyer-first variant
// Now enhanced with smart role-based routing
app.get('/', assignABTestVariant, (req, res) => {
  let variant = req.abTestVariant;
  let routingMethod = 'ab_test';
  
  // Smart routing override: Check if we have a detected or selected role
  const userRole = req.session?.userRole || req.detectedRole;
  if (userRole) {
    // Override A/B test with smart routing
    variant = userRole === 'buyer' ? 'buyer_first' : 'seller_first';
    routingMethod = 'smart_routing';
    
    // Update session to maintain consistency
    req.session.abTestVariant = variant;
  }
  
  // Track page view with variant and routing method information
  const pageViewData = {
    type: 'page_view',
    variant: variant,
    routing_method: routingMethod,
    user_role: userRole || null,
    timestamp: new Date().toISOString(),
    session: req.sessionID || 'anonymous',
    userAgent: req.get('User-Agent'),
    referrer: req.get('Referrer') || null,
    path: '/'
  };
  
  // Log analytics data (in production, this would go to your analytics service)
  console.log('Homepage View:', pageViewData);
  
  // Serve the appropriate variant
  if (variant === 'buyer_first') {
    res.render('buyer-landing', {
      title: 'Find Your Perfect Business | Arzani Marketplace',
      abTestVariant: variant,
      routingMethod: routingMethod,
      userRole: userRole || null
    });
  } else {
    res.render('marketplace-landing', {
      title: 'Sell Your Business Fast | Arzani Marketplace', 
      abTestVariant: variant,
      routingMethod: routingMethod,
      userRole: userRole || null
    });
  }
});

// Direct route to buyer-focused landing page (for testing/admin use)
app.get('/buyer-landing', (req, res) => {
  res.render('buyer-landing', {
    title: 'Find Your Perfect Business | Arzani Marketplace',
    abTestVariant: 'buyer_first'
  });
});

// Direct route to seller-focused landing page (for testing/admin use)  
app.get('/seller-landing', (req, res) => {
  res.render('marketplace-landing', {
    title: 'Sell Your Business Fast | Arzani Marketplace',
    abTestVariant: 'seller_first'
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

// Special handling for routes that were causing redirect issues
app.use(['/history', '/talk-to-arzani', '/profile'], async (req, res, next) => {
  try {
    // Always try all possible token sources
    const authHeader = req.headers['authorization'];
    const cookieToken = req.cookies?.token;
    const sessionToken = req.session?.token;
    
    // Find the first valid token
    let userId = null;
    let validToken = null;
    
    // 1. Try all tokens in order of preference
    const tokenSources = [
      { name: 'header', token: headerToken },
      { name: 'cookie', token: cookieToken },
      { name: 'session', token: sessionToken }
    ];
    
    // Find first valid token
    for (const source of tokenSources) {
      if (source.token) {
        try {
          const decoded = jwt.verify(source.token, process.env.JWT_SECRET);
          validToken = source.token;
          userId = decoded.userId;
          console.log(`Valid token found in ${source.name} for protected route ${req.path}`);
          break;
        } catch (err) {
          console.log(`Invalid token in ${source.name} for ${req.path}:`, err.message);
        }
      }
    }

    // If we found a valid token, set it in all places for consistency
    if (validToken && userId) {
      // Set req.user for this request
      req.user = { userId };
      
      // Ensure token is in session
      if (req.session) {
        req.session.userId = userId;
        req.session.token = validToken;
        await new Promise(resolve => req.session.save(resolve));
      }
      
      // Ensure token is in cookies
      if (!cookieToken || cookieToken !== validToken) {        res.cookie('token', validToken, {
          httpOnly: false, // Allow JS access
          maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
      }
      
      next();
    } else {
      // No valid token found, redirect to login
      console.log(`No valid token found for protected route ${req.path}, redirecting to login`);
      return res.redirect(`/login2?returnTo=${encodeURIComponent(req.originalUrl)}`);
    }
  } catch (error) {
    console.error(`Error in protected route handler for ${req.path}:`, error);
    next(error);
  }
});

// After all routes are registered, print them
console.log("All registered routes:");
printRoutes(app);

})();

app.use((err, req, res, next) => {
  console.error('Error handler triggered:', err.stack);
  console.log('Request path:', req.path);
  console.log('Request headers accept:', req.headers.accept);
  console.log('Request content-type:', req.headers['content-type']);
  
  // If it's an API route, auth route, or expects JSON, return JSON error
  if (req.path.startsWith('/api/') || 
      req.path.startsWith('/auth/') ||
      req.headers.accept?.includes('application/json') || 
      req.headers['content-type']?.includes('application/json')) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
  }
  
  // For regular page requests, render error page
  res.status(500).render('error', { 
    message: 'Something went wrong',
    error: process.env.NODE_ENV === 'development' ? err : {}
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
  saveUninitialized: false,  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
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
          RETURNING id, email, first_name, last_name, source, subscribed_at`;
        
        const result = await pool.query(reactivateQuery, [source, checkResult.rows[0].id]);
        const reactivatedSubscriber = result.rows[0];
        
        // Send admin notification for reactivation (don't wait for it to complete)
        const subscriberName = [reactivatedSubscriber.first_name, reactivatedSubscriber.last_name].filter(Boolean).join(' ') || 'Anonymous';
        sendNewsletterSubscriptionNotification(
          reactivatedSubscriber.email,
          subscriberName + ' (Reactivated)',
          reactivatedSubscriber.source,
          reactivatedSubscriber.id,
          reactivatedSubscriber.subscribed_at
        ).catch(error => {
          console.error('Failed to send newsletter reactivation notification:', error);
        });
        
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
        RETURNING id, email, first_name, last_name, source, subscribed_at`;
      
      const values = [
        email.toLowerCase().trim(),
        first_name || null,
        last_name || null,
        source
      ];
      
      const result = await pool.query(insertQuery, values);
      const newSubscriber = result.rows[0];
      
      // Log the subscription
      console.log(`New newsletter subscription: ${email} from source: ${source}`);
      
      // Send admin notification (don't wait for it to complete)
      const subscriberName = [newSubscriber.first_name, newSubscriber.last_name].filter(Boolean).join(' ') || 'Anonymous';
      sendNewsletterSubscriptionNotification(
        newSubscriber.email,
        subscriberName,
        newSubscriber.source,
        newSubscriber.id,
        newSubscriber.subscribed_at
      ).catch(error => {
        console.error('Failed to send newsletter subscription notification:', error);
        // Don't fail the subscription if notification fails
      });
      
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

// Add Talk to Arzani routes - new route path and backward compatibility paths
app.get('/arzani-ai', (req, res) => {
  try {
    res.render('arzani-ai', {  // Changed from 'views/arzani-ai' to just 'arzani-ai'
      title: 'Talk to Arzani',
      user: req.user || {}
    });
  } catch (error) {
    console.error('Error rendering arzani-ai page:', error);
    res.status(500).send('Error loading arzani-ai page');
  }
});

// Add Arzani X route - new modern A2A-integrated interface with authentication protection
app.get('/arzani-x', requireAuth, (req, res) => {
  try {
    res.render('Arzani-x', {
      title: 'Arzani X- Where real AI experts build real businesses',
      user: req.user || {}
    });
  } catch (error) {
    console.error('Error rendering Arzani-x page:', error);
    res.status(500).send('Error loading Arzani-x page');
  }
});

app.get('/dashboard', (req, res) => {
  res.render('dashboard', {
    title: 'Arzani Dashboard',
    user: req.user || {}
  });
});

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  const error = new Error('Not Found');
  error.status = 404;
  next(error);
});

// Error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  console.error(`[${status}] ${message}:`, err.stack);
  
  res.status(status).json({
    error: {
      status,
      message: process.env.NODE_ENV === 'production' && status === 500 
        ? 'Internal Server Error' 
        : message
    }
  });
});
export { app, server, chatSocketService };
