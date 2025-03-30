/**
 * Chat Activity Tracker
 * Tracks user activity and presence in chat
 */

(function() {
  const ACTIVITY_INTERVAL = 60000; // 1 minute
  let activityTimer = null;
  let hasInitialized = false;
  
  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', init);
  
  /**
   * Initialize activity tracking
   */
  function init() {
    if (hasInitialized) return;
    hasInitialized = true;
    
    console.log('Initializing chat activity tracker');
    
    // Start tracking activity
    startActivityTracking();
    
    // Add event listeners for tab visibility and focus
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    // Check URL for conversation ID
    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get('conversation');
    
    if (conversationId) {
      // Track initial activity
      updateActivityTimestamp(conversationId);
    }
    
    // Listen for URL changes
    window.addEventListener('popstate', handleUrlChange);
  }
  
  /**
   * Start activity tracking timer
   */
  function startActivityTracking() {
    // Clear any existing timer
    if (activityTimer) {
      clearInterval(activityTimer);
    }
    
    // Set up periodic activity updates
    activityTimer = setInterval(() => {
      // Only update if tab is visible
      if (!document.hidden) {
        const urlParams = new URLSearchParams(window.location.search);
        const conversationId = urlParams.get('conversation');
        
        if (conversationId) {
          updateActivityTimestamp(conversationId);
        }
      }
    }, ACTIVITY_INTERVAL);
  }
  
  /**
   * Update user activity timestamp
   */
  function updateActivityTimestamp(conversationId) {
    const token = localStorage.getItem('token') || getCookie('token');
    if (!token) return;
    
    // Use existing API endpoint for updating user activity
    fetch('/api/chat/update-activity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        conversationId,
        status: 'active'
      })
    })
    .then(response => {
      if (!response.ok) throw new Error('Failed to update activity timestamp');
      return response.json();
    })
    .then(data => {
      console.log('Activity timestamp updated');
    })
    .catch(error => {
      console.error('Error updating activity timestamp:', error);
    });
  }
  
  /**
   * Handle visibility change event
   */
  function handleVisibilityChange() {
    const isVisible = !document.hidden;
    
    if (isVisible) {
      // Track activity when page becomes visible
      const urlParams = new URLSearchParams(window.location.search);
      const conversationId = urlParams.get('conversation');
      
      if (conversationId) {
        updateActivityTimestamp(conversationId);
      }
    }
  }
  
  /**
   * Handle window focus event
   */
  function handleFocus() {
    // Track activity when window gets focus
    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get('conversation');
    
    if (conversationId) {
      updateActivityTimestamp(conversationId);
    }
  }
  
  /**
   * Handle window blur event
   */
  function handleBlur() {
    // Update status to 'away' when window loses focus
    const token = localStorage.getItem('token') || getCookie('token');
    if (!token) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get('conversation');
    
    if (conversationId) {
      fetch('/api/chat/update-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          conversationId,
          status: 'away'
        })
      })
      .catch(error => {
        console.error('Error updating away status:', error);
      });
    }
  }
  
  /**
   * Handle URL changes
   */
  function handleUrlChange() {
    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get('conversation');
    
    if (conversationId) {
      updateActivityTimestamp(conversationId);
    }
  }
  
  /**
   * Get cookie value
   */
  function getCookie(name) {
    if (typeof window.getCookie === 'function') {
      return window.getCookie(name);
    }
    
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }
})();
