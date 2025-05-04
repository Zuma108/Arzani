import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../../middleware/auth.js';
import { uploadToS3 } from '../../utils/s3.js';
import pool from '../../db.js';

const router = express.Router();

// Configure multer for memory storage (needed for S3 upload)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Max 5 files
  }
});

// Add a middleware to parse multipart and JSON
router.use((req, res, next) => {
    if (req.headers['content-type']?.includes('application/json')) {
        // JSON request, body is already parsed
        next();
    } else {
        // Multipart request, use multer
        upload.array('images', 5)(req, res, next);
    }
});

// Handle business submissions - support both multipart and JSON requests
router.post('/', authenticateToken, async (req, res) => {
    try {
        console.log('Auth check for POST /api/submit-business');
        
        // Check if user is authenticated
        if (!req.user?.userId) {
            console.error('User not authenticated');
            return res.status(401).json({ error: 'Authentication required' });
        }

        console.log('Request: POST /api/submit-business');
        console.log('Content-Type:', req.headers['content-type']);
        
        // Determine if this is a JSON request (pre-uploaded images) or multipart (direct upload)
        const isJsonRequest = req.headers['content-type']?.includes('application/json');
        let businessData = req.body;
        let s3Urls = [];
        
        console.log('Is JSON request:', isJsonRequest);
        
        if (isJsonRequest) {
            // Handle JSON request with pre-uploaded image URLs
            console.log('Processing JSON business submission');
            
            // Check if images array is provided
            if (!businessData.images || !Array.isArray(businessData.images)) {
                console.error('No images array provided in JSON data');
                return res.status(400).json({ 
                    error: 'Images are required',
                    message: 'Please upload at least 3 images for your business listing'
                });
            }
            
            // Check for minimum required images (3)
            if (businessData.images.length < 3) {
                console.error(`Only ${businessData.images.length} images provided, minimum 3 required`);
                return res.status(400).json({ 
                    error: 'Insufficient images',
                    message: `At least 3 images are required, you provided ${businessData.images.length}`
                });
            }
            
            s3Urls = businessData.images;
            console.log(`Using ${s3Urls.length} pre-uploaded images`);
        } else {
            // Handle multipart request with direct file uploads
            if (!req.files) {
                console.error('No files received in multipart request');
                return res.status(400).json({ 
                    error: 'No images uploaded',
                    message: 'Please upload at least 3 images for your business listing'
                });
            }
            
            if (req.files.length < 3) {
                console.error(`Only ${req.files.length} files uploaded, minimum 3 required`);
                return res.status(400).json({ 
                    error: 'Insufficient images',
                    message: `At least 3 images are required, you uploaded ${req.files.length}`
                });
            }
            
            // Process uploaded files as before
            console.log('Files received:', req.files?.length || 0);
            
            if (req.files && req.files.length > 0) {
                req.files.forEach((file, index) => {
                    console.log(`File ${index + 1}: ${file.originalname}, ${file.size} bytes, ${file.mimetype}`);
                });
                
                // Generate a unique ID for the business using timestamp
                const businessId = Date.now();
                const userId = req.user.userId;
                
                // Get AWS region and bucket name from request or environment
                const region = req.headers['x-aws-region'] || req.body.awsRegion || process.env.AWS_REGION || 'eu-west-2';
                const bucket = req.headers['x-aws-bucket'] || req.body.awsBucket || process.env.AWS_BUCKET_NAME || 'arzani-images1';
                
                // Upload images to S3
                for (const file of req.files) {
                    // Create a safe filename
                    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
                    const s3Key = `businesses/${businessId}/${sanitizedName}`;
                    
                    // Upload file to S3
                    const s3Url = await uploadToS3(file, s3Key, region, bucket);
                    s3Urls.push(s3Url);
                }
            }
        }
        
        console.log('Images array:', s3Urls);

        // Validate required fields
        const requiredFields = ['business_name', 'industry', 'price', 'description'];
        for (const field of requiredFields) {
            if (!businessData[field]) {
                return res.status(400).json({ error: `${field} is required` });
            }
        }

        // Helper function to ensure numeric values and handle both naming formats
        const getNumericValue = (snakeCaseKey, camelCaseKey, defaultValue = 0) => {
            // Try to get value from either naming format
            const value = businessData[snakeCaseKey] || businessData[camelCaseKey];
            if (value === undefined || value === null || value === '') return defaultValue;
            const num = parseFloat(value);
            return isNaN(num) ? defaultValue : num;
        };

        const userId = req.user.userId;
        
        // Prepare query values for database insertion with proper field mapping
        const values = [
            userId,
            businessData.business_name || 'Untitled Business',
            businessData.industry || 'Other',
            getNumericValue('price', 'price', 0),
            businessData.description || '',
            getNumericValue('cash_flow', 'cashFlow', 0),
            getNumericValue('gross_revenue', 'grossRevenue', 0),
            getNumericValue('ebitda', 'ebitda', 0),
            getNumericValue('inventory', 'inventory', 0),
            getNumericValue('sales_multiple', 'salesMultiple', 0),
            getNumericValue('profit_margin', 'profitMargin', 0),
            getNumericValue('debt_service', 'debtService', 0),
            getNumericValue('cash_on_cash', 'cashOnCash', 0),
            getNumericValue('down_payment', 'downPayment', 0),
            businessData.location || 'United Kingdom',
            getNumericValue('ffe', 'ffE', 0),
            parseInt(businessData.employees || '0'),
            businessData.reason_for_selling || businessData.reasonForSelling || '',
            s3Urls, // Store the array of S3 URLs
            parseInt(businessData.years_in_operation || businessData.yearsInOperation || '0'),
            getNumericValue('recurring_revenue_percentage', 'recurringRevenue', 0),
            getNumericValue('growth_rate', 'growthRate', 0),
            businessData.intellectual_property || businessData.intellectualProperty 
                ? (businessData.intellectual_property || businessData.intellectualProperty).split(',').map(ip => ip.trim()) 
                : null,
            parseInt(businessData.website_traffic || businessData.websiteTraffic || '0'),
            parseInt(businessData.social_media_followers || businessData.socialFollowers || '0')
        ];

        // Log values for debugging
        console.log('Database values being used:');
        const fieldNames = [
            'user_id', 'business_name', 'industry', 'price', 'description',
            'cash_flow', 'gross_revenue', 'ebitda', 'inventory', 'sales_multiple',
            'profit_margin', 'debt_service', 'cash_on_cash', 'down_payment', 'location',
            'ffe', 'employees', 'reason_for_selling', 'images', 'years_in_operation',
            'recurring_revenue_percentage', 'growth_rate', 'intellectual_property',
            'website_traffic', 'social_media_followers'
        ];
        
        fieldNames.forEach((field, index) => {
            if (field !== 'images') { // Skip logging the full image array
                console.log(`${field}: ${values[index]}`);
            } else {
                console.log(`${field}: [${values[index].length} images]`);
            }
        });

        // Insert business into database
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
                date_listed
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, NOW())
            RETURNING id, business_name, user_id, images;
        `;
        
        console.log('Database connected');
        const result = await pool.query(query, values);
        console.log('Query result:', result.rows[0]);

        // Ensure the business object has complete data
        const business = result.rows[0];

        // Return success response
        res.status(201).json({
            success: true,
            message: 'Business created successfully',
            business: business,
            redirect: '/marketplace2' // Add redirect URL to response
        });
    } catch (error) {
        console.error('Error creating business:', error);
        res.status(500).json({ 
            error: 'Failed to create business listing',
            message: error.message
        });
    }
});

export default router;
