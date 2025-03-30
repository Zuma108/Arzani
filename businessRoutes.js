import { validateEmail, validatePhone } from './utils/validation.js';
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import sgMail from '@sendgrid/mail';
import pool from './db.js';
import jwt from 'jsonwebtoken'; // Add this import
import fs from 'fs'; // Add this import
import valuationService from './services/valuationService.js'; // Add this import
import { uploadToS3 } from './utils/s3.js'; // Make sure this import is present
import bcrypt from 'bcrypt'; // Add this import for password hashing

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// Add this helper function to get userId from either token or session
async function getUserId(req) {
    // First try to get from session
    if (req.session?.userId) {
        return req.session.userId;
    }

    // Then try to get from token
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // Verify user exists in database
            const userCheck = await pool.query(
                'SELECT id FROM users WHERE id = $1',
                [decoded.userId]
            );
            if (userCheck.rows.length > 0) {
                // Update session with userId
                req.session.userId = decoded.userId;
                await new Promise(resolve => req.session.save(resolve));
                return decoded.userId;
            }
        } catch (error) {
            console.error('Token verification error:', error);
        }
    }

    return null;
}

// Add this helper function at the top with other imports
function sanitizeNumeric(value) {
    if (!value) return 0;
    // Remove currency symbols, commas, and spaces, then convert to number
    return parseFloat(value.toString().replace(/[£$,\s]/g, '')) || 0;
}

// Update storage configuration to use memory storage instead of disk storage
const storage = multer.memoryStorage();

// Update file filter to properly validate images
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const isValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const isValidMime = file.mimetype.startsWith('image/');
    
    if (isValid && isValidMime) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPG and PNG files are allowed.'), false);
    }
};

const upload = multer({
    storage: storage, // Changed from disk to memory storage
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 5 // Maximum 5 files
    }
});

// Add authentication middleware
const authCheck = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};


// Simplify validateToken middleware
const validateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        
        if (!authHeader?.startsWith('Bearer ')) {
            console.log('Missing or invalid auth header');
            return res.status(401).json({ error: 'Authentication required' });
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
                console.log('User not found in database:', decoded.userId);
                return res.status(401).json({ error: 'User not found' });
            }

            // Set both user and session
            req.user = { userId: decoded.userId };
            req.session.userId = decoded.userId;
            await new Promise(resolve => req.session.save(resolve));

            console.log('Auth successful:', {
                userId: decoded.userId,
                sessionId: req.sessionID
            });

            next();
        } catch (error) {
            console.error('Token validation error:', error);
            return res.status(401).json({ error: 'Invalid token' });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
};

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected:', res.rows[0]);
  }
});

// Update base route path - no /api prefix
router.post('/submit-business', validateToken, upload.array('images', 5), async (req, res) => {
    try {
        // Log the incoming request
        console.log('Received business submission:', {
            body: Object.keys(req.body), // Log keys to avoid logging sensitive data
            files: req.files?.length || 0,
            user: req.user,
            imageUrls: req.body.imageUrls ? 'present' : 'missing'
        });

        // Enhanced user authentication check
        if (!req.user?.userId) {
            console.error('Authentication error: No userId in req.user object', { 
                session: req.session,
                authHeader: req.headers['authorization'] ? 'present' : 'missing'
            });
            return res.status(401).json({ error: 'Authentication required' });
        }

        console.log('Authentication confirmed for user:', req.user.userId);

        // Validate required fields with proper error messages
        const requiredFields = [
            'business_name',
            'industry',
            'price',
            'description',
            'location',
            'gross_revenue',
            'employees',
            'years_in_operation'
        ];

        const missingFields = requiredFields.filter(field => !req.body[field]);
        if (missingFields.length > 0) {
            return res.status(400).json({
                error: 'Missing required fields',
                missingFields: missingFields
            });
        }

        // Validate images
        if (!req.files || req.files.length < 3) {
            return res.status(400).json({ error: 'Please upload at least 3 images' });
        }

        // Add a request ID to prevent duplicate processing
        const requestId = `${req.user.userId}-${Date.now()}`;
        
        // Check if this request has already been processed
        const duplicateCheck = await pool.query(
            'SELECT id FROM upload_requests WHERE request_id = $1 LIMIT 1',
            [requestId]
        );
        
        if (duplicateCheck.rows.length > 0) {
            return res.status(409).json({ error: 'Duplicate submission detected' });
        }
        
        // Record this request to prevent duplicates
        await pool.query(
            'INSERT INTO upload_requests (request_id, user_id, created_at) VALUES ($1, $2, NOW())',
            [requestId, req.user.userId]
        );

        // Deduplicate files by their content hash
        const processedFiles = new Map();
        const filesToUpload = req.files.filter(file => {
            // Create a simple hash of the file content (first few bytes)
            const contentHash = Buffer.from(file.buffer.slice(0, 100)).toString('hex');
            if (processedFiles.has(contentHash)) {
                return false; // Skip duplicate
            }
            processedFiles.set(contentHash, file);
            return true;
        });
        
        // Upload images to S3 and get their URLs
        const s3UploadPromises = req.files.map(async (file) => {
            try {
                // Create unique filename
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const ext = path.extname(file.originalname).toLowerCase();
                const filename = `business-${uniqueSuffix}${ext}`;
                
                // Create S3 key - organize by business owner ID for better organization
                const s3Key = `businesses/${req.user.userId}/${filename}`;
                
                // Get region and bucket from request headers or environment variables
                const region = req.headers['x-aws-region'] || process.env.AWS_REGION || 'eu-west-2';
                const bucket = req.headers['x-aws-bucket'] || process.env.AWS_BUCKET_NAME || 'arzani-images1';
                
                console.log(`Uploading ${file.originalname} to S3: ${region}/${bucket}/${s3Key}`);
                
                // Upload to S3 - make sure parameters are in the right order
                const s3Url = await uploadToS3(file, s3Key, region, bucket);
                
                return {
                    filename: filename,
                    url: s3Url
                };
            } catch (error) {
                console.error(`Error uploading file ${file.originalname}:`, error);
                throw error; // Re-throw to be caught by Promise.all
            }
        });

        // Wait for all uploads to complete or fail
        let uploadedImages;
        try {
            uploadedImages = await Promise.all(s3UploadPromises);
        } catch (uploadError) {
            console.error('S3 upload error:', uploadError);
            return res.status(500).json({ 
                error: 'Failed to upload images to S3',
                message: uploadError.message
            });
        }
        
        // Store S3 URLs in the database
        const imageUrls = uploadedImages.map(img => img.url);
        
        console.log(`Successfully uploaded ${imageUrls.length} images to S3`);

        // Map request fields to database column names, handling different naming conventions
        let business_name = req.body.business_name || req.body.title;
        
        // Explicitly log the user_id being used
        console.log('Using user_id for submission:', req.user.userId);
        
        // Prepare values with proper sanitization
        const values = [
            req.user.userId,  // user_id - Ensure this value is correct
            business_name,    // business_name
            req.body.industry,
            sanitizeNumeric(req.body.price),
            req.body.description,
            sanitizeNumeric(req.body.cash_flow),
            sanitizeNumeric(req.body.gross_revenue),
            sanitizeNumeric(req.body.ebitda),
            sanitizeNumeric(req.body.inventory),
            sanitizeNumeric(req.body.sales_multiple),
            sanitizeNumeric(req.body.profit_margin),
            sanitizeNumeric(req.body.debt_service),
            sanitizeNumeric(req.body.cash_on_cash),
            sanitizeNumeric(req.body.down_payment),
            req.body.location,
            sanitizeNumeric(req.body.ffe), // Fix for FFE
            parseInt(req.body.employees) || 0,
            req.body.reason_for_selling,
            imageUrls, // Use S3 URLs instead of local filenames
            parseInt(req.body.years_in_operation) || 0
        ];

        // Output all values for debugging
        console.log('Database insertion values:', {
            user_id: values[0],
            business_name: values[1],
            // Add other important fields here
        });
        
        // Insert into database
        const result = await pool.query(`
            INSERT INTO businesses (
                user_id,
                business_name,
                industry,
                price,
                description,
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
                images,
                years_in_operation,
                date_listed
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                NOW()
            ) RETURNING *
        `, values);

        // Log the inserted business for debugging
        console.log('Business created successfully with ID:', result.rows[0].id);
        console.log('User ID in created business:', result.rows[0].user_id);

        // Return a consistently formatted success response
        res.status(200).json({
            success: true,
            business: result.rows[0]
        });

    } catch (error) {
        console.error('Error creating business:', error);
        res.status(500).json({
            error: 'Failed to create business listing',
            message: error.message,
            detail: error.detail,
            code: error.code
        });
    }
});

// Update upload route for S3
router.post('/upload', validateToken, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Upload each file to S3
    const uploadPromises = req.files.map(async (file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `temp-${uniqueSuffix}${ext}`;
      const s3Key = `temp-uploads/${filename}`;
      
      // Upload to S3
      const s3Url = await uploadToS3(file, s3Key);
      
      return {
        filename: filename,
        path: s3Url
      };
    });

    const fileUrls = await Promise.all(uploadPromises);

    res.json({
      success: true,
      files: fileUrls
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Add image fetch route
router.get('/image/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(__dirname, 'public', 'uploads', filename);
    
    if (!fs.existsSync(filepath)) {
        return res.status(404).send('Image not found');
    }
    
    res.sendFile(filepath);
});

// Update other routes to remove /business prefix
router.get('/business/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM businesses WHERE id = $1',
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch business' });
  }
});

router.get('/listings', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 12; // Items per page
  const offset = (page - 1) * limit;

  try {
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 1;

    // Build filter conditions
    if (req.query.location) {
      whereConditions.push(`LOWER(location) LIKE LOWER($${paramCount})`);
      queryParams.push(`%${req.query.location}%`);
      paramCount++;
    }

    if (req.query.industries) {
      whereConditions.push(`industry = ANY($${paramCount}::text[])`);
      queryParams.push(req.query.industries.split(','));
      paramCount++;
    }

    if (req.query.priceMin) {
      whereConditions.push(`CAST(price AS numeric) >= $${paramCount}::numeric`);
      queryParams.push(req.query.priceMin);
      paramCount++;
    }

    if (req.query.priceMax) {
      whereConditions.push(`CAST(price AS numeric) <= $${paramCount}::numeric`);
      queryParams.push(req.query.priceMax);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Get total count first
    const countQuery = `
      SELECT COUNT(*) 
      FROM businesses 
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    // Add pagination parameters
    queryParams.push(limit, offset);

    // Main query with pagination
    const query = `
      SELECT 
        id, 
        business_name,
        industry,
        CAST(price AS numeric) as price,
        description,
        images,
        date_listed,
        location,
        CAST(gross_revenue AS numeric) as gross_revenue,
        CAST(cash_flow AS numeric) as cash_flow
      FROM businesses 
      ${whereClause}
      ORDER BY date_listed DESC 
      LIMIT $${paramCount} 
      OFFSET $${paramCount + 1}
    `;

    const result = await pool.query(query, queryParams);

    res.json({
      businesses: result.rows,
      totalPages,
      currentPage: page,
      totalCount
    });

  } catch (error) {
    console.error('Error details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch businesses',
      details: error.message 
    });
  }
});

function renderPaginationControls(currentPage, totalPages) {
  const paginationContainer = document.getElementById('pagination-controls');
  paginationContainer.innerHTML = ''; // Clear existing controls

  // Previous Button
  if (currentPage > 1) {
    const prevButton = document.createElement('button');
    prevButton.textContent = 'Previous';
    prevButton.onclick = () => loadPage(currentPage - 1);
    paginationContainer.appendChild(prevButton);
  }

  // Page Numbers
  for (let i = 1; i <= totalPages; i++) {
    const pageButton = document.createElement('button');
    pageButton.textContent = i;
    if (i === currentPage) {
      pageButton.disabled = true; // Disable current page button
    } else {
      pageButton.onclick = () => loadPage(i);
    }
    paginationContainer.appendChild(pageButton);
  }

  // Next Button
  if (currentPage < totalPages) {
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next';
    nextButton.onclick = () => loadPage(currentPage + 1);
    paginationContainer.appendChild(nextButton);
  }
}

function loadPage(pageNumber) {
  // Fetch and render businesses for the specified page
  fetch(`/api/business/listings?page=${pageNumber}`)
    .then((response) => response.json())
    .then((data) => {
      const { businesses, totalPages } = data;
      renderBusinesses(businesses);
      renderPaginationControls(pageNumber, totalPages);
    })
    .catch((error) => {
      console.error('Error fetching businesses:', error);
    });
}



// Configure SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const emailTemplate = {
  ownerNotification: (data) => ({
    to: data.ownerEmail,
    from: {
      email: 'no-reply@arzani.co.uk',
      name: 'Arzani Marketplace'
    },
    subject: `New Inquiry: ${data.businessName}`,
    templateId: 'd-cb4f5efd5679464994f937b80687e3b1',
    dynamicTemplateData: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone || 'Not provided',
      timeframe: data.timeframe || 'Not specified',
      message: data.message || 'No message provided',
      businessName: data.businessName,
      year: new Date().getFullYear()
    }
  }),
  
  inquirerConfirmation: (data) => ({
    to: data.email,
    from: {
      email: 'no-reply@arzani.co.uk',
      name: 'Arzani Marketplace'
    },
    subject: `${data.businessName} Inquiry Received`,
    templateId: 'd-76b6bddff98e4b8c9390a80304ca2484',
    dynamicTemplateData: {
      firstName: data.firstName,
      businessName: data.businessName,
      year: new Date().getFullYear()
    }
  })
};

router.post('/contact-seller', async (req, res) => {
  try {
    // Log the incoming request for debugging
    console.log('Contact seller request received:', {
      businessId: req.body.businessId,
      email: req.body.email,
      // Don't log the entire body to avoid sensitive data in logs
      fields: Object.keys(req.body)
    });
    
    const {
      businessId,
      firstName,
      lastName,
      phone,
      email,
      timeframe,
      message,
      newsletter
    } = req.body;

    // Validate input
    if (!businessId || !firstName || !lastName || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (phone && !validatePhone(phone)) {
      return res.status(400).json({ error: 'Invalid phone format' });
    }

    // Get business details with owner email and user_id by joining with users table
    const businessResult = await pool.query(`
      SELECT b.business_name, b.user_id as owner_id, u.email as owner_email 
      FROM businesses b
      JOIN users u ON b.user_id = u.id
      WHERE b.id = $1
    `, [businessId]);

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const business = businessResult.rows[0];
    
    // Get or create user account for the inquirer
    let inquirerId;
    const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (userCheck.rows.length > 0) {
      // User exists
      inquirerId = userCheck.rows[0].id;
      console.log('Found existing user:', inquirerId);
    } else {
      // Create new user account for inquirer
      const newUserResult = await pool.query(`
        INSERT INTO users (email, username, created_at)
        VALUES ($1, $2, NOW())
        RETURNING id
      `, [email, `${firstName.toLowerCase()}_${Math.floor(Math.random() * 1000)}`]);
      
      inquirerId = newUserResult.rows[0].id;
      console.log('Created new user:', inquirerId);
    }

    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Save inquiry to database
      const inquiryResult = await client.query(`
        INSERT INTO business_inquiries 
        (business_id, first_name, last_name, phone, email, timeframe, message, newsletter, user_email)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        businessId, 
        firstName, 
        lastName, 
        phone, 
        email, 
        timeframe, 
        message, 
        newsletter || false,
        business.owner_email
      ]);
      
      const inquiryId = inquiryResult.rows[0].id;
      console.log('Created inquiry:', inquiryId);
      
      // Prepare and send emails
      const emailData = {
        firstName,
        lastName,
        email,
        phone,
        timeframe,
        message,
        businessName: business.business_name,
        ownerEmail: business.owner_email
      };

      console.log('Setting up emails to:', business.owner_email, 'and', email);
      
      // Send emails asynchronously but don't wait for them
      // This way if there's an email error, the conversation will still be created
      const emailPromises = [];
      
      // Owner notification email
      emailPromises.push(
        sgMail.send(emailTemplate.ownerNotification(emailData))
          .then(() => console.log('Owner notification email sent'))
          .catch(err => console.error('Owner email error:', err))
      );
      
      // Inquirer confirmation email
      emailPromises.push(
        sgMail.send(emailTemplate.inquirerConfirmation(emailData))
          .then(() => console.log('Inquirer confirmation email sent'))
          .catch(err => console.error('Inquirer email error:', err))
      );
      
      // Create a conversation between the inquirer and owner
      const initialChatMessage = `Hello, I'm interested in your business "${business.business_name}".
      
Timeframe: ${timeframe || 'Not specified'}
${message ? `\nMessage: ${message}` : ''}`;
      
      // Create conversation
      const conversationResult = await client.query(`
        INSERT INTO conversations (is_group_chat, business_id)
        VALUES (FALSE, $1)
        RETURNING id
      `, [businessId]);
      
      const conversationId = conversationResult.rows[0].id;
      console.log('Created conversation:', conversationId);
      
      // Check if inquirer and owner are the same person (prevent duplicate entries)
      if (inquirerId === business.owner_id) {
        // Only insert one record if it's the same person
        await client.query(`
          INSERT INTO conversation_participants (conversation_id, user_id, is_admin)
          VALUES ($1, $2, TRUE)
        `, [conversationId, business.owner_id]);
        
        // Add a system message noting this is a self-inquiry
        await client.query(`
          INSERT INTO messages (conversation_id, sender_id, content, is_system_message)
          VALUES ($1, $2, $3, TRUE)
        `, [conversationId, inquirerId, "Note: You inquired about your own business listing."]);
      } else {
        // Add both participants if they're different users
        await client.query(`
          INSERT INTO conversation_participants (conversation_id, user_id, is_admin)
          VALUES ($1, $2, FALSE), ($1, $3, TRUE)
        `, [conversationId, inquirerId, business.owner_id]);
      }
      
      // Add initial message
      await client.query(`
        INSERT INTO messages (conversation_id, sender_id, content)
        VALUES ($1, $2, $3)
      `, [conversationId, inquirerId, initialChatMessage]);
      
      // Update inquiry with conversation ID
      await client.query(`
        UPDATE business_inquiries SET conversation_id = $1 WHERE id = $2
      `, [conversationId, inquiryId]);
      
      await client.query('COMMIT');
      
      // Process the emails (don't wait for completion)
      Promise.all(emailPromises)
        .then(() => console.log('All emails sent successfully'))
        .catch(err => console.error('Error sending some emails:', err));
      
      // Return success response with conversation link
      res.status(200).json({
        success: true,
        message: 'Contact request sent successfully and conversation created',
        inquiryId,
        conversationId,
        chatUrl: `/chat?conversation=${conversationId}`
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error processing contact request:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to process contact request',
      message: process.env.NODE_ENV === 'production' ? error.message : undefined
    });
  }
});

router.get('/businesses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching business with ID:', id); // Debugging line
    const result = await pool.query('SELECT * FROM businesses WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      console.log('Business not found'); // Debugging line
      return res.status(404).send('Business not found');
    }
    const business = result.rows[0];
    console.log('Business found:', business); // Debugging line
    res.render('business_listing', { business }); // <-- Change to render 'business_listing'
  } catch (error) {
    console.error('Error fetching business:', error);
    res.status(500).send('Internal server error');
  }
});

// Update the syncAuth middleware
const syncAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token decoded successfully:', decoded);

        // Check if user exists in database
        const userCheck = await pool.query(
          'SELECT id FROM users WHERE id = $1',
          [decoded.userId]
        );

        if (userCheck.rows.length > 0) {
          req.session.userId = decoded.userId;
          await new Promise((resolve, reject) => {
            req.session.save((err) => {
              if (err) reject(err);
              resolve();
            });
          });
          console.log('Session updated:', {
            sessionId: req.sessionID,
            userId: req.session.userId
          });
        } else {
          console.log('User not found in database:', decoded.userId);
        }
      } catch (tokenError) {
        console.error('Token verification failed:', tokenError);
      }
    }
    next();
  } catch (error) {
    console.error('Auth sync error:', error);
    next();
  }
};

// HTML page route - keep at the original URL
router.get('/history', async (req, res) => {
  try {
    let userId;
    const authHeader = req.headers['authorization'];
    
    // First try to get user from token
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
        
        // Set userId in session
        req.session.userId = userId;
        await new Promise(resolve => req.session.save(resolve));
      } catch (error) {
        console.error('Token validation failed:', error);
      }
    }

    // If no valid token, try session
    if (!userId) {
      userId = req.session?.userId;
    }

    // Only redirect if no valid authentication found
    if (!userId) {
      console.log('No valid authentication found');
      return res.redirect('/login');
    }

    // Valid auth found, render history page
    res.render('history', {
      userId,
      history: [], // Initial empty state
      error: null
    });

  } catch (error) {
    console.error('History route error:', error);
    res.status(500).render('error', { 
      message: 'Failed to load history page',
      error: process.env.NODE_ENV === 'production' ? error.message : undefined
    });
  }
});

router.get('/checkout', (req, res) => {
  res.render('payment/checkout');
});

router.get('/success', (req, res) => {
  res.render('payment/success');
});

// Single token verification endpoint
router.get('/verify-token', async (req, res) => {
  const userId = await getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  res.json({ valid: true, userId });
});

// Add valuation endpoint
router.post('/calculate-valuation', validateToken, async (req, res) => {
    try {
        const businessData = {
            industry: req.body.industry,
            price: parseFloat(req.body.price),
            cashFlow: parseFloat(req.body.cash_flow),
            grossRevenue: parseFloat(req.body.gross_revenue),
            ebitda: parseFloat(req.body.ebitda),
            inventory: parseFloat(req.body.inventory),
            salesMultiple: parseFloat(req.body.sales_multiple),
            profitMargin: parseFloat(req.body.profit_margin),
            yearsInOperation: parseInt(req.body.years_in_operation),
            recurringRevenue: parseFloat(req.body.recurring_revenue),
            growthRate: parseFloat(req.body.growth_rate),
            location: req.body.location,
            employees: parseInt(req.body.employees)
        };

        const valuation = await valuationService.calculateValuation(businessData);
        const priceComparison = valuationService.validatePrice(businessData.price, valuation.valuationRange);

        res.json({
            success: true,
            valuation: valuation,
            priceComparison: priceComparison
        });

    } catch (error) {
        console.error('Valuation error:', error);
        res.status(500).json({
            error: 'Failed to calculate valuation',
            details: process.env.NODE_ENV === 'production' ? error.message : undefined
        });
    }
});

export default router;