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

function convertS3UrlToHttps(s3Url) {
    if (!s3Url) return '';
    if (s3Url.startsWith('http')) return s3Url;
    if (s3Url.startsWith('s3://')) {
        const path = s3Url.slice(5); // Remove 's3://'
        return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${path}`;
    }
    return s3Url;
}

router.post('/submit-business', validateToken, upload.array('images', 5), async (req, res) => {
    try {
        // Log the incoming request
        console.log('Received business submission:', {
            body: req.body,
            files: req.files?.length || 0,
            user: req.user
        });

        if (!req.user?.userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Validate required fields with proper error messages
        // ...existing validation code...

        // Validate images
        if (!req.files || req.files.length < 3) {
            return res.status(400).json({ error: 'Please upload at least 3 images' });
        }

        // Generate a unique business folder name using timestamp
        const businessId = Date.now();
        const s3Urls = [];

        // Upload each file to S3
        for (const file of req.files) {
            try {
                // Create S3 key with business ID for organization
                const s3Key = `businesses/${businessId}/${file.originalname}`;
                const s3Url = await uploadToS3(file, s3Key);
                s3Urls.push(s3Url);
            } catch (uploadError) {
                console.error('S3 upload error:', uploadError);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error uploading images to S3',
                    error: uploadError.message 
                });
            }
        }

        // Prepare values with proper sanitization
        const values = [
            req.user.userId,
            req.body.business_name,
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
            sanitizeNumeric(req.body.ffe),
            parseInt(req.body.employees) || 0,
            req.body.reason_for_selling,
            s3Urls, // Store full S3 URLs in the database
            parseInt(req.body.years_in_operation) || 0
        ];

        // ...existing database insertion code...

        res.status(200).json({
            success: true,
            business: result.rows[0],
            images: s3Urls
        });

    } catch (error) {
        console.error('Error creating business:', error);
        res.status(500).json({
            error: 'Failed to create business listing',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        // For regular filenames, construct the S3 URL
        return `https://arzani-images.s3.eu-north-1.amazonaws.com/businesses/${business.id}/${image}`;
      })
    }));

    res.json({ businesses });
  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ...existing routes...
