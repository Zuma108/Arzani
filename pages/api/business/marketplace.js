import { S3Client } from '@aws-sdk/client-s3';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';
import { uploadToS3 } from '../../../utils/s3';
import { authenticateToken } from '../../../middleware/auth';

// Disable the default body parser to handle form data
export const config = {
  api: {
    bodyParser: false,
  },
};

// Initialize S3 client with correct region
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-2', // Must be valid AWS region code
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Authenticate the request
  try {
    await authenticateToken(req, res, async () => {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const form = new IncomingForm({ multiples: true });
      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error('Form parsing error:', err);
          return res.status(500).json({ success: false, message: 'Error parsing form data' });
        }

        try {
          // Process business details from fields
          const businessData = {
            business_name: fields.business_name?.[0],
            industry: fields.industry?.[0],
            price: fields.price?.[0],
            description: fields.description?.[0],
            // ... other business fields ...
          };

          // Validate required fields
          const requiredFields = ['business_name', 'industry', 'price', 'description'];
          const missingFields = requiredFields.filter(field => !businessData[field]);
          
          if (missingFields.length > 0) {
            return res.status(400).json({ 
              success: false, 
              message: 'Missing required fields', 
              fields: missingFields 
            });
          }

          // Handle image uploads
          const imageFiles = files.images || [];
          if (imageFiles.length < 1) {
            return res.status(400).json({ success: false, message: 'At least one image is required' });
          }

          // Generate a unique folder for this business
          const businessFolder = `business-${Date.now()}`;
          const s3Urls = [];
          
          // Use the correct region and bucket parameters - validate values
          const region = process.env.AWS_REGION || 'eu-west-2';
          const bucket = process.env.AWS_BUCKET_NAME || 'arzani-images1';
          
          // Additional validation to prevent parameter mixup
          if (region === bucket) {
            console.error('Region and bucket cannot be the same:', region);
            return res.status(500).json({
              success: false,
              message: 'Invalid S3 configuration - region and bucket cannot be the same'
            });
          }

          // Upload each image to S3
          for (const file of imageFiles) {
            const timestamp = Date.now();
            const randomPart = Math.floor(Math.random() * 1000000);
            const fileExt = path.extname(file.originalFilename);
            const sanitizedName = `business-${timestamp}-${randomPart}${fileExt}`;
            const s3Key = `businesses/${businessFolder}/${sanitizedName}`;

            console.log(`Attempting to upload file: ${file.originalFilename} as ${s3Key}`);
            
            // Read the file into a buffer
            const fileBuffer = fs.readFileSync(file.filepath);
            
            // Debug-log parameters before upload
            console.log(`S3 upload parameters: region=${region}, bucket=${bucket}, key=${s3Key}`);
            
            // Upload to S3 with validated parameters
            const s3Url = await uploadToS3(
              fileBuffer,
              s3Key,
              file.mimetype,
              region, // Verified region
              bucket  // Verified bucket name
            );
            
            s3Urls.push(s3Url);
          }

          // Here you would typically save the business data and S3 URLs to your database
          // For this example, we'll just return the successful upload result
          return res.status(200).json({
            success: true,
            message: 'Business listing created with images',
            businessData,
            images: s3Urls
          });
          
        } catch (error) {
          console.error('Business submission error:', error);
          return res.status(500).json({
            success: false,
            message: 'Server error during business submission',
            error: error.message
          });
        }
      });
    });
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
}
