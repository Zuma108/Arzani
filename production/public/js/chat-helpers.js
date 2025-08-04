/**
 * Chat Helper Functions
 * Shared utilities for chat functionality
 */

(function() {
  // Confirm the script has loaded
  console.log('Chat helpers loaded');
  
  // Make functions globally available immediately
  window.initConversationList = initConversationList;
  window.loadConversation = loadConversation;
  window.displayMessages = displayMessages;
  window.getCurrentUserId = getCurrentUserId;
  window.getCookie = getCookie;
  
  // Initialize conversation list functionality
  function initConversationList() {
    console.log('Initializing conversation list');
    
    const conversationItems = document.querySelectorAll('.conversation-item');
    
    if (conversationItems.length === 0) {
      console.log('No conversations found');
      return;
    }
    
    conversationItems.forEach(item => {
      item.addEventListener('click', function() {
        // Highlight selected conversation
        conversationItems.forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        
        // Get conversation ID
        const conversationId = this.getAttribute('data-conversation-id');
        if (!conversationId) return;
        
        // Update URL parameter without page reload
        const url = new URL(window.location);
        url.searchParams.set('conversation', conversationId);
        window.history.pushState({}, '', url);
        
        // Load conversation messages
        loadConversation(conversationId);
      });
    });
    
    // Load active conversation if one is selected
    const activeConversation = document.querySelector('.conversation-item.active');
    if (activeConversation) {
      const conversationId = activeConversation.getAttribute('data-conversation-id');
      if (conversationId) {
        loadConversation(conversationId);
      }
    }
  }
  
  // Load conversation messages
  function loadConversation(conversationId) {
    console.log('Loading conversation:', conversationId);
    
    // Get messages container
    const messagesContainer = document.getElementById('messages-list');
    if (!messagesContainer) {
      console.error('Messages container not found');
      return;
    }
    
    // Show loading indicator
    messagesContainer.innerHTML = '<div class="loading">Loading messages...</div>';
    
    // Get token
    const token = localStorage.getItem('token') || getCookie('token');
    
    // Fetch messages from API
    fetch(`/api/chat/messages?conversationId=${conversationId}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Accept': 'application/json'
      }
    })
    .then(response => {
      if (!response.ok) {
        if (response.status === 401) {
          // Redirect to login if unauthorized
          window.location.href = `/login2?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`;
          throw new Error('Authentication required');
        }
        throw new Error('Failed to load messages');
      }
      return response.json();
    })
    .then(data => {
      displayMessages(data.messages || [], conversationId);
    })
    .catch(error => {
      console.error('Error loading messages:', error);
      messagesContainer.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
    });
  }
  
  // Display messages in the UI
  function displayMessages(messages, conversationId) {
    const messagesContainer = document.getElementById('messages-list');
    if (!messagesContainer) return;
    
    if (!messages || messages.length === 0) {
      messagesContainer.innerHTML = '<div class="no-messages">No messages yet. Start the conversation!</div>';
      return;
    }
    
    // Check for business inquiry messages and extract business information
    let businessInfo = extractBusinessInfoFromMessages(messages);
    
    // If we found business info, render the business context panel
    if (businessInfo && typeof renderBusinessContextPanel === 'function') {
      renderBusinessContextPanel(businessInfo);
    }
    
    // Sort messages by timestamp
    messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    // Clear container
    messagesContainer.innerHTML = '';
    
    // Get current user ID
    const currentUserId = getCurrentUserId();
    
    // Group messages by date
    let currentDate = null;
    
    // Add each message
    messages.forEach(message => {
      // Check if date has changed
      const messageDate = new Date(message.created_at).toDateString();
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        
        // Add date separator
        const dateSeparator = document.createElement('div');
        dateSeparator.className = 'date-separator';
        dateSeparator.textContent = formatMessageDate(message.created_at);
        messagesContainer.appendChild(dateSeparator);
      }
      
      // Skip rendering the original system business inquiry message (we'll show the panel instead)
      if (message.is_system_message && message.content.includes('business inquiry for')) {
        return;
      }
      
      // Create message element
      const isOutgoing = message.sender_id === currentUserId;
      const messageEl = document.createElement('div');
      messageEl.className = `message ${isOutgoing ? 'outgoing' : 'incoming'}`;
      if (message.is_system_message) {
        messageEl.className += ' system-message';
      }
      
      // Avatar/profile picture
      let avatarHtml = '';
      if (!message.is_system_message) {
        if (isOutgoing) {
          avatarHtml = '<div class="message-avatar"><div class="avatar current-user"></div></div>';
        } else {
          const senderPic = message.sender_profile_pic || '/images/default-profile.png';
          avatarHtml = `
            <div class="message-avatar">
              <img src="${senderPic}" alt="Profile" class="avatar" onerror="this.src='/images/default-profile.png'">
            </div>
          `;
        }
      }
      
      // Message content
      messageEl.innerHTML = `
        ${avatarHtml}
        <div class="message-wrapper">
          <div class="message-content">
            <div class="message-bubble">
              ${message.content}
            </div>
          </div>
          <div class="message-meta">
            <span class="message-time">${formatMessageTime(message.created_at)}</span>
            ${isOutgoing ? `
              <span class="message-status">
                <i class="fas fa-check"></i>
                ${message.status === 'seen' ? '<i class="fas fa-check"></i>' : ''}
              </span>
            ` : ''}
          </div>
        </div>
      `;
      
      messagesContainer.appendChild(messageEl);
    });
    
    // Scroll to bottom
    setTimeout(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
    
    // Mark conversation as read
    if (currentUserId) {
      markConversationAsRead(conversationId);
    }
  }
  
  /**
   * Extract business info from system messages
   */
  function extractBusinessInfoFromMessages(messages) {
    // Look for business context in messages
    const businessMessages = messages.filter(m => 
      m.is_system_message && m.content.includes('business inquiry')
    );
    
    if (businessMessages.length > 0) {
      // Try to extract business info from system message
      try {
        const businessMessage = businessMessages[0];
        const businessMatch = businessMessage.content.match(/business inquiry for (.+?) \(ID: (\d+)\)/i);
        
        if (businessMatch) {
          return {
            name: businessMatch[1],
            id: businessMatch[2]
          };
        }
      } catch (e) {
        console.error('Error extracting business info:', e);
      }
    }
    
    return null;
  }
  
  /**
   * Create and render business context panel
   */
  function renderBusinessContextPanel(businessInfo) {
    // Don't regenerate if panel already exists
    if (document.getElementById('businessContextPanel')) {
      return;
    }
    
    // Fetch additional business details
    fetch(`/api/business/business/${businessInfo.id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || getCookie('token')}`,
        'Accept': 'application/json'
      }
    })
    .then(response => {
      if (!response.ok) throw new Error('Failed to load business details');
      return response.json();
    })
    .then(data => {
      if (!data || !data.business) throw new Error('Invalid business data');
      
      const business = data.business;
      
      // Create panel element
      const panel = document.createElement('div');
      panel.id = 'businessContextPanel';
      panel.className = 'business-context-panel';
      
      // Format price
      const price = Number(business.price);
      const formattedPrice = !isNaN(price) 
        ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(price)
        : 'Price not specified';
      
      // Render panel content
      panel.innerHTML = `
        <div class="context-header">
          <h3>Business Inquiry</h3>
          <button class="minimize-btn" onclick="toggleBusinessContextPanel()">
            <i class="fas fa-minus"></i>
          </button>
        </div>
        <div class="context-body">
          <div class="business-info">
            <div class="business-name">
              <a href="/business/${business.id}" target="_blank">${business.business_name}</a>
            </div>
            <div class="business-meta">
              <span class="business-price">${formattedPrice}</span>
              <span class="business-industry">${business.industry || 'Unspecified industry'}</span>
              <span class="business-location">${business.location || 'Location not specified'}</span>
            </div>
          </div>
          <div class="context-actions">
            <a href="/business/${business.id}" target="_blank" class="view-listing-btn">
              <i class="fas fa-external-link-alt"></i> View Listing
            </a>
          </div>
        </div>
      `;
      
      // Insert before the main chat container
      const chatContainer = document.querySelector('.chat-container');
      if (chatContainer) {
        chatContainer.parentNode.insertBefore(panel, chatContainer);
      } else {
        // Fallback - insert after header
        const header = document.querySelector('header');
        if (header) {
          header.parentNode.insertBefore(panel, header.nextSibling);
        }
      }
      
      // Add panel toggle function to global scope
      window.toggleBusinessContextPanel = function() {
        panel.classList.toggle('minimized');
        
        const icon = panel.querySelector('.minimize-btn i');
        if (panel.classList.contains('minimized')) {
          icon.className = 'fas fa-plus';
        } else {
          icon.className = 'fas fa-minus';
        }
      };
    })
    .catch(error => {
      console.error('Error rendering business context:', error);
    });
  }
  
  // Helper: Get current user ID from token
  function getCurrentUserId() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      // Decode JWT payload
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      return JSON.parse(jsonPayload).userId;
    } catch (error) {
      console.error('Error getting user ID from token:', error);
      return null;
    }
  }
  
  // Helper: Mark conversation as read
  function markConversationAsRead(conversationId) {
    const token = localStorage.getItem('token') || getCookie('token');
    if (!token) return;
    
    fetch(`/api/chat/mark-read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ conversationId })
    })
    .then(response => {
      if (!response.ok) throw new Error('Failed to mark as read');
      return response.json();
    })
    .then(data => {
      console.log('Marked conversation as read');
      
      // Update unread badge if any
      const conversationItem = document.querySelector(`.conversation-item[data-conversation-id="${conversationId}"]`);
      if (conversationItem) {
        const unreadBadge = conversationItem.querySelector('.unread-badge');
        if (unreadBadge) {
          unreadBadge.remove();
        }
      }
    })
    .catch(error => {
      console.error('Error marking conversation as read:', error);
    });
  }
  
  // Helper: Format message time
  function formatMessageTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Helper: Format message date for separators
  function formatMessageDate(timestamp) {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }
  }
  
  // Helper: Get cookie value
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }
  
  // Make functions globally available
  window.displayMessages = displayMessages;
  window.renderBusinessContextPanel = renderBusinessContextPanel;
})();
