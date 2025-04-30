/**
 * Client-side authentication utilities
 * Works with the unified server-side authentication system
 */

class Auth {
  constructor() {
    // Initialize state
    this.token = null;
    this.userId = null;
    this.authenticated = false;
    this.tokenExpiry = null;
    this.redirectHistory = [];
    
    // Load token on init
    this.loadToken();
    
    // Set up token refresh mechanism
    this.setupTokenRefresh();
    
    // Bind methods to this instance
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.isAuthenticated = this.isAuthenticated.bind(this);
    this.getAuthToken = this.getAuthToken.bind(this);
    this.getUserId = this.getUserId.bind(this);
    this.preNavigationAuthCheck = this.preNavigationAuthCheck.bind(this);
  }
  
  /**
   * Load token from storage
   */
  loadToken() {
    // Check all possible token sources
    const storageToken = localStorage.getItem('token');
    const cookieToken = this.getTokenFromCookie();
    const metaToken = document.querySelector('meta[name="auth-token"]')?.content;
    
    // Use the first available token
    this.token = storageToken || cookieToken || metaToken || null;
    
    if (this.token) {
      // Parse token to get user ID and expiry
      const tokenData = this.parseJwt(this.token);
      
      if (tokenData) {
        this.userId = tokenData.userId;
        this.tokenExpiry = new Date(tokenData.exp * 1000);
        this.authenticated = new Date() < this.tokenExpiry;
        
        // Sync token across all storage mechanisms
        this.syncTokenAcrossStorage(this.token);
        
        // Log authentication status for debugging
        console.log('Auth loaded from storage:', {
          userId: this.userId,
          tokenExpiry: this.tokenExpiry,
          authenticated: this.authenticated,
          source: storageToken ? 'localStorage' : (cookieToken ? 'cookie' : 'meta')
        });
      } else {
        // Token parsing failed, clear invalid token
        console.warn('Clearing invalid token during load');
        this.clearAuthData();
      }
    }
  }
  
  /**
   * Set up token refresh mechanism
   */
  setupTokenRefresh() {
    // Check token expiry and refresh if needed
    setInterval(() => {
      if (this.token && this.tokenExpiry) {
        const now = new Date();
        const expiresIn = this.tokenExpiry.getTime() - now.getTime();
        
        // If token expires in less than 15 minutes, refresh it
        if (expiresIn < 15 * 60 * 1000 && expiresIn > 0) {
          this.refreshToken();
        }
      }
    }, 60000); // Check every minute
  }
  
  /**
   * Parse JWT token
   * @param {string} token - JWT token
   * @returns {Object|null} Decoded token payload or null if invalid
   */
  parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error parsing JWT:', error);
      return null;
    }
  }
  
  /**
   * Get token from cookie
   * @returns {string|null} Token from cookie or null if not found
   */
  getTokenFromCookie() {
    const cookies = document.cookie.split('; ');
    const tokenCookie = cookies.find(cookie => cookie.startsWith('token='));
    
    if (tokenCookie) {
      return tokenCookie.split('=')[1];
    }
    
    return null;
  }
  
  /**
   * Synchronize token across all storage mechanisms
   * @param {string} token - JWT token
   */
  syncTokenAcrossStorage(token) {
    if (!token) return;
    
    try {
      // Save to localStorage
      localStorage.setItem('token', token);
      
      // Save as cookie (accessible to both client and server)
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      const sameSite = 'Lax'; // Less restrictive than Strict, but still secure
      document.cookie = `token=${token}; path=/; max-age=14400${secure}; SameSite=${sameSite}`;
      
      // Save to sessionStorage as well for tab-specific state
      sessionStorage.setItem('token', token);
      
      // Ensure fetch requests include the token
      this.setupFetchInterceptor(token);
      
      console.log('Token synchronized across storage mechanisms');
    } catch (error) {
      console.error('Error syncing token across storage:', error);
    }
  }
  
  /**
   * Set up fetch interceptor to add token to requests
   * @param {string} token - JWT token
   */
  setupFetchInterceptor(token) {
    if (!token) return;
    
    // Save the original fetch function
    if (!window._originalFetch) {
      window._originalFetch = window.fetch;
    }
    
    // Override fetch to add auth header
    window.fetch = (url, options = {}) => {
      // Skip for certain static resources or external domains
      if (typeof url === 'string') {
        // Don't add token to external requests
        if (!url.startsWith('/') && !url.startsWith(window.location.origin)) {
          return window._originalFetch(url, options);
        }
        
        // Skip for static resources
        if (url.match(/\.(css|js|png|jpg|gif|svg|ico|woff|woff2)(\?.*)?$/)) {
          return window._originalFetch(url, options);
        }
      }
      
      // Add token to options
      options = options || {};
      options.headers = options.headers || {};
      
      // Only add token if not already present
      if (!options.headers['Authorization'] && !options.headers['authorization']) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Include credentials for same-origin requests
      if (!options.credentials) {
        options.credentials = 'same-origin';
      }
      
      return window._originalFetch(url, options);
    };
  }
  
  /**
   * Refresh the authentication token
   * @returns {Promise<boolean>} True if token was refreshed successfully
   */
  async refreshToken() {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.ok && data.token) {
        // Update token
        this.token = data.token;
        
        // Parse token for expiry and user ID
        const tokenData = this.parseJwt(data.token);
        
        if (tokenData) {
          this.userId = tokenData.userId;
          this.tokenExpiry = new Date(tokenData.exp * 1000);
          this.authenticated = true;
          
          // Sync token across storage mechanisms
          this.syncTokenAcrossStorage(data.token);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  }
  
  /**
   * Clear all authentication data
   */
  clearAuthData() {
    // Clear memory
    this.token = null;
    this.userId = null;
    this.authenticated = false;
    this.tokenExpiry = null;
    
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiry');
    localStorage.removeItem('user');
    
    // Clear sessionStorage
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('authToken');
    
    // Clear cookies - use path matching logic of server
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/api/auth/refresh;';
    document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    console.log('All auth data cleared');
  }
  
  /**
   * Log in a user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Login result
   */
  async login(email, password) {
    try {
      // Prepare login data with questionnaire identifiers if available
      const loginData = { email, password };
      
      // Add questionnaire data identifiers if available
      const questionnaireSubmissionId = localStorage.getItem('questionnaireSubmissionId');
      const anonymousId = localStorage.getItem('questionnaireAnonymousId');
      
      if (questionnaireSubmissionId) {
        loginData.questionnaireSubmissionId = questionnaireSubmissionId;
      }
      
      if (anonymousId) {
        loginData.anonymousId = anonymousId;
      }
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.ok && data.token) {
        // Store token
        this.token = data.token;
        
        // Parse token for expiry and user ID
        const tokenData = this.parseJwt(data.token);
        
        if (tokenData) {
          this.userId = tokenData.userId;
          this.tokenExpiry = new Date(tokenData.exp * 1000);
          this.authenticated = true;
          
          // Sync token across all storage mechanisms
          this.syncTokenAcrossStorage(data.token);
        }
        
        // Mark questionnaire data as linked if applicable
        if (questionnaireSubmissionId || anonymousId) {
          localStorage.setItem('questionnaireLinkStatus', 'linked');
        }
        
        return {
          success: true,
          user: data.user || { userId: this.userId }
        };
      }
      
      return {
        success: false,
        error: data.error || 'Login failed',
        message: data.message || 'Invalid email or password'
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Network error',
        message: 'Could not connect to the server'
      };
    }
  }
  
  /**
   * Log out the current user
   * @returns {Promise<boolean>} True if logout was successful
   */
  async logout() {
    try {
      // Call logout endpoint if available
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          credentials: 'include'
        });
      } catch (e) {
        // Continue even if the endpoint fails
        console.warn('Logout endpoint failed, continuing with client-side logout');
      }
      
      // Clear authentication data regardless of server response
      this.clearAuthData();
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local auth data on error
      this.clearAuthData();
      return true;
    }
  }
  
  /**
   * Check if the user is authenticated
   * @returns {boolean} True if the user is authenticated
   */
  isAuthenticated() {
    // If no token, not authenticated
    if (!this.token) {
      return false;
    }
    
    // Check if token has expired
    if (this.tokenExpiry) {
      const now = new Date();
      if (now >= this.tokenExpiry) {
        console.log('Token expired, attempting refresh');
        // Attempt token refresh if expired
        this.refreshToken().catch(err => {
          console.error('Failed to refresh expired token:', err);
          this.clearAuthData();
        });
        return false;
      }
    }
    
    return this.authenticated;
  }
  
  /**
   * Get the authentication token
   * @returns {string|null} Authentication token or null if not authenticated
   */
  getAuthToken() {
    return this.token;
  }
  
  /**
   * Get the current user ID
   * @returns {string|null} User ID or null if not authenticated
   */
  getUserId() {
    return this.userId;
  }
  
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Registration result
   */
  async register(userData) {
    try {
      // Add questionnaire data identifiers if available
      const questionnaireSubmissionId = localStorage.getItem('questionnaireSubmissionId');
      const anonymousId = localStorage.getItem('questionnaireAnonymousId');
      
      if (questionnaireSubmissionId) {
        userData.questionnaireSubmissionId = questionnaireSubmissionId;
      }
      
      if (anonymousId) {
        userData.anonymousId = anonymousId;
      }
      
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.ok && data.token) {
        // Store token
        this.token = data.token;
        
        // Parse token for expiry and user ID
        const tokenData = this.parseJwt(data.token);
        
        if (tokenData) {
          this.userId = tokenData.userId;
          this.tokenExpiry = new Date(tokenData.exp * 1000);
          this.authenticated = true;
          
          // Sync token across all storage mechanisms
          this.syncTokenAcrossStorage(data.token);
        }
        
        // Mark questionnaire data as linked if applicable
        if (questionnaireSubmissionId || anonymousId) {
          localStorage.setItem('questionnaireLinkStatus', 'linked');
        }
        
        return {
          success: true,
          user: data.user || { userId: this.userId }
        };
      }
      
      return {
        success: false,
        error: data.error || 'Registration failed',
        message: data.message || 'Could not create account'
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Network error',
        message: 'Could not connect to the server'
      };
    }
  }
  
  /**
   * Verify authentication before navigation
   * @param {string} targetUrl - Target URL
   * @returns {string} Sanitized URL to prevent redirect loops
   */
  preNavigationAuthCheck(targetUrl) {
    // Track redirect history to detect loops
    this.redirectHistory.push(targetUrl);
    
    // Keep only the last 5 entries to limit memory usage
    if (this.redirectHistory.length > 5) {
      this.redirectHistory.shift();
    }
    
    // Detect redirect loops
    if (this.redirectHistory.length >= 3) {
      let loopDetected = false;
      const authPagePatterns = ['/login', '/signup', '/auth/login', '/auth/signup'];
      
      // Check if recent history contains auth pages
      const recentAuthRedirects = this.redirectHistory.filter(url => 
        authPagePatterns.some(pattern => url.includes(pattern))
      );
      
      if (recentAuthRedirects.length >= 2) {
        console.warn('Auth redirect loop detected:', this.redirectHistory);
        loopDetected = true;
      }
      
      if (loopDetected) {
        console.log('Breaking redirect loop, sending to home');
        this.redirectHistory = []; // Clear history
        return '/marketplace2'; // Redirect to main marketplace
      }
    }
    
    // If navigating to auth pages, check if already authenticated
    if (targetUrl.includes('/login') || targetUrl.includes('/signup')) {
      if (this.isAuthenticated()) {
        console.log('Already authenticated, redirecting to marketplace');
        return '/marketplace2';
      }
    }
    
    // Extract deep returnTo URL if present
    const returnToMatch = targetUrl.match(/[?&](returnTo|returnUrl|redirect)=([^&]+)/);
    if (returnToMatch && returnToMatch[2]) {
      const returnTo = decodeURIComponent(returnToMatch[2]);
      
      // Prevent loops in returnTo parameter
      if (returnTo.includes('/login') || returnTo.includes('/signup')) {
        console.log('Removing problematic returnTo param:', returnTo);
        return targetUrl.replace(/([?&])(returnTo|returnUrl|redirect)=([^&]+)(&|$)/, '$1');
      }
    }
    
    return targetUrl;
  }
}

// Create a singleton instance
const auth = new Auth();

// Override navigation methods to prevent auth loops
const originalAssign = window.location.assign;
window.location.assign = function(url) {
  return originalAssign.call(this, auth.preNavigationAuthCheck(url));
};

const originalHref = Object.getOwnPropertyDescriptor(window.Location.prototype, 'href').set;
Object.defineProperty(window.Location.prototype, 'href', {
  set(url) {
    return originalHref.call(this, auth.preNavigationAuthCheck(url));
  },
  configurable: true
});

// Replace fetch with a version that automatically includes auth token
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
  // Skip for certain static resources
  if (typeof url === 'string' && url.match(/\.(css|js|png|jpg|gif|svg|ico|woff|woff2)(\?.*)?$/)) {
    return originalFetch(url, options);
  }
  
  // Determine if this is a relative URL or same domain
  const isRelativeUrl = typeof url === 'string' && url.startsWith('/');
  const isSameDomain = typeof url === 'string' && (
    url.startsWith(window.location.origin) ||
    url.startsWith('/')
  );
  
  if ((isRelativeUrl || isSameDomain) && auth.isAuthenticated()) {
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
    
    // If we have a token and no Authorization header is set yet
    if (!options.headers['Authorization'] && !options.headers['authorization']) {
      options.headers['Authorization'] = `Bearer ${auth.getAuthToken()}`;
    }
    
    // Always include credentials
    options.credentials = 'include';
  }
  
  // Make the original fetch call with enhanced options
  return originalFetch(url, options);
};

// Setup event handler for login and logout events
document.addEventListener('DOMContentLoaded', function() {
  // Attach to login form if it exists
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      const result = await auth.login(email, password);
      
      if (result.success) {
        // Check for return URL
        const urlParams = new URLSearchParams(window.location.search);
        const returnUrl = urlParams.get('returnTo') || '/';
        
        // Redirect to the return URL or home page
        window.location.href = returnUrl;
      } else {
        // Display error
        const errorElement = document.getElementById('loginError');
        if (errorElement) {
          errorElement.textContent = result.message || 'Login failed';
          errorElement.style.display = 'block';
        }
      }
    });
  }
  
  // Attach to logout button if it exists
  const logoutButton = document.getElementById('logoutButton');
  if (logoutButton) {
    logoutButton.addEventListener('click', async function(e) {
      e.preventDefault();
      
      const result = await auth.logout();
      if (result) {
        window.location.href = '/login2';
      }
    });
  }
  
  // Update UI based on authentication status
  const updateAuthUI = () => {
    const isAuthenticated = auth.isAuthenticated();
    
    // Update navigation items based on authentication
    const authNavItems = document.querySelectorAll('.auth-nav-item');
    const guestNavItems = document.querySelectorAll('.guest-nav-item');
    
    authNavItems.forEach(item => {
      item.style.display = isAuthenticated ? 'block' : 'none';
    });
    
    guestNavItems.forEach(item => {
      item.style.display = isAuthenticated ? 'none' : 'block';
    });
  };
  
  // Call initially and set up an interval to check periodically
  updateAuthUI();
  setInterval(updateAuthUI, 60000); // Check every minute
});

// When a page loads, immediately check for token and enforce consistency across storage
document.addEventListener('DOMContentLoaded', function() {
  // Check if we have a token in any storage mechanism
  const localToken = localStorage.getItem('token');
  const cookieToken = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
  const metaToken = document.querySelector('meta[name="auth-token"]')?.content;
  
  // Use the first available token
  const token = localToken || cookieToken || metaToken;
  
  if (token) {
    // Make sure it's stored consistently
    localStorage.setItem('token', token);
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `token=${token}; path=/; max-age=14400${secure}; SameSite=Lax`;
    
    // Check if we're on a protected page
    const protectedPages = ['/post-business', '/profile', '/dashboard', '/saved-searches', '/marketplace2'];
    const currentPath = window.location.pathname;
    
    // If on a protected page, make an immediate verification request
    if (protectedPages.some(path => currentPath.startsWith(path))) {
      fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => {
        if (!response.ok) {
          // If verification fails, redirect to login
          const sanitizedPath = auth.preNavigationAuthCheck(
            `/login2?returnTo=${encodeURIComponent(currentPath)}`
          );
          window.location.href = sanitizedPath;
        } else {
          console.log('Token verified successfully on page load');
        }
      })
      .catch(error => {
        console.error('Auth verification error:', error);
        // Clear invalid token
        auth.clearAuthData();
        
        // Only redirect if not already on login page to prevent loops
        if (!currentPath.includes('/login') && !currentPath.includes('/signup')) {
          const sanitizedPath = auth.preNavigationAuthCheck(
            `/login2?returnTo=${encodeURIComponent(currentPath)}`
          );
          window.location.href = sanitizedPath;
        }
      });
    }
    
    // Check if we're on an auth page while already logged in
    const authPages = ['/login', '/login2', '/signup', '/auth/login', '/auth/signup'];
    if (authPages.some(path => currentPath.startsWith(path))) {
      // Verify token and redirect to home if valid
      fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => {
        if (response.ok) {
          // If verification succeeds while on login/signup page, redirect to marketplace
          console.log('Already authenticated while on auth page, redirecting');
          window.location.href = '/marketplace2';
        }
      })
      .catch(error => {
        console.error('Auth verification error on auth page:', error);
        // Invalid token on auth page is fine, user can log in again
      });
    }
  } else if (window.location.pathname.startsWith('/marketplace2')) {
    // If no token but on marketplace, no need to redirect, marketplace can be browsed anonymously
    console.log('Browsing marketplace anonymously');
  }
});

// Add token synchronization on page load
document.addEventListener('DOMContentLoaded', function() {
  // Check if we have a token in localStorage, cookie or URL
  const localToken = localStorage.getItem('token');
  const cookieToken = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get('token');
  
  // Find the first valid token
  let validToken = null;

  // Try each token source in order of preference
  if (urlToken) {
    try {
      // Validate token if possible (basic structure check)
      if (urlToken.split('.').length === 3) {
        validToken = urlToken;
        console.log('Found valid token in URL');
      }
    } catch (e) {
      console.warn('Invalid token in URL');
    }
  }
  
  if (!validToken && localToken) {
    try {
      if (localToken.split('.').length === 3) {
        validToken = localToken;
        console.log('Found valid token in localStorage');
      }
    } catch (e) {
      console.warn('Invalid token in localStorage');
    }
  }
  
  if (!validToken && cookieToken) {
    try {
      if (cookieToken.split('.').length === 3) {
        validToken = cookieToken;
        console.log('Found valid token in cookie');
      }
    } catch (e) {
      console.warn('Invalid token in cookie');
    }
  }
  
  // If we found a valid token, synchronize it across all storage mechanisms
  if (validToken) {
    // Store in localStorage
    localStorage.setItem('token', validToken);
    
    // Set cookie with proper expiry
    const fourHoursMs = 4 * 60 * 60 * 1000;
    const expiryDate = new Date(Date.now() + fourHoursMs);
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `token=${validToken}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax${secure}`;
    
    // Store expiry time in localStorage for client-side checks
    localStorage.setItem('tokenExpiry', Date.now() + fourHoursMs);
    
    console.log('Token synchronized across storage mechanisms');
    
    // Remove token from URL if present to avoid security issues
    if (urlToken) {
      urlParams.delete('token');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '') + window.location.hash;
      history.replaceState({}, document.title, newUrl);
    }
    
    // If we're on a login page but already authenticated, redirect to marketplace
    if (window.location.pathname.includes('/login') || window.location.pathname.includes('/signup')) {
      console.log('Already authenticated while on login page, redirecting to marketplace');
      window.location.href = '/marketplace2';
      return;
    }

    // Verify the token with the server
    fetch('/api/verify-token', {
      headers: {
        'Authorization': `Bearer ${validToken}`
      }
    })
    .then(response => {
      if (!response.ok) {
        // If token is not valid, clear it
        localStorage.removeItem('token');
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      } else {
        // If we're on a protected page, make sure we're not redirected
        console.log('Token verified successfully');
      }
    })
    .catch(error => {
      console.error('Error verifying token:', error);
    });
  } else if (isProtectedRoute() && !window.location.pathname.includes('/login')) {
    // If we're on a protected route with no valid token, redirect to login
    console.log('No valid token found on protected route, redirecting to login');
    window.location.href = `/login2?returnTo=${encodeURIComponent(window.location.pathname)}`;
  }
});

/**
 * Check if the current route is a protected route
 * @returns {boolean} True if the current route is protected
 */
function isProtectedRoute() {
  // Define protected routes that require authentication
  const protectedRoutes = [
    '/profile',
    '/history',
    '/talk-to-arzani',
    '/arzani-ai',
    '/post-business',
    '/saved-searches',
    '/dashboard'
  ];
  
  // Check if current path starts with any protected route
  return protectedRoutes.some(route => window.location.pathname.startsWith(route));
}

// Export the auth object
window.auth = auth;
export default auth;