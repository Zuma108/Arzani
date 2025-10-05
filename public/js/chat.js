/**
 * Core chat functionality
 */

// Global variables
let currentConversationId = null;
let isConnectedToSocket = false;
let socketConnectAttempts = 0;
let typingTimeout = null;

// Helper functions to get DOM elements with fallbacks for different naming conventions
function getMessagesContainer() {
  return document.getElementById('messages-list') || document.getElementById('messagesContainer');
}

function getMessageInput() {
  return document.getElementById('message-input') || 
         document.getElementById('mainChatInput') || 
         document.getElementById('bottomChatInput');
}

function getMessageForm() {
  return document.getElementById('message-form');
}

// Initialize the chat functionality
window.initChat = function() {
  console.log('Initializing chat functionality');
  
  // Get DOM elements - handle both chat.ejs and Arzani-x.ejs conventions
  const messagesList = getMessagesContainer();
  const messageForm = getMessageForm();
  const messageInput = getMessageInput();
  
  // Check if we have the required elements
  if (!messagesList) {
    console.warn('Messages container not found - chat functionality may be limited');
  }
  
  if (!messageInput) {
    console.warn('Message input not found - chat functionality may be limited');
  }
  
  // Get conversation ID from the form if available
  if (messageForm) {
    currentConversationId = messageForm.dataset.conversationId;
    console.log('Current conversation ID:', currentConversationId);
  }
  
  // Initialize ChatSocket if available
  if (window.ChatSocket) {
    console.log('Found ChatSocket, initializing connection');
    
    // Set up connection change handler
    window.ChatSocket.onConnectionChange(function(isConnected) {
      isConnectedToSocket = isConnected;
      console.log('Socket connection status:', isConnected ? 'Connected' : 'Disconnected');
      
      if (isConnected && currentConversationId) {
        // Join the current conversation room
        window.ChatSocket.joinConversation(currentConversationId);
        
        // Load messages
        loadMessages();
      }
    });
    
    // Set up message handler
    window.ChatSocket.onMessage(function(data) {
      console.log('Received message:', data);
      addMessageToUI(data);
      
      // Scroll to bottom if needed
      if (window.ChatScroll) {
        window.ChatScroll.scrollToBottom();
      }
    });
    
    // Set up typing indicator handler
    window.ChatSocket.onTyping(function(data, isTyping) {
      handleTypingIndicator(data, isTyping);
    });
    
    // Initialize the socket
    window.ChatSocket.init();
  } else {
    console.error('ChatSocket not found, chat functionality will be limited');
    // Try to load messages anyway
    loadMessages();
  }
  
  // Set up message form submission
  if (messageForm) {
    messageForm.addEventListener('submit', function(e) {
      e.preventDefault();
      sendMessage();
    });
  }
  
  // Set up typing indicator
  if (messageInput) {
    messageInput.addEventListener('input', function() {
      sendTypingIndicator();
    });
  }
  
  console.log('Chat functionality initialized');
};

// Enhanced loadMessages function with improved authentication
function loadMessages() {
  if (!currentConversationId) {
    console.warn('No conversation ID, cannot load messages');
    return;
  }
  
  // Handle both chat.ejs and Arzani-x.ejs element conventions
  const messagesList = getMessagesContainer();
  if (!messagesList) {
    console.error('Messages list element not found');
    return;
  }
  
  console.log('Loading messages for conversation:', currentConversationId);
  
  // Generate a unique request ID to track this specific request in logs
  const requestId = Math.random().toString(36).substring(2, 10);
  
  // Show loading indicator with improved styling
  messagesList.innerHTML = `
    <div class="flex flex-col items-center justify-center p-8">
      <div class="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="mt-3 text-gray-600">Loading messages...</p>
      <p class="text-xs text-gray-400">Request ID: ${requestId}</p>
    </div>
  `;
  
  // Get authentication token with fallback options
  const token = getAuthToken();
  
  if (!token) {
    console.error('No authentication token found, cannot load messages');
    messagesList.innerHTML = `
      <div class="bg-red-50 border-l-4 border-red-500 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-red-700">
              Authentication required. Please <a href="/login2?returnTo=${encodeURIComponent(window.location.pathname)}" class="font-medium underline">log in</a> to view messages.
            </p>
          </div>
        </div>
      </div>
    `;
    return;
  }
  
  // First check API connectivity by hitting the auth-debug endpoint
  fetch('/api/chat/auth-debug', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => response.json())
  .then(debugData => {
    console.log('Auth debug info:', debugData);
    
    // If not authenticated in the debug response, show an error
    if (!debugData.authenticated) {
      throw new Error('AUTH_FAILED');
    }
    
    // Now fetch messages with the request ID for tracking
    return fetch(`/api/chat/messages?conversationId=${currentConversationId}&requestId=${requestId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  })
  .then(response => {
    console.log(`Messages API response status: ${response.status}`);
    
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    
    if (response.status === 403) {
      throw new Error('ACCESS_DENIED');
    }
    
    if (response.status === 404) {
      throw new Error('NOT_FOUND');
    }
    
    if (!response.ok) {
      return response.json().then(errorData => {
        console.error('API error details:', errorData);
        throw new Error(errorData.error || `Failed with status: ${response.status}`);
      }).catch(jsonError => {
        throw new Error(`API error (${response.status})`);
      });
    }
    
    return response.json();
  })
  .then(data => {
    if (!data.success) {
      throw new Error(data.error || 'API reported failure');
    }
    
    // Display messages
    if (!data.messages || data.messages.length === 0) {
      messagesList.innerHTML = `
        <div class="text-center p-6">
          <svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
          </svg>
          <p class="text-gray-500">No messages yet</p>
          <p class="text-gray-400 text-sm">Start the conversation!</p>
        </div>
      `;
      return;
    }
    
    messagesList.innerHTML = '';
    
    // Display messages
    data.messages.forEach(message => {
      addMessageToUI(message);
    });
      // Scroll to bottom
    const messagesContainer = getMessagesContainer();
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  })
  .catch(error => {
    console.error('Error loading messages:', error);
    
    // Show appropriate error message based on error type
    if (error.message === 'AUTH_FAILED' || error.message === 'UNAUTHORIZED') {
      messagesList.innerHTML = `
        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 8a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-yellow-700">
                Your session has expired. Please 
                <a href="/login2?returnTo=${encodeURIComponent(window.location.pathname)}" class="font-medium underline">log in again</a>.
              </p>
            </div>
          </div>
        </div>
      `;
    } else if (error.message === 'ACCESS_DENIED') {
      messagesList.innerHTML = `
        <div class="bg-red-50 border-l-4 border-red-500 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 101.414 1.414L10 11.414l1.293 1.293a1 1 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-700">
                You don't have permission to view this conversation.
              </p>
              <div class="mt-2">
                <a href="/chat" class="text-sm font-medium text-red-700 hover:text-red-600">
                  Go to your conversations &rarr;
                </a>
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (error.message === 'NOT_FOUND') {
      messagesList.innerHTML = `
        <div class="bg-orange-50 border-l-4 border-orange-500 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-orange-700">
                This conversation doesn't exist or was deleted.
              </p>
              <div class="mt-2">
                <a href="/chat" class="text-sm font-medium text-orange-700 hover:text-orange-600">
                  View your conversations &rarr;
                </a>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      messagesList.innerHTML = `
        <div class="bg-red-50 border-l-4 border-red-500 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-700">
                Failed to load messages: ${error.message}
              </p>
              <div class="mt-2">
                <button 
                  class="text-sm font-medium text-red-700 hover:text-red-600 mr-4" 
                  onclick="loadMessages()">
                  Try again
                </button>
                <a href="/chat" class="text-sm font-medium text-red-700 hover:text-red-600">
                  View conversations
                </a>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  });
}

// Helper function to implement fetch with retry logic
function fetchWithRetry(url, options, maxRetries = 3) {
  return new Promise((resolve, reject) => {
    const attempt = (retriesLeft) => {
      fetch(url, options)
        .then(response => {
          // Don't retry on 403 or 404 responses
          if (response.status === 403 || response.status === 404) {
            resolve(response);
            return;
          }
          
          if (!response.ok && retriesLeft > 0) {
            console.log(`Retrying fetch... ${retriesLeft} attempts left`);
            setTimeout(() => attempt(retriesLeft - 1), 1000);
          } else {
            resolve(response);
          }
        })
        .catch(error => {
          if (retriesLeft > 0) {
            console.log(`Fetch failed, retrying... ${retriesLeft} attempts left`);
            setTimeout(() => attempt(retriesLeft - 1), 1000);
          } else {
            reject(error);
          }
        });
    };
    
    attempt(maxRetries);
  });
}

// Helper function to scroll to the bottom of the messages container
function scrollToBottom() {
  const messagesContainer = getMessagesContainer();
  if (messagesContainer) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

// Function to mark a conversation as read
function markConversationAsRead(conversationId) {
  if (!conversationId) return;
  
  const token = getToken();
  if (!token) return;
  
  fetch('/api/chat/mark-read', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ conversationId })
  })
  .then(response => {
    if (!response.ok) {
      console.error('Failed to mark conversation as read');
    }
  })
  .catch(error => {
    console.error('Error marking conversation as read:', error);
  });
}

// Helper function to get auth token from various sources
function getAuthToken() {
  // First check if we have a proper ChatUtils library
  if (typeof window.ChatUtils !== 'undefined' && typeof window.ChatUtils.getAuthToken === 'function') {
    return window.ChatUtils.getAuthToken();
  }
  
  // Try meta tag first (most reliable)
  const metaToken = document.querySelector('meta[name="auth-token"]')?.content;
  if (metaToken) return metaToken;
  
  // Try localStorage
  const localToken = localStorage.getItem('token');
  if (localToken) return localToken;
  
  // Try cookie
  const cookieToken = getCookie('token');
  if (cookieToken) return cookieToken;
  
  // No token found
  return null;
}

// Get cookie value by name
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// Mark conversation as read via API
function markConversationAsRead(conversationId) {
  if (!conversationId) return;
  
  const token = getAuthToken();
  if (!token) return;
  
  fetch('/api/chat/mark-read', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ conversationId })
  })
  .then(response => {
    if (!response.ok) {
      console.error('Failed to mark conversation as read:', response.status);
    }
  })
  .catch(error => {
    console.error('Error marking conversation as read:', error);
  });
}

// Add a fallback method to load conversations when a specific conversation fails
function loadConversationsFallback() {
  window.location.href = '/chat';
}

// Improved addMessageToUI function with better user identification
function addMessageToUI(message) {
  // Make sure we have all required data
  if (!message) {
    console.error('No message data provided to addMessageToUI');
    return;
  }
  
  // Get current user ID from global variable or data attribute
  const currentUserId = getCurrentUserId();
  
  // Convert both to strings to ensure correct comparison
  const isCurrentUser = String(message.sender_id) === String(currentUserId);
  
  // Log debug info to help with troubleshooting
  if (window.chatDebug) {
    console.log(`Message from ${message.sender_id}, currentUser: ${currentUserId}, isCurrentUser: ${isCurrentUser}`);
  }
  
  // Create message element
  const messageElement = document.createElement('div');
  messageElement.className = `message ${isCurrentUser ? 'outgoing' : 'incoming'}`;
  messageElement.setAttribute('data-message-id', message.id || 'temp-' + Date.now());
  messageElement.setAttribute('data-sender-id', message.sender_id || 'unknown');
  
  // Add debug information if needed
  if (window.chatDebug) {
    messageElement.setAttribute('data-current-user', currentUserId || 'not-set');
    messageElement.setAttribute('data-is-current', isCurrentUser ? 'yes' : 'no');
  }
  
  // Handle profile picture with error fallback
  let avatarHtml = '';
  if (message.sender_id && !message.is_system_message) {
    // Get default profile image from ImageHandler if available or use hardcoded default
    const defaultProfileImage = (window.ImageHandler && window.ImageHandler.DEFAULT_PROFILE_IMAGE) 
      ? window.ImageHandler.DEFAULT_PROFILE_IMAGE 
      : '/images/default-avatar.png';
    
    // Check if this image URL is already known to fail
    const profilePicUrl = message.sender_profile_pic || defaultProfileImage;
    const isKnownFailedImage = window.failedImages && window.failedImages.has(profilePicUrl);
    const imageSrc = isKnownFailedImage ? defaultProfileImage : profilePicUrl;
    
    avatarHtml = `
      <div class="message-avatar">
        <img 
          src="${imageSrc}" 
          alt="${message.sender_name || 'User'}" 
          class="avatar-image"
          data-original-src="${profilePicUrl}"
          data-fallback="${defaultProfileImage}"
          onerror="this.onerror=null; this.src='${defaultProfileImage}'; if(window.ImageHandler) window.ImageHandler.markImageAsFailed(this);"
        />
      </div>
    `;
  }
  
  // Label for debugging and user identification
  const userLabel = isCurrentUser ? 'User 1 (You)' : 'User 2';
  
  // Construct the message HTML - make sure message bubbles appear on correct sides
  messageElement.innerHTML = `
    ${avatarHtml}
    <div class="message-wrapper">
      ${!isCurrentUser ? `<div class="message-sender">${message.sender_name || userLabel}</div>` : ''}
      <div class="message-content">${formatMessageContent(message.content)}</div>
      <div class="message-time">${formatTimestamp(message.created_at || new Date())}</div>
      ${isCurrentUser ? `<div class="message-sender text-right">${userLabel}</div>` : ''}
    </div>
  `;
    // Find the messages container
  const messagesContainer = getMessagesContainer();
  if (!messagesContainer) {
    console.error('Messages container not found');
    return;
  }
  
  // Add the message to the container
  messagesContainer.appendChild(messageElement);
  
  // Apply image error handling to the new message
  if (window.ImageHandler) {
    const messageImages = messageElement.querySelectorAll('img');
    messageImages.forEach(img => window.ImageHandler.setupImageErrorHandler(img));
  }
  
  // Scroll to bottom
  scrollToBottom();
  
  return messageElement;
}

// Improved function to get current user ID from multiple sources
function getCurrentUserId() {
  // Try to get from page data attribute (most reliable)
  const userIdElement = document.querySelector('[data-user-id]');
  if (userIdElement && userIdElement.dataset.userId) {
    return userIdElement.dataset.userId;
  }
  
  // Try from global variable
  if (window.currentUserId) {
    return window.currentUserId;
  }
  
  // Try from meta tag
  const metaUserId = document.querySelector('meta[name="user-id"]')?.content;
  if (metaUserId) {
    return metaUserId;
  }
  
  // Try from JWT token if available
  const token = getAuthToken();
  if (token) {
    try {
      // Simple JWT parser (gets payload without verification)
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const payload = JSON.parse(jsonPayload);
      if (payload.userId) {
        // Cache this ID for future use
        window.currentUserId = payload.userId;
        return payload.userId;
      }
    } catch (e) {
      console.error('Error parsing JWT token:', e);
    }
  }
  
  // Last resort: check if the userId is in the URL
  const urlParams = new URLSearchParams(window.location.search);
  const urlUserId = urlParams.get('userId');
  if (urlUserId) {
    return urlUserId;
  }
  
  // Fallback to any userId we can find on the page
  return document.querySelector('[data-user]')?.dataset.user || 
         document.querySelector('[data-id]')?.dataset.id ||
         'current-user'; // Last resort fallback
}

// Format message content with proper escaping if needed
function formatMessageContent(content) {
  if (!content) return '';
  
  // If content is already HTML, return as is
  if (content.includes('<') && content.includes('>')) {
    return content;
  }
  
  // Otherwise escape and add line breaks
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

// Format timestamp for message display
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  
  return date.toLocaleDateString();
}

// Display messages in the UI
function displayMessages(messages) {
  const messagesList = getMessagesContainer();
  if (!messagesList) return;
  
  if (messages.length === 0) {
    messagesList.innerHTML = '<div class="no-messages text-center p-4 text-gray-500">No messages yet. Start the conversation!</div>';
    return;
  }
  
  messagesList.innerHTML = '';
  
  messages.forEach(message => {
    addMessageToUI(message);
  });
  
  // Scroll to bottom
  if (window.ChatScroll) {
    window.ChatScroll.scrollToBottom();
  }
}

// Send a message
function sendMessage() {
  const messageInput = getMessageInput();
  if (!messageInput || !currentConversationId) return;
  
  const content = messageInput.value.trim();
  if (!content) return;
  
  console.log('Sending message:', content);
  
  // Clear input
  messageInput.value = '';
  
  // Clear typing indicator
  clearTimeout(typingTimeout);
  if (window.ChatSocket && window.ChatSocket.isConnected()) {
    window.ChatSocket.sendStopTyping(currentConversationId);
  }
  
  // Send through websocket if available
  if (window.ChatSocket && window.ChatSocket.isConnected()) {
    window.ChatSocket.sendMessage(currentConversationId, content);
  } else {
    // Fallback to API if websocket not available
    sendMessageViaAPI(content);
  }
}

// Send message via API (fallback)
function sendMessageViaAPI(content) {
  fetch('/api/chat/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify({
      conversationId: currentConversationId,
      content: content
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    return response.json();
  })
  .then(data => {
    console.log('Message sent successfully:', data);
    
    // Add message to UI
    addMessageToUI(data.message);
    
    // Scroll to bottom
    if (window.ChatScroll) {
      window.ChatScroll.scrollToBottom();
    }
  })
  .catch(error => {
    console.error('Error sending message:', error);    // Show error in UI
    const messagesList = getMessagesContainer();
    if (messagesList) {
      const errorElement = document.createElement('div');
      errorElement.classList.add('error-message', 'text-center', 'p-2', 'text-red-500', 'text-sm');
      errorElement.textContent = `Failed to send message: ${error.message}`;
      messagesList.appendChild(errorElement);
    }
  });
}

// Send typing indicator
function sendTypingIndicator() {
  if (!window.ChatSocket || !window.ChatSocket.isConnected() || !currentConversationId) return;
  
  // Clear previous timeout
  clearTimeout(typingTimeout);
  
  // Send typing indicator
  window.ChatSocket.sendTyping(currentConversationId);
  
  // Set timeout to stop typing indicator after a delay
  typingTimeout = setTimeout(() => {
    window.ChatSocket.sendStopTyping(currentConversationId);
  }, 3000);
}

// Handle typing indicator from other users
function handleTypingIndicator(data, isTyping) {
  if (data.conversationId !== currentConversationId) return;
  
  const typingIndicator = document.querySelector('.typing-indicator');
  
  if (isTyping) {    // Create typing indicator if it doesn't exist
    if (!typingIndicator) {
      const messagesList = getMessagesContainer();
      if (!messagesList) return;
      
      const indicatorElement = document.createElement('div');
      indicatorElement.classList.add('typing-indicator', 'flex', 'items-center', 'text-gray-500', 'text-sm', 'ml-2', 'mb-2');
      indicatorElement.innerHTML = 'Someone is typing<span class="typing-dots">...</span>';
      messagesList.appendChild(indicatorElement);
      
      // Scroll to bottom if auto-scroll is enabled
      if (window.ChatScroll) {
        window.ChatScroll.scrollToBottom();
      }
    }
  } else {
    // Remove typing indicator
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }
}

// Helper functions
function getToken() {
  // Get token from meta tag
  const meta = document.querySelector('meta[name="auth-token"]');
  if (meta && meta.content) {
    return meta.content;
  }
  
  // Fallback to localStorage
  return localStorage.getItem('token') || '';
}

function getCurrentUserId() {
  // This could come from a global variable, data attribute, or other source
  // For now, try to get from URL or data attribute
  const userIdElement = document.querySelector('[data-user-id]');
  
  if (userIdElement && userIdElement.dataset.userId) {
    return userIdElement.dataset.userId;
  }
  
  // Try meta tag
  const userIdMeta = document.querySelector('meta[name="user-id"]');
  if (userIdMeta && userIdMeta.content) {
    return userIdMeta.content;
  }
  
  return null;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  
  return date.toLocaleDateString();
}

// Initialize chat when document is ready
if (document.readyState !== 'loading') {
  window.initChat();
} else {
  document.addEventListener('DOMContentLoaded', window.initChat);
}

// Add a function to test file uploads
window.testFileUpload = function(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  console.log('Testing file upload with:', {
    filename: file.name,
    type: file.type,
    size: file.size
  });
  
  fetch('/api/chat/test-upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: formData
  })
  .then(response => {
    console.log('Test upload response status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('Test upload response:', data);
    alert('Test upload result: ' + (data.success ? 'Success!' : 'Failed'));
  })
  .catch(error => {
    console.error('Test upload error:', error);
    alert('Test upload error: ' + error.message);
  });
};

// Improved file upload handling
function uploadFile(file, conversationId) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided for upload'));
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    if (conversationId) {
      formData.append('conversationId', conversationId);
    }
    
    console.log(`Uploading file: ${file.name} (${file.type}, ${file.size} bytes)`, {
      conversationId: conversationId || 'not provided',
      formDataEntries: Array.from(formData.entries()).map(entry => entry[0])
    });
    
    // Get authentication token
    const token = getAuthToken();
    if (!token) {
      reject(new Error('Authentication required for file upload'));
      return;
    }
    
    fetch('/api/chat/upload-file', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })
    .then(response => {
      console.log('Upload response status:', response.status);
      
      // Try to get detailed error info if there's an error
      if (!response.ok) {
        return response.json().then(errorData => {
          console.error('Upload error details:', errorData);
          throw new Error(errorData.error || `Upload failed with status: ${response.status}`);
        }).catch(jsonError => {
          // If we can't parse the error as JSON, throw a basic error
          throw new Error(`Upload failed with status: ${response.status}`);
        });
      }
      
      return response.json();
    })
    .then(data => {
      if (!data.success) {
        throw new Error(data.error || 'Upload failed');
      }
      
      console.log('File uploaded successfully:', data);
      resolve(data.file);
    })
    .catch(error => {
      console.error('Error uploading file:', error);
      reject(error);
    });
  });
}

// Improved file upload function with better error handling
window.uploadFile = function(file, conversationId) {
  return new Promise((resolve, reject) => {
    if (!file) {
      console.error('No file provided to uploadFile function');
      reject(new Error('No file provided for upload'));
      return;
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    if (conversationId) {
      formData.append('conversationId', conversationId);
    }
    
    // Log what we're attempting to upload for debugging
    console.log(`Uploading file: ${file.name}`, {
      type: file.type,
      size: file.size,
      conversationId: conversationId || 'none',
      form: {
        hasFile: formData.has('file'),
        hasConversationId: formData.has('conversationId')
      }
    });
    
    // Get authentication token
    const token = getAuthToken();
    if (!token) {
      console.error('No auth token available for file upload');
      reject(new Error('Authentication required for file upload'));
      return;
    }
    
    // Make the API request
    fetch('/api/chat/upload-file', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })
    .then(response => {
      console.log('Upload response status:', response.status);
      
      // Handle non-successful responses
      if (!response.ok) {
        return response.json().then(errorData => {
          console.error('Upload error details:', errorData);
          throw new Error(errorData.error || `Upload failed with status: ${response.status}`);
        }).catch(jsonError => {
          // If we can't parse the response as JSON
          if (jsonError.name === 'SyntaxError') {
            console.error('Non-JSON error response from server');
            throw new Error(`Upload failed with status: ${response.status}`);
          }
          throw jsonError;
        });
      }
      
      return response.json();
    })
    .then(data => {
      if (!data.success) {
        console.error('Server reported error:', data);
        throw new Error(data.error || 'Upload failed');
      }
      
      console.log('Upload succeeded:', data);
      resolve(data.file);
    })
    .catch(error => {
      console.error('Error uploading file:', error);
      reject(error);
    });
  });
};

// Test function that can be called from the browser console
window.testUpload = function() {
  // Create a test file
  const testFile = new File(['test file content'], 'test.txt', { type: 'text/plain' });
    // Show a status message
  console.log('Starting test upload...');
  const messagesList = getMessagesContainer();
  if (messagesList) {
    const statusElement = document.createElement('div');
    statusElement.classList.add('text-center', 'p-2', 'bg-blue-50', 'text-blue-700', 'rounded', 'my-2');
    statusElement.textContent = 'Testing file upload...';
    messagesList.appendChild(statusElement);
    
    // Attempt the upload
    uploadFile(testFile, currentConversationId)
      .then(result => {
        statusElement.classList.remove('bg-blue-50', 'text-blue-700');
        statusElement.classList.add('bg-green-50', 'text-green-700');
        statusElement.textContent = `Upload successful! File ID: ${result.id}`;
        console.log('Test upload succeeded:', result);
      })
      .catch(error => {
        statusElement.classList.remove('bg-blue-50', 'text-blue-700');
        statusElement.classList.add('bg-red-50', 'text-red-700');
        statusElement.textContent = `Upload failed: ${error.message}`;
        console.error('Test upload failed:', error);
      });
  } else {
    console.log('Cannot display status - messages list not found');
  }
};
