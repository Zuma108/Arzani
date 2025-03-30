/**
 * WebSocket Client for Chat
 * Handles real-time messaging and notifications
 */

(function() {
  // WebSocket state
  let socket = null;
  let isConnected = false;
  let reconnectTimeout = null;
  let reconnectAttempts = 0;
  let isInitializing = false;
  let pollingActive = false;
  
  // Initialize when DOM is loaded and Socket.io is ready
  document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, checking Socket.io availability');
    // Verify Socket.io is available at this point
    if (window.socketIoLoaded) {
      init();
    } else {
      // Wait for Socket.io to be ready
      waitForSocketIo();
    }
  });
  
  /**
   * Wait for Socket.io to be available with timeout
   */
  function waitForSocketIo() {
    let attempts = 0;
    const maxAttempts = 10; // 5 seconds max wait
    
    function checkSocketIo() {
      attempts++;
      
      // Check if io is a function (properly loaded)
      if (typeof io === 'function') {
        console.log(`Socket.io confirmed available after ${attempts} attempts`);
        window.socketIoLoaded = true;
        init();
        return;
      }
      
      // Give up after max attempts and use polling fallback
      if (attempts >= maxAttempts) {
        console.warn('Giving up on Socket.io after multiple attempts, using polling fallback');
        tryPollingFallback();
        return;
      }
      
      console.log(`Socket.io not available yet, waiting (attempt ${attempts}/${maxAttempts})...`);
      setTimeout(checkSocketIo, 500);
    }
    
    checkSocketIo();
  }
  
  /**
   * Initialize WebSocket connection
   */
  function init() {
    if (isInitializing) return;
    isInitializing = true;
    
    console.log('Initializing WebSocket client');
    
    // Connect to WebSocket server with fallback mechanisms
    safeConnectWebSocket();
    
    // Add event listeners for connection management
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleFocus);
    
    // Listen for URL changes to update seen status
    window.addEventListener('popstate', checkMessageSeenStatus);
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('conversation')) {
      checkMessageSeenStatus();
    }
  }
  
  /**
   * Safely connect to WebSocket server with error handling
   */
  function safeConnectWebSocket() {
    try {
      // Double-verify Socket.io is available and is a function
      if (typeof io !== 'function') {
        console.error('Socket.io is not a function, using polling fallback');
        tryPollingFallback();
        return;
      }
      
      connectWebSocket();
    } catch (error) {
      console.error('Error in WebSocket initialization:', error);
      tryPollingFallback();
    }
  }
  
  /**
   * Connect to WebSocket server
   */
  function connectWebSocket() {
    try {
      // Final verification before connection
      if (typeof io !== 'function') {
        console.error('Socket.io verification failed at connection time');
        tryPollingFallback();
        return;
      }
      
      // Get token for authentication
      const token = localStorage.getItem('token') || getCookie('token');
      
      // Log connection attempt
      console.log('Attempting Socket.io connection with auth token:', !!token);
      
      // Create connection configuration - use window.socketConfig if available or defaults
      const socketConfig = window.socketConfig || {
        url: window.location.origin,
        options: {
          path: '/socket.io',
          transports: ['polling', 'websocket']
        }
      };
      
      console.log('Socket.io config:', socketConfig);
      
      // Create Socket.IO connection
      socket = io(socketConfig.url, {
        ...socketConfig.options,
        auth: { token },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5  // Reduce max attempts before fallback
      });
      
      // Setup event handlers
      setupSocketEvents();
      
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      tryPollingFallback();
    }
  }
  
  /**
   * Fallback to using standard HTTP polling for chat updates
   */
  function tryPollingFallback() {
    if (pollingActive) return; // Prevent multiple polling intervals
    
    console.log('Using polling fallback for chat updates');
    pollingActive = true;
    
    // Set up periodic polling for new messages
    setInterval(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const conversationId = urlParams.get('conversation');
      
      if (!conversationId) return;
      
      // Poll for new messages
      const token = localStorage.getItem('token') || getCookie('token');
      
      fetch(`/api/chat/messages?conversationId=${conversationId}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Accept': 'application/json'
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.success && typeof window.displayMessages === 'function') {
          window.displayMessages(data.messages, conversationId);
        }
      })
      .catch(error => {
        console.error('Error polling messages:', error);
      });
    }, 5000); // Poll every 5 seconds
    
    // Show polling indicator
    document.addEventListener('DOMContentLoaded', function() {
      const chatHeader = document.querySelector('.chat-header');
      if (chatHeader) {
        const pollingIndicator = document.createElement('div');
        pollingIndicator.className = 'polling-indicator';
        pollingIndicator.innerHTML = 'Using refresh mode for messages <i class="fas fa-sync"></i>';
        pollingIndicator.style.cssText = 'font-size:12px;color:#666;margin-left:10px;';
        chatHeader.appendChild(pollingIndicator);
      }
    });
  }
  
  /**
   * Set up Socket.io event handlers
   */
  function setupSocketEvents() {
    // Connection events
    socket.on('connect', () => {
      console.log('WebSocket connected');
      isConnected = true;
      reconnectAttempts = 0;
      
      // Clear any reconnect timeout
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      
      // Join active conversation room if any
      joinActiveConversation();
      
      // Notify application that WebSocket is connected
      document.dispatchEvent(new Event('ws-connected'));
    });
    
    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      isConnected = false;
      
      // Notify application that WebSocket is disconnected
      document.dispatchEvent(new Event('ws-disconnected'));
      
      // Attempt to reconnect
      scheduleReconnect();
    });
    
    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      isConnected = false;
      
      // Attempt to reconnect
      scheduleReconnect();
    });
    
    // Message events
    socket.on('new_message', (data) => {
      console.log('New message received:', data);
      
      // Handle new message
      handleNewMessage(data);
    });
    
    socket.on('message_seen', (data) => {
      console.log('Message seen:', data);
      
      // Update message seen status
      updateMessageSeenStatus(data);
    });
    
    socket.on('typing', (data) => {
      console.log('Typing indicator:', data);
      
      // Show typing indicator
      showTypingIndicator(data);
    });
  }
  
  /**
   * Join active conversation room
   */
  function joinActiveConversation() {
    if (!isConnected) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get('conversation');
    
    if (conversationId) {
      console.log('Joining conversation room:', conversationId);
      
      socket.emit('join_conversation', { conversationId });
    }
  }
  
  /**
   * Handle new message
   */
  function handleNewMessage(data) {
    // Check if message belongs to active conversation
    const urlParams = new URLSearchParams(window.location.search);
    const activeConversationId = urlParams.get('conversation');
    
    // If this is the active conversation, add message to UI
    if (activeConversationId === data.conversationId) {
      // Call the function in chat.js to add message to UI
      if (typeof window.chatFunctions?.addMessageToChat === 'function') {
        window.chatFunctions.addMessageToChat(data.message);
      } else if (typeof addMessageToChat === 'function') {
        addMessageToChat(data.message);
      } else {
        console.error('addMessageToChat function not found');
      }
      
      // Mark message as seen
      socket.emit('mark_seen', {
        conversationId: data.conversationId,
        messageId: data.message.id
      });
    } else {
      // Update unread count for this conversation
      updateUnreadCount(data.conversationId);
    }
    
    // Show notification if browser is not focused
    if (!document.hasFocus()) {
      showNotification(data.message);
    }
  }
  
  /**
   * Update unread count for a conversation
   */
  function updateUnreadCount(conversationId) {
    const conversationItem = document.querySelector(`.conversation-item[data-conversation-id="${conversationId}"]`);
    if (!conversationItem) return;
    
    let unreadBadge = conversationItem.querySelector('.unread-badge');
    
    if (!unreadBadge) {
      // Create badge if it doesn't exist
      unreadBadge = document.createElement('span');
      unreadBadge.className = 'unread-badge';
      unreadBadge.textContent = '1';
      
      const lastMessageEl = conversationItem.querySelector('.conversation-last-message');
      if (lastMessageEl) {
        lastMessageEl.prepend(unreadBadge);
      }
    } else {
      // Increment existing badge
      const count = parseInt(unreadBadge.textContent) || 0;
      unreadBadge.textContent = count + 1;
    }
    
    // Move conversation to top of list
    const conversationsList = conversationItem.parentElement;
    if (conversationsList) {
      conversationsList.prepend(conversationItem);
    }
  }
  
  /**
   * Show browser notification
   */
  function showNotification(message) {
    // Check if browser supports notifications
    if (!("Notification" in window)) return;
    
    // Check notification permission
    if (Notification.permission === "granted") {
      createNotification(message);
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          createNotification(message);
        }
      });
    }
  }
  
  /**
   * Create browser notification
   */
  function createNotification(message) {
    const senderName = message.sender_name || 'Someone';
    const notificationTitle = `New message from ${senderName}`;
    
    // Create notification
    const notification = new Notification(notificationTitle, {
      body: message.content,
      icon: '/images/logo.png'
    });
    
    // Handle notification click
    notification.onclick = function() {
      window.focus();
      
      // Navigate to conversation
      window.location.href = `/chat?conversation=${message.conversation_id}`;
      
      notification.close();
    };
    
    // Auto close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);
  }
  
  /**
   * Show typing indicator
   */
  function showTypingIndicator(data) {
    // Check if this is for active conversation
    const urlParams = new URLSearchParams(window.location.search);
    const activeConversationId = urlParams.get('conversation');
    
    if (activeConversationId !== data.conversationId) return;
    
    // Get/create typing indicator element
    let typingIndicator = document.querySelector('.typing-indicator');
    
    if (!typingIndicator) {
      typingIndicator = document.createElement('div');
      typingIndicator.className = 'typing-indicator';
      
      const messagesContainer = document.querySelector('.messages-list');
      if (messagesContainer) {
        messagesContainer.appendChild(typingIndicator);
      }
    }
    
    // Show/hide based on typing status
    if (data.isTyping) {
      typingIndicator.innerHTML = `<div class="typing-dots"><span>.</span><span>.</span><span>.</span></div>`;
      typingIndicator.style.display = 'block';
      
      // Auto hide after 10 seconds (in case we miss the stop typing event)
      setTimeout(() => {
        typingIndicator.style.display = 'none';
      }, 10000);
    } else {
      typingIndicator.style.display = 'none';
    }
  }
  
  /**
   * Update message seen status
   */
  function updateMessageSeenStatus(data) {
    // Call the function in chat.js to update message status
    if (typeof window.chatFunctions?.updateMessageStatus === 'function') {
      window.chatFunctions.updateMessageStatus(data.messageId, 'seen');
    } else if (typeof updateMessageStatus === 'function') {
      updateMessageStatus(data.messageId, 'seen');
    }
  }
  
  /**
   * Check message seen status for active conversation
   */
  function checkMessageSeenStatus() {
    if (!isConnected) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get('conversation');
    
    if (conversationId) {
      socket.emit('check_seen', { conversationId });
    }
  }
  
  /**
   * Handle online event
   */
  function handleOnline() {
    console.log('Browser went online');
    
    // Reconnect WebSocket if not connected
    if (!isConnected) {
      connectWebSocket();
    }
  }
  
  /**
   * Handle offline event
   */
  function handleOffline() {
    console.log('Browser went offline');
    
    // No need to do anything, socket will handle reconnection
    // when internet is back
  }
  
  /**
   * Handle focus event
   */
  function handleFocus() {
    console.log('Window focused');
    
    // Check messages seen status when window gets focus
    checkMessageSeenStatus();
  }
  
  /**
   * Schedule WebSocket reconnection
   */
  function scheduleReconnect() {
    // Clear any existing reconnect timeout
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    
    // Calculate backoff delay based on attempts
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
    
    console.log(`Scheduling reconnect in ${delay}ms (attempt ${reconnectAttempts + 1})`);
    
    // Set timeout for reconnection
    reconnectTimeout = setTimeout(() => {
      reconnectAttempts++;
      connectWebSocket();
    }, delay);
  }
  
  /**
   * Send typing status
   */
  function sendTypingStatus(isTyping) {
    if (!isConnected) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get('conversation');
    
    if (conversationId) {
      socket.emit('typing', {
        conversationId,
        isTyping
      });
    }
  }
  
  // Export functions for use in other scripts
  window.chatSocket = {
    sendTypingStatus,
    isConnected: () => isConnected,
    reconnect: connectWebSocket
  };
  
  // For debugging
  window._chatSocketDebug = {
    getSocketState: () => ({
      isConnected,
      reconnectAttempts,
      hasSocket: !!socket
    })
  };
  
  // Connect on page load
  try {
    connectWebSocket();
  } catch (error) {
    console.error('Error connecting WebSocket on load:', error);
    tryPollingFallback();
  }
  
  // Helper function to get cookie value
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }
})();
