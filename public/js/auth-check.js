// Enhanced auth-check.js for reliable authentication across the application
// This script ensures all API requests have proper authentication headers

(function() {
  // Track the last known authentication state
  let lastAuthState = {
    token: null,
    sessionId: null,
    lastCheck: 0
  };
  
  // Function to get token from various sources
  function getAuthToken() {
    // Try localStorage first (most common)
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (token) return token;
    
    // Try session storage as fallback
    const sessionToken = sessionStorage.getItem('token');
    if (sessionToken) return sessionToken;
    
    // Try to get from cookie
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.startsWith('token=')) {
        return cookie.substring(6);
      }
    }
    
    return null;
  }
  
  // Function to check if user is authenticated
  function isAuthenticated() {
    const token = getAuthToken();
    return !!token;
  }
  
  // Check and fix authentication headers before each fetch request
  const originalFetch = window.fetch;
  window.fetch = function(url, options = {}) {
    // Skip for certain static resources
    if (typeof url === 'string' && (
        url.match(/\.(css|js|png|jpg|gif|svg|ico|woff|woff2)(\?.*)?$/) ||
        url.includes('/auth/login') ||
        url.includes('/auth/register')
      )) {
      return originalFetch(url, options);
    }
    
    // Only add auth header if this is likely an API request to our domain
    // or if this is a relative URL (same domain)
    const isRelativeUrl = typeof url === 'string' && !url.startsWith('http');
    const isSameDomain = typeof url === 'string' && (
      url.startsWith(window.location.origin) ||
      url.startsWith('/')
    );
    
    // Initialize headers if not present
    if (!options.headers) {
      options.headers = {};
    }
    
    // Convert Headers object to plain object if needed
    if (options.headers instanceof Headers) {
      const plainHeaders = {};
      for (const [key, value] of options.headers.entries()) {
        plainHeaders[key] = value;
      }
      options.headers = plainHeaders;
    }
    
    // If this is our API or a relative URL, add authentication
    if (isRelativeUrl || isSameDomain) {
      const token = getAuthToken();
      
      // If we have a token and no Authorization header is set yet
      if (token && !options.headers['Authorization']) {
        options.headers['Authorization'] = `Bearer ${token}`;
        
        // For credentials, ensure cookies are sent
        options.credentials = 'include';
      }
    }
    
    // Make the original fetch call with our enhanced options
    return originalFetch(url, options);
  };
  
  // Function to refresh the session periodically
  function keepSessionAlive() {
    // Only attempt if we have a token
    const token = getAuthToken();
    if (!token) return;
    
    // Only check every 5 minutes
    const now = Date.now();
    if (now - lastAuthState.lastCheck < 5 * 60 * 1000) return;
    
    lastAuthState.lastCheck = now;
    
    // Make a lightweight call to the server to keep session alive
    fetch('/api/auth/check', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })
    .then(response => {
      if (!response.ok && response.status === 401) {
        // Token is no longer valid, clear it
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      }
    })
    .catch(err => {
      console.warn('Session check failed:', err);
    });
  }
  
  // Initialize session check on page load
  document.addEventListener('DOMContentLoaded', function() {
    // Initial session check
    keepSessionAlive();
    
    // Set up periodic session check
    setInterval(keepSessionAlive, 10 * 60 * 1000); // Every 10 minutes
    
    // Also check when user becomes active after being idle
    document.addEventListener('mousemove', function() {
      keepSessionAlive();
    }, { passive: true, once: true });
    
    // Add token to any forms that might need it
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      // Skip login/register forms
      if (form.id === 'loginForm' || form.id === 'registerForm') return;
      
      // Check if it's missing our token field
      if (!form.querySelector('input[name="_token"]')) {
        const token = getAuthToken();
        if (token) {
          const tokenInput = document.createElement('input');
          tokenInput.type = 'hidden';
          tokenInput.name = '_token';
          tokenInput.value = token;
          form.appendChild(tokenInput);
        }
      }
    });
  });
  
  // Expose auth utilities to global scope
  window.AuthCheck = {
    getToken: getAuthToken,
    isAuthenticated: isAuthenticated,
    refreshSession: keepSessionAlive
  };
})();

/**
 * Client-side authentication check and redirect loop prevention
 */

(function() {
  // Run on page load
  window.addEventListener('DOMContentLoaded', function() {
    // Check if this is a login page
    const isLoginPage = window.location.pathname.includes('/login') || 
                        window.location.pathname.includes('/auth/login') ||
                        window.location.pathname.includes('/signup');
    
    if (isLoginPage) {
      // Parse the URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      let returnTo = urlParams.get('returnTo') || urlParams.get('returnUrl') || urlParams.get('redirect');
      
      if (returnTo) {
        try {
          // Decode the return URL
          returnTo = decodeURIComponent(returnTo);
          
          // Check if it points to another login page
          if (returnTo.includes('/login') || 
              returnTo.includes('/signup') || 
              returnTo.includes('/auth/login')) {
            
            console.warn('Detected client-side redirect loop:', returnTo);
            
            // Remove the problematic parameter from URL
            urlParams.delete('returnTo');
            urlParams.delete('returnUrl');
            urlParams.delete('redirect');
            
            // Set a safe return URL
            urlParams.set('returnTo', '/');
            
            // Update the URL without reloading the page
            const newUrl = window.location.pathname + '?' + urlParams.toString();
            window.history.replaceState({}, document.title, newUrl);
            
            // Update any form actions if present
            const loginForms = document.querySelectorAll('form[action*="login"]');
            loginForms.forEach(form => {
              const formAction = form.getAttribute('action');
              if (formAction && formAction.includes('returnTo=')) {
                const cleanAction = formAction.replace(/(returnTo|returnUrl|redirect)=([^&]+)/, '$1=%2F');
                form.setAttribute('action', cleanAction);
              }
            });
          }
        } catch (e) {
          console.error('Error processing return URL:', e);
        }
      }
    }
  });
})();

/**
 * Utility functions to check authentication status
 */

// Function to check if user appears to be logged in based on cookies/localStorage
function checkUserLoggedIn() {
    // Check for authentication tokens in localStorage or cookies
    const hasAuthToken = Boolean(
        localStorage.getItem('authToken') || 
        document.cookie.includes('authToken=') || 
        document.cookie.includes('connect.sid=')
    );
    
    console.log(`Auth check: User appears ${hasAuthToken ? 'logged in' : 'not logged in'}`);
    return hasAuthToken;
}

// Make available globally
window.checkUserLoggedIn = checkUserLoggedIn;
