/**
 * S3 Handler Middleware
 * Provides consistent handling for S3 uploads across the application
 */
import { uploadToS3 } from '../utils/s3.js';
import multer from 'multer';
import path from 'path';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Max 5 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const ext = path.extname(file.originalname).toLowerCase();
    const isValid = allowedTypes.test(ext);
    const isValidMime = file.mimetype.startsWith('image/');
    
    if (isValid && isValidMime) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPG, PNG, GIF and WebP files are allowed.'), false);
    }
  }
});

/**
 * S3 Uploader Middleware
 * Process uploaded files and add S3 URLs to the request object
 * 
 * @param {string} fieldName - Form field name for the file(s)
 * @param {string} s3KeyPrefix - Prefix for S3 keys (folder path)
 * @param {boolean} multiple - Whether to expect multiple files
 * @returns {Array} - Array of middleware functions
 */
export const s3Uploader = (fieldName, s3KeyPrefix, multiple = false) => {
  // Choose the right multer method based on whether we expect multiple files
  const multerMiddleware = multiple ? 
    upload.array(fieldName, 5) : 
    upload.single(fieldName);
  
  // Return array of middleware functions
  return [
    multerMiddleware,
    async (req, res, next) => {
      try {
        // Skip if no files were uploaded
        if ((!multiple && !req.file) || (multiple && (!req.files || req.files.length === 0))) {
          return next();
        }
        
        // Get AWS region and bucket from environment
        const region = process.env.AWS_REGION || 'eu-west-2';
        const bucketName = process.env.AWS_BUCKET_NAME || 'arzani-images1';
        
        if (multiple) {
          // Process multiple files
          req.s3Files = [];
          for (const file of req.files) {
            const timestamp = Date.now();
            const randomPart = Math.floor(Math.random() * 1000000);
            const fileExt = path.extname(file.originalname);
            const sanitizedName = `${timestamp}-${randomPart}${fileExt}`;
            const s3Key = `${s3KeyPrefix}/${sanitizedName}`;
            
            const s3Url = await uploadToS3(
              file,
              s3Key,
              file.mimetype,
              region,
              bucketName
            );
            
            req.s3Files.push({
              originalName: file.originalname,
              s3Url,
              s3Key,
              contentType: file.mimetype,
              size: file.size
            });
          }
        } else {
          // Process single file
          const file = req.file;
          const timestamp = Date.now();
          const randomPart = Math.floor(Math.random() * 1000000);
          const fileExt = path.extname(file.originalname);
          const sanitizedName = `${timestamp}-${randomPart}${fileExt}`;
          const s3Key = `${s3KeyPrefix}/${sanitizedName}`;
          
          const s3Url = await uploadToS3(
            file,
            s3Key,
            file.mimetype,
            region,
            bucketName
          );
          
          req.s3File = {
            originalName: file.originalname,
            s3Url,
            s3Key,
            contentType: file.mimetype,
            size: file.size
          };
        }
        
        next();
      } catch (error) {
        console.error('S3 upload middleware error:', error);
        res.status(500).json({
          success: false,
          error: 'File upload failed',
          message: error.message
        });
      }
    }
  ];
};

export default {
  upload,
  s3Uploader
};
