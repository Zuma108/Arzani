/**
 * S3 Image Helper
 * Provides utilities to handle multi-region S3 image loading
 */

// Global event handler to add error handling to all images
document.addEventListener('DOMContentLoaded', function() {
  console.log('S3 Image Helper initialized');
  
  // First, always ensure we have the S3 configuration
  if (!window.AWS_REGION || !window.AWS_BUCKET_NAME) {
    console.log('S3 config not found, setting defaults');
    window.AWS_REGION = 'eu-west-2';
    window.AWS_BUCKET_NAME = 'arzani-images1';
    window.AWS_ALTERNATE_REGIONS = ['eu-north-1'];
    
    // Try to fetch the config from the server
    fetch('/api/s3-debug')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch S3 config: ${response.status}`);
        }
        return response.json();
      })
      .then(config => {
        console.log('S3 configuration loaded:', config);
        window.AWS_REGION = config.region;
        window.AWS_BUCKET_NAME = config.bucketName;
        window.AWS_ALTERNATE_REGIONS = config.alternateRegions || ['eu-north-1'];
      })
      .catch(error => {
        console.warn('Using default S3 config due to error:', error);
      });
  }
  
  // Apply to all images when the page loads
  applyImageErrorHandling();
  
  // Also handle dynamically loaded images by checking periodically
  setInterval(applyImageErrorHandling, 2000);
});

// Add error handling to all images that don't already have it
function applyImageErrorHandling() {
  document.querySelectorAll('img:not([data-s3-handled])').forEach(img => {
    // Skip images that already have our handler
    if (img.hasAttribute('data-s3-handled')) return;
    
    // Mark this image as handled
    img.setAttribute('data-s3-handled', 'true');
    
    // Add error handler to try alternate region
    img.addEventListener('error', function() {
      const src = this.src;
      console.log('Image loading failed:', src);
      
      // Only handle S3 URLs
      if (!src.includes('amazonaws.com')) return;
      
      // Try alternate region
      if (src.includes('eu-west-2')) {
        console.log('Retrying with north region...');
        this.src = src.replace('eu-west-2', 'eu-north-1');
      } else if (src.includes('eu-north-1')) {
        console.log('Retrying with west region...');
        this.src = src.replace('eu-north-1', 'eu-west-2');
      } else {
        // If we can't determine the region, use default image
        console.log('Using default image');
        this.src = '/images/default-business.jpg';
      }
    });
  });
}

// Function to format image URL with multiple region support
function formatS3ImageUrl(imageUrl, businessId) {
  // If it's already a full URL, return it as is
  if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
    return imageUrl;
  }
  
  // If no image, invalid business ID, or non-string image, return default image
  if (!imageUrl || !businessId || typeof imageUrl !== 'string') {
    return '/images/default-business.jpg';
  }
  
  // Get bucket name and region from page config
  const bucket = window.AWS_BUCKET_NAME || 'arzani-images1';
  const region = window.AWS_REGION || 'eu-west-2';
  
  // Create S3 URL
  return `https://${bucket}.s3.${region}.amazonaws.com/businesses/${businessId}/${imageUrl}`;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatS3ImageUrl,
    applyImageErrorHandling
  };
}

// Also expose to window object for non-module scripts
window.s3ImageHelper = {
  formatUrl: formatS3ImageUrl,
  applyErrorHandling: applyImageErrorHandling,
  
  // Add a utility function to manually test images
  testImageUrl: function(businessId, imageName) {
    if (!businessId || !imageName) {
      console.error('Need both businessId and imageName to test');
      return;
    }
    
    const regions = ['eu-west-2', 'eu-north-1'];
    const bucket = window.AWS_BUCKET_NAME || 'arzani-images1';
    
    regions.forEach(region => {
      const url = `https://${bucket}.s3.${region}.amazonaws.com/businesses/${businessId}/${imageName}`;
      console.log(`Testing ${region}:`, url);
      
      const img = new Image();
      img.onload = () => console.log(`✅ ${region} SUCCESS:`, url);
      img.onerror = () => console.log(`❌ ${region} FAILED:`, url);
      img.src = url;
    });
  }
};
