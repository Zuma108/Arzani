/**
 * Chat WebSocket Client
 * Handles WebSocket communication for the chat interface
 */

(function() {
  // Private variables
  let socket = null;
  let isConnected = false;
  let messageHandlers = [];
  let typingHandlers = [];
  let connectionHandlers = [];
  let userId = null;
  let token = null;
  let reconnectTimeout = null;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 5;
  
  // ChatSocket public API
  window.ChatSocket = {
    // Initialize the socket connection
    init: function() {
      // Get token and store it
      token = getAuthToken();
      
      if (!token) {
        console.warn('No authentication token found, ChatSocket will not connect');
        return;
      }
      
      // Create socket connection
      connectSocket();
    },
    
    // Check if socket is connected
    isConnected: function() {
      return isConnected;
    },
    
    // Join a conversation
    joinConversation: function(conversationId) {
      if (!isConnected || !conversationId) return;
      
      socket.send(JSON.stringify({
        type: 'join',
        conversationId: conversationId
      }));
      
      console.log('Joined conversation:', conversationId);
    },
    
    // Send a message
    sendMessage: function(conversationId, content) {
      if (!isConnected || !conversationId || !content) return;
      
      socket.send(JSON.stringify({
        type: 'message',
        conversationId: conversationId,
        content: content
      }));
    },
    
    // Send typing indicator
    sendTyping: function(conversationId) {
      if (!isConnected || !conversationId) return;
      
      socket.send(JSON.stringify({
        type: 'typing',
        conversationId: conversationId
      }));
    },
    
    // Send stop typing indicator
    sendStopTyping: function(conversationId) {
      if (!isConnected || !conversationId) return;
      
      socket.send(JSON.stringify({
        type: 'stopTyping',
        conversationId: conversationId
      }));
    },
    
    // Mark conversation as read - provide multiple method names for compatibility
    markAsRead: function(conversationId) {
      if (!isConnected || !conversationId) return;
      
      socket.send(JSON.stringify({
        type: 'markRead',
        conversationId: conversationId
      }));
    },
    
    // Alias for markAsRead - for backward compatibility
    markConversationRead: function(conversationId) {
      this.markAsRead(conversationId);
    },
    
    // Set handler for incoming messages
    onMessage: function(callback) {
      if (typeof callback === 'function') {
        messageHandlers.push(callback);
      }
    },
    
    // Set handler for typing indicators
    onTyping: function(callback) {
      if (typeof callback === 'function') {
        typingHandlers.push(callback);
      }
    },
    
    // Set handler for connection changes
    onConnectionChange: function(callback) {
      if (typeof callback === 'function') {
        connectionHandlers.push(callback);
        
        // Immediately call with current status
        callback(isConnected);
      }
    },
    
    // Disconnect socket
    disconnect: function() {
      if (socket) {
        socket.close();
      }
    }
  };
  
  // Private functions
  
  // Connect to WebSocket server
  function connectSocket() {
    try {
      // Get WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;
      
      console.log('Connecting to WebSocket server:', wsUrl);
      
      // Create WebSocket connection
      socket = new WebSocket(wsUrl);
      
      // Set up event handlers
      socket.addEventListener('open', handleSocketOpen);
      socket.addEventListener('message', handleSocketMessage);
      socket.addEventListener('close', handleSocketClose);
      socket.addEventListener('error', handleSocketError);
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      handleSocketClose();
    }
  }
  
  // Handle socket open event
  function handleSocketOpen() {
    console.log('WebSocket connection established');
    isConnected = true;
    reconnectAttempts = 0;
    
    // Clear any reconnect timeout
    clearTimeout(reconnectTimeout);
    
    // Notify connection handlers
    connectionHandlers.forEach(handler => {
      try {
        handler(true);
      } catch (error) {
        console.error('Error in connection handler:', error);
      }
    });
    
    // Authenticate
    if (token) {
      socket.send(JSON.stringify({
        type: 'auth',
        token: token
      }));
    }
  }
  
  // Handle socket message event
  function handleSocketMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      // Handle different message types
      switch (data.type) {
        case 'auth_success':
          handleAuthSuccess(data);
          break;
        case 'auth_error':
          handleAuthError(data);
          break;
        case 'message':
          handleIncomingMessage(data);
          break;
        case 'typing':
          handleTypingIndicator(data, true);
          break;
        case 'stop_typing':
          handleTypingIndicator(data, false);
          break;
        default:
          console.log('Received WebSocket message:', data);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }
  
  // Improve websocket error handling and reconnection
  function handleSocketClose() {
    if (isConnected) {
      console.log('WebSocket connection closed');
      isConnected = false;
      
      // Notify connection handlers
      connectionHandlers.forEach(handler => {
        try {
          handler(false);
        } catch (error) {
          console.error('Error in connection handler:', error);
        }
      });
    }
    
    // Attempt to reconnect with backoff
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      
      console.log(`Reconnecting WebSocket in ${delay / 1000} seconds (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
      
      reconnectTimeout = setTimeout(connectSocket, delay);
    } else {
      console.error('Maximum WebSocket reconnect attempts reached');
      
      // Show a notification to the user if possible
      showReconnectionError();
    }
  }
  
  // Show WebSocket reconnection error to user
  function showReconnectionError() {
    // Check if we have the toast component
    if (typeof showToast === 'function') {
      showToast('Could not connect to real-time chat service. Messages may be delayed.', 'error');
    } else {
      // Create a simple notification element
      const notificationContainer = document.createElement('div');
      notificationContainer.className = 'fixed top-4 right-4 max-w-md z-50 notification-container';
      notificationContainer.id = 'websocket-notification';
      
      notificationContainer.innerHTML = `
        <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-md">
          <div class="flex items-center">
            <div class="py-1 mr-2">
              <svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div>
              <p class="font-medium">Connection Error</p>
              <p class="text-sm">Could not connect to real-time chat service. Messages may be delayed.</p>
            </div>
          </div>
          <button class="absolute top-0 right-0 p-2 text-red-700 hover:text-red-900" onclick="this.parentElement.remove()">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      `;
      
      // Add to document body
      document.body.appendChild(notificationContainer);
      
      // Remove after 10 seconds
      setTimeout(() => {
        const notification = document.getElementById('websocket-notification');
        if (notification) {
          notification.remove();
        }
      }, 10000);
    }
  }
  
  // Handle socket error event
  function handleSocketError(error) {
    console.error('WebSocket error:', error);
  }
  
  // Handle successful authentication
  function handleAuthSuccess(data) {
    console.log('Authentication successful');
    userId = data.userId;
  }
  
  // Handle authentication error
  function handleAuthError(data) {
    console.error('Authentication error:', data.message);
  }
  
  // Handle incoming message
  function handleIncomingMessage(data) {
    // Notify message handlers
    messageHandlers.forEach(handler => {
      try {
        handler(data.message);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  }
  
  // Handle typing indicator
  function handleTypingIndicator(data, isTyping) {
    // Notify typing handlers
    typingHandlers.forEach(handler => {
      try {
        handler(data, isTyping);
      } catch (error) {
        console.error('Error in typing handler:', error);
      }
    });
  }
  
  // Get auth token from various sources
  function getAuthToken() {
    // Check meta tag
    const meta = document.querySelector('meta[name="auth-token"]');
    if (meta && meta.content) {
      return meta.content;
    }
    
    // Check localStorage
    return localStorage.getItem('token') || '';
  }
})();
