/**
 * WebSocket Utility Library
 * Provides consistent message formatting for WebSocket communications
 */

// Only define WebSocketManager if it doesn't already exist
if (typeof window.WebSocketManager === 'undefined') {
  // WebSocket connection management
  class WebSocketManager {
    constructor(url) {
      this.url = url || (window.location.protocol === 'https:' ? 
        `wss://${window.location.host}` : 
        `ws://${window.location.host}`);
      this.socket = null;
      this.reconnectAttempts = 0;
      this.maxReconnectAttempts = 5;
      this.reconnectDelay = 2000;
      this.callbacks = {
        message: [],
        open: [],
        close: [],
        error: []
      };
      this.isConnected = false;
    }

    /**
     * Initialize WebSocket connection
     */
    connect() {
      if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
        console.log('WebSocket already connected or connecting');
        return;
      }

      try {
        console.log(`Connecting to WebSocket at ${this.url}`);
        this.socket = new WebSocket(this.url);
        
        this.socket.onopen = (event) => {
          console.log('WebSocket connection established');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.callbacks.open.forEach(callback => callback(event));
        };
        
        this.socket.onmessage = (event) => {
          try {
            // Try to parse as JSON first
            let data;
            try {
              data = JSON.parse(event.data);
            } catch (e) {
              // If not valid JSON, use as raw text
              data = { type: 'text', text: event.data };
            }
            
            // Call all registered message callbacks with the parsed data
            this.callbacks.message.forEach(callback => callback(data, event));
          } catch (error) {
            console.error('Error handling WebSocket message:', error);
          }
        };
        
        this.socket.onclose = (event) => {
          console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
          this.isConnected = false;
          this.callbacks.close.forEach(callback => callback(event));
          
          // Attempt reconnection if not closed cleanly
          if (event.code !== 1000 && event.code !== 1001) {
            this.attemptReconnect();
          }
        };
        
        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.callbacks.error.forEach(callback => callback(error));
        };
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
      }
    }

    /**
     * Attempt to reconnect to WebSocket server
     */
    attemptReconnect() {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Maximum reconnection attempts reached');
        return;
      }
      
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay);
    }

    /**
     * Send a message through the WebSocket connection
     * Always sends as properly formatted JSON
     * 
     * @param {Object|string} data - Data to send
     * @returns {boolean} - Whether the message was sent successfully
     */
    send(data) {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        console.error('Cannot send message: WebSocket not connected');
        return false;
      }
      
      try {
        // If data is already a string, check if it's JSON
        if (typeof data === 'string') {
          try {
            // Check if it's already JSON
            JSON.parse(data);
            // If no error was thrown, it's valid JSON, send as is
            this.socket.send(data);
          } catch (e) {
            // Not JSON, wrap in a JSON object
            this.socket.send(JSON.stringify({ type: 'text', text: data }));
          }
        } else {
          // It's an object, stringify it
          this.socket.send(JSON.stringify(data));
        }
        return true;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        return false;
      }
    }

    /**
     * Close the WebSocket connection
     * @param {number} code - Close code
     * @param {string} reason - Close reason
     */
    close(code, reason) {
      if (this.socket) {
        this.socket.close(code || 1000, reason || 'Normal closure');
      }
    }

    /**
     * Register a callback for a specific event
     * @param {string} event - Event name: 'message', 'open', 'close', or 'error'
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
      if (typeof callback !== 'function') {
        console.error('Callback must be a function');
        return;
      }
      
      if (this.callbacks[event]) {
        this.callbacks[event].push(callback);
      } else {
        console.error(`Unknown event: ${event}`);
      }
    }

    /**
     * Remove a callback for a specific event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to remove
     */
    off(event, callback) {
      if (!this.callbacks[event]) return;
      
      const index = this.callbacks[event].indexOf(callback);
      if (index !== -1) {
        this.callbacks[event].splice(index, 1);
      }
    }

    /**
     * Check if WebSocket is connected
     * @returns {boolean} - Connection status
     */
    isConnected() {
      return this.socket && this.socket.readyState === WebSocket.OPEN;
    }
  }

  // Create a global instance for voice chat
  window.voiceSocket = new WebSocketManager();
  
  // Export as a global variable for browser usage
  window.WebSocketManager = WebSocketManager;
}

// Socket.IO and WebSocket utilities
(function() {
  /**
   * Get the base URL for WebSocket connections
   * Automatically detects the correct server URL and port
   * @returns {string} The base URL for WebSocket connections
   */
  function getWebSocketBaseUrl() {
    // Get the current page's origin (protocol, hostname, port)
    const origin = window.location.origin;
    console.log('Current origin:', origin);
    
    // This ensures we connect to the same server that served this page
    return origin;
  }
  
  /**
   * Create a WebSocket connection
   * @param {string} path - Optional path to append to the base URL
   * @returns {WebSocket} WebSocket connection
   */
  function createWebSocketConnection(path = '') {
    const baseUrl = getWebSocketBaseUrl();
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // Extract hostname and port from the base URL
    const url = new URL(baseUrl);
    
    // Construct WebSocket URL
    const wsUrl = `${wsProtocol}//${url.hostname}:${url.port}${path}`;
    
    console.log('Connecting to WebSocket URL:', wsUrl);
    return new WebSocket(wsUrl);
  }
  
  /**
   * Create a Socket.IO connection with automatic configuration
   * @param {Object} options - Socket.IO options
   * @returns {Socket} Socket.IO connection
   */
  function createSocketIOConnection(options = {}) {
    if (typeof io !== 'function') {
      console.error('Socket.IO is not loaded');
      return null;
    }
    
    const baseUrl = getWebSocketBaseUrl();
    console.log('Creating Socket.IO connection to:', baseUrl);
    
    // Create Socket.IO connection with polling transport only - WebSocket is failing
    const socket = io(baseUrl, {
      // Only use polling - explicitly disable websocket as it's failing
      transports: ['polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: true,
      ...options
    });
    
    // Log connection events
    socket.on('connect', () => console.log('Socket.IO connected using polling transport'));
    socket.on('connect_error', (err) => console.error('Socket.IO connection error:', err));
    
    return socket;
  }
  
  /**
   * Get a JWT token for WebSocket authentication
   * @returns {string|null} JWT token or null if not available
   */
  function getAuthToken() {
    // First try to get token from meta tag
    const tokenMeta = document.querySelector('meta[name="auth-token"]');
    if (tokenMeta && tokenMeta.content) {
      return tokenMeta.content;
    }
    
    // Then try cookies
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    
    if (cookies.token) {
      return cookies.token;
    }
    
    // Finally try localStorage
    return localStorage.getItem('token');
  }
  
  // Export functions to global scope only if they don't already exist
  window.WebSocketUtils = window.WebSocketUtils || {
    getBaseUrl: getWebSocketBaseUrl,
    createWebSocket: function(path = '') {
      const baseUrl = getWebSocketBaseUrl();
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = new URL(baseUrl);
      const wsUrl = `${wsProtocol}//${url.hostname}:${url.port}${path}`;
      console.log('Creating raw WebSocket to:', wsUrl);
      return new WebSocket(wsUrl);
    },
    createSocketIO: createSocketIOConnection,
    getAuthToken: getAuthToken
  };
})();