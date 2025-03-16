/**
 * Authentication Helper Functions
 * Handles client-side token management and fixes post-business auth issues
 */

// Function to check if user is logged in
function isLoggedIn() {
  const token = localStorage.getItem('token') || 
                document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
  return !!token;
}

// Function to ensure auth headers are added to all future fetch requests
function setupAuthHeaders() {
  const token = localStorage.getItem('token');
  if (token) {
    // Monkey patch fetch to add auth headers to all requests
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
      // Create headers if they don't exist
      if (!options.headers) {
        options.headers = {};
      }
      
      // Convert Headers object to plain object if necessary
      if (options.headers instanceof Headers) {
        const plainHeaders = {};
        for (const [key, value] of options.headers.entries()) {
          plainHeaders[key] = value;
        }
        options.headers = plainHeaders;
      }
      
      // Add Authorization header if not already present
      if (!options.headers['Authorization']) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }
      
      return originalFetch(url, options);
    };
    
    console.log('Auth headers setup complete');
  }
}

// Function to restore auth state for post-business page
function restoreAuthState() {
  const token = localStorage.getItem('token');
  if (token) {
    // Set token as cookie as well for server-side auth
    document.cookie = `token=${token}; path=/; max-age=7200; SameSite=Lax`;
    
    // For the post-business page specifically
    if (window.location.pathname === '/post-business' || 
        window.location.pathname.startsWith('/post-business/')) {
      console.log('Post-business page detected, ensuring auth state');
      
      // Add token to body as data attribute for template access
      document.body.dataset.authToken = token;
      
      // Ensure auth headers are set up
      setupAuthHeaders();
    }
  }
}

// Run restore auth state on page load
document.addEventListener('DOMContentLoaded', restoreAuthState);

// Expose functions globally
window.isLoggedIn = isLoggedIn;
window.setupAuthHeaders = setupAuthHeaders;
window.restoreAuthState = restoreAuthState;
