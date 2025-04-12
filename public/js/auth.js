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
    
    // Save to localStorage
    localStorage.setItem('token', token);
    
    // Save as cookie (accessible to both client and server)
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `token=${token}; path=/; max-age=14400${secure}; SameSite=Lax`;
    
    // Ensure fetch requests include the token
    this.setupFetchInterceptor(token);
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
}

// Create a singleton instance
const auth = new Auth();

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

// Function to handle login form submission
async function handleLogin(event) {
  event.preventDefault();
  
  // Get form data
  const formData = new FormData(event.target);
  const loginData = Object.fromEntries(formData.entries());
  
  // Add questionnaire submission ID if available
  const submissionId = localStorage.getItem('questionnaireSubmissionId');
  if (submissionId) {
    loginData.questionnaireSubmissionId = submissionId;
  }
  
  try {
    // Send login request
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    });
    
    // Handle response
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('questionnaireLinkStatus', 'linked');
      
      // Sync token across all storage mechanisms
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `token=${data.token}; path=/; max-age=14400${secure}; SameSite=Lax`;
      
      // Reload the page or redirect
      window.location.reload();
    }
  } catch (error) {
    console.error('Login error:', error);
  }
}

// Function to handle signup form submission
async function handleSignup(event) {
  event.preventDefault();
  
  // Get form data
  const formData = new FormData(event.target);
  const signupData = Object.fromEntries(formData.entries());
  
  // Add questionnaire submission ID if available
  const submissionId = localStorage.getItem('questionnaireSubmissionId');
  if (submissionId) {
    signupData.questionnaireSubmissionId = submissionId;
  }
  
  try {
    // Send signup request
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(signupData)
    });
    
    // Handle response
    const data = await response.json();
    if (response.ok) {
      // Store token if provided
      if (data.token) {
        localStorage.setItem('token', data.token);
        
        // Sync token across all storage
        const secure = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `token=${data.token}; path=/; max-age=14400${secure}; SameSite=Lax`;
      }
      
      // Mark questionnaire as linked
      localStorage.setItem('questionnaireLinkStatus', 'linked');
      
      // Show success message
      alert('Account created successfully! Please check your email to verify your account.');
      
      // Redirect to login
      window.location.href = '/login2';
    }
  } catch (error) {
    console.error('Signup error:', error);
  }
}

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
    const protectedPages = ['/post-business', '/profile', '/dashboard', '/saved-searches'];
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
          window.location.href = `/login2?returnTo=${encodeURIComponent(currentPath)}`;
        }
      })
      .catch(error => {
        console.error('Auth verification error:', error);
      });
    }
  }
});

// Export the auth object
window.auth = auth;
export default auth;