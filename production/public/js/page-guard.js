/**
 * Client-side protection to prevent the chat interface from loading on marketplace pages
 */
(function() {
  // Run immediately when script loads
  function preventChatInterface() {
    // Check if we're on a marketplace page
    const isMarketplacePage = window.location.pathname.includes('/marketplace');
    
    if (isMarketplacePage) {
      // Remove any chat interface elements that might have loaded
      const chatElements = document.querySelectorAll('.chat-interface, .chat-container, .chatbot');
      
      chatElements.forEach(element => {
        if (element) {
          element.remove();
          console.log('Removed unauthorized chat interface element');
        }
      });
      
      // Set a global flag to prevent chat from loading
      window.isChatPage = false;
      Object.defineProperty(window, 'isChatPage', {
        value: false,
        writable: false,
        configurable: false
      });
      
      // Create a guard to monitor and prevent chat elements
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.addedNodes && mutation.addedNodes.length) {
            for (let i = 0; i < mutation.addedNodes.length; i++) {
              const node = mutation.addedNodes[i];
              
              // Check if the added node is a chat element
              if (node.classList && 
                  (node.classList.contains('chat-interface') || 
                   node.classList.contains('chat-container') || 
                   node.classList.contains('chatbot'))) {
                     
                // Remove unauthorized chat elements
                node.remove();
                console.log('Prevented chat interface from loading');
              }
            }
          }
        });
      });
      
      // Start observing the document for chat elements
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }
  
  // Run when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', preventChatInterface);
  } else {
    preventChatInterface();
  }
})();
