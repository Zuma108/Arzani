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
  }
  
  /**
   * Load authentication token from available sources
   */
  loadToken() {
    // Try localStorage first
    const localToken = localStorage.getItem('token') || localStorage.getItem('authToken');
    
    // Then try sessionStorage
    const sessionToken = sessionStorage.getItem('token');
    
    // Then try cookies
    const cookieToken = this.getCookie('token');
    
    // Use the first available token
    const token = localToken || sessionToken || cookieToken;
    
    if (token) {
      try {
        // Parse the token to get expiry and user ID
        const tokenData = this.parseJwt(token);
        
        if (tokenData && tokenData.exp && tokenData.userId) {
          const expiryDate = new Date(tokenData.exp * 1000);
          const now = new Date();
          
          // Only set as authenticated if the token is not expired
          if (expiryDate > now) {
            this.token = token;
            this.userId = tokenData.userId;
            this.tokenExpiry = expiryDate;
            this.authenticated = true;
            
            // Store the token in localStorage for consistency
            localStorage.setItem('token', token);
            return;
          }
        }
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }
    
    // If we got here, no valid token was found
    this.authenticated = false;
    this.token = null;
    this.userId = null;
    this.tokenExpiry = null;
  }
  
  /**
   * Parse a JWT token to extract payload
   * @param {string} token - JWT token
   * @returns {Object|null} Decoded token payload or null if invalid
   */
  parseJwt(token) {
    try {
      // Split the token and decode the payload
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error parsing JWT token:', error);
      return null;
    }
  }
  
  /**
   * Get a cookie value by name
   * @param {string} name - Cookie name
   * @returns {string|null} Cookie value or null if not found
   */
  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }
  
  /**
   * Set up automatic token refresh based on expiry
   */
  setupTokenRefresh() {
    // Check token expiry every minute
    setInterval(() => {
      if (this.authenticated && this.tokenExpiry) {
        const now = new Date();
        const expiryTime = this.tokenExpiry.getTime();
        const timeUntilExpiry = expiryTime - now.getTime();
        
        // If token expires in less than 15 minutes, refresh it
        if (timeUntilExpiry < 15 * 60 * 1000 && timeUntilExpiry > 0) {
          this.refreshToken();
        }
        // If token is expired, clear it
        else if (timeUntilExpiry <= 0) {
          this.clearAuthData();
        }
      }
    }, 60000); // Check every minute
  }
  
  /**
   * Refresh the authentication token
   * @returns {Promise<boolean>} True if token was refreshed successfully
   */
  async refreshToken() {
    try {
      // Call the token refresh endpoint
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Include cookies
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.token) {
          // Update token data
          this.token = data.token;
          localStorage.setItem('token', data.token);
          
          // Parse the new token
          const tokenData = this.parseJwt(data.token);
          
          if (tokenData && tokenData.exp) {
            this.tokenExpiry = new Date(tokenData.exp * 1000);
            this.userId = tokenData.userId;
            this.authenticated = true;
            return true;
          }
        }
      }
      
      // If we get here, token refresh failed
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
    
    // Clear storage
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('token');
    
    // Clear cookies - use path matching logic of server
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/api/auth/refresh;';
  }
  
  /**
   * Log in a user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Login result
   */
  async login(email, password) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.ok && data.token) {
        // Store token
        this.token = data.token;
        localStorage.setItem('token', data.token);
        
        // Parse token for expiry and user ID
        const tokenData = this.parseJwt(data.token);
        
        if (tokenData) {
          this.userId = tokenData.userId;
          this.tokenExpiry = new Date(tokenData.exp * 1000);
          this.authenticated = true;
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
    // If we have a token and it's not expired, the user is authenticated
    if (this.token && this.tokenExpiry) {
      const now = new Date();
      return this.tokenExpiry > now;
    }
    
    return false;
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
      const response = await fetch('/api/auth/register', {
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
        localStorage.setItem('token', data.token);
        
        // Parse token for expiry and user ID
        const tokenData = this.parseJwt(data.token);
        
        if (tokenData) {
          this.userId = tokenData.userId;
          this.tokenExpiry = new Date(tokenData.exp * 1000);
          this.authenticated = true;
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
   * Add authentication headers to fetch options
   * @param {Object} options - Fetch options
   * @returns {Object} Updated fetch options with auth headers
   */
  addAuthHeaders(options = {}) {
    if (!options.headers) {
      options.headers = {};
    }
    
    if (this.token) {
      options.headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    options.credentials = 'include';
    return options;
  }
  
  /**
   * Authenticated fetch - wrapper around fetch with auth headers
   * @param {string} url - URL to fetch
   * @param {Object} options - Fetch options
   * @returns {Promise<Response>} Fetch response
   */
  async authFetch(url, options = {}) {
    const authOptions = this.addAuthHeaders(options);
    return fetch(url, authOptions);
  }
}

// Create a singleton instance
const auth = new Auth();

// Export the singleton instance
window.Auth = auth;

// Add fetch interceptor to automatically add auth headers
const originalFetch = window.fetch;
window.fetch = async function(url, options = {}) {
  // Skip for certain static resources
  if (typeof url === 'string' && url.match(/\.(css|js|png|jpg|gif|svg|ico|woff|woff2)(\?.*)?$/)) {
    return originalFetch(url, options);
  }
  
  // Skip for auth endpoints
  if (typeof url === 'string' && (
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
    if (!options.headers['Authorization']) {
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

// Export as module if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = auth;
}