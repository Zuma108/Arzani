/**
 * AI Chatbot Integration
 * Handles integration between the main app and AI chatbot functionality
 */

(function() {
  // Store the global state
  const state = {
    initialized: false,
    userLoggedIn: false,
    chatbotVisible: false,
    token: null,
    userId: null,
    chatHistory: [],
    pendingMessages: []
  };

  // Initialize on page load
  document.addEventListener('DOMContentLoaded', init);

  // Main initialization function
  function init() {
    console.log('AI Chatbot Integration initializing...');
    
    // Check authentication state
    checkAuthState();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize chat container
    setupChatContainer();
    
    // Connect to auth events
    listenForAuthChanges();
    
    state.initialized = true;
    console.log('AI Chatbot Integration initialized successfully');
  }

  // Check if user is authenticated
  function checkAuthState() {
    // Get token from multiple sources
    state.token = localStorage.getItem('token') || 
                  document.querySelector('meta[name="auth-token"]')?.content ||
                  getCookie('token');
    
    if (state.token) {
      state.userLoggedIn = true;
      
      // Extract user ID from token if possible (JWT format)
      try {
        const tokenData = JSON.parse(atob(state.token.split('.')[1]));
        state.userId = tokenData.userId;
      } catch (e) {
        console.log('Could not extract user ID from token');
      }
      
      console.log('AI Chatbot: User is authenticated', { 
        userId: state.userId,
        hasToken: !!state.token
      });
    } else {
      state.userLoggedIn = false;
      console.log('AI Chatbot: User is not authenticated');
    }
  }

  // Set up event listeners for the chatbot
  function setupEventListeners() {
    // Listen for chat button click
    document.querySelectorAll('.ai-chat-btn, .chat-button, [data-action="open-chat"]').forEach(btn => {
      if (btn) {
        btn.addEventListener('click', toggleChatbot);
      }
    });
    
    // Listen for auth events from auth-token-handler.js
    window.addEventListener('auth-state-changed', function(event) {
      if (event.detail && event.detail.authenticated !== undefined) {
        state.userLoggedIn = event.detail.authenticated;
        state.token = event.detail.token;
        console.log('Auth state changed:', event.detail);
      }
    });
  }

  // Set up the chat container if it doesn't exist
  function setupChatContainer() {
    const existingContainer = document.getElementById('ai-chatbot-container');
    
    if (!existingContainer) {
      // If no container exists, don't create one - it will be loaded via partial
      return;
    }
    
    // If container exists, set it up
    const chatInput = existingContainer.querySelector('.chat-input');
    const sendButton = existingContainer.querySelector('.send-button');
    
    if (chatInput && sendButton) {
      chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage(chatInput.value);
          chatInput.value = '';
        }
      });
      
      sendButton.addEventListener('click', function() {
        sendMessage(chatInput.value);
        chatInput.value = '';
      });
    }
  }

  // Toggle chatbot visibility
  function toggleChatbot() {
    const chatContainer = document.getElementById('ai-chatbot-container');
    
    if (!chatContainer) {
      console.error('Chat container not found');
      return;
    }
    
    if (chatContainer.classList.contains('hidden')) {
      chatContainer.classList.remove('hidden');
      state.chatbotVisible = true;
      
      // Focus the input field
      setTimeout(() => {
        const chatInput = chatContainer.querySelector('.chat-input');
        if (chatInput) chatInput.focus();
      }, 100);
      
      // Send event
      document.dispatchEvent(new CustomEvent('ai-chatbot-opened'));
    } else {
      chatContainer.classList.add('hidden');
      state.chatbotVisible = false;
      
      // Send event
      document.dispatchEvent(new CustomEvent('ai-chatbot-closed'));
    }
  }

  // Send a message to the AI
  function sendMessage(message) {
    if (!message.trim()) return;
    
    // Add message to UI immediately
    addMessageToUI('user', message);
    
    // Send to API with authentication if available
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }
    
    fetch('/api/ai/chat', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        message: message,
        history: state.chatHistory.slice(-5) // Send last 5 messages for context
      })
    })
    .then(response => {
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    })
    .then(data => {
      if (data.response) {
        addMessageToUI('ai', data.response);
        
        // Store in history
        state.chatHistory.push({ role: 'user', content: message });
        state.chatHistory.push({ role: 'ai', content: data.response });
      }
    })
    .catch(error => {
      console.error('Error sending message to AI:', error);
      addMessageToUI('ai', 'Sorry, I encountered an error. Please try again later.');
    });
  }

  // Add message to the UI
  function addMessageToUI(sender, message) {
    const chatContainer = document.getElementById('ai-chatbot-messages');
    if (!chatContainer) return;
    
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${sender}-message`;
    
    // Create avatar element
    const avatarEl = document.createElement('div');
    avatarEl.className = 'chat-avatar';
    
    if (sender === 'user') {
      // Use user profile picture if available
      if (state.userLoggedIn) {
        const userAvatar = document.querySelector('.profile-picture, [data-user-avatar]');
        if (userAvatar && userAvatar.src) {
          avatarEl.innerHTML = `<img src="${userAvatar.src}" alt="You" class="avatar-image">`;
        } else {
          avatarEl.innerHTML = '<div class="avatar-placeholder"><i class="fas fa-user"></i></div>';
        }
      } else {
        avatarEl.innerHTML = '<div class="avatar-placeholder"><i class="fas fa-user"></i></div>';
      }
    } else {
      // AI avatar
      avatarEl.innerHTML = '<div class="ai-avatar"><i class="fas fa-robot"></i></div>';
    }
    
    // Create message content
    const contentEl = document.createElement('div');
    contentEl.className = 'chat-message-content';
    contentEl.innerText = message;
    
    // Append elements
    messageEl.appendChild(avatarEl);
    messageEl.appendChild(contentEl);
    chatContainer.appendChild(messageEl);
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // Listen for auth state changes
  function listenForAuthChanges() {
    // Watch for token changes in localStorage
    window.addEventListener('storage', function(e) {
      if (e.key === 'token') {
        if (e.newValue) {
          state.token = e.newValue;
          state.userLoggedIn = true;
        } else {
          state.token = null;
          state.userLoggedIn = false;
        }
      }
    });
  }

  // Helper to get cookie by name
  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  // Export methods for global access
  window.AIChatbot = {
    toggle: toggleChatbot,
    send: sendMessage,
    isVisible: () => state.chatbotVisible,
    isInitialized: () => state.initialized
  };
})();
