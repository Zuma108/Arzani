/**
 * AI Assistant functionality for marketplace
 */

// Check if AIAssistant is already defined to prevent double declaration errors
if (typeof window.AIAssistant === 'undefined') {
  // Define the class only if it doesn't already exist
  class AIAssistant {
    constructor() {
      // UI Elements - updated selectors to match new class names
      this.container = document.getElementById('ai-assistant-container');
      this.button = document.getElementById('ai-assistant-button');
      this.buttonWrapper = document.querySelector('.ai-button-wrapper');
      this.messagesContainer = document.querySelector('.messages-scroll');
      this.inputField = document.querySelector('#assistant-input');
      this.sendButton = document.querySelector('.send-icon');
      this.paperclipButton = document.querySelector('.attachment-icon');
      this.clearChatButton = document.querySelector('.clear-chat-button');
      
      // Chat history
      this.history = this.loadChatHistory() || [];
      
      // Track if we're currently displaying a typing indicator
      this.isTyping = false;
      
      // Add credits tracking for the new system
      this.credits = 30;
      this.maxCredits = 30;
      this.nextReset = null;
      this.subscriptionTier = 'free';
      
      // User context
      this.user = this.getUserInfo();
      
      // Add toggle state
      this.isOpen = false;
      
      // Initialize marketplace data object before using it
      this.marketplaceData = {
        activeListings: [],
        savedBusinesses: [],
        recentViews: [],
        lastSearch: null
      };
      
      // Initialize knowledge base
      this.knowledge = {
        industries: [
          'Agriculture', 'Automotive & Boat', 'Beauty & Personal Care', 
          'Building & Construction', 'Communication & Media', 'Education & Children',
          'Entertainment & Recreation', 'Financial Services', 'Health Care & Fitness',
          'Manufacturing', 'Online & Technology', 'Pet Services',
          'Restaurants & Food', 'Retail', 'Service Businesses',
          'Transportation & Storage', 'Travel', 'Wholesale & Distributors'
        ],
        commonQuestions: {
          // ...existing code...
        }
      };
      
      // Initialize user preferences
      this.userPreferences = {
        industries: [],
        locations: [],
        priceRange: null,
        lastInteractions: []
      };
      
      // Initialize lead status
      this.leadStatus = {
        email: null,
        phone: null,
        interestLevel: 'unknown',
        stage: 'browsing',
        lastQualificationAttempt: null
      };
      
      // Initialize
      this.init();
    }
    
    init() {
      console.log('Initializing AI Assistant...');
      
      // Critical fix: Setup toggle functionality for the AI button with proper logging
      if (this.button) {
        console.log('AI Button found, setting up event listener');
        this.button.addEventListener('click', (e) => {
          console.log('AI Button clicked');
          e.preventDefault();
          e.stopPropagation();
          this.toggleAssistant();
          return false;
        });
      } else {
        console.warn('AI Button not found!');
      }
      
      // Setup close button
      const closeButton = document.querySelector('.close-assistant-btn');
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          console.log('Close button clicked');
          this.toggleAssistant(false);
        });
      }
      
      // Setup clear chat button - enhanced to ensure it works
      if (this.clearChatButton) {
        console.log('Clear chat button found, setting up event listener');
        this.clearChatButton.addEventListener('click', (e) => {
          e.preventDefault();
          console.log('Clear chat button clicked');
          this.clearHistory();
        });
        
        // Ensure the button is visible
        this.clearChatButton.style.display = 'flex';
        this.clearChatButton.style.visibility = 'visible';
      } else {
        console.warn('Clear chat button not found!');
        // Create the button if it doesn't exist
        this.createClearChatButton();
      }
      
      this.setupEventListeners();
      this.setupQuickActions();
      this.renderChatHistory();
      
      // Log that assistant is initialized
      console.log('AI Assistant initialized:', {
        containerExists: !!this.container,
        buttonExists: !!this.button,
        messagesContainerExists: !!this.messagesContainer,
        inputFieldExists: !!this.inputField
      });

      // Fetch marketplace data for better contextual awareness
      this.fetchMarketplaceData();
      
      // Load user preferences from localStorage
      this.loadUserPreferences();
      
      // Set up analytics tracking
      this.setupAnalytics();
      
      // Fetch credit info
      this.fetchCreditInfo();
    }
    
    // Toggle the assistant visibility
    toggleAssistant(forceState) {
      console.log('Toggle assistant called, forceState:', forceState, 'current state:', this.isOpen);
      
      if (this.container) {
        const newState = forceState !== undefined ? forceState : !this.isOpen;
        console.log('New state will be:', newState);
        
        if (newState) {
          console.log('Showing assistant');
          this.container.classList.remove('ai-assistant-hidden');
          this.isOpen = true;
          // Focus input field
          setTimeout(() => {
            if (this.inputField) {
              this.inputField.focus();
              console.log('Input field focused');
            }
          }, 300);
        } else {
          console.log('Hiding assistant');
          this.container.classList.add('ai-assistant-hidden');
          this.isOpen = false;
        }
      } else {
        console.error('Container not found!');
      }
    }
    
    setupEventListeners() {
      // Send message on button click
      if (this.sendButton) {
        this.sendButton.addEventListener('click', () => {
          this.sendMessage();
        });
      }
      
      // Send message on Enter key
      if (this.inputField) {
        this.inputField.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
          }
        });
      }
      
      // File attachment (placeholder)
      if (this.paperclipButton) {
        this.paperclipButton.addEventListener('click', () => {
          this.showNotification('File attachments coming soon!', 'info');
        });
      }
      
      // Handle clicking on action tiles
      document.querySelectorAll('.action-tile').forEach(tile => {
        tile.addEventListener('click', () => {
          const description = tile.querySelector('.action-description');
          if (description) {
            this.sendMessage(description.textContent);
          }
        });
      });
      
      // Credits upgrade click
      const upgradeLink = document.querySelector('.upgrade-link');
      if (upgradeLink) {
        upgradeLink.addEventListener('click', (e) => {
          // Let the link work normally
          e.stopPropagation();
        });
      }
    }
    
    getUserInfo() {
      // Try to get username from profile button or localStorage
      const profileBtn = document.getElementById('profileBtn');
      const username = profileBtn?.getAttribute('data-username') || 
                      localStorage.getItem('username') || 
                      'there';
      
      // Get current page context
      const path = window.location.pathname;
      let context = 'marketplace';
      
      if (path.includes('business/')) {
        context = 'business_details';
      } else if (path.includes('post-business')) {
        context = 'seller';
      } else if (path.includes('saved-searches')) {
        context = 'saved';
      }
      
      return {
        name: username,
        context: context,
        lastInteraction: Date.now()
      };
    }
    
    setupQuickActions() {
      // Create different quick actions based on page context
      const quickActions = [];
      
      switch (this.user.context) {
        case 'business_details':
          quickActions.push(
            { title: "Valuation Analysis", description: "Is this price fair?" },
            { title: "Due Diligence", description: "What should I check?" },
            { title: "Financing", description: "How to finance this purchase?" },
            { title: "Business Worth", description: "What's my business worth?" } // Added business worth question
          );
          break;
          
        case 'seller':
          quickActions.push(
            { title: "Business Valuation", description: "What's my business worth?" }, // Added as first option for sellers
            { title: "Optimize Listing", description: "How can I improve my listing?" },
            { title: "Pricing Strategy", description: "How should I price my business?" },
            { title: "Deal Structure", description: "What terms should I offer?" }
          );
          break;
          
        case 'saved':
          quickActions.push(
            { title: "Compare Businesses", description: "Help me compare my saved businesses" },
            { title: "Investment Analysis", description: "Which saved business is the best investment?" },
            { title: "Business Worth", description: "What's my business worth?" } // Added for users browsing saved businesses
          );
          break;
          
        default: // marketplace
          quickActions.push(
            { title: "Find Businesses", description: "Help me find a business to buy" },
            { title: "Market Trends", description: "What industries are trending?" },
            { title: "Investment Tips", description: "What makes a good business investment?" },
            { title: "Business Worth", description: "What's my business worth?" } // Added for marketplace users
          );
      }
      
      // Find the welcome message and append quick actions
      const firstMessage = this.messagesContainer?.querySelector('.system-message .message-content');
      if (firstMessage && quickActions.length > 0) {
        // Create quick actions container
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'quick-actions';
        actionsContainer.style.display = 'flex';
        actionsContainer.style.flexWrap = 'wrap';
        actionsContainer.style.gap = '10px';
        actionsContainer.style.marginTop = '16px';
        
        // Add actions
        quickActions.forEach(action => {
          const actionTile = document.createElement('div');
          actionTile.className = 'action-tile';
          actionTile.style.width = '190px';
          actionTile.style.cursor = 'pointer';
          
          actionTile.innerHTML = `
            <div class="tile-content">
              <div class="tile-title">${action.title}</div>
              <div class="tile-description">${action.description}</div>
            </div>
          `;
          
          // Add click handler
          actionTile.addEventListener('click', () => {
            this.sendMessage(action.description);
          });
          
          actionsContainer.appendChild(actionTile);
        });
        
        firstMessage.appendChild(actionsContainer);
      }
    }
    
    sendMessage(text = null) {
      const message = text || this.inputField.value.trim();
      
      if (!message) return;
      
      // Check if user has credits
      if (this.credits <= 0) {
        this.addSystemMessage("You've used all your AI credits. Please upgrade your plan or wait for your credits to reset.");
        this.showNotification('Out of credits. Please upgrade for more.', 'error');
        return;
      }
      
      // Track the message being sent
      this.trackEvent('message_sent', { 
        messageLength: message.length,
        isQuickAction: text !== null
      });
      
      // Update user preferences based on this message
      this.updateUserPreferencesFromMessage(message);
      
      // Clear input field
      if (!text) this.inputField.value = '';
      
      // Add user message to chat
      this.addUserMessage(message);
      
      // Show typing indicator
      this.showTypingIndicator();
      
      // Generate response with slight delay for realism
      setTimeout(() => {
        this.generateResponse(message);
      }, 500 + Math.random() * 1000);
      
      // Update credits (will be refreshed after message sent)
      this.credits -= 1;
      this.updateCreditDisplay();
    }
    
    addUserMessage(text) {
      const messageDiv = document.createElement('div');
      messageDiv.className = 'user-message';
      messageDiv.style.textAlign = 'right';
      messageDiv.style.marginBottom = '16px';
      
      messageDiv.innerHTML = `
        <div style="display: inline-block; background-color: #0009a3; color: white; padding: 10px 14px; border-radius: 18px 18px 4px 18px; max-width: 80%;">
          ${this.escapeHTML(text)}
        </div>
        <div style="font-size: 11px; color: #666; margin-top: 4px;">
          ${this.formatTime(new Date())} · ${this.user.name}
        </div>
      `;
      
      this.messagesContainer.appendChild(messageDiv);
      this.scrollToBottom();
      
      // Save to history
      this.history.push({
        role: 'user',
        content: text,
        timestamp: new Date().toISOString()
      });
      
      this.saveChatHistory();
    }
    
    addAssistantMessage(text) {
      // Remove typing indicator if present
      this.removeTypingIndicator();
      
      const messageDiv = document.createElement('div');
      messageDiv.className = 'assistant-message';
      messageDiv.style.display = 'flex';
      messageDiv.style.marginBottom = '16px';
      messageDiv.style.position = 'relative';
      messageDiv.style.paddingLeft = '40px';
      
      messageDiv.innerHTML = `
        <div class="profile-icon" style="width: 32px; height: 32px; position: absolute; left: 0; top: 0; background: linear-gradient(93deg, #4F8CFF 0%, #010545 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
          <img src="/images/ai-assistant.png" alt="AI" style="width: 22px; height: 22px;">
        </div>
        <div style="background-color: #f5f5f5; padding: 10px 14px; border-radius: 18px 18px 18px 4px; max-width: 80%;">
          ${this.formatMessageWithLinks(text)}
        </div>
      `;
      
      const timeDiv = document.createElement('div');
      timeDiv.style.fontSize = '11px';
      timeDiv.style.color = '#666';
      timeDiv.style.marginTop = '4px';
      timeDiv.style.marginLeft = '8px';
      timeDiv.textContent = `${this.formatTime(new Date())} · AI Assistant`;
      
      messageDiv.querySelector('div:last-child').appendChild(timeDiv);
      
      this.messagesContainer.appendChild(messageDiv);
      this.scrollToBottom();
      
      // Save to history
      this.history.push({
        role: 'assistant',
        content: text,
        timestamp: new Date().toISOString()
      });
      
      this.saveChatHistory();
    }
    
    addSystemMessage(text) {
      // System messages have a slightly different style
      const messageDiv = document.createElement('div');
      messageDiv.className = 'system-message';
      messageDiv.style.borderLeft = '3px solid #0009a3';
      messageDiv.style.padding = '8px 8px 8px 16px';
      messageDiv.style.backgroundColor = 'rgba(0, 9, 163, 0.05)';
      messageDiv.style.margin = '16px 0';
      messageDiv.style.borderRadius = '4px';
      
      messageDiv.innerHTML = `
        <div class="message-text" style="font-size: 14px;">${text}</div>
      `;
      
      this.messagesContainer.appendChild(messageDiv);
      this.scrollToBottom();
    }
    
    showTypingIndicator() {
      // Don't add multiple typing indicators
      if (this.isTyping) return;
      
      this.isTyping = true;
      
      const typingDiv = document.createElement('div');
      typingDiv.className = 'typing-indicator assistant-message';
      typingDiv.style.display = 'flex';
      typingDiv.style.marginBottom = '16px';
      typingDiv.style.position = 'relative';
      typingDiv.style.paddingLeft = '40px';
      
      typingDiv.innerHTML = `
        <div class="profile-icon" style="width: 32px; height: 32px; position: absolute; left: 0; top: 0; background: linear-gradient(93deg, #4F8CFF 0%, #010545 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
          <img src="/images/ai-assistant.png" alt="AI" style="width: 22px; height: 22px;">
        </div>
        <div style="background-color: #f5f5f5; padding: 10px 14px; border-radius: 18px 18px 18px 4px;">
          <div class="typing-dots" style="display: flex; align-items: center; gap: 4px;">
            <span style="height: 8px; width: 8px; border-radius: 50%; background-color: #0009a3; display: inline-block; animation: typing 1.4s infinite ease-in-out both; animation-delay: -0.32s;"></span>
            <span style="height: 8px; width: 8px; border-radius: 50%; background-color: #0009a3; display: inline-block; animation: typing 1.4s infinite ease-in-out both; animation-delay: -0.16s;"></span>
            <span style="height: 8px; width: 8px; border-radius: 50%; background-color: #0009a3; display: inline-block; animation: typing 1.4s infinite ease-in-out both;"></span>
          </div>
          <style>
            @keyframes typing {
              0%, 80%, 100% { transform: scale(0); }
              40% { transform: scale(1); }
            }
          </style>
        </div>
      `;
      
      this.messagesContainer.appendChild(typingDiv);
      this.scrollToBottom();
    }
    
    removeTypingIndicator() {
      const typingIndicator = this.messagesContainer.querySelector('.typing-indicator');
      if (typingIndicator) {
        typingIndicator.remove();
      }
      this.isTyping = false;
    }
    
    generateResponse(userMessage) {
      // Use the API if connected, otherwise use the offline mode
      if (window.navigator.onLine) {
        this.generateAPIResponse(userMessage);
      } else {
        this.generateOfflineResponse(userMessage);
      }
    }
    
    async generateAPIResponse(userMessage) {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          // Fall back to offline mode if not authenticated
          this.generateOfflineResponse(userMessage);
          return;
        }
        
        const response = await fetch('/api/assistant/chat', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: userMessage,
            conversationHistory: this.history.slice(-10) // Send last 10 messages for context
          })
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Add the response to the chat
        this.addAssistantMessage(data.message || "I'm sorry, I couldn't generate a response.");
        
        // Update credit information
        if (data.credits) {
          this.credits = data.credits.remaining || this.credits;
          this.maxCredits = data.credits.limit || this.maxCredits;
          this.updateCreditDisplay();
        } else {
          // Refresh credits info if not returned
          this.fetchCreditInfo();
        }
        
      } catch (error) {
        console.error('API response error:', error);
        this.generateOfflineResponse(userMessage);
      }
    }
    
    generateOfflineResponse(userMessage) {
      const lowerMessage = userMessage.toLowerCase();
      let response;
      
      // Check for business valuation questions
      if (lowerMessage.includes('worth') || 
          lowerMessage.includes('value') || 
          lowerMessage.includes('valuation') || 
          (lowerMessage.includes('business') && lowerMessage.includes('how much'))) {
        
        response = "Arzani has a dedicated business valuation tool that can help you determine what your business is worth. I'd recommend using our valuation tool in the 'Post a Business' section of our website.\n\n";
        response += "You can access it directly at www/arzani.co.uk/post-business and follow the guided process there. The tool will ask for your business details like revenue, profit, assets, and industry, then provide you with a professional estimate.\n\n";
        response += "Would you like me to direct you to the valuation tool now?";
        
        // Add suggestion chips for this response
        setTimeout(() => {
          const lastMessage = this.messagesContainer.querySelector('.assistant-message:last-child');
          if (lastMessage) {
            this.addSuggestionChips([
              { text: "Go to valuation tool", action: "navigateTo", data: "https://www.arzani.co.uk/post-business" },
              "What factors affect valuation?",
              "Not now, thanks"
            ], lastMessage);
          }
        }, 100);
        
        return response;
      }
      
      // First, check if the message mentions budget
      if (lowerMessage.includes('budget') || lowerMessage.includes('£') || 
          lowerMessage.match(/\d{5,}/) || lowerMessage.includes('afford')) {
        
        // Extract budget amount if present
        let budget = '£12,323,892'; // Default if no specific amount found
        const budgetMatch = lowerMessage.match(/£([0-9,]+)/);
        if (budgetMatch) {
          budget = `£${budgetMatch[1]}`;
        }
        
        response = `With a budget of ${budget}, you have several excellent options available on the Arzani marketplace. Here are some businesses that fit within your budget:\n\n`;
        
        // Provide properly categorized businesses
        response += `1. LuxeJet Travel Services\n`;
        response += `   • Industry: Travel & Hospitality\n`;
        response += `   • Price: £12,000,000\n`;
        response += `   • Location: London, UK\n`;
        response += `   • Established: 2015\n\n`;
        
        response += `2. Charlie's Chocolate Factory\n`;
        response += `   • Industry: Food & Beverage Manufacturing\n`;
        response += `   • Price: £10,500,000\n`;
        response += `   • Location: Birmingham, UK\n`;
        response += `   • Established: 2008\n\n`;
        
        response += `3. TechSphere Solutions\n`;
        response += `   • Industry: Online & Technology\n`;
        response += `   • Price: £11,800,000\n`;
        response += `   • Location: Manchester, UK\n`;
        response += `   • Established: 2012\n\n`;
        
        response += `You have approximately £500,000+ in remaining budget flexibility for transition costs, working capital, or potential upgrades.\n\n`;
        response += `Would you like me to provide more details about any of these businesses, or would you prefer to see options in a specific industry or location?`;
      }
      
      // Then check for lead generation opportunities
      if (!this.leadStatus.email && this.leadStatus.interestLevel !== 'unknown' && 
          lowerMessage.includes('contact') || lowerMessage.includes('seller')) {
        response = "I can help connect you with the seller. To do that, could you share your email address so they can reach out to you directly?";
        this.leadStatus.lastQualificationAttempt = Date.now();
      }
      
      // Then check for marketplace-specific questions using knowledge base
      if (!response) {
        for (const [topic, data] of Object.entries(this.knowledge.commonQuestions)) {
          for (const keyword of data.keywords) {
            if (lowerMessage.includes(keyword)) {
              response = data.answer;
              break;
            }
          }
          if (response) break;
        }
      }
      
      // Check for personalized responses using marketplace data
      if (!response) {
        // If the user has viewed businesses recently
        if (this.marketplaceData.recentViews && this.marketplaceData.recentViews.length > 0 && 
            (lowerMessage.includes('recent') || lowerMessage.includes('view') || lowerMessage.includes('saw'))) {
          response = "I notice you've recently viewed some businesses. Would you like me to help you compare them or provide more information about any specific one?";
        }
        
        // If the user has saved businesses
        else if (this.marketplaceData.savedBusinesses && this.marketplaceData.savedBusinesses.length > 0 && 
            lowerMessage.includes('saved')) {
          response = `You have ${this.marketplaceData.savedBusinesses.length} saved businesses. Would you like to discuss any of them in particular, or would you like recommendations for similar businesses?`;
        }
        
        // If the user has search criteria set
        else if (this.marketplaceData.lastSearch && 
                (lowerMessage.includes('search') || lowerMessage.includes('find') || lowerMessage.includes('looking'))) {
          response = "Based on your previous search criteria, I can help you find businesses that match your preferences. Would you like me to focus on a specific industry, location, or price range?";
        }
      }
      
      // Customized responses based on page context
      if (!response) {
        if (this.user.context === 'business_details' && lowerMessage.includes('contact')) {
          response = "To contact the seller, use the contact button on this page. Be specific about your experience and interest. I recommend mentioning any relevant background you have in this industry to increase your chances of a response.";
        } else if (this.user.context === 'seller' && lowerMessage.includes('picture') || lowerMessage.includes('photo')) {
          response = "Adding high-quality photos can increase interest in your listing by up to 80%. For best results, include photos of the premises, equipment, products, and any unique selling points. Avoid including staff or customer faces without permission.";
        } else if (this.user.context === 'saved' && (lowerMessage.includes('compare') || lowerMessage.includes('which'))) {
          response = "I can help you compare your saved businesses. To provide the best analysis, I need to know what aspects are most important to you: return on investment, growth potential, work-life balance, or required expertise?";
        }
      }
      
      // Generic responses as fallback
      if (!response) {
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi ')) {
          response = `Hello ${this.user.name}! I'm your AI assistant for the business marketplace. I can help with finding businesses, valuation, due diligence, or creating listings. What would you like to know?`;
        } else if (lowerMessage.includes('thank')) {
          response = "You're welcome! If you have more questions about the marketplace or specific businesses, feel free to ask. I'm here to help.";
        } else if (lowerMessage.includes('who are you') || lowerMessage.includes('what can you do')) {
          response = "I'm an AI assistant specialized in business buying and selling. I can help with market research, valuation analysis, due diligence guidance, and optimization of business listings. Just ask me specific questions about businesses you're interested in!";
        } else if (lowerMessage.includes('find business') || lowerMessage.includes('search for')) {
          // Use user preferences if available
          if (this.userPreferences.industries.length > 0 || this.userPreferences.locations.length > 0) {
            const industries = this.userPreferences.industries.length > 0 ? 
              `in the ${this.userPreferences.industries.join(' or ')} industry` : '';
            const locations = this.userPreferences.locations.length > 0 ?
              `in ${this.userPreferences.locations.join(' or ')}` : '';
            
            response = `Based on your interests, I can help you find businesses ${industries} ${locations}. Would you like me to search for these criteria or would you prefer to specify different parameters?`;
          } else {
            response = "To find businesses that match your criteria, you can use the filters at the top of the marketplace page. You can filter by industry, location, price range, and more. What type of business are you looking for?";
          }
        } else {
          // Default response when no pattern matches
          response = "I understand you're interested in the business marketplace. Could you provide more specific details about what you're looking for? I can help with finding businesses, understanding valuations, due diligence, or creating effective listings.";
        }
      }
      
      // Add response with a realistic typing delay
      const typingSpeed = 20; // ms per character
      const delay = Math.min(2000, response.length * typingSpeed);
      
      // Track the response
      this.trackEvent('message_received', {
        responseLength: response.length,
        responseTime: delay,
        isOffline: true
      });
      
      setTimeout(() => {
        this.addAssistantMessage(response);
        
        // Update credits info after sending
        this.fetchCreditInfo();
      }, delay);
    }
    
    renderChatHistory() {
      if (!this.history || !this.history.length) return;
      
      // Clear initial welcome message if we have history
      this.messagesContainer.innerHTML = '';
      
      // Render messages
      this.history.forEach(msg => {
        if (msg.role === 'user') {
          this.addUserMessage(msg.content);
        } else {
          this.addAssistantMessage(msg.content);
        }
      });
    }
    
    loadChatHistory() {
      try {
        const history = localStorage.getItem('aiAssistantHistory');
        return history ? JSON.parse(history) : null;
      } catch (err) {
        console.error('Error loading chat history', err);
        return null;
      }
    }
    
    saveChatHistory() {
      try {
        // Keep last 50 messages to avoid localStorage limits
        const historyToSave = this.history.slice(-50);
        localStorage.setItem('aiAssistantHistory', JSON.stringify(historyToSave));
      } catch (err) {
        console.error('Error saving chat history', err);
        // Show a discreet notification to user
        this.showNotification('Could not save chat history', 'error');
      }
    }
    
    clearHistory() {
      // Clear history from localStorage
      localStorage.removeItem('aiAssistantHistory');
      
      // Clear chat UI
      this.messagesContainer.innerHTML = '';
      this.history = [];
      
      // Add welcome message back
      this.addSystemMessage(`Welcome ${this.user.name}! How can I help you with the marketplace today?`);
      
      // Re-add quick actions
      this.setupQuickActions();
    }
    
    showNotification(message, type = 'info') {
      // Create a floating notification
      const notification = document.createElement('div');
      notification.textContent = message;
      notification.style.position = 'fixed';
      notification.style.bottom = '20px';
      notification.style.right = '20px';
      notification.style.padding = '10px 20px';
      notification.style.borderRadius = '4px';
      notification.style.zIndex = '9999';
      notification.style.fontSize = '14px';
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.3s ease';
      
      // Style based on type
      switch (type) {
        case 'error':
          notification.style.backgroundColor = '#f8d7da';
          notification.style.color = '#721c24';
          notification.style.border = '1px solid #f5c6cb';
          break;
        case 'success':
          notification.style.backgroundColor = '#d4edda';
          notification.style.color = '#155724';
          notification.style.border = '1px solid #c3e6cb';
          break;
        default: // info
          notification.style.backgroundColor = '#d1ecf1';
          notification.style.color = '#0c5460';
          notification.style.border = '1px solid #bee5eb';
      }
      
      document.body.appendChild(notification);
      
      // Show the notification with a fade-in effect
      setTimeout(() => {
        notification.style.opacity = '1';
      }, 10);
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 300);
      }, 3000);
    }
    
    formatTime(date) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    scrollToBottom() {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
    
    escapeHTML(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    formatMessageWithLinks(text) {
      // Replace URLs with clickable links
      return text.replace(
        /(https?:\/\/[^\s]+)/g, 
        '<a href="$1" target="_blank" style="color: #0009a3; text-decoration: underline;">$1</a>'
      );
    }

    // New method to fetch marketplace data
    async fetchMarketplaceData() {
      try {
        // Get recent views from localStorage or API
        const recentViewsStr = localStorage.getItem('recentBusinessViews');
        if (recentViewsStr) {
          this.marketplaceData.recentViews = JSON.parse(recentViewsStr);
        }
        
        // Get saved businesses if available
        const savedBusinessesStr = localStorage.getItem('savedBusinesses');
        if (savedBusinessesStr) {
          this.marketplaceData.savedBusinesses = JSON.parse(savedBusinessesStr);
        }
        
        // Get last search criteria
        const lastSearchStr = localStorage.getItem('lastSearchCriteria');
        if (lastSearchStr) {
          this.marketplaceData.lastSearch = JSON.parse(lastSearchStr);
        }
        
        // If we're on a listing page, get current business details
        if (this.user.context === 'business_details') {
          const businessIdMatch = window.location.pathname.match(/\/business\/(\w+)/);
          if (businessIdMatch && businessIdMatch[1]) {
            const businessId = businessIdMatch[1];
            // In a real implementation, you would fetch this data from your API
            // For now, we'll just note that we would need this data
            console.log(`Would fetch business data for ID: ${businessId}`);
          }
        }
      } catch (error) {
        console.error('Error fetching marketplace data:', error);
      }
    }
    
    // New method to load user preferences
    loadUserPreferences() {
      try {
        const preferences = localStorage.getItem('aiAssistantUserPreferences');
        if (preferences) {
          this.userPreferences = {...this.userPreferences, ...JSON.parse(preferences)};
        }
        
        // Extract industry preferences from filters if available
        const industryCheckboxes = document.querySelectorAll('.industry-checkbox:checked');
        if (industryCheckboxes.length > 0) {
          this.userPreferences.industries = Array.from(industryCheckboxes).map(cb => cb.value);
        }
        
        // Extract location if available
        const locationInput = document.getElementById('locationInput');
        if (locationInput && locationInput.value) {
          this.userPreferences.locations = [locationInput.value];
        }
        
        // Extract price range if selected
        const priceRangeInputs = document.querySelectorAll('input[name="priceRange"]:checked');
        if (priceRangeInputs.length > 0) {
          this.userPreferences.priceRange = priceRangeInputs[0].value;
        }
      } catch (error) {
        console.error('Error loading user preferences:', error);
      }
    }
    
    // New method for analytics tracking
    setupAnalytics() {
      // Track conversation starting
      this.trackEvent('chat_started');
      
      // Add additional tracking for significant events
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && this.history.length > 0) {
          this.trackEvent('chat_abandoned');
        }
      });
    }
    
    // New method to track events
    trackEvent(eventName, properties = {}) {
      // Implementation would depend on your analytics system
      // This is a placeholder for analytics tracking
      console.log(`Tracking event: ${eventName}`, properties);
      
      // In a real implementation, you would send this to your analytics service
      // Example: analytics.track(eventName, properties);
    }
    
    // New method to update user preferences from message content
    updateUserPreferencesFromMessage(message) {
      const lowerMessage = message.toLowerCase();
      
      // Check for industry mentions
      this.knowledge.industries.forEach(industry => {
        if (lowerMessage.includes(industry.toLowerCase())) {
          if (!this.userPreferences.industries.includes(industry)) {
            this.userPreferences.industries.push(industry);
          }
        }
      });
      
      // Check for location mentions (simple implementation)
      const commonLocations = ['london', 'manchester', 'birmingham', 'leeds', 
                              'liverpool', 'edinburgh', 'glasgow', 'bristol'];
      commonLocations.forEach(location => {
        if (lowerMessage.includes(location.toLowerCase())) {
          if (!this.userPreferences.locations.includes(location)) {
            this.userPreferences.locations.push(location);
          }
        }
      });
      
      // Check for price mentions
      const priceMatch = lowerMessage.match(/£([0-9,]+)/);
      if (priceMatch) {
        const price = parseInt(priceMatch[1].replace(/,/g, ''));
        
        // Categorize the price range
        let priceRange = null;
        if (price <= 100000) priceRange = '0-100000';
        else if (price <= 250000) priceRange = '100000-250000';
        else if (price <= 500000) priceRange = '250000-500000';
        else if (price <= 1000000) priceRange = '500000-1000000';
        else priceRange = '1000000+';
        
        this.userPreferences.priceRange = priceRange;
      }
      
      // Save the updated preferences
      this.saveUserPreferences();
      
      // Update lead qualification status
      this.qualifyLead(message);
    }
    
    // New method to save user preferences
    saveUserPreferences() {
      try {
        localStorage.setItem('aiAssistantUserPreferences', 
          JSON.stringify(this.userPreferences)
        );
      } catch (error) {
        console.error('Error saving user preferences', error);
      }
    }
    
    // New method to attempt lead qualification
    qualifyLead(message) {
      const lowerMessage = message.toLowerCase();
      
      // Check for contact info
      const emailMatch = message.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/);
      if (emailMatch && !this.leadStatus.email) {
        this.leadStatus.email = emailMatch[0];
        this.trackEvent('lead_email_captured', { email: this.leadStatus.email });
      }
      
      const phoneMatch = message.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
      if (phoneMatch && !this.leadStatus.phone) {
        this.leadStatus.phone = phoneMatch[0];
        this.trackEvent('lead_phone_captured', { phone: this.leadStatus.phone });
      }
      
      // Check for buying intent signals
      const buyingSignals = [
        'interested in buying', 'want to purchase', 'looking to acquire',
        'ready to invest', 'contact the seller', 'make an offer'
      ];
      
      let buyingIntent = false;
      buyingSignals.forEach(signal => {
        if (lowerMessage.includes(signal.toLowerCase())) {
          buyingIntent = true;
        }
      });
      
      if (buyingIntent) {
        // Upgrade lead status
        if (this.leadStatus.interestLevel === 'unknown') {
          this.leadStatus.interestLevel = 'medium';
        } else if (this.leadStatus.interestLevel === 'medium') {
          this.leadStatus.interestLevel = 'high';
        }
        
        if (this.leadStatus.stage === 'browsing') {
          this.leadStatus.stage = 'researching';
        } else if (this.leadStatus.stage === 'researching') {
          this.leadStatus.stage = 'serious';
        }
        
        this.trackEvent('lead_qualification_update', { 
          interestLevel: this.leadStatus.interestLevel,
          stage: this.leadStatus.stage
        });
        
        // If this is a high-interest lead without contact info, try to capture it
        if (this.leadStatus.interestLevel === 'high' && !this.leadStatus.email && 
            (!this.leadStatus.lastQualificationAttempt || 
             Date.now() - this.leadStatus.lastQualificationAttempt > 300000)) {
          
          this.leadStatus.lastQualificationAttempt = Date.now();
          
          // Queue up a contact request message after the next AI response
          setTimeout(() => {
            this.addAssistantMessage("I'd be happy to connect you with the seller. Could you provide your email address so they can reach out to you?");
          }, 5000);
        }
      }
    }
    
    /**
     * Fetch credit information from the API
     */
    async fetchCreditInfo() {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('No token found, using default credits');
          this.credits = 30;
          this.maxCredits = 30;
          this.updateCreditDisplay();
          return;
        }
        
        console.log('Fetching credit info...');
        const response = await fetch('/api/assistant/info', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          this.credits = data.remaining || 30;
          this.maxCredits = data.limit || 30;
          this.nextReset = data.nextReset;
          this.subscriptionTier = data.subscription || 'free';
          this.updateCreditDisplay();
          console.log('Credit info updated:', this.credits, '/', this.maxCredits);
        } else {
          console.warn('Error fetching credits, using defaults');
          // Keep using default values
          this.credits = 30;
          this.maxCredits = 30;
          this.updateCreditDisplay();
        }
      } catch (error) {
        console.error('Error fetching credit info:', error);
        // Set defaults on error
        this.credits = 30;
        this.maxCredits = 30;
        this.updateCreditDisplay();
      }
    }
    
    /**
     * Update the credit display in the UI
     */
    updateCreditDisplay() {
      const creditsText = document.querySelector('.credits p');
      if (creditsText) {
        // Format the next reset date if available
        let resetText = '';
        if (this.nextReset) {
          try {
            const resetDate = new Date(this.nextReset);
            if (!isNaN(resetDate.getTime())) {
              const today = new Date();
              const diffTime = Math.abs(resetDate - today);
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              resetText = diffDays <= 1 ? ' Credits reset tomorrow.' : ` Credits reset in ${diffDays} days.`;
            }
          } catch (e) {
            console.warn('Invalid date format for reset date', e);
            resetText = ' Credits reset every 7 days.';
          }
        } else {
          resetText = ' Credits reset every 7 days.';
        }
        
        // Show appropriate upgrade link based on current subscription
        let upgradeLink = '';
        if (this.subscriptionTier === 'free') {
          upgradeLink = '<a href="/checkout-gold" class="upgrade-link">Upgrade for more</a>';
        } else if (this.subscriptionTier === 'gold') {
          upgradeLink = '<a href="/checkout-platinum" class="upgrade-link">Upgrade to Platinum</a>';
        }
        
        // Update the display
        creditsText.innerHTML = `
          Remaining: <strong>${this.credits}</strong> of <strong>${this.maxCredits}</strong> credits.${resetText}
          ${upgradeLink}
        `;
      } else {
        console.warn('Credit display element not found');
      }
    }

    // Make the assistant available globally
    static initializeGlobal() {
      // Only initialize if not already initialized
      if (!window.aiAssistant) {
        try {
          console.log('AI Assistant: Initializing globally...');
          window.aiAssistant = new AIAssistant();
          console.log('AI Assistant: Initialization complete');
          
          // Make the toggle function available globally
          window.showDialog = () => {
            if (window.aiAssistant) {
              window.aiAssistant.toggleAssistant(true);
            }
          };
          
        } catch (error) {
          console.error('Error initializing AI Assistant:', error);
        }
      } else {
        console.log('AI Assistant: Already initialized, skipping');
      }
    }
    
    // Add new method to create clear chat button if missing
    createClearChatButton() {
      console.log('Creating clear chat button');
      const chatContainer = this.container.querySelector('.chat-container');
      const messagesContainer = this.container.querySelector('.messages-scroll');
      
      if (chatContainer && messagesContainer) {
        const clearButton = document.createElement('button');
        clearButton.className = 'clear-chat-button mx-auto';
        clearButton.innerHTML = '<i class="fa-regular fa-trash-can-xmark"></i> Clear chat';
        
        // Insert after messages container
        messagesContainer.after(clearButton);
        
        // Update reference and add event listener
        this.clearChatButton = clearButton;
        this.clearChatButton.addEventListener('click', () => {
          console.log('Clear chat clicked');
          this.clearHistory();
        });
        
        console.log('Clear chat button created successfully');
      }
    }

    // Add suggestion chips for responses
    addSuggestionChips(suggestions, parentMessage) {
      // Don't add chips if there are none
      if (!suggestions || !suggestions.length) return;
      
      // Create suggestion chips container
      const chipsContainer = document.createElement('div');
      chipsContainer.className = 'suggestion-chips';
      
      // Store suggestions for analytics
      this.suggestionChips = suggestions;
      
      // Add each suggestion as a chip
      suggestions.forEach(suggestion => {
        let chipText = suggestion;
        let chipAction = null;
        let chipData = {};
        let chipClass = 'suggestion-chip';
        
        // If suggestion is an object with text and action
        if (typeof suggestion === 'object' && suggestion.text) {
          chipText = suggestion.text;
          chipAction = suggestion.action;
          chipData = suggestion.data || {};
          
          // Add special styling for industry/location/price chips
          if (chipAction === 'filterByIndustry') {
            chipClass += ' category-chip industry-chip';
          } else if (chipAction === 'filterByLocation') {
            chipClass += ' category-chip location-chip';
          } else if (chipAction === 'filterByPrice') {
            chipClass += ' category-chip price-chip';
          }
        }
        
        const chip = document.createElement('button');
        chip.className = chipClass;
        chip.textContent = chipText;
        
        // Store action and data in dataset
        if (chipAction) {
          chip.dataset.action = chipAction;
          chip.dataset.actionData = JSON.stringify(chipData);
        }
        
        // Add click handler
        chip.addEventListener('click', () => {
          // Execute action if defined
          if (chipAction && this.actions[chipAction]) {
            this.actions[chipAction](chipData);
          } else {
            // Otherwise just send as a message
            this.sendMessage(chipText);
          }
          
          // Track the interaction
          this.trackEvent('suggestion_chip_clicked', {
            suggestion: chipText,
            action: chipAction || 'send_message'
          });
          
          // Disable all chips in this container
          chipsContainer.querySelectorAll('button').forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'default';
          });
        });
        
        chipsContainer.appendChild(chip);
      });
      
      // Append chips to parent message
      parentMessage.querySelector('div:nth-child(2)').appendChild(chipsContainer);
    }

    // Add navigation action if it doesn't exist
    navigateTo(data) {
      const url = data.url || data;
      
      // Track the action
      this.trackEvent('navigate_to', { url });
      
      // Add system message
      this.addSystemMessage(`Navigating to ${url}...`);
      
      // Navigate after a short delay
      setTimeout(() => {
        // Handle both relative and absolute URLs
        if (url.startsWith('http') || url.startsWith('www')) {
          window.location.href = url;
        } else {
          window.location.href = url;
        }
      }, 1000);
    }
  }

  // Make class available globally but only if not already defined
  window.AIAssistant = AIAssistant;
  
  // Critical fix: Initialize immediately after class definition to ensure it runs
  // even if DOMContentLoaded has already fired
  console.log('Defining AIAssistant global initialization');
  window.initializeAIAssistant = function() {
    if (!window.aiAssistant) {
      console.log('Creating global AI Assistant instance');
      try {
        window.aiAssistant = new AIAssistant();
        
        // Add "show dialog" global helper
        window.showAIAssistant = function() {
          if (window.aiAssistant) {
            window.aiAssistant.toggleAssistant(true);
          }
        };
        
        console.log('AI Assistant initialized successfully');
      } catch (error) {
        console.error('Failed to initialize AI Assistant:', error);
      }
    } else {
      console.log('AI Assistant already initialized');
    }
  };
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initializeAIAssistant);
  } else {
    // If DOMContentLoaded has already fired, initialize immediately
    window.initializeAIAssistant();
  }
  
  // Also try on window load as a fallback
  window.addEventListener('load', function() {
    window.initializeAIAssistant();
  });
} else {
  console.log('AI Assistant: Class already defined, skipping redeclaration');
}
