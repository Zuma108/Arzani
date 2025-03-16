/**
 * AI Assistant Integration
 * Connects UI elements with AI functionality and ensures proper initialization
 */

// Execute when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('AI Chatbot Integration: Initializing');
  
  // Elements we need to access
  const elements = {
    container: document.getElementById('ai-assistant-container'),
    button: document.getElementById('ai-assistant-button'),
    buttonWrapper: document.querySelector('.ai-button-wrapper'),
    messagesContainer: document.querySelector('.messages-scroll'),
    inputField: document.querySelector('#assistant-input'),
    sendButton: document.querySelector('.send-icon'),
    clearChatButton: document.querySelector('.clear-chat-button')
  };
  
  // Log all elements to diagnose any issues
  console.log('AI Elements check:', {
    containerExists: !!elements.container,
    buttonExists: !!elements.button,
    messagesContainerExists: !!elements.messagesContainer,
    inputFieldExists: !!elements.inputField,
    sendButtonExists: !!elements.sendButton,
    clearChatButtonExists: !!elements.clearChatButton
  });
  
  // If the AIAssistant class exists but no instance is created, create one
  if (typeof window.AIAssistant !== 'undefined' && !window.aiAssistant) {
    console.log('Creating new AI Assistant instance');
    window.aiAssistant = new window.AIAssistant();
    
    // Expose key functions globally
    window.showAIAssistant = function() {
      if (window.aiAssistant) window.aiAssistant.toggleAssistant(true);
    };
    
    window.hideAIAssistant = function() {
      if (window.aiAssistant) window.aiAssistant.toggleAssistant(false);
    };
    
    window.sendAIMessage = function(message) {
      if (window.aiAssistant) window.aiAssistant.sendMessage(message);
    };
  }
  
  // Fix event listeners if needed
  function repairEventListeners() {
    // Fix button click
    if (elements.button) {
      // Remove any existing listeners by cloning and replacing
      const originalButton = elements.button;
      const newButton = originalButton.cloneNode(true);
      originalButton.parentNode.replaceChild(newButton, originalButton);
      
      // Add our click handler
      newButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('AI button clicked via integration handler');
        
        if (window.aiAssistant && typeof window.aiAssistant.toggleAssistant === 'function') {
          window.aiAssistant.toggleAssistant();
        } else {
          // Fallback toggle functionality
          if (elements.container) {
            elements.container.classList.toggle('ai-assistant-hidden');
          }
        }
        return false;
      });
    }
    
    // Fix clear chat button
    if (elements.clearChatButton) {
      elements.clearChatButton.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Clear chat clicked via integration handler');
        
        if (window.aiAssistant) {
          window.aiAssistant.clearHistory();
        } else {
          // Fallback clear action
          if (elements.messagesContainer) {
            elements.messagesContainer.innerHTML = '';
            localStorage.removeItem('aiAssistantHistory');
            
            // Add welcome message back
            const systemMsg = document.createElement('div');
            systemMsg.className = 'system-message';
            systemMsg.innerHTML = `
              <div class="message-content">
                <p>Welcome to our Marketplace Assistant! I'm here to help you find and sell businesses. You can ask me about available listings, business valuation, or get help with selling your business.</p>
              </div>
            `;
            elements.messagesContainer.appendChild(systemMsg);
          }
        }
      });
    }
    
    // Fix send button
    if (elements.sendButton && elements.inputField) {
      elements.sendButton.addEventListener('click', function() {
        const message = elements.inputField.value.trim();
        if (!message) return;
        
        if (window.aiAssistant) {
          window.aiAssistant.sendMessage(message);
        } else {
          // Call API directly if needed
          console.log('Would send message:', message);
          elements.inputField.value = '';
        }
      });
      
      // Fix enter key functionality
      elements.inputField.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const message = elements.inputField.value.trim();
          if (!message) return;
          
          if (window.aiAssistant) {
            window.aiAssistant.sendMessage(message);
          } else {
            // Call API directly if needed
            console.log('Would send message:', message);
            elements.inputField.value = '';
          }
        }
      });
    }
  }
  
  // Run the repair after a short delay
  setTimeout(repairEventListeners, 500);
  
  // Expose a function to check and repair AI assistant functionality
  window.checkAIAssistant = function() {
    console.log('Checking AI Assistant functionality');
    
    const status = {
      elements: {
        containerExists: !!elements.container,
        buttonExists: !!elements.button,
        messagesContainerExists: !!elements.messagesContainer,
        inputFieldExists: !!elements.inputField
      },
      functionality: {
        classAvailable: typeof window.AIAssistant !== 'undefined',
        instanceAvailable: typeof window.aiAssistant !== 'undefined',
        toggleFunctionWorks: typeof window.aiAssistant?.toggleAssistant === 'function'
      }
    };
    
    console.log('AI Assistant status:', status);
    
    if (!status.functionality.instanceAvailable && status.functionality.classAvailable) {
      console.log('Creating missing AI Assistant instance');
      window.aiAssistant = new window.AIAssistant();
      repairEventListeners();
      return true;
    }
    
    return status.functionality.instanceAvailable;
  };
  
  // Check AI Assistant again after everything has loaded
  window.addEventListener('load', function() {
    setTimeout(window.checkAIAssistant, 1000);
  });
  
  console.log('AI Chatbot Integration: Initialized');
});
