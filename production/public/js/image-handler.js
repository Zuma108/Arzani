/**
 * Image Handler Utility
 * Handles image loading failures and fallbacks
 */

// Global configuration - ensure these are only declared once
// If these are already defined in the global scope, don't redefine them
if (typeof window.DEFAULT_PROFILE_IMAGE === 'undefined') {
  window.DEFAULT_PROFILE_IMAGE = '/images/default-profile.png';
}
if (typeof window.IMAGE_UPLOAD_MAX_SIZE === 'undefined') {
  window.IMAGE_UPLOAD_MAX_SIZE = 5 * 1024 * 1024; // 5MB
}
if (typeof window.ALLOWED_MIME_TYPES === 'undefined') {
  window.ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
}

(function() {
  // Create a set to track failed image URLs
  window.failedImages = new Set();
  
  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', init);
  
  /**
   * Initialize image handling
   */
  function init() {
    console.log('Initializing image handler');
    
    // Add global handler for image errors
    document.addEventListener('error', handleImageError, true);
    
    // Handle existing images
    processExistingImages();
  }
  
  /**
   * Global error handler for image loading failures
   * @param {Event} event - The error event
   */
  function handleImageError(event) {
    // Only handle image errors
    if (event.target.tagName.toLowerCase() !== 'img') {
      return;
    }
    
    const img = event.target;
    const src = img.src;
    
    // Skip if already using a fallback image
    if (src.includes(window.DEFAULT_PROFILE_IMAGE) || 
        src.includes('default-business.jpg') || 
        src.includes('placeholder.jpg')) {
      return;
    }
    
    console.warn(`Image failed to load: ${src}`);
    
    // Add to failed images set
    window.failedImages.add(src);
    
    // Apply appropriate fallback based on context
    if (isProfileImage(img)) {
      applyProfileImageFallback(img);
    } else if (isBusinessImage(img)) {
      applyBusinessImageFallback(img);
    } else {
      applyGenericImageFallback(img);
    }
  }
  
  /**
   * Process all images on the page to set appropriate error handlers
   */
  function processExistingImages() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      // Skip images that already have explicit onerror handlers
      if (img.hasAttribute('onerror')) {
        return;
      }
      
      // Set fallback handlers based on image context
      if (isProfileImage(img)) {
        img.onerror = function() {
          applyProfileImageFallback(this);
        };
      } else if (isBusinessImage(img)) {
        img.onerror = function() {
          applyBusinessImageFallback(this);
        };
      } else {
        img.onerror = function() {
          applyGenericImageFallback(this);
        };
      }
      
      // Pre-emptively handle images that have already failed
      if (img.complete && img.naturalWidth === 0) {
        img.onerror();
      }
    });
  }
  
  /**
   * Determine if image is likely a profile image based on classes or attributes
   * @param {HTMLImageElement} img - The image element to check
   * @returns {boolean} - True if it's a profile image
   */
  function isProfileImage(img) {
    const src = img.src || '';
    const classNames = img.className || '';
    const altText = img.alt || '';
    
    return src.includes('profile') || 
           src.includes('avatar') || 
           classNames.includes('profile') || 
           classNames.includes('avatar') || 
           classNames.includes('user-img') || 
           altText.includes('Profile') || 
           altText.includes('Avatar') ||
           img.closest('.user-avatar, .profile-image, .avatar');
  }
  
  /**
   * Determine if image is likely a business image based on classes or attributes
   * @param {HTMLImageElement} img - The image element to check
   * @returns {boolean} - True if it's a business image
   */
  function isBusinessImage(img) {
    const src = img.src || '';
    const classNames = img.className || '';
    const altText = img.alt || '';
    
    return src.includes('business') || 
           classNames.includes('business') || 
           classNames.includes('listing-img') || 
           altText.includes('Business') ||
           img.closest('.business-image, .listing-image');
  }
  
  /**
   * Apply profile image fallback
   * @param {HTMLImageElement} img - The image element to fix
   */
  function applyProfileImageFallback(img) {
    // Save original source for debugging
    const originalSrc = img.src;
    
    // Set to default profile image
    img.src = window.DEFAULT_PROFILE_IMAGE;
    
    // Add classes to indicate fallback was applied
    img.classList.add('fallback-image', 'profile-fallback');
    
    // Add data attribute for reference to original
    img.dataset.originalSrc = originalSrc;
    
    console.log(`Applied profile fallback for: ${originalSrc}`);
  }
  
  /**
   * Apply business image fallback
   * @param {HTMLImageElement} img - The image element to fix
   */
  function applyBusinessImageFallback(img) {
    // Save original source for debugging
    const originalSrc = img.src;
    
    // Set to default business image
    img.src = '/images/default-business.jpg';
    
    // Add classes to indicate fallback was applied
    img.classList.add('fallback-image', 'business-fallback');
    
    // Add data attribute for reference to original
    img.dataset.originalSrc = originalSrc;
    
    console.log(`Applied business fallback for: ${originalSrc}`);
  }
  
  /**
   * Apply generic image fallback
   * @param {HTMLImageElement} img - The image element to fix
   */
  function applyGenericImageFallback(img) {
    // Save original source for debugging
    const originalSrc = img.src;
    
    // Set to placeholder image
    img.src = '/images/placeholder.jpg';
    
    // Add classes to indicate fallback was applied
    img.classList.add('fallback-image', 'generic-fallback');
    
    // Add data attribute for reference to original
    img.dataset.originalSrc = originalSrc;
    
    console.log(`Applied generic fallback for: ${originalSrc}`);
  }
  
  /**
   * Utility to pre-load critical images
   * @param {Array<string>} urls - Array of image URLs to preload
   * @returns {Promise} - Promise that resolves when all images are loaded
   */
  window.preloadImages = function(urls) {
    if (!urls || !Array.isArray(urls)) return Promise.resolve();
    
    const promises = urls.map(url => {
      // Skip if already failed
      if (window.failedImages.has(url)) {
        return Promise.resolve();
      }
      
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = () => {
          window.failedImages.add(url);
          resolve(null);
        };
        img.src = url;
      });
    });
    
    return Promise.all(promises);
  };
  
  /**
   * Check if an image URL is known to have failed
   * @param {string} url - The image URL to check
   * @returns {boolean} - True if the image is known to have failed
   */
  window.hasImageFailed = function(url) {
    return window.failedImages.has(url);
  };
  
  /**
   * Get appropriate fallback for a failed image
   * @param {string} url - The original image URL
   * @param {string} type - The image type ('profile', 'business', or 'generic')
   * @returns {string} - The fallback image URL
   */
  window.getImageFallback = function(url, type = 'generic') {
    if (!window.failedImages.has(url)) return url;
    
    switch (type.toLowerCase()) {
      case 'profile':
        return window.DEFAULT_PROFILE_IMAGE;
      case 'business':
        return '/images/default-business.jpg';
      default:
        return '/images/placeholder.jpg';
    }
  };
})();

// Only define these global functions if they don't already exist
if (typeof window.ImageHandler === 'undefined') {
  /**
   * Image handling utilities for chat interface
   */
  window.ImageHandler = {
    initUpload: function(fileInputId, previewId, onImageSelected) {
      const fileInput = document.getElementById(fileInputId);
      const preview = document.getElementById(previewId);
      
      if (!fileInput || !preview) {
        console.error('Image upload elements not found');
        return;
      }
      
      fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate file
        if (!window.ImageHandler.validateImage(file)) {
          window.ImageHandler.resetInput(fileInput);
          return;
        }
        
        // Show preview
        window.ImageHandler.showPreview(file, preview);
        
        // Call callback if provided
        if (typeof onImageSelected === 'function') {
          onImageSelected(file);
        }
      });
    },
    validateImage: function(file) {
      // Use the global variables instead of redefining constants
      if (file.size > window.IMAGE_UPLOAD_MAX_SIZE) {
        alert(`File too large. Maximum size is ${window.IMAGE_UPLOAD_MAX_SIZE / 1024 / 1024}MB.`);
        return false;
      }
      
      if (!window.ALLOWED_MIME_TYPES.includes(file.type)) {
        alert('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
        return false;
      }
      
      return true;
    },
    showPreview: function(file, previewElement) {
      const reader = new FileReader();
      
      reader.onload = function(e) {
        // If preview element is an img
        if (previewElement.tagName === 'IMG') {
          previewElement.src = e.target.result;
          return;
        }
        
        // Otherwise, look for an img inside the element
        const img = previewElement.querySelector('img');
        if (img) {
          img.src = e.target.result;
        } else {
          // Or create a new img element
          const newImg = document.createElement('img');
          newImg.src = e.target.result;
          newImg.classList.add('preview-image');
          previewElement.innerHTML = '';
          previewElement.appendChild(newImg);
        }
      };
      
      reader.readAsDataURL(file);
    },
    resetInput: function(fileInput) {
      fileInput.value = '';
    },
    formatUrl: function(url) {
      if (!url) return window.DEFAULT_PROFILE_IMAGE;
      
      // Handle S3 URLs
      if (url.includes('amazonaws.com')) {
        return url;
      }
      
      // Handle relative URLs
      if (url.startsWith('/')) {
        return url;
      }
      
      // Fallback
      return window.DEFAULT_PROFILE_IMAGE;
    },
    dataUrlToBlob: function(dataUrl) {
      const arr = dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      
      return new Blob([u8arr], { type: mime });
    }
  };
}

/**
 * Image Handler
 * Handles image loading, errors, and fallbacks
 */

// Store failed image URLs to avoid repeated attempts
window.failedImages = new Set();

// Default profile image path - make sure this file exists!
const DEFAULT_PROFILE_IMAGE = '/images/default-avatar.png';

/**
 * Initialize image error handling for the entire document
 */
function initImageErrorHandling() {
  // Apply to all images with data-fallback attribute
  document.querySelectorAll('img[data-fallback]').forEach(img => {
    setupImageErrorHandler(img);
  });
  
  // Apply specifically to profile pictures
  document.querySelectorAll('.profile-picture, .avatar-image, [data-profile-img]').forEach(img => {
    setupProfileImageHandler(img);
  });
  
  console.log('Image error handling initialized');
}

/**
 * Set up error handling for a specific image
 */
function setupImageErrorHandler(imgElement) {
  if (!imgElement) return;
  
  // Store original src
  const originalSrc = imgElement.src;
  imgElement.setAttribute('data-original-src', originalSrc);
  
  // Set error handler
  imgElement.onerror = function() {
    // Clear the error handler to avoid infinite loops
    this.onerror = null;
    
    // Use specified fallback or default
    const fallback = this.getAttribute('data-fallback') || DEFAULT_PROFILE_IMAGE;
    
    // Log the error - don't change to console.error as that can cause excessive logging
    console.log(`Image failed to load: ${originalSrc}, using fallback: ${fallback}`);
    
    // If not already using fallback, switch to it
    if (this.src !== fallback) {
      this.src = fallback;
      
      // Add class to indicate fallback is in use
      this.classList.add('using-fallback');
      
      // Add to failed images set
      markImageAsFailed(this);
    }
  };
  
  // If image URL is already known to fail, use fallback immediately
  if (originalSrc && window.failedImages && window.failedImages.has(originalSrc)) {
    imgElement.src = imgElement.getAttribute('data-fallback') || DEFAULT_PROFILE_IMAGE;
    imgElement.classList.add('using-fallback');
  }
}

/**
 * Set up handling specifically for profile images
 */
function setupProfileImageHandler(imgElement) {
  if (!imgElement) return;
  
  // Profile images always use the default profile fallback
  imgElement.setAttribute('data-fallback', DEFAULT_PROFILE_IMAGE);
  setupImageErrorHandler(imgElement);
  
  // Add specifically to profile images to ensure fallback works
  imgElement.addEventListener('error', handleImageError);
}

/**
 * Handle image error event
 */
function handleImageError(event) {
  const img = event.target;
  
  // Clear the error handler to prevent infinite loops
  img.removeEventListener('error', handleImageError);
  
  // Get original source if available
  const originalSrc = img.getAttribute('data-original-src') || img.src;
  
  // Log the error
  console.log(`Image failed to load: ${originalSrc}`);
  
  // Use default fallback
  img.src = DEFAULT_PROFILE_IMAGE;
  
  // Mark as failed
  markImageAsFailed(img);
  
  // Add class to indicate fallback is in use
  img.classList.add('using-fallback');
}

/**
 * Mark an image URL as failed to avoid repeated attempts
 */
function markImageAsFailed(imgElement) {
  // Initialize failedImages set if it doesn't exist
  if (!window.failedImages) {
    window.failedImages = new Set();
  }
  
  // Get original source
  const originalSrc = imgElement.getAttribute('data-original-src') || imgElement.src;
  
  // Add to failed images set
  window.failedImages.add(originalSrc);
  
  // Store in localStorage to remember across page loads
  try {
    // Get existing failed images from localStorage
    const storedFailedImages = JSON.parse(localStorage.getItem('failedImages') || '[]');
    
    // Add this URL if not already present
    if (!storedFailedImages.includes(originalSrc)) {
      storedFailedImages.push(originalSrc);
      
      // Store back to localStorage (limit to 100 URLs to prevent excessive storage)
      localStorage.setItem('failedImages', JSON.stringify(
        storedFailedImages.slice(-100)
      ));
    }
  } catch (error) {
    console.error('Error storing failed image in localStorage:', error);
  }
}

/**
 * Fix image URLs to ensure proper paths
 */
function fixImageUrl(url) {
  if (!url) return DEFAULT_PROFILE_IMAGE;
  
  // If the URL already starts with http/https, it's already absolute
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If the URL is just a filename without a path, add the uploads prefix
  if (!url.includes('/')) {
    return `/uploads/profiles/${url}`;
  }
  
  // Otherwise, assume it's a relative path and use as is
  return url;
}

/**
 * Load failed images from localStorage
 */
function loadFailedImagesFromStorage() {
  try {
    const storedFailedImages = JSON.parse(localStorage.getItem('failedImages') || '[]');
    window.failedImages = new Set(storedFailedImages);
    console.log(`Loaded ${window.failedImages.size} known failed images from storage`);
  } catch (error) {
    console.error('Error loading failed images from localStorage:', error);
    window.failedImages = new Set();
  }
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('Image handler loaded');
  loadFailedImagesFromStorage();
  initImageErrorHandling();
  
  // Set up a mutation observer to handle dynamically added images
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(function(node) {
          // Check if the added node is an image or contains images
          if (node.nodeName === 'IMG') {
            setupImageErrorHandler(node);
          } else if (node.querySelectorAll) {
            node.querySelectorAll('img').forEach(function(img) {
              setupImageErrorHandler(img);
            });
          }
        });
      }
    });
  });
  
  // Start observing the document with the configured parameters
  observer.observe(document.body, { childList: true, subtree: true });
});

// Make functions available globally
window.ImageHandler = {
  setupImageErrorHandler,
  setupProfileImageHandler,
  markImageAsFailed,
  fixImageUrl,
  DEFAULT_PROFILE_IMAGE
};
