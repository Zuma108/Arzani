import sharp from 'sharp';
import multer from 'multer';
import path from 'path';

// Store processed images in memory
const storage = multer.memoryStorage();

// Create multer instance with increased limits
export const uploadMiddleware = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    
    // Only allow jpg and png
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
      return cb(new Error('Only JPG and PNG files are allowed!'), false);
    }
    
    cb(null, true);
  }
});

// Middleware to optimize images before uploading to S3
export const optimizeImages = async (req, res, next) => {
  try {
    // Skip if no files
    if (!req.files || req.files.length === 0) {
      return next();
    }
    
    console.log(`Optimizing ${req.files.length} images...`);
    
    // Process each file
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      
      // Skip if not an image
      if (!file.mimetype.startsWith('image/')) {
        continue;
      }
      
      // Use sharp to resize and optimize
      const optimized = await sharp(file.buffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();
      
      // Replace the file buffer with the optimized version
      file.buffer = optimized;
      console.log(`Optimized ${file.originalname}: ${file.size} → ${optimized.length} bytes`);
    }
    
    next();
  } catch (error) {
    console.error('Image optimization error:', error);
    next(error);
  }
};

export default {
  uploadMiddleware,
  optimizeImages
};
