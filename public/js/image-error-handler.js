/**
 * Global Image Error Handler
 * 
 * This script helps prevent repeated requests for images that fail to load,
 * which can cause console spamming and performance issues.
 */

(function() {
  // Use localStorage to persist failed image URLs across page loads
  const STORAGE_KEY = 'failed_image_urls';
  
  // Initialize the Set of failed images
  window.failedImages = new Set(getFailedImagesFromStorage());
  
  // Add image to failed set and save to storage
  window.markImageAsFailed = function(img) {
    const src = img.getAttribute('data-original-src') || img.src;
    window.failedImages.add(src);
    saveFailedImagesToStorage();
    
    // Debug logging (only in dev)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.debug('Image failed to load and has been cached:', src);
    }
  };
  
  // Process all images on the page
  function processImages() {
    // Find avatar and profile images
    const avatarImages = document.querySelectorAll('.avatar-image, .profile-picture, [data-user-avatar]');
    
    avatarImages.forEach(img => {
      // Store original source for reference
      const originalSrc = img.src;
      img.setAttribute('data-original-src', originalSrc);
      
      // If this image previously failed, use default immediately
      if (window.failedImages.has(originalSrc)) {
        img.src = '/images/default-profile.png';
      }
      
      // Add error handler if not already present
      if (!img.hasAttribute('onerror')) {
        img.onerror = function() {
          this.onerror = null; // Prevent error handler loop
          this.src = '/images/default-profile.png';
          window.markImageAsFailed(this);
        };
      }
    });
  }
  
  // Load failed images from storage
  function getFailedImagesFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error loading failed images from storage:', e);
      return [];
    }
  }
  
  // Save failed images to storage
  function saveFailedImagesToStorage() {
    try {
      // Only store up to 100 failed URLs to prevent storage issues
      const failedArray = Array.from(window.failedImages).slice(0, 100);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(failedArray));
    } catch (e) {
      console.error('Error saving failed images to storage:', e);
    }
  }
  
  // Reset stored failed images after a week (604800000 ms)
  function checkResetFailedImages() {
    try {
      const lastReset = localStorage.getItem('failed_images_last_reset');
      const now = Date.now();
      
      // If never reset or it's been a week, reset the failed images
      if (!lastReset || (now - parseInt(lastReset, 10)) > 604800000) {
        window.failedImages.clear();
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem('failed_images_last_reset', now.toString());
      }
    } catch (e) {
      console.error('Error checking reset time:', e);
    }
  }
  
  // Initialize everything when DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    checkResetFailedImages();
    processImages();
    
    // Setup MutationObserver to handle dynamically added images
    const observer = new MutationObserver(function(mutations) {
      let shouldProcess = false;
      
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length) {
          shouldProcess = true;
        }
      });
      
      if (shouldProcess) {
        processImages();
      }
    });
    
    // Start observing the document body
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
  });
})();
