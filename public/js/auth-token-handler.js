/**
 * Authentication token handler
 * This script ensures consistent handling of authentication tokens
 */

(function() {
  // Check for token in URL parameters (for redirects from OAuth flows)
  function checkUrlForToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      console.log('Token found in URL, storing in localStorage');
      localStorage.setItem('token', token);
      
      // Remove token from URL to avoid sharing it accidentally
      urlParams.delete('token');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, document.title, newUrl);
      
      return true;
    }
    
    return false;
  }
    // Ensure token is in cookies for server-side auth
  function syncTokenToCookie() {
    const token = localStorage.getItem('token');
    
    if (token) {
      // Set token as cookie with secure settings based on protocol
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      const expiryTime = new Date(Date.now() + (4 * 60 * 60 * 1000)); // 4 hours
      document.cookie = `token=${token}; expires=${expiryTime.toUTCString()}; path=/; SameSite=Lax${secure}`;
      console.log('Token synced to cookie');
      return true;
    }
    
    return false;
  }
  
  // Add token to request headers
  function addTokenToFetchRequests() {
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
      // Initialize headers if not present
      options = options || {};
      options.headers = options.headers || {};
      
      // Convert Headers object to plain object if needed
      if (options.headers instanceof Headers) {
        const plainHeaders = {};
        for (const [key, value] of options.headers.entries()) {
          plainHeaders[key] = value;
        }
        options.headers = plainHeaders;
      }
      
      // Add token to Authorization header if not already present
      const token = localStorage.getItem('token');
      if (token && !options.headers['Authorization']) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Make the request with token
      return originalFetch(url, options);
    };
  }
  
  // Check authentication status and redirect if needed
  function checkAuthAndRedirect() {
    const protectedPaths = ['/profile', '/dashboard', '/post-business', '/saved-searches'];
    const currentPath = window.location.pathname;
    
    // Check if current path is protected
    const isProtectedPath = protectedPaths.some(path => currentPath.startsWith(path));
    
    if (isProtectedPath) {
      const token = localStorage.getItem('token');
      
      if (!token) {
        // Redirect to login if token not found
        console.log('No token found, redirecting to login');
        window.location.href = `/login2?returnTo=${encodeURIComponent(currentPath)}`;
        return;
      }
        // Validate token with the server
      fetch('/api/verify-token', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Token validation failed');
        }
        return response.json();
      })
      .then(data => {
        if (!data.valid || !data.userId) {
          console.log('Token invalid, redirecting to login');
          localStorage.removeItem('token');
          document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          window.location.href = `/login2?returnTo=${encodeURIComponent(currentPath)}`;
        } else {
          console.log('Token validated successfully for user:', data.userId);
        }
      })
      .catch(error => {
        console.error('Token validation error:', error);
        localStorage.removeItem('token');
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        window.location.href = `/login2?returnTo=${encodeURIComponent(currentPath)}`;
      });
    }
  }
  
  /**
   * Verify token validity
   * This helps prevent using expired or invalid tokens
   */
  function verifyToken(token) {
    if (!token) return false;
    
    // Basic structure verification
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    try {
      // Decode the payload part (index 1)
      const payload = JSON.parse(atob(parts[1]));
      
      // Check expiration
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        console.log('Token expired');
        return false;
      }
      
      return true;
    } catch (e) {
      console.error('Token verification failed:', e);
      return false;
    }
  }
  
  /**
   * Ensure consistent token presence across localStorage, cookies, and meta tags
   */
  function ensureTokenConsistency() {
    const token = localStorage.getItem('token');
    
    if (token && verifyToken(token)) {
      // Update cookie if needed
      const cookieToken = getCookie('token');
      if (token !== cookieToken) {
        document.cookie = `token=${token}; path=/; max-age=14400`; // 4 hours
      }
      
      // Let the application know the auth state
      dispatchAuthEvent(true, token);
    } else {
      // Clear invalid token
      if (token) {
        localStorage.removeItem('token');
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        dispatchAuthEvent(false, null);
      }
    }
  }
  
  /**
   * Dispatch auth state change event for other scripts to listen
   */
  function dispatchAuthEvent(authenticated, token) {
    const event = new CustomEvent('auth-state-changed', {
      detail: {
        authenticated,
        token
      }
    });
    window.dispatchEvent(event);
  }
  
  /**
   * Get cookie by name
   */
  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }
    // Enhanced init function
  function init() {
    // Check for token in URL first (high priority for OAuth flows)
    const tokenInUrl = checkUrlForToken();
    const tokenInLocalStorage = !!localStorage.getItem('token');
    
    // Always ensure token synchronization
    if (tokenInUrl || tokenInLocalStorage) {
      syncTokenToCookie();
      addTokenToFetchRequests();
      
      // Verify token and ensure consistency
      ensureTokenConsistency();
    }
    
    // For protected pages, check auth status - but give a small delay if token was just found in URL
    if (tokenInUrl) {
      // Small delay to allow token to be processed
      setTimeout(() => {
        checkAuthAndRedirect();
      }, 100);
    } else {
      checkAuthAndRedirect();
    }
    
    // Periodically check token validity
    setInterval(ensureTokenConsistency, 60000); // Check every minute
  }
  
  // Run when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Export functions
  window.authTokenHandler = {
    checkUrlForToken,
    syncTokenToCookie,
    checkAuthAndRedirect,
    verifyToken,
    ensureTokenConsistency
  };
})();
