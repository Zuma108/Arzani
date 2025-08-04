/**
 * AI Chatbot Initializer
 * This script ensures the AI assistant is properly initialized on all pages
 */

// Use IIFE to avoid polluting global scope
(function() {
  /**
   * Check if AI Assistant is initialized and fix if needed
   */
  function ensureAIAssistantInitialized() {
    console.log('Checking AI Assistant initialization...');
    
    // Check UI elements
    const checkElements = {
      container: !!document.getElementById('ai-assistant-container'),
      button: !!document.getElementById('ai-assistant-button'),
      messagesContainer: !!document.querySelector('.messages-scroll'),
      input: !!document.querySelector('#assistant-input')
    };
    
    // Check functionality
    const checkFunctionality = {
      classAvailable: typeof window.AIAssistant !== 'undefined',
      instanceAvailable: typeof window.aiAssistant !== 'undefined',
      showDialogFunction: typeof window.showDialog === 'function'
    };
    
    console.log('AI Assistant elements check:', checkElements);
    console.log('AI Assistant functionality check:', checkFunctionality);
    
    // Fix missing elements if possible
    if (!checkElements.container || !checkElements.button) {
      console.warn('AI Assistant container or button missing, cannot fix automatically');
      return false;
    }
    
    // Fix missing instance if class is available
    if (checkElements.container && checkElements.button && 
        checkFunctionality.classAvailable && !checkFunctionality.instanceAvailable) {
      
      console.log('Fixing AI Assistant initialization...');
      try {
        window.aiAssistant = new window.AIAssistant();
        console.log('AI Assistant instance created successfully');
        
        // Add global showDialog function if missing
        if (!checkFunctionality.showDialogFunction) {
          window.showDialog = function() {
            if (window.aiAssistant) {
              window.aiAssistant.toggleAssistant(true);
            }
          };
          console.log('Added showDialog function');
        }
        
        // Fix button click handler
        const button = document.getElementById('ai-assistant-button');
        if (button) {
          button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (window.aiAssistant) {
              window.aiAssistant.toggleAssistant();
            }
            return false;
          });
          console.log('Fixed button click handler');
        }
        
        return true;
      } catch (error) {
        console.error('Failed to fix AI Assistant initialization:', error);
        return false;
      }
    }
    
    return checkFunctionality.instanceAvailable;
  }
  
  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(ensureAIAssistantInitialized, 500);
    });
  } else {
    // If DOMContentLoaded already fired
    setTimeout(ensureAIAssistantInitialized, 500);
  }
  
  // Also try to fix after everything has loaded
  window.addEventListener('load', function() {
    setTimeout(ensureAIAssistantInitialized, 1000);
  });

  function initializeConversationStarters() {
    const starterContainer = document.querySelector('.conversation-starters');
    if (!starterContainer) return;
    
    // Define only the starters you want to keep (removing the 4 specified ones)
    const starters = [
      {
        icon: 'fa-regular fa-comments',
        title: 'General Help',
        prompt: 'How can I help you today?'
      },
      // Add any other starters you want to keep here
      
      // Remove these 4 starters:
      // {
      //   icon: 'fa-regular fa-store',
      //   title: 'Find Businesses',
      //   prompt: 'Help me find a business to buy'
      // },
      // {
      //   icon: 'fa-regular fa-chart-line',
      //   title: 'Market Trends',
      //   prompt: 'What industries are trending?'
      // },
      // {
      //   icon: 'fa-regular fa-lightbulb',
      //   title: 'Investment Tips', 
      //   prompt: 'What makes a good business investment?'
      // },
      // {
      //   icon: 'fa-regular fa-calculator',
      //   title: 'Business Worth',
      //   prompt: 'What\'s my business worth?'
      // }
    ];
    
    // Render the starters
    renderConversationStarters(starterContainer, starters);
  }
  
})();
