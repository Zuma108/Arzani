/**
 * Chat Scroll Functionality
 * Manages scrolling behavior in the chat interface
 */

(function() {
  let messagesContainer = null;
  let messagesList = null;
  let isAutoScrollEnabled = true;
  let lastScrollPosition = 0;
  let observer = null;
  
  // Initialize scroll functionality
  function init() {
    console.log('Initializing chat scroll functionality');
    
    // Get DOM elements
    messagesContainer = document.querySelector('.messages-container');
    messagesList = document.getElementById('messages-list');
    
    if (!messagesContainer || !messagesList) {
      console.warn('Chat container elements not found');
      return;
    }
    
    // Set up scroll event listener
    messagesContainer.addEventListener('scroll', handleScroll);
    
    // Set up mutation observer to watch for new messages
    setupObserver();
    
    // Initial scroll to bottom
    scrollToBottom();
    
    console.log('Chat scroll functionality initialized');
  }
  
  // Handle scroll events
  function handleScroll() {
    if (!messagesContainer) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    // Enable auto-scroll when user manually scrolls to bottom
    if (isNearBottom && !isAutoScrollEnabled) {
      isAutoScrollEnabled = true;
      console.log('Auto-scroll enabled');
    }
    
    // Disable auto-scroll when user scrolls up
    if (!isNearBottom && isAutoScrollEnabled && scrollTop < lastScrollPosition) {
      isAutoScrollEnabled = false;
      console.log('Auto-scroll disabled');
    }
    
    // Update last scroll position
    lastScrollPosition = scrollTop;
  }
  
  // Set up mutation observer to detect new messages
  function setupObserver() {
    if (!messagesList) return;
    
    // Disconnect existing observer if there is one
    if (observer) {
      observer.disconnect();
    }
    
    // Create new observer
    observer = new MutationObserver((mutations) => {
      if (isAutoScrollEnabled) {
        scrollToBottom();
      }
    });
    
    // Start observing
    observer.observe(messagesList, {
      childList: true,
      subtree: true
    });
  }
  
  // Scroll to bottom of messages container
  function scrollToBottom() {
    if (!messagesContainer) return;
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  // Expose public methods
  window.ChatScroll = {
    init: init,
    scrollToBottom: scrollToBottom,
    enableAutoScroll: function() {
      isAutoScrollEnabled = true;
      scrollToBottom();
    },
    disableAutoScroll: function() {
      isAutoScrollEnabled = false;
    }
  };
  
  // Initialize when DOM is loaded
  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
