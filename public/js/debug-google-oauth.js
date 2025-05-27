/**
 * Debug script for Google OAuth issues
 * This script helps diagnose common Google OAuth problems
 */

// Self-executing function to avoid global pollution
(function() {
  // Debug info collector
  const debugInfo = {
    userAgent: navigator.userAgent,
    windowSize: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    cookiesEnabled: navigator.cookieEnabled,
    hasLocalStorage: !!window.localStorage,
    hasSessionStorage: !!window.sessionStorage,
    googleApiLoaded: false,
    googleAccountsLoaded: false,
    origin: window.location.origin,
    href: window.location.href,
    referrer: document.referrer,
    googleClientId: null,
    allowedOrigins: [],
    browserFeatures: {},
    timestamp: new Date().toISOString()
  };

  // Try to get Google client ID from meta or config
  try {
    debugInfo.googleClientId = document.querySelector('meta[name="google-client-id"]')?.content || 
                              (window.config && window.config.GOOGLE_CLIENT_ID);
  } catch (e) {
    debugInfo.googleClientIdError = e.message;
  }
  
  // Check for popups support
  try {
    const popup = window.open('', '_blank', 'width=10,height=10');
    if (popup) {
      debugInfo.browserFeatures.popupsAllowed = true;
      popup.close();
    } else {
      debugInfo.browserFeatures.popupsAllowed = false;
    }
  } catch (e) {
    debugInfo.browserFeatures.popupsAllowed = false;
    debugInfo.browserFeatures.popupError = e.message;
  }

  // Check for third-party cookies (relevant for cross-origin iframes)
  debugInfo.browserFeatures.thirdPartyCookiesBlocked = document.cookie.indexOf('_gac') === -1;
  
  // Check for postMessage support
  debugInfo.browserFeatures.postMessageSupported = !!window.postMessage;

  // Listen for Google API load event
  window.addEventListener('load', function() {
    setTimeout(() => {
      debugInfo.googleApiLoaded = typeof window.gapi !== 'undefined';
      debugInfo.googleAccountsLoaded = !!(window.google && window.google.accounts);
      
      // Check for Google One Tap patch status
      debugInfo.googlePatchApplied = !!window._patchedGoogleOneTap;
      
      // Check if Google client is properly initialized
      if (window.google && window.google.accounts && window.google.accounts.id) {
        try {
          // This is just a check to see if the API is responding
          const hasGetContextMethod = typeof window.google.accounts.id.getContext === 'function';
          debugInfo.googleInitialized = hasGetContextMethod;
        } catch (e) {
          debugInfo.googleInitializeError = e.message;
        }
      }
      
      // Log complete debug info
      console.log('Google OAuth Debug Info:', debugInfo);
      
      // Show any detected issues
      const issues = detectIssues(debugInfo);
      if (issues.length > 0) {
        console.warn('Google OAuth Potential Issues:');
        issues.forEach((issue, i) => console.warn(`${i+1}. ${issue}`));
      }
    }, 2000); // Wait 2 seconds for APIs to load
  });

  // Function to detect common issues
  function detectIssues(info) {
    const issues = [];
    
    if (!info.googleApiLoaded) {
      issues.push('Google API failed to load. Check your network connection and content blockers.');
    }
    
    if (!info.googleAccountsLoaded) {
      issues.push('Google Accounts API failed to load. Check your network connection and content blockers.');
    }
    
    if (!info.googleClientId) {
      issues.push('Google Client ID not found. Check if it\'s properly configured.');
    }
    
    if (!info.googlePatchApplied) {
      issues.push('Google OAuth patch not applied. Fix script might not be working correctly.');
    }
    
    if (!info.browserFeatures.popupsAllowed) {
      issues.push('Popup windows are blocked. Please allow popups for this site.');
    }
    
    if (info.browserFeatures.thirdPartyCookiesBlocked) {
      issues.push('Third-party cookies may be blocked, which can affect OAuth flows.');
    }
    
    // Check for iframe issues (OAuth can have problems in iframes)
    if (window !== window.top) {
      issues.push('Page is running in an iframe, which can cause OAuth issues.');
    }
    
    // Check if origin is localhost (development environment)
    if (info.origin.includes('localhost')) {
      issues.push('Running on localhost. Make sure your Google Client ID is configured for localhost.');
    }
    
    return issues;
  }
  
  // Add listener for postMessage events to debug cross-window communication
  window.addEventListener('message', function(event) {
    if (
      event.data && 
      typeof event.data === 'object' && 
      (event.data.type === 'webpackOk' || event.data.type === 'webpackInvalid')
    ) {
      // Ignore webpack dev server messages
      return;
    }
    
    if (
      event.origin.includes('google') || 
      event.origin.includes('gstatic') || 
      event.origin === window.location.origin
    ) {
      console.log('OAuth postMessage:', {
        origin: event.origin,
        data: event.data
      });
    }
  });
  
  // Expose debug functions to the window for console access
  window.googleOAuthDebug = {
    getInfo: () => debugInfo,
    detectIssues: () => detectIssues(debugInfo),
    checkPopup: () => {
      try {
        const popup = window.open('about:blank', 'oauth-test', 'width=400,height=400');
        if (popup) {
          popup.document.write('<html><body><h1>Popup Test</h1><p>Popups are working correctly. You can close this window.</p></body></html>');
          return true;
        }
        return false;
      } catch (e) {
        console.error('Popup test failed:', e);
        return false;
      }
    }
  };
})();
