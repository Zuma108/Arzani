/**
 * Blog Image Specifications
 * Optimal dimensions for Arzani blog system
 */

const BLOG_IMAGE_SPECS = {
  // Hero images for blog posts
  hero: {
    width: 1200,
    height: 630,
    aspectRatio: '1.91:1',
    maxFileSize: '500KB',
    formats: ['webp', 'jpg'],
    description: 'Main blog post hero image - optimized for social sharing'
  },
  
  // Related post thumbnails
  thumbnail: {
    width: 600,
    height: 400,
    aspectRatio: '3:2', 
    maxFileSize: '200KB',
    formats: ['webp', 'jpg'],
    description: 'Related post thumbnails and blog listing cards'
  },
  
  // In-content images
  content: {
    width: 800,
    height: 600,
    aspectRatio: '4:3',
    maxFileSize: '300KB',
    formats: ['webp', 'jpg'],
    description: 'Images within blog post content'
  },
  
  // Author avatars
  avatar: {
    width: 150,
    height: 150,
    aspectRatio: '1:1',
    maxFileSize: '50KB',
    formats: ['webp', 'jpg', 'png'],
    description: 'Author profile images'
  }
};

// S3 upload path structure for organized storage
const BLOG_IMAGE_PATHS = {
  hero: 'blogs/heroes/',
  thumbnail: 'blogs/thumbnails/', 
  content: 'blogs/content/',
  avatar: 'authors/'
};

// Image optimization settings
const IMAGE_OPTIMIZATION = {
  quality: 85,           // JPEG/WebP quality
  progressive: true,     // Progressive JPEG
  stripMetadata: true,   // Remove EXIF data
  webpFallback: true    // Provide JPG fallback
};

module.exports = {
  BLOG_IMAGE_SPECS,
  BLOG_IMAGE_PATHS,
  IMAGE_OPTIMIZATION
};

/**
 * Usage Examples:
 * 
 * 1. Hero Image URL Generator:
 * https://arzani-images1.s3.eu-west-2.amazonaws.com/blogs/heroes/business-acquisition-guide-1200x630.webp
 * 
 * 2. Responsive Image HTML:
 * <img src="hero-1200x630.webp" 
 *      srcset="hero-600x315.webp 600w, hero-1200x630.webp 1200w"
 *      sizes="(max-width: 768px) 100vw, 66vw"
 *      alt="Blog post title">
 * 
 * 3. CSS Background Optimization:
 * background-image: url('hero-1200x630.webp');
 * background-size: cover;
 * background-position: center;
 */
