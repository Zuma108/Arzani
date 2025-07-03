/**
 * AI Chatbot Integration
 * 
 * This script handles the AI chatbot functionality for the marketplace
 */

// Use an immediately invoked function expression to avoid global scope pollution
(function() {
  // Create the AI Assistant object
  const aiAssistant = {
    credits: 30,
    maxCredits: 30,
    isOpen: false,
    conversationHistory: [],
    
    init() {
      console.log('Initializing AI Assistant');
      this.loadIcons();
      this.setupEventListeners();
      this.loadConversationHistory();
      this.updateCreditDisplay();
      this.fetchCreditInfo();
    },
    
    loadIcons() {
      if (!document.querySelector('link[href*="font-awesome"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(link);
        console.log('Font Awesome loaded');
      }
    },
    
    async fetchCreditInfo() {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch('/api/assistant/info', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          this.credits = data.remaining;
          this.maxCredits = data.limit;
          this.updateCreditDisplay();
        }
      } catch (error) {
        console.error('Error fetching credit info:', error);
      }
    },
    
    setupEventListeners() {
      // Safely find elements
      const assistantButton = document.getElementById('ai-assistant-button');
      const closeButton = document.querySelector('.close-assistant-btn');
      const clearButton = document.querySelector('.clear-chat-button');
      const inputField = document.getElementById('assistant-input');
      const sendButton = document.querySelector('.send-icon');
      
      // Toggle chatbot visibility
      if (assistantButton) {
        assistantButton.addEventListener('click', () => this.toggleAssistant());
      }
      
      if (closeButton) {
        closeButton.addEventListener('click', () => this.toggleAssistant(false));
      }
      
      // Handle clear chat button
      if (clearButton) {
        clearButton.addEventListener('click', () => this.clearChat());
      }
      
      // Handle message sending
      if (inputField) {
        inputField.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            this.sendMessage();
          }
        });
      }
      
      if (sendButton) {
        sendButton.addEventListener('click', () => this.sendMessage());
      }
      
      // Setup action tiles with proper error handling
      try {
        const actionTiles = document.querySelectorAll('.action-tile');
        if (actionTiles && actionTiles.length > 0) {
          actionTiles.forEach(tile => {
            tile.addEventListener('click', () => {
              const descEl = tile.querySelector('.action-description');
              if (descEl && inputField) {
                inputField.value = descEl.textContent || '';
                this.sendMessage();
              }
            });
          });
        }
      } catch (error) {
        console.error('Error setting up action tiles:', error);
      }
    },
    
    loadConversationHistory() {
      try {
        const savedHistory = localStorage.getItem('aiAssistantHistory');
        if (savedHistory) {
          this.conversationHistory = JSON.parse(savedHistory);
          
          // Display last 5 messages from the history
          const recentMessages = this.conversationHistory.slice(-5);
          recentMessages.forEach(message => {
            if (message.role === 'user') {
              this.addUserMessage(message.content, false);
            } else if (message.role === 'assistant') {
              this.addSystemMessage(message.content, false);
            }
          });
        } else {
          // If no history, add a welcome message
          const welcomeMessage = "Welcome to our Marketplace Assistant! I'm here to help you find and sell businesses. You can ask me about available listings, business valuation, or get help with selling your business.";
          this.addSystemMessage(welcomeMessage, false);
          this.conversationHistory.push({
            role: 'assistant',
            content: welcomeMessage
          });
          this.saveConversationHistory();
        }
      } catch (error) {
        console.error('Error loading conversation history:', error);
        // Add fallback welcome message
        this.addSystemMessage("Welcome to our Marketplace Assistant! I'm here to help you find and sell businesses.");
      }
    },
    
    saveConversationHistory() {
      try {
        // Only keep the last 20 messages to avoid localStorage limits
        const trimmedHistory = this.conversationHistory.slice(-20);
        localStorage.setItem('aiAssistantHistory', JSON.stringify(trimmedHistory));
      } catch (error) {
        console.error('Error saving conversation history:', error);
      }
    },
    
    toggleAssistant(show = null) {
      const container = document.getElementById('ai-assistant-container');
      if (!container) return;
      
      // If show is null, toggle based on current state
      show = show === null ? !this.isOpen : show;
      
      if (show) {
        container.classList.remove('ai-assistant-hidden');
        this.isOpen = true;
        setTimeout(() => {
          document.getElementById('assistant-input')?.focus();
        }, 300);
      } else {
        container.classList.add('ai-assistant-hidden');
        this.isOpen = false;
      }
    },
    
    async sendMessage() {
      const inputField = document.getElementById('assistant-input');
      if (!inputField || !inputField.value.trim()) return;
      
      // Check if we have credits
      if (this.credits <= 0) {
        this.addSystemMessage("You've used all your credits. Please upgrade for unlimited access or wait for your credits to reset.");
        return;
      }
      
      const userMessage = inputField.value.trim();
      inputField.value = '';
      
      // Add user message to chat
      this.addUserMessage(userMessage);
      
      // Deduct a credit
      this.credits--;
      this.updateCreditDisplay();
      
      try {
        // Show typing indicator
        this.showTypingIndicator();
        
        // Make API call to get response
        const response = await this.getAIResponse(userMessage);
        
        // Remove typing indicator and add response
        this.hideTypingIndicator();
        this.addSystemMessage(response.message);
        
        // If there are suggestions, add them
        if (response.suggestions && response.suggestions.length > 0) {
          this.addSuggestionButtons(response.suggestions);
        }
        
        // Update credits from response
        if (response.credits) {
          this.credits = response.credits.remaining;
          this.maxCredits = response.credits.limit;
          this.updateCreditDisplay();
        }
        
        // Save conversation history
        this.saveConversationHistory();
        
      } catch (error) {
        console.error('Error getting AI response:', error);
        this.hideTypingIndicator();
        this.addSystemMessage("I'm sorry, I couldn't process your request. Please try again later.");
      }
    },
    
    addUserMessage(message, saveToHistory = true) {
      const messagesContainer = document.querySelector('.messages-scroll');
      if (!messagesContainer) return;
      
      const messageEl = document.createElement('div');
      messageEl.className = 'dmo-mt-16 user-message';
      messageEl.style.textAlign = 'right';
      messageEl.style.paddingLeft = '40px';
      
      messageEl.innerHTML = `
        <div class="message-content" style="background-color: #f0f0f0; padding: 10px; border-radius: 8px;">
          <p>${this.escapeHtml(message)}</p>
        </div>
      `;
      
      messagesContainer.appendChild(messageEl);
      this.scrollToBottom();
      
      // Add to conversation history if requested
      if (saveToHistory) {
        this.conversationHistory.push({
          role: 'user',
          content: message
        });
      }
    },
    
    addSystemMessage(message, saveToHistory = true) {
      const messagesContainer = document.querySelector('.messages-scroll');
      if (!messagesContainer) return;
      
      const messageEl = document.createElement('div');
      messageEl.className = 'dmo-mt-16 system-message';
        messageEl.innerHTML = `
        <span class="profile-icon system-icon">
          <img src="/figma design exports/images.webp/arzani-icon-nobackground.png" alt="Arzani AI" class="assistant-logo" 
               onerror="this.onerror=null; this.src='https://cdn-icons-png.flaticon.com/512/4616/4616734.png';">
        </span>
        <div class="message-content">
          <p>${this.formatMessage(message)}</p>
        </div>
      `;
      
      messagesContainer.appendChild(messageEl);
      this.scrollToBottom();
      
      // Add to conversation history if requested
      if (saveToHistory) {
        this.conversationHistory.push({
          role: 'assistant',
          content: message
        });
      }
    },
    
    formatMessage(message) {
      // Basic formatting (bold, italic, links)
      let formattedMessage = this.escapeHtml(message)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
      
      // Handle newlines
      formattedMessage = formattedMessage.replace(/\n/g, '<br>');
      
      return formattedMessage;
    },
    
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },
    
    showTypingIndicator() {
      const messagesContainer = document.querySelector('.messages-scroll');
      if (!messagesContainer) return;
      
      const indicatorEl = document.createElement('div');
      indicatorEl.className = 'typing-indicator system-message dmo-mt-16';
      indicatorEl.id = 'typing-indicator';
      
      indicatorEl.innerHTML = `
        <span class="profile-icon system-icon">
          <img src="/images/ai-assistant.png" alt="AI" class="assistant-logo"
               onerror="this.onerror=null; this.src='https://cdn-icons-png.flaticon.com/512/4616/4616734.png';">
        </span>
        <div class="message-content">
          <div class="typing-dots">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      `;
      
      messagesContainer.appendChild(indicatorEl);
      this.scrollToBottom();
      
      // Add styles for typing dots if not already added
      if (!document.getElementById('typing-dots-style')) {
        const style = document.createElement('style');
        style.id = 'typing-dots-style';
        style.textContent = `
          .typing-dots { display: flex; }
          .typing-dots .dot {
            width: 8px;
            height: 8px;
            margin: 0 4px;
            background: #000AA4;
            border-radius: 50%;
            animation: typingAnimation 1.4s infinite;
          }
          .typing-dots .dot:nth-child(2) { animation-delay: 0.2s; }
          .typing-dots .dot:nth-child(3) { animation-delay: 0.4s; }
          @keyframes typingAnimation {
            0%, 100% { opacity: 0.2; transform: translateY(0); }
            50% { opacity: 1; transform: translateY(-5px); }
          }
        `;
        document.head.appendChild(style);
      }
    },
    
    hideTypingIndicator() {
      const indicator = document.getElementById('typing-indicator');
      if (indicator) {
        indicator.remove();
      }
    },
    
    addSuggestionButtons(suggestions) {
      const messagesContainer = document.querySelector('.messages-scroll');
      if (!messagesContainer || !suggestions.length) return;
      
      const suggestionsEl = document.createElement('div');
      suggestionsEl.className = 'suggestions-container dmo-mt-16';
      
      let buttonsHtml = '<div class="suggestions-title">You might want to ask:</div>';
      suggestions.forEach(suggestion => {
        buttonsHtml += `
          <button class="suggestion-button" data-query="${this.escapeHtml(suggestion)}">
            ${this.escapeHtml(suggestion)}
          </button>
        `;
      });
      
      suggestionsEl.innerHTML = buttonsHtml;
      messagesContainer.appendChild(suggestionsEl);
      
      // Add event listeners
      const buttons = suggestionsEl.querySelectorAll('.suggestion-button');
      if (buttons.length > 0) {
        buttons.forEach(button => {
          button.addEventListener('click', () => {
            const input = document.getElementById('assistant-input');
            if (input) {
              input.value = button.dataset.query || '';
              this.sendMessage();
            }
          });
        });
      }
      
      this.scrollToBottom();
      
      // Add styles for suggestions if not already added
      if (!document.getElementById('suggestions-style')) {
        const style = document.createElement('style');
        style.id = 'suggestions-style';
        style.textContent = `
          .suggestions-container {
            margin-left: 40px;
            margin-top: 10px;
          }
          .suggestions-title {
            font-size: 12px;
            color: #666;
            margin-bottom: 8px;
          }
          .suggestion-button {
            background: #f5f5f5;
            border: 1px solid #e0e0e0;
            border-radius: 16px;
            padding: 6px 12px;
            margin: 0 8px 8px 0;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .suggestion-button:hover {
            background: #e9e9e9;
          }
        `;
        document.head.appendChild(style);
      }
    },
    
    scrollToBottom() {
      const messagesContainer = document.querySelector('.messages-scroll');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    },
    
    updateCreditDisplay() {
      const creditsText = document.querySelector('.credits p');
      if (creditsText) {
        creditsText.innerHTML = `
          Remaining: <strong>${this.credits}</strong> of <strong>${this.maxCredits}</strong> credits. Credits reset every 7 days.
          <a href="/checkout-platinum" class="upgrade-link">Upgrade for more</a>
        `;
      }
    },
    
    clearChat() {
      const messagesContainer = document.querySelector('.messages-scroll');
      if (!messagesContainer) return;
      
      // Clear all messages
      messagesContainer.innerHTML = '';
      
      // Add a fresh welcome message
      const welcomeMessage = "Welcome to our Marketplace Assistant! I'm here to help you find and sell businesses. You can ask me about available listings, business valuation, or get help with selling your business.";
      this.addSystemMessage(welcomeMessage, false);
      
      // Reset conversation history but keep the welcome message
      this.conversationHistory = [{
        role: 'assistant',
        content: welcomeMessage
      }];
      
      this.saveConversationHistory();
    },
    
    async getAIResponse(message) {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          throw new Error('Authentication required');
        }
        
        const response = await fetch('/api/assistant/chat', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message,
            conversationHistory: this.conversationHistory.slice(-10) // Send the last 10 messages for context
          })
        });
        
        if (!response.ok) {
          // Handle different error scenarios
          if (response.status === 401) {
            throw new Error('Authentication required');
          } else if (response.status === 429) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Credit limit reached');
          } else {
            throw new Error('Failed to get response from AI assistant');
          }
        }
        
        return await response.json();
        
      } catch (error) {
        console.error('AI response error:', error);
        return {
          message: `I'm having trouble connecting to the server. ${error.message}`,
          suggestions: ['Try again later', 'Contact support', 'Check your connection']
        };
      }
    }
  };
  
  // Define the global showDialog function
  window.showDialog = function() {
    if (window.aiAssistant) {
      window.aiAssistant.toggleAssistant(true);
    } else {
      console.error('AI Assistant not initialized');
    }
  };

  // Initialize the AI assistant when DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    try {
      console.log('Checking for AI assistant container');
      
      // Check if the container exists before initializing
      const container = document.getElementById('ai-assistant-container');
      if (container) {
        console.log('AI assistant container found, initializing');
        
        // Make the assistant object globally available
        window.aiAssistant = aiAssistant;
        
        // Start the assistant
        setTimeout(() => {
          aiAssistant.init();
          console.log('AI Assistant initialized successfully');
        }, 100);
      } else {
        console.log('AI assistant container not found on this page');
      }
    } catch (error) {
      console.error('Error during AI Assistant initialization:', error);
    }
  });
})();
