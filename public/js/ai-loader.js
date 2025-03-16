/**
 * AI Assistant Loader
 * This file ensures the AI assistant is loaded on all pages
 * and creates required elements if they don't exist
 */

(function() {
  /**
   * Create AI assistant elements if they don't exist
   */
  function createAIElements() {
    // Don't create if already exists
    if (document.getElementById('ai-assistant-container')) {
      return;
    }
    
    console.log('Creating AI assistant elements');
    
    // Load CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = '/css/ai-chatbot.css';
    document.head.appendChild(cssLink);
    
    // Create AI container
    const container = document.createElement('div');
    container.id = 'ai-assistant-container';
    container.className = 'ai-assistant-hidden';
    container.innerHTML = `
      <!-- Chatbot Header -->
      <div class="copilot-header d-flex align-items-center justify-content-between px-3">
        <span class="assistant-title">
          AI Assistant <span class="version-badge">BETA</span>
        </span>
        <i class="fa-regular fa-xmark close-assistant-btn"></i>
      </div>

      <!-- Chat Container -->
      <div class="chat-container">
        <div class="messages-scroll">
          <!-- System welcome message -->
          <div class="system-message">
            <div class="message-content">
              <p>Welcome to our Marketplace Assistant! I'm here to help you find and sell businesses.</p>
            </div>
          </div>
        </div>
        
        <!-- Clear chat button -->
        <button class="clear-chat-button">
          <i class="fa-regular fa-trash-can-xmark"></i> Clear chat
        </button>
        
        <!-- Input area -->
        <div class="assistant-input-container">
          <span class="form-control searcher input">
            <input type="text" id="assistant-input" placeholder="Ask anything..." class="assistant-input">
          </span>
          <i class="fa-regular fa-paperclip attachment-icon"></i>
          <i class="fa-regular fa-paper-plane-top send-icon"></i>
        </div>
        
        <!-- Credit counter -->
        <div class="credits">
          <i class="fa-regular fa-circle-star"></i>
          <p>
            Remaining: <strong>30</strong> of <strong>30</strong> credits. Credits reset every 7 days.
            <a href="/checkout-platinum" class="upgrade-link">Upgrade for more</a>
          </p>
        </div>
      </div>
    `;
    
    // Create AI button
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'ai-button-container no-overlay';
    buttonContainer.innerHTML = `
      <button class="ai-button" id="ai-assistant-button">
        <span>AI</span>
        <i class="fa-regular fa-sparkles"></i>
        <span class="ml-2 version-badge">BETA</span>
      </button>
    `;
    
    // Add elements to the page
    document.body.appendChild(container);
    document.body.appendChild(buttonContainer);
    
    // Add Font Awesome if not already loaded
    if (!document.querySelector('link[href*="font-awesome"]')) {
      const fontAwesome = document.createElement('link');
      fontAwesome.rel = 'stylesheet';
      fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
      document.head.appendChild(fontAwesome);
    }
    
    console.log('AI assistant elements created');
  }
  
  /**
   * Load AI assistant script
   */
  function loadAIScript() {
    // Don't load if already loaded
    if (typeof window.AIAssistant !== 'undefined') {
      return;
    }
    
    console.log('Loading AI assistant script');
    
    const script = document.createElement('script');
    script.src = '/js/ai-assistant.js';
    document.body.appendChild(script);
    
    script.onload = function() {
      console.log('AI assistant script loaded');
      
      // Initialize after load
      if (typeof window.AIAssistant !== 'undefined' && !window.aiAssistant) {
        window.aiAssistant = new window.AIAssistant();
        console.log('AI assistant initialized from loader');
      }
    };
  }
  
  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      createAIElements();
      loadAIScript();
    });
  } else {
    // If already loaded
    createAIElements();
    loadAIScript();
  }
})();
