/**
 * Image helper utilities
 */

/**
 * Format the profile picture URL based on storage location
 * @param {string} url - The original profile picture URL
 * @returns {string} The formatted URL
 */
export function formatProfilePicture(url) {
  if (!url) return '/images/default-profile.png';
  
  // Already a full URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Relative path in uploads directory
  if (url.startsWith('/uploads/')) {
    return url;
  }
  
  // No path prefix, assume it's in the uploads directory
  if (!url.startsWith('/')) {
    return `/uploads/${url}`;
  }
  
  // Path starts with / but not /uploads, assume it's at the root
  return url;
}

/**
 * Format business image URL 
 * @param {string} url - The raw image URL
 * @param {number} businessId - Business ID for S3 path construction
 * @returns {string} - Properly formatted image URL
 */
export function formatBusinessImage(url, businessId) {
  if (!url) return '/images/default-business.jpg';
  
  // If URL is already a full URL (starts with http), return as is
  if (url.startsWith('http')) return url;
  
  // For S3 images with business ID
  if (businessId) {
    // Check if it's already an S3 URL path
    if (url.includes('s3.') || url.includes('amazonaws.com')) {
      return url;
    }
    
    // Otherwise construct S3 URL
    return `https://arzani-images.s3.eu-north-1.amazonaws.com/businesses/${businessId}/${url}`;
  }
  
  // If URL is a relative path starting with /uploads, it's a local file
  if (url.startsWith('/uploads/')) return url;
  
  // If URL doesn't have a path prefix, assume it's in the uploads directory
  if (!url.startsWith('/')) return `/uploads/${url}`;
  
  // If none of the above, return the URL as is
  return url;
}

/**
 * Check if an image URL is valid
 * @param {string} url - The image URL to check
 * @returns {Promise<boolean>} Whether the image is valid
 */
export function isImageValid(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

// Export default for CommonJS compatibility
export default {
  formatProfilePicture,
  isImageValid
};
