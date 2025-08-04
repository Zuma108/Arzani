/**
 * Enhanced Chat Interface
 * Provides improved UI, animations, and functionality for the chat interface
 */

(function() {
  // Store the state
  const state = {
    aiChatbotVisible: false,
    aiChatbotMinimized: false,
    aiConversationHistory: [],
    typingTimer: null,
    isMobile: window.innerWidth < 768
  };
  
  // Start initialization when DOM is ready
  document.addEventListener('DOMContentLoaded', init);
  
  // Main initialization function
  function init() {
    console.log('Enhanced chat interface initializing...');
    
    // Set up AI chatbot functionality
    initAiChatbot();
    
    // Set up main chat UI enhancements
    enhanceMainChat();
    
    // Initialize toast notification system
    initToastSystem();
    
    // Set up responsive behavior
    handleResponsive();
    
    // Check for new conversation notification
    checkForNewConversation();
    
    console.log('Enhanced chat interface initialized');
  }
  
  // Initialize the AI chatbot overlay
  function initAiChatbot() {
    // Get DOM elements
    const aiChatbot = document.getElementById('ai-assistant-container-wrapper');
    // Remove startAiChat button reference since it's been removed
    const floatingAiButton = document.getElementById('floatingAiButton');
    const closeButton = document.querySelector('.ai-close-btn');
    const minimizeButton = document.querySelector('.ai-minimize-btn');
    const inputField = document.querySelector('.ai-input-field');
    const sendButton = document.querySelector('.ai-send-btn');
    
    if (!aiChatbot) return;
    
    // Remove event listener for the removed button
    
    // Handle floating AI button click
    if (floatingAiButton) {
      floatingAiButton.addEventListener('click', function() {
        toggleAiChatbot();
      });
    }
    
    // Handle close button
    if (closeButton) {
      closeButton.addEventListener('click', function() {
        hideAiChatbot();
      });
    }
    
    // Handle minimize button
    if (minimizeButton) {
      minimizeButton.addEventListener('click', function() {
        minimizeAiChatbot();
      });
    }
    
    // Handle input field keypress
    if (inputField) {
      inputField.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && inputField.value.trim()) {
          sendAiMessage(inputField.value.trim());
          inputField.value = '';
        }
      });
    }
    
    // Handle send button click
    if (sendButton) {
      sendButton.addEventListener('click', function() {
        if (inputField.value.trim()) {
          sendAiMessage(inputField.value.trim());
          inputField.value = '';
        }
      });
    }
  }
  
  // Show the AI chatbot
  function showAiChatbot() {
    const aiChatbot = document.getElementById('ai-assistant-container-wrapper');
    if (!aiChatbot) return;
    
    aiChatbot.classList.remove('hidden');
    aiChatbot.classList.remove('minimized');
    state.aiChatbotVisible = true;
    state.aiChatbotMinimized = false;
    
    // Focus the input field
    setTimeout(() => {
      const inputField = document.querySelector('.ai-input-field');
      if (inputField) inputField.focus();
    }, 300);
  }
  
  // Hide the AI chatbot
  function hideAiChatbot() {
    const aiChatbot = document.getElementById('ai-assistant-container-wrapper');
    if (!aiChatbot) return;
    
    aiChatbot.classList.add('hidden');
    state.aiChatbotVisible = false;
  }
  
  // Minimize the AI chatbot
  function minimizeAiChatbot() {
    const aiChatbot = document.getElementById('ai-assistant-container-wrapper');
    if (!aiChatbot) return;
    
    aiChatbot.classList.add('minimized');
    state.aiChatbotMinimized = true;
  }
  
  // Toggle the AI chatbot visibility
  function toggleAiChatbot() {
    if (state.aiChatbotVisible && !state.aiChatbotMinimized) {
      hideAiChatbot();
    } else {
      showAiChatbot();
    }
  }
  
  // Send a message to the AI
  function sendAiMessage(message) {
    // Add user message to UI
    addAiChatMessage('user', message);
    
    // Add to conversation history
    state.aiConversationHistory.push({
      role: 'user',
      content: message
    });
    
    // Show typing indicator
    showAiTypingIndicator();
    
    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      // Remove typing indicator
      removeAiTypingIndicator();
      
      // For demo, generate a simple response
      let response;
      
      if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
        response = "Hello! How can I help you with the Arzani marketplace today?";
      } else if (message.toLowerCase().includes('price') || message.toLowerCase().includes('cost')) {
        response = "Our pricing varies based on the business type and revenue. Would you like me to provide more specific pricing information?";
      } else if (message.toLowerCase().includes('sell') || message.toLowerCase().includes('selling')) {
        response = "Selling your business on Arzani is a straightforward process. First, you'll need to create a listing with details about your business. Would you like me to guide you through the steps?";
      } else if (message.toLowerCase().includes('buy') || message.toLowerCase().includes('buying')) {
        response = "Looking to buy a business? You can browse our marketplace to find opportunities that match your criteria. Would you like some tips on evaluating businesses?";
      } else {
        response = "Thank you for your message. Can you provide more details about what you're looking for, so I can better assist you?";
      }
      
      // Add AI response to UI
      addAiChatMessage('ai', response);
      
      // Add to conversation history
      state.aiConversationHistory.push({
        role: 'ai',
        content: response
      });
    }, 1000 + Math.random() * 1000); // Random delay between 1-2 seconds
  }
  
  // Add a message to the AI chat UI
  function addAiChatMessage(sender, message) {
    const chatContainer = document.getElementById('ai-chatbot-messages');
    if (!chatContainer) return;
    
    const messageEl = document.createElement('div');
    messageEl.className = `ai-message ${sender === 'user' ? 'user-message' : ''}`;
    
    const avatarEl = document.createElement('div');
    avatarEl.className = 'ai-avatar';
    avatarEl.innerHTML = `<i class="fas fa-${sender === 'user' ? 'user' : 'robot'}"></i>`;
    
    const contentEl = document.createElement('div');
    contentEl.className = 'ai-message-content';
    contentEl.textContent = message;
    
    messageEl.appendChild(avatarEl);
    messageEl.appendChild(contentEl);
    chatContainer.appendChild(messageEl);
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
  
  // Show AI typing indicator
  function showAiTypingIndicator() {
    const chatContainer = document.getElementById('ai-chatbot-messages');
    if (!chatContainer) return;
    
    // Check if typing indicator already exists
    if (document.querySelector('.ai-typing-indicator')) return;
    
    const typingEl = document.createElement('div');
    typingEl.className = 'ai-message ai-typing-indicator';
      const avatarEl = document.createElement('div');
    avatarEl.className = 'ai-avatar';
    avatarEl.innerHTML = '<img src="/figma design exports/images.webp/arzani-icon-nobackground.png" alt="Arzani AI" style="width: 24px; height: 24px; object-fit: contain;" onerror="this.onerror=null; this.src=\'https://cdn-icons-png.flaticon.com/512/4616/4616734.png\';">';
    
    const contentEl = document.createElement('div');
    contentEl.className = 'ai-message-content';
    contentEl.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
    
    typingEl.appendChild(avatarEl);
    typingEl.appendChild(contentEl);
    chatContainer.appendChild(typingEl);
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    // Add typing animation styles if not already added
    if (!document.getElementById('typing-indicator-style')) {
      const style = document.createElement('style');
      style.id = 'typing-indicator-style';
      style.textContent = `
        .typing-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: rgba(0, 0, 0, 0.3);
          margin: 0 2px;
          animation: typing-dot 1.4s infinite ease-in-out both;
        }
        .ai-typing-indicator .ai-message-content .typing-dot:nth-child(1) {
          animation-delay: 0s;
        }
        .ai-typing-indicator .ai-message-content .typing-dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        .ai-typing-indicator .ai-message-content .typing-dot:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes typing-dot {
          0%, 80%, 100% { transform: scale(0.7); }
          40% { transform: scale(1.2); }
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  // Remove AI typing indicator
  function removeAiTypingIndicator() {
    const typingIndicator = document.querySelector('.ai-typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }
  
  // Enhance the main chat UI
  function enhanceMainChat() {
    // Apply perfect scrollbar to chat messages if available
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages && window.PerfectScrollbar) {
      new PerfectScrollbar(chatMessages, {
        suppressScrollX: true,
        wheelPropagation: false
      });
    }
    
    // Enhance the conversation list
    const conversationList = document.querySelector('.conversations-scroll');
    if (conversationList && window.PerfectScrollbar) {
      new PerfectScrollbar(conversationList, {
        suppressScrollX: true,
        wheelPropagation: false
      });
    }
    
    // Enhance suggested messages in empty state
    const suggestedMessages = document.querySelectorAll('.suggested-message');
    suggestedMessages.forEach(btn => {
      btn.addEventListener('click', function() {
        const quill = window.chatQuill;
        if (quill) {
          quill.setText(btn.textContent);
          // Enable the send button
          const sendBtn = document.getElementById('sendMessageBtn');
          if (sendBtn) sendBtn.disabled = false;
        }
      });
    });
    
    // Make the suggested messages button have a hover effect
    const style = document.createElement('style');
    style.textContent = `
      .suggested-message {
        transition: all 0.2s ease;
      }
      .suggested-message:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      }
    `;
    document.head.appendChild(style);
  }
  
  // Initialize toast notification system
  function initToastSystem() {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    
    // Add global showToast function
    window.showToast = function(options) {
      const { type = 'info', title, message, duration = 5000 } = options;
      
      // Create toast element
      const toastEl = document.createElement('div');
      toastEl.className = `toast toast-${type}`;
      
      // Set icon based on type
      let icon = 'info-circle';
      if (type === 'success') icon = 'check-circle';
      if (type === 'error') icon = 'exclamation-circle';
      if (type === 'warning') icon = 'exclamation-triangle';
      
      // Build toast HTML
      toastEl.innerHTML = `
        <div class="toast-icon">
          <i class="fas fa-${icon}"></i>
        </div>
        <div class="toast-content">
          ${title ? `<div class="toast-title">${title}</div>` : ''}
          <div class="toast-message">${message}</div>
        </div>
        <div class="toast-close">
          <i class="fas fa-times"></i>
        </div>
      `;
      
      // Add to container
      toastContainer.appendChild(toastEl);
      
      // Set up close button
      const closeBtn = toastEl.querySelector('.toast-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', function() {
          closeToast(toastEl);
        });
      }
      
      // Auto close after duration
      if (duration > 0) {
        setTimeout(() => {
          if (toastEl.parentNode) {
            closeToast(toastEl);
          }
        }, duration);
      }
    };
    
    // Function to close a toast with animation
    function closeToast(toastEl) {
      toastEl.classList.add('closing');
      setTimeout(() => {
        if (toastEl.parentNode) {
          toastEl.parentNode.removeChild(toastEl);
        }
      }, 300); // Match the animation duration
    }
  }
  
  // Handle responsive behavior
  function handleResponsive() {
    // Check initial state
    checkResponsiveState();
    
    // Listen for window resize
    window.addEventListener('resize', function() {
      checkResponsiveState();
    });
  }
  
  // Check and update responsive state
  function checkResponsiveState() {
    const newIsMobile = window.innerWidth < 768;
    
    // Only update if state changed
    if (newIsMobile !== state.isMobile) {
      state.isMobile = newIsMobile;
      
      // If now mobile and AI chatbot is open, close it
      if (newIsMobile && state.aiChatbotVisible) {
        hideAiChatbot();
      }
    }
  }
  
  // Enhances the start AI chat button for smoother animations
  document.getElementById('startAiChat')?.addEventListener('mouseenter', function() {
    this.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
    this.style.transform = 'translateY(-2px)';
  });
  
  document.getElementById('startAiChat')?.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(0)';
  });
  
  // Export functions to window for debug access
  window.aiChatbot = {
    show: showAiChatbot,
    hide: hideAiChatbot,
    minimize: minimizeAiChatbot,
    toggle: toggleAiChatbot
  };
  
  // Check URL parameters for new conversation flag
  function checkForNewConversation() {
    const urlParams = new URLSearchParams(window.location.search);
    const isNewConversation = urlParams.get('new') === '1';
    const conversationId = urlParams.get('conversation');
    
    if (isNewConversation && conversationId) {
      // Show a welcome toast
      setTimeout(() => {
        window.showToast({
          type: 'success',
          title: 'Conversation Started',
          message: 'You can now communicate with the seller directly through this chat.',
          duration: 5000
        });
      }, 1000);
      
      // Clean up URL
      urlParams.delete('new');
      const newUrl = window.location.pathname + 
                     (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, document.title, newUrl);
    }
  }
  
})();
