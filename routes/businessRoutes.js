import express from 'express';
import { authenticateToken, businessAuth } from '../middleware/auth.js';
import { uploadToS3, getPublicUrl } from '../utils/s3.js';
import multer from 'multer';
import pool from './db.js';
// ...rest of your code...

// Replace disk storage with memory storage for S3 upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Max 5 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const isValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const isValidMime = file.mimetype.startsWith('image/');
    
    if (isValid && isValidMime) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPG and PNG files are allowed.'), false);
    }
  }
});

function convertS3UrlToHttps(s3Url, region = 'eu-west-2') {
    if (!s3Url) return '';
    if (s3Url.startsWith('http')) return s3Url;
    if (s3Url.startsWith('s3://')) {
        const path = s3Url.slice(5); // Remove 's3://'
        return `https://${process.env.AWS_BUCKET_NAME}.s3.${region}.amazonaws.com/${path}`;
    }
    return s3Url;
}

// Add helper function for sanitizing numeric values to ensure consistent handling
function sanitizeNumeric(value) {
  if (!value) return null;
  const sanitized = value.toString().replace(/[^0-9.-]/g, '');
  return sanitized ? sanitized : null;
}

// Update the business submission route for better error handling and image upload
router.post('/submit-business', validateToken, upload.array('images', 5), async (req, res) => {
    try {
        // Log the incoming request
        console.log('Received business submission:', {
            body: {
                business_name: req.body.business_name,
                industry: req.body.industry,
                price: req.body.price,
                location: req.body.location
            },
            files: req.files?.length || 0,
            user: req.user?.userId
        });

        if (!req.user?.userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Validate required fields
        const requiredFields = ['business_name', 'industry', 'price', 'description'];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({ 
                error: 'Missing required fields', 
                fields: missingFields 
            });
        }

        // Validate images
        if (!req.files || req.files.length < 3) {
            return res.status(400).json({ error: 'Please upload at least 3 images' });
        }

        // Get AWS region from request headers or form data, default to London (eu-west-2)
        const region = req.headers['x-aws-region'] || req.body.awsRegion || process.env.AWS_REGION || 'eu-west-2';
        const bucketName = req.headers['x-aws-bucket'] || req.body.awsBucket || process.env.AWS_BUCKET_NAME || 'arzani-images1';
        
        console.log(`Using S3 region: ${region} and bucket: ${bucketName} for upload`);

        // Generate a unique business ID using timestamp
        const businessId = Date.now();
        const s3Urls = [];
        const uploadErrors = [];

        // Attempt to upload each file to S3
        for (const file of req.files) {
            try {
                // Enhanced file validation
                if (!file.buffer || file.buffer.length === 0) {
                    throw new Error('Empty file buffer');
                }
                
                if (!file.mimetype || !file.mimetype.startsWith('image/')) {
                    throw new Error('Invalid file type: ' + (file.mimetype || 'unknown'));
                }
                
                // Get sanitized filename or use original filename if not available
                const sanitizedFilename = file.s3key || file.filename || file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
                
                // Create S3 key with business ID for organization
                const s3Key = `businesses/${businessId}/${sanitizedFilename}`;
                
                // Upload to S3 with detailed logging
                console.log(`Uploading file: ${sanitizedFilename}, size: ${file.size} bytes, type: ${file.mimetype}`);
                const s3Url = await uploadToS3(file, s3Key, region, bucketName);
                console.log(`Upload successful, URL: ${s3Url}`);
                
                // Verify the URL is correctly formatted
                if (!s3Url || !s3Url.startsWith('http')) {
                    throw new Error(`Invalid S3 URL returned: ${s3Url}`);
                }
                
                s3Urls.push(s3Url);
            } catch (uploadError) {
                console.error('S3 upload error:', uploadError);
                uploadErrors.push(`Failed to upload ${file.originalname}: ${uploadError.message}`);
            }
        }

        // Check if we have enough successful uploads
        if (s3Urls.length < 3) {
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to upload required minimum of 3 images',
                errors: uploadErrors
            });
        }

        // Log the successful uploads
        console.log(`Successfully uploaded ${s3Urls.length} images:`, s3Urls);

        // Ensure numeric fields are properly handled
        const ensureNumeric = (value, defaultValue = 0) => {
            if (value === undefined || value === null || value === '') {
                return defaultValue;
            }
            const parsed = parseFloat(value);
            return isNaN(parsed) ? defaultValue : parsed;
        };

        // Check for presence of important fields before proceeding
        console.log('Business name:', req.body.business_name);
        console.log('Price:', req.body.price);
        console.log('Images array:', s3Urls);

        if (!s3Urls.length) {
            throw new Error('Failed to upload any images');
        }

        // Log both camelCase and snake_case fields for debugging
        console.log('Form fields received:');
        for (const key in req.body) {
            console.log(`${key}: ${req.body[key]}`);
        }

        // Helper function to get values from either naming convention
        const getFieldValue = (snakeCaseKey, camelCaseKey, defaultValue = 0) => {
            // Check both naming formats
            const value = req.body[snakeCaseKey] !== undefined ? req.body[snakeCaseKey] : 
                         (req.body[camelCaseKey] !== undefined ? req.body[camelCaseKey] : null);
            
            // For numeric fields, ensure we have a proper number
            if (value === undefined || value === null || value === '') {
                return defaultValue;
            }
            
            // Try to parse as number if it should be numeric
            if (typeof defaultValue === 'number') {
                const num = parseFloat(value);
                return isNaN(num) ? defaultValue : num;
            }
            
            return value;
        };

        // Prepare values with consistent field handling
        const values = [
            req.user.userId,
            getFieldValue('business_name', 'businessName', 'Untitled Business'),
            getFieldValue('industry', 'industry', 'Other'),
            getFieldValue('price', 'price', 0),
            getFieldValue('description', 'description', ''),
            getFieldValue('cash_flow', 'cashFlow', 0),
            getFieldValue('gross_revenue', 'grossRevenue', 0),
            getFieldValue('ebitda', 'ebitda', 0),
            getFieldValue('inventory', 'inventory', 0),
            getFieldValue('sales_multiple', 'salesMultiple', 0),
            getFieldValue('profit_margin', 'profitMargin', 0),
            getFieldValue('debt_service', 'debtService', 0),
            getFieldValue('cash_on_cash', 'cashOnCash', 0),
            getFieldValue('down_payment', 'downPayment', 0),
            getFieldValue('location', 'location', 'United Kingdom'),
            getFieldValue('ffe', 'ffE', 0),
            parseInt(getFieldValue('employees', 'employees', '0')),
            getFieldValue('reason_for_selling', 'reasonForSelling', ''),
            s3Urls,
            parseInt(getFieldValue('years_in_operation', 'yearsInOperation', '0')),
            getFieldValue('recurring_revenue_percentage', 'recurringRevenue', 0),
            getFieldValue('growth_rate', 'growthRate', 0),
            getFieldValue('intellectual_property', 'intellectualProperty', null) ?
                getFieldValue('intellectual_property', 'intellectualProperty').split(',').map(ip => ip.trim()) : null,
            parseInt(getFieldValue('website_traffic', 'websiteTraffic', '0')),
            parseInt(getFieldValue('social_media_followers', 'socialFollowers', '0')),
            true // is_active
        ];

        // Log prepared values
        console.log('Prepared values for database:');
        const fieldNames = [
            'user_id', 'business_name', 'industry', 'price', 'description',
            'cash_flow', 'gross_revenue', 'ebitda', 'inventory', 'sales_multiple',
            'profit_margin', 'debt_service', 'cash_on_cash', 'down_payment', 'location',
            'ffe', 'employees', 'reason_for_selling', 'images', 'years_in_operation',
            'recurring_revenue_percentage', 'growth_rate', 'intellectual_property',
            'website_traffic', 'social_media_followers', 'is_active'
        ];
        fieldNames.forEach((field, index) => {
            if (field !== 'images') {
                console.log(`${field}: ${values[index]}`);
            } else {
                console.log(`${field}: [${values[index].length} URLs]`);
            }
        });

        // Insert business into database with images as a native PostgreSQL array
        const query = `
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
                recurring_revenue_percentage,
                growth_rate,
                intellectual_property,
                website_traffic,
                social_media_followers,
                is_active,
                date_listed
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                $21, $22, $23, $24, $25, $26, NOW()
            ) RETURNING id, business_name, images;
        `;

        console.log('Running SQL query with values:', values);
        const result = await pool.query(query, values);
        console.log('Query result:', result.rows[0]);

        // Explicitly construct the business object to ensure it has the expected structure
        const business = {
            id: result.rows[0]?.id,
            business_name: result.rows[0]?.business_name,
            images: result.rows[0]?.images || [],
            user_id: req.user.userId
        };

        // Debug log to verify the business object
        console.log('Constructed business object for response:', business);
        
        // Ensure the business object has an id before returning
        if (!business.id) {
            throw new Error('Database returned a result but no business ID was found');
        }

        // Return success with the new business ID and image URLs
        res.status(200).json({
            success: true,
            business: business,
            images: s3Urls,
            uploadErrors: uploadErrors.length > 0 ? uploadErrors : undefined
        });

    } catch (error) {
        console.error('Error creating business:', error);
        res.status(500).json({
            error: 'Failed to create business listing',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Get business listings with S3 URLs
router.get('/api/business/listings', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM businesses ORDER BY created_at DESC');
    
    // Transform the data to ensure clean S3 URLs
    const businesses = rows.map(business => ({
      ...business,
      images: business.images.map(image => {
        if (image.startsWith('http')) return image;
        if (image.startsWith('/uploads/')) {
          // Clean up any legacy /uploads/ URLs
          const s3Part = image.substring(image.indexOf('https://'));
          return s3Part || image;
        }
        // For regular filenames, construct the S3 URL using the default region (London)
        return `https://arzani-images1.s3.eu-west-2.amazonaws.com/businesses/${business.id}/${image}`;
      })
    }));

    res.json({ businesses });
  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ...existing routes...
