/**
 * Socket.io wrapper module for chat functionality
 * This file provides a consistent interface for Socket.io connections
 */

// Create a global ChatSocket object that will be available to all scripts
window.ChatSocket = (function() {
  // Private variables
  let socket = null;
  let isConnected = false;
  let connectionAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 5;
  const connectionCallbacks = [];
  const messageCallbacks = [];
  const typingCallbacks = [];
  const readCallbacks = [];
  const errorCallbacks = [];
  
  // Get the auth token from meta tag or localStorage
  function getAuthToken() {
    // Use WebSocketUtils if available
    if (window.WebSocketUtils && typeof window.WebSocketUtils.getAuthToken === 'function') {
      return window.WebSocketUtils.getAuthToken();
    }
    
    // Try to get token from meta tag first
    const metaToken = document.querySelector('meta[name="auth-token"]')?.content;
    if (metaToken) return metaToken;
    
    // Fallback to localStorage
    return localStorage.getItem('token');
  }
  
  // Initialize socket connection
  function initialize() {
    if (socket) return; // Already initialized
    
    try {
      console.log('Initializing Socket.io connection...');
      
      // Get the authentication token
      const token = getAuthToken();
      
      if (!token) {
        console.warn('No authentication token available for socket connection');
      }
      
      // Create socket connection with polling transport only based on diagnostics
      const options = {
        auth: { token: token },
        transports: ['polling'], // Force polling only since WebSocket is failing
        reconnection: true,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: true,
        query: { token: token } // Also include token in query string for compatibility
      };
      
      // Create socket with proper port
      if (window.WebSocketUtils && typeof window.WebSocketUtils.createSocketIO === 'function') {
        socket = window.WebSocketUtils.createSocketIO(options);
      } else {
        // If WebSocketUtils is not available, connect directly 
        socket = io(window.location.origin, options);
      }
      
      // Set up event handlers
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('error', handleError);
      socket.on('connect_error', handleConnectError);
      socket.on('message', handleMessage);
      socket.on('typing', handleTyping);
      socket.on('stop_typing', handleStopTyping);
      socket.on('message_read', handleMessageRead);
      
      // Authenticate immediately after connection
      socket.on('connect', () => {
        if (token) {
          socket.emit('authenticate', { token });
        }
      });
      
      console.log('Socket.io initialization complete (using polling transport only)');
    } catch (error) {
      console.error('Error initializing Socket.io:', error);
      notifyError(error);
    }
  }
  
  // Connect event handler
  function handleConnect() {
    console.log('Socket.io connected');
    isConnected = true;
    connectionAttempts = 0;
    
    // Notify all connection callbacks
    connectionCallbacks.forEach(callback => {
      try {
        callback(true);
      } catch (error) {
        console.error('Error in connection callback:', error);
      }
    });
  }
  
  // Disconnect event handler
  function handleDisconnect(reason) {
    console.log('Socket.io disconnected:', reason);
    isConnected = false;
    
    // Notify all connection callbacks
    connectionCallbacks.forEach(callback => {
      try {
        callback(false, reason);
      } catch (error) {
        console.error('Error in disconnection callback:', error);
      }
    });
  }
  
  // Error event handler
  function handleError(error) {
    console.error('Socket.io error:', error);
    notifyError(error);
  }
  
  // Connection error handler
  function handleConnectError(error) {
    console.error('Socket.io connection error:', error);
    connectionAttempts++;
    
    if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
    }
    
    notifyError(error);
  }
  
  // Message event handler
  function handleMessage(data) {
    console.log('Socket.io message received:', data);
    
    // Notify all message callbacks
    messageCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in message callback:', error);
      }
    });
  }
  
  // Typing event handler
  function handleTyping(data) {
    // Notify all typing callbacks
    typingCallbacks.forEach(callback => {
      try {
        callback(data, true); // true = is typing
      } catch (error) {
        console.error('Error in typing callback:', error);
      }
    });
  }
  
  // Stop typing event handler
  function handleStopTyping(data) {
    // Notify all typing callbacks
    typingCallbacks.forEach(callback => {
      try {
        callback(data, false); // false = stopped typing
      } catch (error) {
        console.error('Error in stop typing callback:', error);
      }
    });
  }
  
  // Message read event handler
  function handleMessageRead(data) {
    // Notify all read callbacks
    readCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in read callback:', error);
      }
    });
  }
  
  // Notify all error callbacks
  function notifyError(error) {
    errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (e) {
        console.error('Error in error callback:', e);
      }
    });
  }
  
  // Public API
  return {
    // Initialize the socket connection
    init: function() {
      initialize();
      return this;
    },
    
    // Check if socket is connected
    isConnected: function() {
      return isConnected;
    },
    
    // Join a conversation
    joinConversation: function(conversationId) {
      if (!socket || !isConnected) {
        console.warn('Cannot join conversation: Socket not connected');
        return false;
      }
      
      console.log('Joining conversation:', conversationId);
      socket.emit('join', { conversationId });
      return true;
    },
    
    // Leave a conversation
    leaveConversation: function(conversationId) {
      if (!socket || !isConnected) return false;
      
      console.log('Leaving conversation:', conversationId);
      socket.emit('leave', { conversationId });
      return true;
    },
    
    // Send a message
    sendMessage: function(conversationId, content) {
      if (!socket || !isConnected) {
        console.warn('Cannot send message: Socket not connected');
        return false;
      }
      
      console.log('Sending message to conversation:', conversationId);
      socket.emit('sendMessage', { conversationId, content });
      return true;
    },
    
    // Send typing indicator
    sendTyping: function(conversationId) {
      if (!socket || !isConnected) return false;
      
      socket.emit('typing', { conversationId });
      return true;
    },
    
    // Send stop typing
    sendStopTyping: function(conversationId) {
      if (!socket || !isConnected) return false;
      
      socket.emit('stopTyping', { conversationId });
      return true;
    },
    
    // Mark conversation as read
    markAsRead: function(conversationId) {
      if (!socket || !isConnected) return false;
      
      socket.emit('markConversationRead', { conversationId });
      return true;
    },
    
    // Register connection state change callback
    onConnectionChange: function(callback) {
      if (typeof callback === 'function') {
        connectionCallbacks.push(callback);
        
        // Immediately call with current state if already connected
        if (isConnected) {
          try {
            callback(true);
          } catch (error) {
            console.error('Error in immediate connection callback:', error);
          }
        }
      }
      return this;
    },
    
    // Register message callback
    onMessage: function(callback) {
      if (typeof callback === 'function') {
        messageCallbacks.push(callback);
      }
      return this;
    },
    
    // Register typing callback
    onTyping: function(callback) {
      if (typeof callback === 'function') {
        typingCallbacks.push(callback);
      }
      return this;
    },
    
    // Register read callback
    onMessageRead: function(callback) {
      if (typeof callback === 'function') {
        readCallbacks.push(callback);
      }
      return this;
    },
    
    // Register error callback
    onError: function(callback) {
      if (typeof callback === 'function') {
        errorCallbacks.push(callback);
      }
      return this;
    },
    
    // Get socket object (for advanced usage)
    getSocket: function() {
      return socket;
    }
  };
})();

// Auto-initialize when script loads, but check for dependencies
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, checking for Socket.IO...');
  
  // Wait a short time to ensure all dependencies are loaded
  setTimeout(() => {
    if (typeof io === 'function') {
      console.log('Socket.IO detected, initializing ChatSocket');
      window.ChatSocket.init();
    } else {
      console.warn('Socket.IO not detected, attempting to load from CDN');
      
      // Load Socket.IO from CDN
      const script = document.createElement('script');
      script.src = 'https://cdn.socket.io/4.6.1/socket.io.min.js';
      script.integrity = 'sha384-7EyYLQZgWBi67fBtVxw60/OWl1kjsfrPFcaU0pp0nAh+i8FD068QogUvg85Ewy1k';
      script.crossOrigin = 'anonymous';
      
      script.onload = function() {
        console.log('Socket.IO loaded from CDN, initializing ChatSocket');
        window.ChatSocket.init();
      };
      
      script.onerror = function() {
        console.error('Failed to load Socket.IO from CDN');
      };
      
      document.head.appendChild(script);
    }
  }, 100);
});