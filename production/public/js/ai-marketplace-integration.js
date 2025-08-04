/**
 * AI Marketplace Integration
 * Connects the AI Assistant with marketplace functionality and data
 */

// Check if AIMarketplaceIntegration is already defined to prevent double declaration errors
if (typeof window.AIMarketplaceIntegration === 'undefined') {
  console.log('Defining AIMarketplaceIntegration class');
  
  window.AIMarketplaceIntegration = class AIMarketplaceIntegration {
    constructor(aiAssistant) {
      console.log('Initializing AIMarketplaceIntegration with assistant:', aiAssistant);
      this.aiAssistant = aiAssistant;
      this.marketplaceData = {
        featuredListings: [],
        industries: [],
        locations: [],
        priceRanges: []
      };
      
      // Initialize the integration
      this.init();
    }
    
    async init() {
      try {
        // Load marketplace data
        await this.loadMarketplaceData();
        
        // Set up event listeners for marketplace interactions
        this.setupEventListeners();
        
        // Register commands with AI assistant
        this.registerCommands();
        
        console.log('AI Marketplace Integration initialized');
      } catch (error) {
        console.error('Error initializing AI Marketplace Integration:', error);
      }
    }
    
    async loadMarketplaceData() {
      try {
        // In a real implementation, this would fetch data from your API
        // For now, we'll use mock data or localStorage
  
        // Get featured listings (most viewed/popular)
        const featuredListingsStr = localStorage.getItem('featuredListings');
        if (featuredListingsStr) {
          this.marketplaceData.featuredListings = JSON.parse(featuredListingsStr);
        }
        
        // Get industries list
        const industriesSelect = document.getElementById('industriesDropdown');
        if (industriesSelect) {
          const industryItems = document.querySelectorAll('.industry-checkbox');
          this.marketplaceData.industries = Array.from(industryItems).map(item => item.value);
        }
        
        // Get locations
        const locationItems = document.querySelectorAll('.location-item');
        this.marketplaceData.locations = Array.from(locationItems).map(item => item.textContent);
        
        // Get price ranges
        const priceRangeItems = document.querySelectorAll('input[name="priceRange"]');
        this.marketplaceData.priceRanges = Array.from(priceRangeItems).map(item => item.value);
        
      } catch (error) {
        console.error('Error loading marketplace data:', error);
      }
    }
    
    setupEventListeners() {
      // Listen for marketplace events
      
      // Track when user views a business
      document.addEventListener('business_viewed', event => {
        if (this.aiAssistant) {
          this.aiAssistant.trackEvent('business_viewed', event.detail);
          
          // Update suggestion chips based on viewed business
          this.suggestRelatedQuestions(event.detail.businessId);
        }
      });
      
      // Track when user saves a business
      document.addEventListener('business_saved', event => {
        if (this.aiAssistant) {
          this.aiAssistant.trackEvent('business_saved', event.detail);
        }
      });
      
      // Track when user contacts a seller
      document.addEventListener('seller_contacted', event => {
        if (this.aiAssistant && this.aiAssistant.leadStatus) {
          // Update lead status
          this.aiAssistant.leadStatus.stage = 'serious';
          this.aiAssistant.leadStatus.interestLevel = 'high';
          
          // Track the event
          this.aiAssistant.trackEvent('seller_contacted', event.detail);
        }
      });
      
      // Listen for contact form submissions
      const contactForm = document.getElementById('contactForm');
      if (contactForm) {
        contactForm.addEventListener('submit', event => {
          // Get form data for lead capture
          const email = document.getElementById('email').value;
          const phone = document.getElementById('phone').value;
          const timeframe = document.getElementById('timeframe').value;
          
          // Update AI assistant with lead data
          if (this.aiAssistant && this.aiAssistant.leadStatus) {
            this.aiAssistant.leadStatus.email = email;
            this.aiAssistant.leadStatus.phone = phone;
            this.aiAssistant.leadStatus.stage = this.getStageFromTimeframe(timeframe);
            
            // Track the lead capture
            this.aiAssistant.trackEvent('lead_form_submitted', {
              email,
              phone,
              timeframe,
              stage: this.aiAssistant.leadStatus.stage
            });
          }
        });
      }
    }
    
    // Helper to determine lead stage from timeframe
    getStageFromTimeframe(timeframe) {
      switch (timeframe) {
        case '0-3': return 'ready';
        case '3-6': return 'serious';
        default: return 'researching';
      }
    }
    
    suggestRelatedQuestions(businessId) {
      // Get business context (in real implementation would fetch from API)
      // For now, use simple business type detection from URL or localStorage
      let businessType = 'unknown';
      let industry = 'unknown';
      
      // Try to get from localStorage if we've viewed this business
      const recentViews = JSON.parse(localStorage.getItem('recentBusinessViews') || '[]');
      const businessView = recentViews.find(b => b.id === businessId);
      
      if (businessView) {
        industry = businessView.industry || 'unknown';
      }
      
      // Suggest questions based on context
      let suggestions = [];
      
      if (industry !== 'unknown') {
        suggestions.push(`What's important to know about ${industry} businesses?`);
        suggestions.push(`How are ${industry} businesses valued?`);
      }
      
      // Add general suggestions
      suggestions = suggestions.concat([
        "Is this a fair price?",
        "What should I check during due diligence?",
        "How can I finance this purchase?"
      ]);
      
      // If we have the AI assistant, update chips
      if (window.showSuggestionChips && suggestions.length > 0) {
        window.showSuggestionChips(suggestions);
      }
    }
    
    registerCommands() {
      if (!this.aiAssistant) return;
      
      // Register marketplace-specific commands
      this.commands = {
        'search': this.executeSearch.bind(this),
        'view_business': this.viewBusiness.bind(this),
        'save_business': this.saveBusiness.bind(this),
        'contact_seller': this.contactSeller.bind(this),
        'get_recommendations': this.getRecommendations.bind(this)
      };
      
      // Make commands available to AI assistant
      this.aiAssistant.marketplaceCommands = this.commands;
    }
    
    // Command implementation: Execute search
    executeSearch(parameters) {
      const { industry, location, minPrice, maxPrice } = parameters;
      
      // Set the search filters
      if (industry) {
        const industryCheckbox = document.querySelector(`.industry-checkbox[value="${industry}"]`);
        if (industryCheckbox) industryCheckbox.checked = true;
      }
      
      if (location) {
        const locationInput = document.getElementById('locationInput');
        if (locationInput) locationInput.value = location;
      }
      
      // Set price range
      if (minPrice && maxPrice) {
        const priceRange = `${minPrice}-${maxPrice}`;
        const priceInput = document.querySelector(`input[name="priceRange"][value="${priceRange}"]`);
        if (priceInput) priceInput.checked = true;
      }
      
      // Trigger search
      const searchButton = document.querySelector('.filter-button') || 
                           document.querySelector('.apply-btn');
      if (searchButton) searchButton.click();
      
      return {
        success: true,
        message: `Searched for ${industry || 'any industry'} businesses in ${location || 'any location'}`
      };
    }
    
    // Command implementation: View business details
    viewBusiness(parameters) {
      const { businessId } = parameters;
      
      if (businessId) {
        window.location.href = `/business/${businessId}`;
        return { success: true };
      }
      
      return { 
        success: false,
        message: 'Business ID is required'
      };
    }
    
    // Command implementation: Save business
    saveBusiness(parameters) {
      const { businessId } = parameters;
      
      if (businessId) {
        // Fire a custom event that your save business functionality can listen for
        const event = new CustomEvent('ai_save_business', {
          detail: { businessId }
        });
        document.dispatchEvent(event);
        
        return { 
          success: true,
          message: 'Business saved to your favorites'
        };
      }
      
      return { 
        success: false,
        message: 'Business ID is required'
      };
    }
    
    // Command implementation: Contact seller
    contactSeller(parameters) {
      const { businessId, message, name, email, phone } = parameters;
      
      if (businessId) {
        // Open the contact modal
        const contactModal = document.getElementById('contactModal');
        if (contactModal) {
          // Populate form fields if provided
          if (email) {
            const emailField = document.getElementById('email');
            if (emailField) emailField.value = email;
          }
          
          if (phone) {
            const phoneField = document.getElementById('phone');
            if (phoneField) phoneField.value = phone;
          }
          
          if (message) {
            const messageField = document.getElementById('message');
            if (messageField) messageField.value = message;
          }
          
          if (name) {
            // Try to split the name into first and last
            const nameParts = name.split(' ');
            const firstName = document.getElementById('firstName');
            const lastName = document.getElementById('lastName');
            
            if (firstName && nameParts.length > 0) {
              firstName.value = nameParts[0];
            }
            
            if (lastName && nameParts.length > 1) {
              lastName.value = nameParts.slice(1).join(' ');
            }
          }
          
          // Set the business ID
          const businessIdField = document.getElementById('businessId');
          if (businessIdField) businessIdField.value = businessId;
          
          // Show the modal
          const bsModal = new bootstrap.Modal(contactModal);
          bsModal.show();
          
          return {
            success: true,
            message: 'Contact form opened'
          };
        }
      }
      
      return {
        success: false,
        message: 'Could not open contact form'
      };
    }
    
    // Command implementation: Get business recommendations
    getRecommendations(parameters) {
      const { industry, location, budget, userId } = parameters;
      
      // In a real implementation, this would call your API
      // For now, just return a placeholder message
      return {
        success: true,
        message: `Recommendations for ${industry || 'any industry'} in ${location || 'any location'} with budget ${budget || 'any'} would be shown here`
      };
    }
  };
  
  // Update the initialization to be more robust and add better error handling
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, checking for AI Assistant');
    
    let attempts = 0;
    const maxAttempts = 20; // Try for 10 seconds max (20 * 500ms)
    
    const checkForAIAssistant = () => {
      attempts++;
      console.log(`Looking for AI Assistant (attempt ${attempts}/${maxAttempts})...`);
      
      if (window.aiAssistant) {
        console.log('Found AI Assistant, initializing marketplace integration');
        try {
          window.aiMarketplaceIntegration = new AIMarketplaceIntegration(window.aiAssistant);
        } catch (error) {
          console.error('Error initializing AI Marketplace Integration:', error);
        }
      } else if (attempts < maxAttempts) {
        console.log('AI Assistant not found yet, will retry...');
        setTimeout(checkForAIAssistant, 500);
      } else {
        console.warn('AI Assistant not found after maximum attempts');
      }
    };
    
    // Give a short delay to ensure other scripts have loaded first
    setTimeout(checkForAIAssistant, 1000);
  });
  
} else {
  console.log('AIMarketplaceIntegration already defined, skipping redefinition');
}
