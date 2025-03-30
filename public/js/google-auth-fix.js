/**
 * Google Sign-In error handling and configuration fix
 * This script addresses the "origin not allowed" error with Google Sign-In
 */

(function() {
  // Function to check and fix Google Sign-In configuration
  function fixGoogleSignIn() {
    // Check if Google API is loaded
    if (typeof window.gapi === 'undefined' || !window.google) {
      console.log('Google API not loaded yet, will retry');
      return;
    }

    // Get the current domain/origin
    const currentOrigin = window.location.origin;
    
    // Debug information
    console.log('Current origin:', currentOrigin);
    
    // Set the correct client ID based on environment
    const clientIdMeta = document.querySelector('meta[name="google-signin-client_id"]');
    if (!clientIdMeta) {
      console.error('Google client ID meta tag not found - add it to your HTML head section');
      // Try to create one with the client ID from environment
      const clientId = window.googleClientId || localStorage.getItem('googleClientId');
      if (clientId) {
        const meta = document.createElement('meta');
        meta.name = 'google-signin-client_id';
        meta.content = clientId;
        document.head.appendChild(meta);
        console.log('Added Google client ID meta tag dynamically');
      }
    }
    
    // Add event listener for Google Sign-In errors
    window.addEventListener('error', function(event) {
      // Check if this is a Google Sign-In error about origins
      if (event.message && (
          event.message.includes('The given origin is not allowed') || 
          event.message.includes('GSI_LOGGER'))) {
        
        console.warn('Google Sign-In origin error detected');
        
        // Show user-friendly message
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'position:fixed; top:10px; right:10px; background:#f8d7da; color:#721c24; padding:10px; border-radius:5px; z-index:9999;';
        errorDiv.innerHTML = `
          <strong>Google Sign-In Error</strong>
          <p>The current domain is not configured for Google Sign-In.</p>
          <p>Please add "${currentOrigin}" to the allowed origins in your Google Cloud Console.</p>
          <button id="dismiss-gsi-error" style="background:#721c24; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;">Dismiss</button>
        `;
        document.body.appendChild(errorDiv);
        
        document.getElementById('dismiss-gsi-error').addEventListener('click', function() {
          errorDiv.remove();
        });
        
        // Disable Google Sign-In button to prevent further errors
        const googleButtons = document.querySelectorAll('.google-signin-button, [data-provider="google"]');
        googleButtons.forEach(button => {
          button.disabled = true;
          button.title = 'Google Sign-In not available - domain not configured';
          button.classList.add('disabled');
        });
      }
    }, true); // Use capture phase to catch errors before they propagate
  }
  
  // Run when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixGoogleSignIn);
  } else {
    fixGoogleSignIn();
  }
  
  // Also run when Google API is loaded (in case it loads after this script)
  window.addEventListener('load', fixGoogleSignIn);
  
  // Export function to global scope for manual triggering
  window.fixGoogleSignIn = fixGoogleSignIn;
})();

