/**
 * AI Assistant functionality for marketplace
 */

// Check if AIAssistant is already defined to prevent double declaration errors
if (typeof window.AIAssistant === 'undefined') {
  // Define the class only if it doesn't already exist
  class AIAssistant {
    constructor() {
      // UI Elements
      this.messagesContainer = document.querySelector('.messages-scroll');
      this.inputField = document.querySelector('.form-control');
      this.sendButton = document.querySelector('.send-icon');
      this.paperclipButton = document.querySelector('.paperclip-icon');
      this.dialog = document.getElementById('ai-assistant-dialog');
      
      // Chat history
      this.history = this.loadChatHistory() || [];
      
      // Track if we're currently displaying a typing indicator
      this.isTyping = false;
      
      // User context
      this.user = this.getUserInfo();
      
      // Marketplace knowledge base
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
          'valuation': {
            keywords: ['worth', 'value', 'valuation', 'price', 'pricing', 'cost'],
            answer: "Business valuation typically involves multiple of earnings (EBITDA), revenue multiples, or asset-based approaches. For most small businesses, a common rule of thumb is 2-3x annual profit, but this varies widely by industry, growth rate, and asset value."
          },
          'due_diligence': {
            keywords: ['check', 'verify', 'diligence', 'risk', 'review'],
            answer: "For due diligence, you should review: financial statements (3+ years), legal documents, customer/supplier contracts, employee information, and operational processes. I recommend creating a checklist specific to the business type you're evaluating."
          },
          'financing': {
            keywords: ['loan', 'finance', 'bank', 'sba', 'funding', 'capital', 'money'],
            answer: "Common financing options include SBA loans (3-5% down), seller financing (10-30% down), conventional bank loans (15-25% down), and equity partners. The best approach depends on your credit history, available capital, and the business's financials."
          },
          'finding_businesses': {
            keywords: ['find', 'search', 'locate', 'discover'],
            answer: "To find businesses, use our search filters for industry, location, and price range. I recommend saving your search criteria to receive alerts for new listings. You can also directly contact business brokers who specialize in your desired industry."
          },
          'selling': {
            keywords: ['sell', 'exit', 'listing'],
            answer: "To sell your business, start by organizing financial documents and operations. Create your listing by clicking 'Post a Business' with clear photos and detailed descriptions. Being transparent about financials while highlighting growth potential will attract serious buyers."
          }
        },
        
        tips: {
          'seller_communication': "When contacting sellers, be specific about your background, timeline, and why you're interested in their business. Serious inquiries that demonstrate knowledge get the best responses.",
          'negotiation': "When making an offer, consider earnouts or seller financing to bridge valuation gaps. Focus negotiations on verifiable metrics rather than potential.",
          'listing_optimization': "For your listings, professional photos and transparent financials generate 3x more inquiries. Include growth opportunities but keep claims realistic."
        }
      };
      
      // Add enhanced marketplace integration capabilities
      this.marketplaceData = {
        activeListings: null,
        savedBusinesses: null,
        recentViews: null,
        lastSearch: null
      };

      // Add user preference tracking
      this.userPreferences = {
        industries: [],
        locations: [],
        priceRange: null,
        lastInteractions: []
      };

      // Lead generation tracking
      this.leadStatus = {
        email: null,
        phone: null,
        interestLevel: 'unknown', // unknown, low, medium, high
        stage: 'browsing', // browsing, researching, serious, ready
        lastQualificationAttempt: null
      };
      
      // Initialize
      this.init();
    }
    
    init() {
      this.setupEventListeners();
      this.setupQuickActions();
      this.renderChatHistory();
      
      // Log that assistant is initialized
      console.log('AI Assistant initialized:', {
        dialogExists: !!this.dialog,
        messagesContainerExists: !!this.messagesContainer,
        inputFieldExists: !!this.inputField
      });
      
      // If dialog is already showing when initialized, make sure it's properly visible
      if (this.dialog && this.dialog.style.display === 'block') {
        this.dialog.classList.add('show');
        this.scrollToBottom();
      }

      // Fetch marketplace data for better contextual awareness
      this.fetchMarketplaceData();
      
      // Load user preferences from localStorage
      this.loadUserPreferences();
      
      // Set up analytics tracking
      this.setupAnalytics();
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
        
        // Focus the input field when the dialog is opened
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.attributeName === 'style' && this.dialog.style.display === 'block') {
              setTimeout(() => this.inputField.focus(), 300);
            }
          });
        });
        
        observer.observe(this.dialog, { attributes: true });
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
          const description = tile.querySelector('.tile-description');
          if (description) {
            this.sendMessage(description.textContent);
          }
        });
      });
      
      // Credits upgrade click
      const upgradeBtn = document.querySelector('.credits-upgrade');
      if (upgradeBtn) {
        upgradeBtn.addEventListener('click', () => {
          window.open('/pricing', '_blank');
        });
      }
      
      // Create copy button
      const createCopyBtn = document.querySelector('.create-copy-btn');
      if (createCopyBtn) {
        createCopyBtn.addEventListener('click', () => {
          this.showNotification('Creating a copy of your scenario...', 'success');
          setTimeout(() => {
            this.addSystemMessage("I've created a copy of your scenario. You can now make changes safely.");
          }, 1000);
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
            { title: "Financing", description: "How to finance this purchase?" }
          );
          break;
          
        case 'seller':
          quickActions.push(
            { title: "Optimize Listing", description: "How can I improve my listing?" },
            { title: "Pricing Strategy", description: "How should I price my business?" },
            { title: "Deal Structure", description: "What terms should I offer?" }
          );
          break;
          
        case 'saved':
          quickActions.push(
            { title: "Compare Businesses", description: "Help me compare my saved businesses" },
            { title: "Investment Analysis", description: "Which saved business is the best investment?" }
          );
          break;
          
        default: // marketplace
          quickActions.push(
            { title: "Find Businesses", description: "Help me find a business to buy" },
            { title: "Market Trends", description: "What industries are trending?" },
            { title: "Investment Tips", description: "What makes a good business investment?" }
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
      const lowerMessage = userMessage.toLowerCase();
      let response;
      
      // First, check for lead generation opportunities
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
        responseTime: delay
      });
      
      setTimeout(() => {
        this.addAssistantMessage(response);
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
  }

  // Make class available globally but only if not already defined
  window.AIAssistant = AIAssistant;
  
  // Initialize when DOM is ready - use a unique event name to avoid duplicate initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAIAssistant);
  } else {
    // If DOMContentLoaded has already fired, initialize immediately
    initializeAIAssistant();
  }
  
  function initializeAIAssistant() {
    // Remove the event listener to prevent double initialization
    document.removeEventListener('DOMContentLoaded', initializeAIAssistant);
    
    // Only initialize if not already initialized
    if (!window.aiAssistant) {
      try {
        console.log('AI Assistant: Initializing...');
        
        // Add a button to clear chat history
        const headerElement = document.querySelector('.assistant-dialog-header');
        if (headerElement) {
          const clearButton = document.createElement('button');
          clearButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
          clearButton.className = 'clear-history-btn';
          clearButton.title = 'Clear chat history';
          clearButton.style.position = 'absolute';
          clearButton.style.right = '40px';
          clearButton.style.background = 'none';
          clearButton.style.border = 'none';
          clearButton.style.color = 'rgba(255,255,255,0.7)';
          clearButton.style.cursor = 'pointer';
          
          clearButton.addEventListener('mouseenter', () => {
            clearButton.style.color = 'white';
          });
          
          clearButton.addEventListener('mouseleave', () => {
            clearButton.style.color = 'rgba(255,255,255,0.7)';
          });
          
          headerElement.appendChild(clearButton);
        }
        
        // Initialize AI Assistant
        window.aiAssistant = new AIAssistant();
        
        // Add clear history functionality
        const clearButton = document.querySelector('.clear-history-btn');
        if (clearButton && window.aiAssistant) {
          clearButton.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear your chat history?')) {
              window.aiAssistant.clearHistory();
            }
          });
        }
        
        // Update welcome message with user's name if available
        const messageText = document.querySelector('.system-message .message-text');
        if (messageText && window.aiAssistant && window.aiAssistant.user) {
          const username = window.aiAssistant.user.name !== 'there' ? window.aiAssistant.user.name : '';
          if (username) {
            messageText.textContent = `Welcome ${username}! I have noticed you're browsing the marketplace. How can I help you today?`;
          }
        }
        
        console.log('AI Assistant: Initialization complete');
      } catch (error) {
        console.error('Error initializing AI Assistant:', error);
      }
    } else {
      console.log('AI Assistant: Already initialized, skipping');
    }
  }
} else {
  console.log('AI Assistant: Class already defined, skipping redeclaration');
}
