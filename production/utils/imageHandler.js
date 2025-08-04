/**
 * Utility functions for handling multi-region S3 images
 */

// Default regions to try in order
export const S3_REGIONS = ['eu-west-2', 'eu-north-1'];
export const DEFAULT_BUCKET = 'arzani-images1';

/**
 * Generate S3 URL for either region
 * @param {string} key - The object key without bucket or region
 * @param {string} region - The AWS region
 * @param {string} bucket - The S3 bucket name
 * @returns {string} - Complete S3 URL
 */
export function generateS3Url(key, region = S3_REGIONS[0], bucket = DEFAULT_BUCKET) {
  if (!key) return null;
  
  // If already a full URL, return as is
  if (key.startsWith('http')) {
    return key;
  }
  
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Format image URLs for a business, ensuring proper S3 URLs for both regions
 * @param {Object} business - Business object with images array
 * @returns {Object} - Business with formatted image URLs
 */
export function processBusinessImages(business) {
  if (!business) return business;
  
  // Skip processing if no images
  if (!business.images || !Array.isArray(business.images) || business.images.length === 0) {
    return business;
  }
  
  // Parse PostgreSQL array if needed
  let imageArray = business.images;
  if (typeof imageArray === 'string' && imageArray.startsWith('{') && imageArray.endsWith('}')) {
    // Parse PostgreSQL array string format {url1,url2,url3}
    imageArray = imageArray.substring(1, imageArray.length - 1).split(',');
    business.imagesOriginal = business.images; // Save original format
    business.images = imageArray;
  }
  
  // Process each image URL
  business.processedImages = imageArray.map(img => {
    // Skip null/empty values
    if (!img) return null;
    
    // If already a full URL, return as is
    if (img.startsWith('http')) {
      return img;
    }
    
    // For relative paths, add the proper prefix
    if (img.startsWith('/uploads/')) {
      const filename = img.substring('/uploads/'.length);
      return generateS3Url(`businesses/${business.id}/${filename}`);
    }
    
    // For plain filenames, assume they're in the business folder
    return generateS3Url(`businesses/${business.id}/${img}`);
  }).filter(Boolean); // Remove null values
  
  return business;
}

/**
 * Get HTML for an image that will try both regions if the first fails
 * @param {string} imageUrl - The primary image URL
 * @param {string} altText - Alternative text for the image
 * @param {string} classes - CSS classes to apply
 * @returns {string} - HTML for the image with error handling
 */
export function getFallbackImageHtml(imageUrl, altText = "Business image", classes = "card-img-top") {
  if (!imageUrl) {
    return `<img src="/images/default-business.jpg" alt="${altText}" class="${classes}">`;
  }
  
  // Create alternate URL for the other region
  let alternateUrl = imageUrl;
  if (imageUrl.includes('eu-west-2')) {
    alternateUrl = imageUrl.replace('eu-west-2', 'eu-north-1');
  } else if (imageUrl.includes('eu-north-1')) {
    alternateUrl = imageUrl.replace('eu-north-1', 'eu-west-2');
  }
  
  return `<img src="${imageUrl}" alt="${altText}" class="${classes}" 
        onerror="if (this.src !== '${alternateUrl}') this.src='${alternateUrl}'; 
                else this.src='/images/default-business.jpg';">`;
}
