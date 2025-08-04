/**
 * Scroll To Bottom Button Implementation
 * Shows a button when the user is not at the bottom of the chat
 */
class ScrollToBottomManager {
  constructor() {
    // Initialize properties
    this.messagesContainer = document.getElementById('messagesContainer');
    this.scrollToBottomBtn = document.getElementById('scrollToBottomBtn');
    
    // Button state
    this.buttonState = {
      isVisible: false,
      scrollThreshold: 100,
      isAtBottom: true
    };
    
    // Initialize if DOM elements exist
    if (this.messagesContainer && this.scrollToBottomBtn) {
      this.initialize();
    } else {
      console.warn('Scroll to bottom elements not found');
    }
  }
  
  // Main initialization method
  initialize() {
    // Setup event listeners
    this.setupEventListeners();
    
    // Start observing new messages
    this.observeMessageAdditions();
    
    // Handle window resize events
    this.handleWindowResize();
    
    // Initial check for button visibility
    this.checkScrollPosition();
    
    console.log('✅ Scroll to bottom button manager initialized');
  }
  
  // Set up scroll and click event listeners
  setupEventListeners() {
    // Scroll event with debounce for performance
    let scrollTimeout;
    this.messagesContainer.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.checkScrollPosition();
      }, 100);
    });
    
    // Click event for the button
    this.scrollToBottomBtn.addEventListener('click', () => {
      this.scrollToBottom();
    });
  }
  
  // Check scroll position and update button visibility
  checkScrollPosition() {
    if (!this.messagesContainer) return;
    
    const scrollTop = this.messagesContainer.scrollTop;
    const scrollHeight = this.messagesContainer.scrollHeight;
    const clientHeight = this.messagesContainer.clientHeight;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    // Update state
    this.buttonState.isAtBottom = distanceFromBottom < this.buttonState.scrollThreshold;
    
    // Update button visibility based on position
    if (!this.buttonState.isAtBottom) {
      this.showButton();
    } else {
      this.hideButton();
    }
  }
  
  // Show the scroll to bottom button
  showButton() {
    if (!this.buttonState.isVisible) {
      this.scrollToBottomBtn.classList.remove('hidden');
      this.scrollToBottomBtn.classList.add('visible');
      this.buttonState.isVisible = true;
    }
  }
  
  // Hide the scroll to bottom button
  hideButton() {
    if (this.buttonState.isVisible) {
      this.scrollToBottomBtn.classList.remove('visible');
      this.scrollToBottomBtn.classList.add('hidden');
      this.buttonState.isVisible = false;
    }
  }
  
  // Smooth scroll to bottom of messages container
  scrollToBottom() {
    this.messagesContainer.scrollTo({
      top: this.messagesContainer.scrollHeight,
      behavior: 'smooth'
    });
    
    // Hide button after scrolling
    setTimeout(() => {
      this.hideButton();
    }, 300);
  }
  
  // Observe new message additions
  observeMessageAdditions() {
    const observer = new MutationObserver(() => {
      // Check if button should be shown when new content is added
      this.checkScrollPosition();
    });
    
    // Start observing the messages container
    observer.observe(this.messagesContainer, { 
      childList: true,
      subtree: true
    });
  }
  
  // Handle window resize events
  handleWindowResize() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.checkScrollPosition();
      }, 100);
    });
  }
}

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
  // Wait a brief moment to ensure all other scripts are loaded
  setTimeout(() => {
    window.scrollToBottomManager = new ScrollToBottomManager();
  }, 500);
});
