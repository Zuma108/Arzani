/**
 * Global image error handler to try multiple S3 regions
 * Include this script in your HTML to enable automatic region fallback for all images
 */
(function() {
  // S3 regions to try in order
  const S3_REGIONS = ['eu-west-2', 'eu-north-1'];
  const DEFAULT_BUCKET = 'arzani-images1';
  
  // Function to get alternate URL for a given URL
  function getAlternateUrl(url) {
    if (!url) return '/images/default-business.jpg';
    
    // If the URL contains eu-west-2, try eu-north-1
    if (url.includes('s3.eu-west-2.amazonaws.com')) {
      return url.replace('s3.eu-west-2.amazonaws.com', 's3.eu-north-1.amazonaws.com');
    }
    
    // If the URL contains eu-north-1, try eu-west-2
    if (url.includes('s3.eu-north-1.amazonaws.com')) {
      return url.replace('s3.eu-north-1.amazonaws.com', 's3.eu-west-2.amazonaws.com');
    }
    
    // For non-S3 URLs, return default
    return '/images/default-business.jpg';
  }
  
  // Add error handler to all images as they're added to the DOM
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          // Only process Element nodes
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if it's an image
            if (node.tagName === 'IMG') {
              addFallbackHandler(node);
            } else {
              // Check for images inside the added node
              node.querySelectorAll('img').forEach(img => addFallbackHandler(img));
            }
          }
        });
      }
    });
  });
  
  // Start observing
  document.addEventListener('DOMContentLoaded', function() {
    // Add handlers to existing images
    document.querySelectorAll('img').forEach(img => addFallbackHandler(img));
    
    // Watch for future image additions
    observer.observe(document.body, { childList: true, subtree: true });
    
    console.log('S3 region fallback handler initialized');
  });
  
  // Helper function to add fallback handler to an image
  function addFallbackHandler(img) {
    if (!img.hasAttribute('data-has-fallback')) {
      img.setAttribute('data-has-fallback', 'true');
      
      img.addEventListener('error', function(e) {
        const src = this.src;
        console.log('Image failed to load, trying alternate region:', src);
        
        // Only attempt region fallback for S3 URLs
        if (src.includes('amazonaws.com') || src.includes('/uploads/')) {
          // Get alternate URL
          const alternateUrl = getAlternateUrl(src);
          
          // Only apply if we haven't tried this URL yet
          if (alternateUrl !== src && !this.dataset.triedFallback) {
            this.dataset.triedFallback = 'true';
            this.src = alternateUrl;
            e.preventDefault(); // Prevent error from bubbling up
          } else {
            // If we've tried the fallback and it still fails, use default
            this.src = '/images/default-business.jpg';
            this.onerror = null; // Remove to prevent loops
          }
        }
      });
    }
  }
})();
