/**
 * S3 Image Fallback Utility
 * Handles image loading with region fallback and progressive loading
 */

// Configuration - check if S3_CONFIG already exists before declaring
if (typeof window.S3_CONFIG === 'undefined') {
  window.S3_CONFIG = {
    primaryRegion: 'eu-west-2',
    fallbackRegion: 'eu-north-1',
    bucket: 'arzani-images1'
  };
} else {
  // If it exists, ensure it has all required properties
  window.S3_CONFIG.primaryRegion = window.S3_CONFIG.primaryRegion || 'eu-west-2';
  window.S3_CONFIG.fallbackRegion = window.S3_CONFIG.fallbackRegion || 'eu-north-1';
  window.S3_CONFIG.bucket = window.S3_CONFIG.bucket || 'arzani-images1';
}

// Use window.S3_CONFIG throughout the file instead of just S3_CONFIG
// to make it clear we're using the global version

/**
 * Initialize S3 image loading with fallback
 * Called on page load to set up image handling
 */
function initS3ImageHandling() {
  // Get configuration from the page if available
  const configElement = document.getElementById('s3-config');
  if (configElement) {
    try {
      const config = JSON.parse(configElement.textContent);
      if (config.region) window.S3_CONFIG.primaryRegion = config.region;
      if (config.fallbackRegion) window.S3_CONFIG.fallbackRegion = config.fallbackRegion;
      if (config.bucketName) window.S3_CONFIG.bucket = config.bucketName;
    } catch (e) {
      console.error('Error parsing S3 config:', e);
    }
  }

  // Add event handlers to all S3 images
  setupS3ImageEventHandlers();
  
  // Setup mutation observer to handle dynamically added images
  setupImageObserver();
}

/**
 * Setup handlers for all S3 images on the page
 */
function setupS3ImageEventHandlers() {
  // Find all images that might be S3 images
  document.querySelectorAll('img[src*="amazonaws.com"], img[data-src*="amazonaws.com"]').forEach(img => {
    addS3FallbackHandlers(img);
  });
  
  // Also handle images that might be using relative paths
  document.querySelectorAll('img[src^="/uploads/"], img[data-src^="/uploads/"]').forEach(img => {
    convertRelativeToS3(img);
  });
}

/**
 * Add load and error handlers to S3 images
 * @param {HTMLImageElement} img - Image element to enhance
 */
function addS3FallbackHandlers(img) {
  // Skip if already processed
  if (img.hasAttribute('data-s3-processed')) return;
  
  // Mark as processed
  img.setAttribute('data-s3-processed', 'true');
  
  // Create fallback URL for the alternate region
  const currentSrc = img.src || img.dataset.src;
  let fallbackSrc = '';
  
  if (currentSrc.includes(`s3.${window.S3_CONFIG.primaryRegion}.amazonaws.com`)) {
    fallbackSrc = currentSrc.replace(
      `s3.${window.S3_CONFIG.primaryRegion}.amazonaws.com`, 
      `s3.${window.S3_CONFIG.fallbackRegion}.amazonaws.com`
    );
  } else if (currentSrc.includes(`s3.${window.S3_CONFIG.fallbackRegion}.amazonaws.com`)) {
    fallbackSrc = currentSrc.replace(
      `s3.${window.S3_CONFIG.fallbackRegion}.amazonaws.com`, 
      `s3.${window.S3_CONFIG.primaryRegion}.amazonaws.com`
    );
  }
  
  // Store fallback URL as data attribute
  if (fallbackSrc) {
    img.setAttribute('data-fallback', fallbackSrc);
  }
  
  // Add load handler
  img.addEventListener('load', function() {
    this.classList.add('loaded');
    const placeholder = this.previousElementSibling;
    if (placeholder && placeholder.classList.contains('image-placeholder')) {
      placeholder.style.display = 'none';
    }
  });
  
  // Add error handler
  img.addEventListener('error', function() {
    // Skip if we've already tried the fallback
    if (this.dataset.usedFallback === 'true') {
      this.src = '/images/default-business.jpg';
      this.onerror = null; // Prevent infinite loop
      return;
    }
    
    // Try the fallback
    this.dataset.usedFallback = 'true';
    
    if (this.dataset.fallback) {
      this.src = this.dataset.fallback;
    } else if (this.src.includes(`s3.${window.S3_CONFIG.primaryRegion}.amazonaws.com`)) {
      this.src = this.src.replace(
        `s3.${window.S3_CONFIG.primaryRegion}.amazonaws.com`, 
        `s3.${window.S3_CONFIG.fallbackRegion}.amazonaws.com`
      );
    } else if (this.src.includes(`s3.${window.S3_CONFIG.fallbackRegion}.amazonaws.com`)) {
      this.src = this.src.replace(
        `s3.${window.S3_CONFIG.fallbackRegion}.amazonaws.com`, 
        `s3.${window.S3_CONFIG.primaryRegion}.amazonaws.com`
      );
    } else {
      this.src = '/images/default-business.jpg';
    }
  });
}

/**
 * Convert relative upload paths to S3 URLs
 * @param {HTMLImageElement} img - Image element with relative path
 */
function convertRelativeToS3(img) {
  // Skip if already processed
  if (img.hasAttribute('data-s3-processed')) return;
  
  // Mark as processed
  img.setAttribute('data-s3-processed', 'true');
  
  // Get the source - either from src or data-src attribute
  const relativePath = img.src || img.dataset.src;
  if (!relativePath.startsWith('/uploads/')) return;
  
  // Extract the filename and business ID if possible
  const filename = relativePath.substring('/uploads/'.length);
  const businessCard = img.closest('[data-business-id]');
  const businessId = businessCard ? businessCard.dataset.businessId : '';
  
  // Create the S3 URL path
  let s3Path = '';
  if (businessId) {
    s3Path = `businesses/${businessId}/${filename}`;
  } else {
    s3Path = filename;
  }
  
  // Create the full S3 URL
  const s3Url = `https://${window.S3_CONFIG.bucket}.s3.${window.S3_CONFIG.primaryRegion}.amazonaws.com/${s3Path}`;
  
  // Create fallback URL
  const fallbackUrl = s3Url.replace(
    `s3.${window.S3_CONFIG.primaryRegion}.amazonaws.com`, 
    `s3.${window.S3_CONFIG.fallbackRegion}.amazonaws.com`
  );
  
  // Update the image
  if (img.dataset.src) {
    img.dataset.src = s3Url;
  } else {
    img.src = s3Url;
  }
  
  // Set fallback URL
  img.dataset.fallback = fallbackUrl;
  
  // Add the same handlers as for S3 images
  addS3FallbackHandlers(img);
}

/**
 * Setup mutation observer to handle dynamically added images
 */
function setupImageObserver() {
  // Create a MutationObserver to watch for new images
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          // Check if this is an element node
          if (node.nodeType === Node.ELEMENT_NODE) {
            // If it's an image, process it
            if (node.tagName === 'IMG') {
              if (node.src.includes('amazonaws.com') || node.dataset.src?.includes('amazonaws.com')) {
                addS3FallbackHandlers(node);
              } else if (node.src.startsWith('/uploads/') || node.dataset.src?.startsWith('/uploads/')) {
                convertRelativeToS3(node);
              }
            }
            
            // Also check for images within the added node
            const nestedImages = node.querySelectorAll('img');
            nestedImages.forEach(img => {
              if (img.src.includes('amazonaws.com') || img.dataset.src?.includes('amazonaws.com')) {
                addS3FallbackHandlers(img);
              } else if (img.src.startsWith('/uploads/') || img.dataset.src?.startsWith('/uploads/')) {
                convertRelativeToS3(img);
              }
            });
          }
        });
      }
    });
  });
  
  // Start observing the document body
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initS3ImageHandling);

// Export functions for use in other scripts
window.S3ImageUtils = {
  init: initS3ImageHandling,
  addFallbackHandlers: addS3FallbackHandlers,
  convertRelativeToS3: convertRelativeToS3
};
