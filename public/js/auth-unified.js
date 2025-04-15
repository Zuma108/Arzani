/**
 * Unified Client-Side Authentication Utility
 * This file consolidates all client-side authentication functionality
 * to ensure consistent behavior across the application.
 */

// Use IIFE to avoid polluting global namespace
(function() {
  // Internal state tracking
  const state = {
    token: null,
    userId: null,
    tokenExpiry: null,
    lastCheck: 0,
    redirectHistory: []
  };

  //=======================================
  // Token Management Functions
  //=======================================

  /**
   * Extract token from all possible storage locations
   * @returns {string|null} JWT token or null if not found
   */
  function getToken() {
    // Try localStorage first (most common)
    const localToken = localStorage.getItem('token');
    if (localToken) return localToken;
    
    // Try sessionStorage as fallback
    const sessionToken = sessionStorage.getItem('token');
    if (sessionToken) return sessionToken;
    
    // Try cookie
    const cookieToken = getCookie('token');
    if (cookieToken) return cookieToken;
    
    // Try meta tag (sometimes used for server-rendered pages)
    const metaToken = document.querySelector('meta[name="auth-token"]')?.content;
    if (metaToken) return metaToken;
    
    return null;
  }

  /**
   * Get cookie by name
   * @param {string} name - Cookie name
   * @returns {string|null} Cookie value or null if not found
   */
  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  /**
   * Store token across all storage mechanisms for consistent access
   * @param {string} token - JWT token
   */
  function storeToken(token) {
    if (!token) return;
    
    try {
      // Clean up in case token is invalid
      cleanupInvalidTokens();
      
      // Store in localStorage as primary storage
      localStorage.setItem('token', token);
      
      // Store in sessionStorage for tab-specific state
      sessionStorage.setItem('token', token);
      
      // Store in cookie for server-side access
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      const sameSite = 'Lax'; // Less restrictive than Strict but still secure
      document.cookie = `token=${token}; path=/; max-age=14400${secure}; SameSite=${sameSite}`;
      
      // Parse token to get expiry and user ID
      const payload = parseJwt(token);
      if (payload) {
        state.token = token;
        state.userId = payload.userId;
        state.tokenExpiry = payload.exp ? new Date(payload.exp * 1000) : null;
      }
      
      // Set up fetch interceptor for auto-authentication
      setupFetchInterceptor(token);
      
      // Dispatch auth state change event
      dispatchAuthEvent(true, token);
      
      console.log('Token synchronized across storage mechanisms');
    } catch (error) {
      console.error('Error storing token:', error);
    }
  }

  /**
   * Parse JWT token to extract payload
   * @param {string} token - JWT token
   * @returns {Object|null} Token payload or null if invalid
   */
  function parseJwt(token) {
    if (!token) return null;
    
    try {
      // Split token parts
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      // Base64 decode the payload (middle part)
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error parsing JWT:', error);
      return null;
    }
  }

  /**
   * Clean up any invalid tokens from storage
   */
  function cleanupInvalidTokens() {
    try {
      const localToken = localStorage.getItem('token');
      const sessionToken = sessionStorage.getItem('token');
      const cookieToken = getCookie('token');
      
      // Check localStorage token
      if (localToken && !isTokenValid(localToken)) {
        localStorage.removeItem('token');
      }
      
      // Check sessionStorage token
      if (sessionToken && !isTokenValid(sessionToken)) {
        sessionStorage.removeItem('token');
      }
      
      // Check cookie token
      if (cookieToken && !isTokenValid(cookieToken)) {
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      }
    } catch (error) {
      console.error('Error cleaning up invalid tokens:', error);
    }
  }

  /**
   * Clear all auth data on logout
   */
  function clearAuthData() {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    // Reset state
    state.token = null;
    state.userId = null;
    state.tokenExpiry = null;
    
    // Dispatch auth state change event
    dispatchAuthEvent(false, null);
  }

  //=======================================
  // Authentication Verification Functions
  //=======================================

  /**
   * Check if the user is authenticated
   * @returns {boolean} True if authenticated, false otherwise
   */
  function isAuthenticated() {
    const token = getToken();
    if (!token) return false;
    
    // Verify token validity
    return isTokenValid(token);
  }

  /**
   * Check if token is valid (not expired and proper format)
   * @param {string} token - JWT token
   * @returns {boolean} True if valid, false otherwise
   */
  function isTokenValid(token) {
    if (!token) return false;
    
    try {
      // Check token structure
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      // Parse payload
      const payload = parseJwt(token);
      if (!payload) return false;
      
      // Check if token has expired
      if (payload.exp) {
        const expiryDate = new Date(payload.exp * 1000);
        if (expiryDate <= new Date()) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  /**
   * Refresh authentication token
   * @returns {Promise<boolean>} Promise resolving to true if token refreshed, false otherwise
   */
  async function refreshToken() {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }
      
      const data = await response.json();
      
      if (data.success && data.token) {
        storeToken(data.token);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  /**
   * Verify token with server
   * @returns {Promise<boolean>} Promise resolving to true if token is valid, false otherwise
   */
  async function verifyTokenWithServer() {
    const token = getToken();
    if (!token) return false;
    
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      return data.authenticated || false;
    } catch (error) {
      console.error('Token server verification error:', error);
      return false;
    }
  }

  //=======================================
  // Navigation & Redirect Protection
  //=======================================

  /**
   * Check URL for token parameter and extract it
   * Useful for OAuth flows that return tokens in URL
   */
  function checkUrlForToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      console.log('Token found in URL, storing');
      storeToken(token);
      
      // Remove token from URL to avoid security issues
      urlParams.delete('token');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, document.title, newUrl);
      
      return true;
    }
    
    return false;
  }

  /**
   * Sanitize redirect URL to prevent redirect loops
   * @param {string} url - URL to sanitize
   * @returns {string} Sanitized URL
   */
  function sanitizeRedirectUrl(url) {
    if (!url) return '/';
    
    // Decode URL if it's encoded
    try {
      url = decodeURIComponent(url);
    } catch (e) {
      // If decoding fails, use as is
    }
    
    // Check if this is a login/signup page
    if (url.match(/\/(login2?|signup|auth\/login|auth\/signup)/i)) {
      console.log('Prevented redirect to auth page:', url);
      
      // Check for nested returnTo parameter
      const match = url.match(/[?&](returnTo|returnUrl|redirect)=([^&]+)/);
      if (match && match[2]) {
        try {
          const nestedUrl = decodeURIComponent(match[2]);
          return sanitizeRedirectUrl(nestedUrl);
        } catch (e) {
          // If nested URL is invalid, fall back to root
          return '/';
        }
      }
      
      // Default to marketplace if no valid nested URL found
      return '/marketplace2';
    }
    
    // If URL is absolute, only allow our own domain
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
      // Extract domain
      const a = document.createElement('a');
      a.href = url;
      const domain = a.hostname;
      
      // Only allow our domain
      if (domain !== window.location.hostname) {
        console.log('Prevented redirect to external domain:', domain);
        return '/';
      }
    }
    
    return url;
  }

  /**
   * Track redirect to detect loops
   * @param {string} url - Target URL
   * @returns {boolean} True if a loop was detected
   */
  function detectRedirectLoop(url) {
    // Add to history
    state.redirectHistory.push(url);
    
    // Keep history at reasonable size
    if (state.redirectHistory.length > 5) {
      state.redirectHistory.shift();
    }
    
    // Check for three consecutive identical redirects
    if (state.redirectHistory.length >= 3) {
      const last = state.redirectHistory[state.redirectHistory.length - 1];
      const secondLast = state.redirectHistory[state.redirectHistory.length - 2];
      const thirdLast = state.redirectHistory[state.redirectHistory.length - 3];
      
      if (last === secondLast && secondLast === thirdLast) {
        console.warn('Redirect loop detected:', state.redirectHistory);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check authentication before navigation
   * @param {string} url - Target URL
   * @returns {string} Processed URL
   */
  function preNavigationAuthCheck(url) {
    // Sanitize the URL first
    const sanitizedUrl = sanitizeRedirectUrl(url);
    
    // Check for redirect loops
    if (detectRedirectLoop(sanitizedUrl)) {
      console.log('Breaking redirect loop, redirecting to marketplace');
      state.redirectHistory = []; // Clear history
      return '/marketplace2';
    }
    
    // If navigating to auth pages and already logged in, redirect to marketplace
    if (sanitizedUrl.match(/\/(login2?|signup|auth\/login|auth\/signup)/i)) {
      if (isAuthenticated()) {
        console.log('Already authenticated, redirecting from auth page to marketplace');
        return '/marketplace2';
      }
    }
    
    return sanitizedUrl;
  }

  //=======================================
  // Networking & API Functions
  //=======================================

  /**
   * Set up fetch interceptor to add token to requests
   * @param {string} token - JWT token
   */
  function setupFetchInterceptor(token) {
    if (!token) return;
    
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
      // Skip for static resources
      if (typeof url === 'string' && url.match(/\.(css|js|png|jpg|gif|svg|ico|woff|woff2)(\?.*)?$/)) {
        return originalFetch(url, options);
      }
      
      // Skip for login/register endpoints
      if (typeof url === 'string' && (url.includes('/auth/login') || url.includes('/auth/register'))) {
        return originalFetch(url, options);
      }
      
      // Initialize options
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
      
      // Add token for same-origin requests
      const isSameOrigin = typeof url === 'string' && (
        !url.startsWith('http') || url.startsWith(window.location.origin)
      );
      
      if (isSameOrigin && !options.headers['Authorization'] && !options.headers['authorization']) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Include credentials for same-origin requests
      if (isSameOrigin && !options.credentials) {
        options.credentials = 'same-origin';
      }
      
      return originalFetch(url, options);
    };
  }

  /**
   * Keep session alive with periodic check
   */
  function keepSessionAlive() {
    const token = getToken();
    if (!token) return;
    
    // Check if enough time has passed since last check
    const now = Date.now();
    if (now - state.lastCheck < 5 * 60 * 1000) return; // 5 minutes
    
    state.lastCheck = now;
    
    // Make a lightweight call to verify token
    fetch('/api/auth/check', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        // Token invalid, attempt refresh
        refreshToken().catch(() => {
          // If refresh fails, clear auth data
          clearAuthData();
        });
      }
    })
    .catch(err => {
      console.warn('Session check failed:', err);
    });
  }

  /**
   * Log in a user
   * @param {Object} credentials - Login credentials
   * @returns {Promise<Object>} Login result
   */
  async function login(credentials) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });
      
      const data = await response.json();
      
      if (response.ok && data.token) {
        storeToken(data.token);
        return {
          success: true,
          user: data.user
        };
      }
      
      return {
        success: false,
        error: data.message || 'Login failed'
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Network error during login'
      };
    }
  }

  /**
   * Log out current user
   * @returns {Promise<boolean>} Logout success
   */
  async function logout() {
    try {
      const token = getToken();
      if (!token) return true;
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Clear auth data regardless of response
      clearAuthData();
      
      return response.ok;
    } catch (error) {
      console.error('Logout error:', error);
      
      // Clear auth data even on error
      clearAuthData();
      
      return false;
    }
  }

  //=======================================
  // Event Handling & Utilities
  //=======================================

  /**
   * Dispatch authentication state change event
   * @param {boolean} authenticated - Authentication state
   * @param {string|null} token - JWT token
   */
  function dispatchAuthEvent(authenticated, token) {
    const event = new CustomEvent('auth-state-changed', {
      detail: {
        authenticated,
        token,
        userId: authenticated ? state.userId : null
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Update UI based on authentication state
   */
  function updateAuthUI() {
    const authenticated = isAuthenticated();
    
    // Update navigation items
    const authNavItems = document.querySelectorAll('.auth-nav-item');
    const guestNavItems = document.querySelectorAll('.guest-nav-item');
    
    authNavItems.forEach(item => {
      item.style.display = authenticated ? 'block' : 'none';
    });
    
    guestNavItems.forEach(item => {
      item.style.display = authenticated ? 'none' : 'block';
    });
    
    // Update login/logout buttons
    const loginButtons = document.querySelectorAll('.login-button');
    const logoutButtons = document.querySelectorAll('.logout-button');
    
    loginButtons.forEach(button => {
      button.style.display = authenticated ? 'none' : 'inline-block';
    });
    
    logoutButtons.forEach(button => {
      button.style.display = authenticated ? 'inline-block' : 'none';
    });
  }

  /**
   * Initialize the authentication system
   */
  function init() {
    // Check URL for token (like after OAuth)
    checkUrlForToken();
    
    // Load token from storage
    const token = getToken();
    if (token && isTokenValid(token)) {
      // Token exists and is valid
      storeToken(token);
    } else if (token) {
      // Token exists but is invalid, try to refresh it
      refreshToken().catch(() => {
        // If refresh fails, clear auth data
        clearAuthData();
      });
    }
    
    // Set up periodic session check
    setInterval(keepSessionAlive, 10 * 60 * 1000); // Every 10 minutes
    
    // Override navigation methods to prevent auth loops
    overrideNavigationMethods();
    
    // Set up periodic UI updates
    updateAuthUI();
    setInterval(updateAuthUI, 60000); // Every minute
    
    // Add event listeners for logout buttons
    document.addEventListener('click', function(e) {
      if (e.target && e.target.classList.contains('logout-button')) {
        e.preventDefault();
        logout().then(() => {
          window.location.href = '/login2';
        });
      }
    });
  }

  /**
   * Override navigation methods to prevent auth loops
   */
  function overrideNavigationMethods() {
    // Override window.location.href setter
    const originalHref = Object.getOwnPropertyDescriptor(window.Location.prototype, 'href').set;
    Object.defineProperty(window.Location.prototype, 'href', {
      set(url) {
        return originalHref.call(this, preNavigationAuthCheck(url));
      },
      configurable: true
    });
    
    // Override window.location.assign
    const originalAssign = window.location.assign;
    window.location.assign = function(url) {
      return originalAssign.call(this, preNavigationAuthCheck(url));
    };
    
    // Override window.location.replace
    const originalReplace = window.location.replace;
    window.location.replace = function(url) {
      return originalReplace.call(this, preNavigationAuthCheck(url));
    };
  }

  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export public API
  window.AuthUtils = {
    isAuthenticated,
    login,
    logout,
    getToken,
    refreshToken,
    verifyTokenWithServer,
    sanitizeRedirectUrl
  };
})();