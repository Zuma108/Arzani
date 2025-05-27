/**
 * Google OAuth Fix for "Cannot read properties of null (reading 'postMessage')" Error
 * 
 * This script fixes issues with the Google OAuth popup and provides better error handling.
 * It addresses the specific issue with the transform_layer_library postMessage error
 * by ensuring the OAuth popup is properly initialized and maintained.
 */

// Initialize tracking variables
window.googleOAuthPopupErrors = 0;
window.lastGoogleOAuthAttempt = 0;
window.googleOAuthPopups = [];

// Log script load
console.log('Google Identity Services loaded successfully');

// Function to safely check if a window is closed
function isWindowClosed(win) {
  try {
    return win.closed;
  } catch (e) {
    return true;
  }
}

// Patch Google One Tap to prevent common popup errors
function patchGoogleOneTap() {
  if (!window._patchedGoogleOneTap && window.google && window.google.accounts) {
    // Store original initialization function for reference
    const originalInitialize = window.google.accounts.id.initialize;
    
    // Override with safer version
    window.google.accounts.id.initialize = function(config) {
      console.log('Patched Google OAuth initialize() called');
      
      // Check if client ID is valid
      if (!config.client_id) {
        console.error('Missing client_id in Google OAuth configuration');
        return;
      }
      
      // Add improved error handling and safe defaults
      const enhancedConfig = {
        ...config,
        cancel_on_tap_outside: true,
        itp_support: true,
        context: 'signin',
        ux_mode: config.ux_mode || 'popup',
        use_fedcm_for_prompt: false // Disable Chrome's FedCM for more consistent behavior
      };
      
      // Explicitly set allowed origins to prevent "Origin not allowed" errors
      if (!enhancedConfig.allowed_parent_origin) {
        enhancedConfig.allowed_parent_origin = window.location.origin;
      }
      
      // Add extra check for browser compatibility
      const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
      const isEdge = navigator.userAgent.indexOf("Edg") > -1;
      
      // Store browser info for debugging
      window.googleOAuthBrowserInfo = { isChrome, isSafari, isFirefox, isEdge };
      
      // Safari and Firefox need special handling for popup interactions
      if (isSafari || isFirefox) {
        enhancedConfig.use_fedcm_for_prompt = false;
        // Use redirect for Safari to avoid popup issues
        if (isSafari) {
          console.log('Safari detected, adjusting configuration');
          enhancedConfig.ux_mode = 'redirect';
        }
      }
      
      // Check if we're running in a valid context
      try {
        // Test window.opener access (will throw in some cross-origin contexts)
        if (window.opener && window.opener !== window) {
          console.log('Running in popup context - adjusting configuration');
          enhancedConfig.ux_mode = 'redirect';
        }
      } catch (e) {
        console.warn('Cross-origin restriction detected, adjusting configuration', e);
        enhancedConfig.ux_mode = 'redirect';
      }
      
      // Track initialization
      window.googleOAuthInitialized = true;
      window.googleOAuthConfig = enhancedConfig;
      
      // Call original with enhanced config
      return originalInitialize.call(this, enhancedConfig);
    };
    
    // Patch the prompt method to better handle popup window tracking
    const originalPrompt = window.google.accounts.id.prompt;
    window.google.accounts.id.prompt = function(momentListener) {
      console.log('Patched Google OAuth prompt() called');
      
      try {
        // Clean up any orphaned popups before creating new ones
        window.googleOAuthPopups = window.googleOAuthPopups || [];
        window.googleOAuthPopups.forEach(popup => {
          try {
            if (!isWindowClosed(popup)) {
              popup.close();
            }
          } catch (e) {
            // Ignore errors with inaccessible windows
          }
        });
        window.googleOAuthPopups = [];
        
        // Call the original prompt method
        const result = originalPrompt.call(this, momentListener);
        
        // Set up a timer to check for the popup's existence
        // This helps detect when the popup is blocked or closed
        setTimeout(() => {
          const popups = [];
          // Look for new popup windows
          for (let i = 0; i < window.opener?.length || 0; i++) {
            try {
              const popup = window.opener[i];
              if (popup && !isWindowClosed(popup)) {
                popups.push(popup);
              }
            } catch (e) {
              // Skip inaccessible windows
            }
          }
          window.googleOAuthPopups = popups;
        }, 500);
        
        return result;
      } catch (e) {
        console.error('Error in patched prompt method:', e);
        // Fall back to original behavior
        return originalPrompt.call(this, momentListener);
      }
    };
    
    // Also patch the renderButton to fix width issues
    const originalRenderButton = window.google.accounts.id.renderButton;
    window.google.accounts.id.renderButton = function(parent, options) {
      // Fix width parameter if percentage is used
      if (options && options.width && typeof options.width === 'string' && 
          options.width.includes('%')) {
        console.log('Converting percentage width to pixels for Google Sign-In button');
        options.width = 250; // Default to a sensible pixel value
      }
      return originalRenderButton.call(this, parent, options);
    };
    
    // Mark as patched to prevent double-patching
    window._patchedGoogleOneTap = true;
    console.log('Google OAuth patched successfully');
  }
}

// Enhanced error handler for Google Sign-In
function handleGoogleSignInError(error, buttonElement) {
  console.error('Google Sign-In error:', error);
  
  // Increment error counter
  window.googleOAuthPopupErrors++;
  
  // Show error in button if it exists
  if (buttonElement) {
    buttonElement.innerHTML = `
      <div style="color: red; text-align: center">
        Google Sign-In failed.${window.googleOAuthPopupErrors > 1 ? ' Try clicking the button again.' : ''}
        <div style="font-size: 0.8em; margin-top: 5px;">${error.message || 'Unknown error'}</div>
      </div>
    `;
    
    // Attempt to re-render the button after delay
    setTimeout(() => {
      try {
        if (window.google && window.google.accounts) {
          google.accounts.id.renderButton(buttonElement, {
            theme: 'outline',
            size: 'large',
            shape: 'rectangular',
            text: 'continue_with',
            logo_alignment: 'left',
            width: '100%'
          });
        } else {
          buttonElement.innerHTML = '<div style="color: orange">Google Sign-In unavailable</div>';
        }
      } catch (e) {
        console.error('Error re-rendering Google Sign-In button:', e);
        buttonElement.innerHTML = '<div style="color: orange">Google Sign-In unavailable. Please reload the page.</div>';
      }
    }, 3000);
  }
  
  // If we've had multiple failures, consider reloading
  if (window.googleOAuthPopupErrors > 3) {
    if (confirm('Google Sign-In is having problems. Would you like to reload the page?')) {
      window.location.reload();
    }
  }
}

// Global event listener to catch uncaught Google OAuth errors
window.addEventListener('error', function(event) {
  if (
    event.error && 
    (event.error.message?.includes('postMessage') || 
     event.error.message?.includes('Cannot read properties of null') ||
     event.error.stack?.includes('transform_layer_library'))
  ) {
    console.warn('Caught Google OAuth related error:', event.error);
    
    // Check for rate limiting
    const now = Date.now();
    if (now - window.lastGoogleOAuthAttempt < 3000) {
      console.warn('Too many OAuth attempts in short period - throttling');
      return;
    }
    
    window.lastGoogleOAuthAttempt = now;
    
    // Try to find the Google signin button
    const googleBtn = document.getElementById('google-signin-btn');
    if (googleBtn) {
      handleGoogleSignInError(event.error, googleBtn);
    }
    
    // Attempt to fix the transform_layer_library issue by specifically
    // checking for broken postMessage references
    if (event.error.message?.includes('postMessage') || 
        event.error.message?.includes('Cannot read properties of null')) {
      
      // Check for orphaned popups or iframes that might be causing the issue
      const fixAttempt = fixOrphanedPostMessageTargets();
      
      if (fixAttempt) {
        console.log('Applied postMessage fix - attempting to continue OAuth flow');
        
        // Try to restart Google sign-in if it was interrupted
        setTimeout(() => {
          if (window.google && window.google.accounts) {
            try {
              // Re-prompt for sign-in
              google.accounts.id.prompt();
            } catch (e) {
              console.error('Failed to restart Google sign-in:', e);
            }
          }
        }, 1000);
      }
    }
    
    // Prevent default error handling
    event.preventDefault();
  }
});

// Function to fix orphaned postMessage targets
function fixOrphanedPostMessageTargets() {
  let fixApplied = false;
  
  try {
    // Check any open popups
    if (window.googleOAuthPopups && window.googleOAuthPopups.length > 0) {
      window.googleOAuthPopups.forEach(popup => {
        try {
          if (!isWindowClosed(popup)) {
            // The popup exists but might have lost its connection
            // Close it to prevent orphaned state
            popup.close();
            fixApplied = true;
          }
        } catch (e) {
          // Ignore errors with inaccessible windows
        }
      });
      window.googleOAuthPopups = [];
    }
    
    // Check for orphaned iframes from Google Sign-In
    const googleIframes = document.querySelectorAll('iframe[src*="accounts.google.com"]');
    if (googleIframes.length > 0) {
      console.log('Found Google iframe elements:', googleIframes.length);
      
      // Remove any non-functional iframes to allow fresh ones to be created
      googleIframes.forEach(iframe => {
        try {
          // Check if the iframe is stale (older than 60 seconds)
          const iframeTime = iframe.getAttribute('data-create-time');
          if (iframeTime && (Date.now() - parseInt(iframeTime)) > 60000) {
            iframe.parentNode.removeChild(iframe);
            fixApplied = true;
          }
        } catch (e) {
          console.error('Error removing iframe:', e);
        }
      });
    }
    
    return fixApplied;
  } catch (e) {
    console.error('Error in fixOrphanedPostMessageTargets:', e);
    return false;
  }
}

// Apply the patch when the script loads
document.addEventListener('DOMContentLoaded', function() {
  patchGoogleOneTap();
  
  // Schedule periodic checks to make sure the patch is applied
  // This handles cases where the Google library loads after our script
  const patchInterval = setInterval(() => {
    if (window.google && window.google.accounts && !window._patchedGoogleOneTap) {
      console.log('Applying delayed patch to Google OAuth');
      patchGoogleOneTap();
    }
    
    // Stop checking after 30 seconds
    if (document.readyState === 'complete' && window._patchedGoogleOneTap) {
      clearInterval(patchInterval);
    }
  }, 1000);
  
  // Add create time attribute to any Google iframes
  // This helps identify stale iframes
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.tagName === 'IFRAME' && 
              node.src && 
              node.src.includes('accounts.google.com')) {
            node.setAttribute('data-create-time', Date.now().toString());
          }
        });
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
});
