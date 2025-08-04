import express from 'express';
import marketTrendsRoutes from './markettrendsroutes.js';
import trendsRoutes from './trendsroutes.js';
// Import other API route files here
import jwt from 'jsonwebtoken';
import { authenticateUser, authenticateToken } from '../middleware/auth.js'; // Add this import
import pool from '../db.js'; // Add this import for database access


import multer from 'multer';
import { uploadToS3 } from '../utils/s3.js';

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
    // Get token from multiple possible sources
    const authHeader = req.headers['authorization'];
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const cookieToken = req.cookies?.token;
    const sessionToken = req.session?.token;
    
    // Try all available tokens in order of preference
    const token = headerToken || cookieToken || sessionToken;
    
    if (!token) {
      return res.status(401).json({ 
        valid: false, 
        error: 'No authentication token found'
      });
    }
    
    // Get userId from token
    const userId = await getUserIdFromToken(token);
    
    if (!userId) {
      return res.status(401).json({ 
        valid: false, 
        error: 'Invalid token'
      });
    }
    
    // Ensure token is stored in all places for consistency
    // This helps ensure token is available for subsequent requests
    if (req.session) {
      req.session.userId = userId;
      req.session.token = token;
      await new Promise(resolve => req.session.save(resolve));
    }
    
    // Set token cookie if it's not already set
    if (!cookieToken) {
      res.cookie('token', token, {
        httpOnly: false, // Allow JS access
        maxAge: 4 * 60 * 60 * 1000, // 4 hours
        path: '/',
        sameSite: 'lax'
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

// Enhanced token validation endpoint with improved security
router.get('/secure-verify-token', async (req, res) => {
  try {
    // Get token from Authorization header or secure cookie only
    const authHeader = req.headers['authorization'];
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const cookieToken = req.cookies?.token;
    
    // Only use header token or secure cookie - not session token
    const token = headerToken || cookieToken;
    
    if (!token) {
      return res.status(401).json({ 
        valid: false, 
        message: 'Authentication required' 
      });
    }
    
    // Get userId from token
    const userId = await getUserIdFromToken(token);
    
    if (!userId) {
      return res.status(401).json({ 
        valid: false, 
        message: 'Invalid or expired token' 
      });
    }
    
    // Store in session (server-side only)
    if (req.session) {
      req.session.userId = userId;
      await new Promise(resolve => req.session.save(resolve));
    }
    
    // Set secure token cookie if not present
    if (!cookieToken) {
      res.cookie('token', token, {
        httpOnly: true, // Make cookie inaccessible to JavaScript
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        maxAge: 4 * 60 * 60 * 1000, // 4 hours
        path: '/',
        sameSite: 'lax'
      });
    }
    
    // Return minimal response without exposing token details
    res.json({ 
      authenticated: true, 
      userId
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ 
      authenticated: false, 
      message: 'Authentication failed'
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

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// S3 upload endpoint for Dropzone
router.post('/s3-upload', authenticateUser, upload.single('file'), async (req, res) => {
  try {
    console.log('S3 upload request received');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }
    
    // Get user ID for folder organization
    const userId = req.session?.userId || req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    // Generate a unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    const originalName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${randomString}-${originalName}`;
    
    // Set S3 key with user ID in path
    const s3Key = `businesses/user-${userId}/${filename}`;
    
    // Get region from headers or use default
    const region = req.headers['x-aws-region'] || process.env.AWS_REGION || 'eu-west-2';
    const bucket = req.headers['x-aws-bucket'] || process.env.AWS_BUCKET_NAME || 'arzani-images1';
    
    console.log(`Uploading file to S3: ${s3Key} (${req.file.size} bytes)`);
    console.log(`Using region: ${region}, bucket: ${bucket}`);
    
    // Upload to S3
    const s3Url = await uploadToS3(req.file, s3Key, region, bucket);
    
    console.log('S3 upload successful:', s3Url);
    
    // Return success with the URL
    return res.json({
      success: true,
      url: s3Url,
      key: s3Key
    });
  } catch (error) {
    console.error('S3 upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Fix the S3 upload endpoint
router.post('/s3-upload', authenticateToken, async (req, res) => {
  console.log('S3 upload request received');
  
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    const file = req.files.file;
    const userId = req.user?.userId || 'anonymous';
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 10);
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
    const key = `businesses/user-${userId}/${timestamp}-${randomId}-${sanitizedFilename}`;
    
    console.log(`Uploading file to S3: ${key} (${file.size} bytes)`);
    
    // CRITICAL: Keep region and bucket as separate variables to avoid mixup
    const region = 'eu-west-2';
    const bucket = 'arzani-images1';
    
    console.log(`Using region: ${region}, bucket: ${bucket}`);
    
    // Pass parameters in the correct order
    const s3Url = await uploadToS3(
      file.data,        // file buffer
      key,              // key
      file.mimetype,    // content type
      region,           // region
      bucket            // bucket
    );
    
    return res.status(200).json({
      success: true,
      url: s3Url,
      key
    });
  } catch (error) {
    console.error('S3 upload error:', error);
    return res.status(500).json({
      success: false,
      error: `S3 upload failed: ${error.message || 'Unknown error'}`
    });
  }
});

// Fix the S3 upload handler to correctly order parameters
router.post('/s3-upload', authenticateToken, async (req, res) => {
  console.log('S3 upload request received');
  
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    const file = req.files.file;
    const userId = req.user?.userId || 'anonymous';
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 10);
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
    const key = `businesses/user-${userId}/${timestamp}-${randomId}-${sanitizedFilename}`;
    
    console.log(`Uploading file to S3: ${key} (${file.size} bytes)`);
    
    // FIX: Make sure to define region and bucket separately and correctly
    // Split the comma-separated values if present
    const region = (process.env.AWS_REGION || 'eu-west-2').split(',')[0].trim();
    const bucket = (process.env.AWS_BUCKET_NAME || 'arzani-images1').split(',')[0].trim();
    
    console.log(`Using region: ${region}, bucket: ${bucket}`);
    
    // Pass the parameters in the correct order
    const s3Url = await uploadToS3(
      file.data,             // fileBuffer
      key,                   // key
      file.mimetype,         // contentType
      region,                // region (correct parameter)
      bucket                 // bucket (correct parameter)
    );
    
    return res.status(200).json({
      success: true,
      url: s3Url,
      key
    });
  } catch (error) {
    console.error('S3 upload error:', error);
    return res.status(500).json({
      success: false,
      error: `S3 upload failed: ${error.message || 'Unknown error'}`
    });
  }
});

// Fix the S3 upload handler endpoint
router.post('/upload-to-s3', authenticateToken, async (req, res) => {
  console.log('S3 upload request received');
  
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    const file = req.files.file;
    const userId = req.user?.userId || 'anonymous';
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 10);
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
    const key = `businesses/user-${userId}/${timestamp}-${randomId}-${sanitizedFilename}`;
    
    console.log(`Uploading file to S3: ${key} (${file.size} bytes)`);
    
    // IMPORTANT: Use single values for region and bucket
    const region = process.env.AWS_REGION?.trim() || 'eu-west-2';
    const bucket = process.env.AWS_BUCKET_NAME?.trim() || 'arzani-images1';
    
    console.log(`Using region: ${region}, bucket: ${bucket}`);
    
    // FIX: Correct parameter order: fileBuffer, key, contentType, region, bucket
    const s3Url = await uploadToS3(
      file.data,               // file buffer
      key,                     // S3 object key
      file.mimetype,           // content type
      region,                  // AWS region
      bucket                   // S3 bucket name
    );
    
    return res.status(200).json({
      success: true,
      url: s3Url,
      key
    });
  } catch (error) {
    console.error('S3 upload error:', error);
    return res.status(500).json({
      success: false,
      error: `S3 upload failed: ${error.message || 'Unknown error'}`
    });
  }
});

// Update the S3 upload endpoint
router.post('/s3-upload', authenticateToken, async (req, res) => {
  console.log('S3 upload request received');
  
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    const file = req.files.file;
    const userId = req.user?.userId || 'anonymous';
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 10);
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
    const key = `businesses/user-${userId}/${timestamp}-${randomId}-${sanitizedFilename}`;
    
    console.log(`Uploading file to S3: ${key} (${file.size} bytes)`);
    
    // Important: Use single values for region and bucket
    const region = process.env.AWS_REGION?.trim() || 'eu-west-2';
    const bucket = process.env.AWS_BUCKET_NAME?.trim() || 'arzani-images1';
    
    console.log(`Using region: ${region}, bucket: ${bucket}`);
    
    // Pass the file object directly - our improved uploadToS3 function will handle it
    const s3Url = await uploadToS3(
      file,                    // Pass the entire file object
      key,                     // S3 object key  
      file.mimetype,           // content type
      region,                  // AWS region
      bucket                   // S3 bucket name
    );
    
    return res.status(200).json({
      success: true,
      url: s3Url,
      key
    });
  } catch (error) {
    console.error('S3 upload error:', error);
    return res.status(500).json({
      success: false,
      error: `S3 upload failed: ${error.message || 'Unknown error'}`
    });
  }
});

// Submit business endpoint with improved file handling
router.post('/submit-business', authenticateUser, upload.array('images', 5), async (req, res) => {
  try {
    console.log('Request debug:', {
      path: req.path,
      sessionID: req.sessionID,
      hasSession: !!req.session,
      sessionUserId: req.session?.userId,
      hasAuthHeader: !!req.headers.authorization,
      tokenPresent: !!req.token,
      files: req.files?.length || 0
    });
    
    console.log('Auth check for POST /api/submit-business');
    console.log('Database connected');
    console.log('Request: POST /api/submit-business');
    
    const businessData = req.body;
    console.log('Business data received:', businessData);
    
    // Process uploaded files or stock images
    let imageUrls = [];
    
    // FIXED: Check for stock images first
    if (businessData.useStockImages === 'true' || businessData.useStockImages === true) {
      console.log('Using stock images for this business');
      
      // Check for images array in JSON
      if (Array.isArray(businessData.images)) {
        imageUrls = businessData.images;
        console.log('Found images array in JSON body:', imageUrls);
      } 
      // Check for stockImageUrls[] in form data which comes as a single item or array
      else if (businessData['stockImageUrls[]']) {
        if (Array.isArray(businessData['stockImageUrls[]'])) {
          imageUrls = businessData['stockImageUrls[]'];
        } else {
          imageUrls = [businessData['stockImageUrls[]']];
        }
        console.log('Found stock image URLs in form data:', imageUrls);
      }
    }
    // If not using stock images, process uploaded files
    else if (req.files && req.files.length > 0) {
      console.log(`Processing ${req.files.length} uploaded files`);
      
      // Upload each file to S3
      const uploadPromises = req.files.map(async (file) => {
        try {
          // Generate S3 key
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substring(2, 10);
          const filename = `${timestamp}-${randomString}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const s3Key = `businesses/user-${req.session.userId}/${filename}`;
          
          // Upload to S3
          const s3Url = await uploadToS3(file, s3Key);
          console.log(`File uploaded to S3: ${s3Url}`);
          return s3Url;
        } catch (error) {
          console.error(`Error uploading file ${file.originalname} to S3:`, error);
          return null;
        }
      });
      
      // Wait for all uploads to complete
      const results = await Promise.all(uploadPromises);
      
      // Filter out failed uploads
      imageUrls = results.filter(url => url !== null);
      console.log(`Successfully uploaded ${imageUrls.length} of ${req.files.length} files`);
    }
    
    // Format images as a PostgreSQL array
    let imagesArray = '{}'; // Default empty array
    if (imageUrls.length > 0) {
      // FIXED: Properly escape URLs for PostgreSQL array
      imagesArray = '{' + imageUrls.map(url => `"${url.replace(/"/g, '\\"')}"`).join(',') + '}';
      console.log('Final images array for database:', imagesArray);
    } else {
      console.log('No images found in request');
    }
    
    // Build a comprehensive query with all possible fields
    const query = `
      INSERT INTO businesses (
        business_name, 
        description, 
        user_id, 
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
        years_in_operation,
        recurring_revenue_percentage,
        growth_rate,
        intellectual_property,
        website_traffic,
        social_media_followers,
        images,
        date_listed
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, NOW()
      ) RETURNING *
    `;
    
    // Prepare intellectual property as a PostgreSQL array
    let intellectualProperty = '{}'; // Default empty array
    if (businessData.intellectual_property || businessData.intellectualProperty) {
      const ipValue = businessData.intellectual_property || businessData.intellectualProperty;
      if (typeof ipValue === 'string') {
        intellectualProperty = '{' + 
          ipValue.split(',')
                 .map(item => `"${item.trim()}"`)
                 .filter(item => item !== '""')
                 .join(',') + 
          '}';
      }
    }
    
    // Handle field name mismatches and prepare values array 
    const values = [
      businessData.business_name || businessData.name || businessData.title || '', 
      businessData.description || '',
      req.session.userId,
      businessData.industry || 'Other',
      parseFloat(businessData.price) || 0,
      parseFloat(businessData.cash_flow || businessData.cashFlow) || 0,
      parseFloat(businessData.gross_revenue || businessData.grossRevenue) || 0,
      parseFloat(businessData.ebitda) || 0,
      parseFloat(businessData.inventory) || 0,
      parseFloat(businessData.sales_multiple || businessData.salesMultiple) || 0,
      parseFloat(businessData.profit_margin || businessData.profitMargin) || 0,
      parseFloat(businessData.debt_service || businessData.debtService) || 0,
      parseFloat(businessData.cash_on_cash || businessData.cashOnCash) || 0,
      parseFloat(businessData.down_payment || businessData.downPayment) || 0,
      businessData.location || '',
      parseFloat(businessData.ffe || businessData.ffE) || 0,
      parseInt(businessData.employees) || 0,
      businessData.reason_for_selling || businessData.reasonForSelling || '',
      parseInt(businessData.years_in_operation || businessData.yearsInOperation) || 0,
      parseFloat(businessData.recurring_revenue_percentage || businessData.recurringRevenue) || 0,
      parseFloat(businessData.growth_rate || businessData.growthRate) || 0,
      intellectualProperty,
      parseInt(businessData.website_traffic || businessData.websiteTraffic) || 0,
      parseInt(businessData.social_media_followers || businessData.socialFollowers) || 0,
      imagesArray // Use the S3 image URLs
    ];
    
    console.log('Executing query with values:', values);
    
    // Insert business into database with all fields
    const result = await pool.query(query, values);
    
    // Get the complete business object directly from the insert result
    const business = result.rows[0];
    console.log('Query result:', { id: business.id });
    
    // Make sure we're actually sending back the business object
    console.log('Sending business object:', business);
    
    // Return the complete business object
    res.json({ 
      success: true, 
      business: business,
      images: imageUrls
    });
  } catch (error) {
    console.error('Error submitting business:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Update the submit business endpoint where it processes files
router.post('/submit-business', upload.array('images', 10), async (req, res) => {
  console.log('Auth check for POST /api/submit-business');
  try {
    // ...existing authentication code...
    
    console.log('Business data received:', req.body);
    
    // Access files from req.files (multer array)
    if (req.files && req.files.length > 0) {
      console.log(`Processing ${req.files.length} uploaded files`);
      
      // CRITICAL: Fix parameter passing for S3 upload
      const imageUrls = await Promise.all(req.files.map(async (file) => {
        try {
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2, 6);
          const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '-');
          const key = `businesses/user-${userId}/${timestamp}-${randomId}-${sanitizedFilename}`;
          
          // CRITICAL: Hardcode the correct values - avoid using environment variables for now
          const region = 'eu-west-2';
          const bucket = 'arzani-images1';
          
          // CRITICAL: Make sure we have a content type - use a fallback if file.mimetype is missing
          const contentType = file.mimetype || getMimeTypeFromFilename(file.originalname) || 'application/octet-stream';
          
          // Pass parameters in the correct order
          const s3Url = await uploadToS3(
            file.buffer,     // file buffer
            key,             // key
            contentType,     // content type
            region,          // region
            bucket           // bucket
          );
          
          return s3Url;
        } catch (error) {
          console.error(`Error uploading file ${file.originalname} to S3:`, error);
          return null;
        }
      }));
      
      // Filter out any failed uploads
      const successfulUploads = imageUrls.filter(url => url !== null);
      console.log(`Successfully uploaded ${successfulUploads.length} of ${req.files.length} files`);
      
      // If at least some uploads succeeded, add them to the business data
      if (successfulUploads.length > 0) {
        images = successfulUploads;
      } else {
        console.warn('No images found in request');
      }
    }
    
    // ...existing code to save business to database...
  } catch (error) {
    // ...existing error handling...
  }
});

/**
 * Helper function to determine content type from filename
 * @param {string} filename - The filename
 * @returns {string} - MIME type or undefined
 */
function getMimeTypeFromFilename(filename) {
  if (!filename) return undefined;
  
  const extension = filename.split('.').pop().toLowerCase();
  
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}

export default router;
