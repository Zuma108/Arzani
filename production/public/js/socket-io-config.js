/**
 * Socket.IO Configuration
 * Provides consistent Socket.IO configuration settings
 */

(function() {
  // Store the configuration globally
  window.SocketIOConfig = {
    /**
     * Create a new Socket.IO connection with the correct settings
     * @param {string} url - Optional URL override (defaults to current origin)
     * @param {Object} customOptions - Optional custom options to merge
     * @returns {Object} Socket.IO instance
     */
    createConnection: function(url, customOptions) {
      const baseUrl = url || window.location.origin;
      
      // Default options using polling only (WebSocket is failing)
      const defaultOptions = {
        transports: ['polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: true,
        // Get auth token if available
        auth: {
          token: this.getAuthToken()
        }
      };
      
      // Merge custom options
      const options = {...defaultOptions, ...customOptions};
      
      console.log('Creating Socket.IO connection to', baseUrl, 'with polling transport');
      
      // Create and return the socket
      return io(baseUrl, options);
    },
    
    /**
     * Get auth token from various sources
     * @returns {string|null} Authentication token or null
     */
    getAuthToken: function() {
      // First check meta tag
      const metaToken = document.querySelector('meta[name="auth-token"]')?.content;
      if (metaToken) return metaToken;
      
      // Then try cookies
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {});
      
      if (cookies.token) return cookies.token;
      
      // Finally check localStorage
      return localStorage.getItem('token');
    }
  };
  
  // Log configuration status
  console.log('Socket.IO configuration initialized with polling transport only');
})();
