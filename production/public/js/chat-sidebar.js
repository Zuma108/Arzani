/**
 * Chat Sidebar JavaScript
 * Handles the functionality of the conversation sidebar
 */

(function() {
  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', init);
  
  /**
   * Initialize sidebar functionality
   */
  function init() {
    console.log('Initializing chat sidebar');
    
    // Get DOM elements
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const chatSidebar = document.getElementById('chatSidebar');
    const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const newConversationBtn = document.getElementById('new-conversation-btn');
    const conversationItems = document.querySelectorAll('.conversation-item');
    
    // Log initialization status
    console.log('Sidebar elements found:', {
      overlay: !!sidebarOverlay,
      sidebar: !!chatSidebar,
      toggleBtn: !!toggleSidebarBtn,
      closeBtn: !!closeSidebarBtn,
      newBtn: !!newConversationBtn,
      conversations: conversationItems.length
    });
    
    // Set up event listeners
    setupEventListeners({
      sidebarOverlay, 
      chatSidebar,
      toggleSidebarBtn,
      closeSidebarBtn,
      newConversationBtn,
      conversationItems
    });
    
    // Handle initial active conversation
    highlightActiveConversation();
  }
  
  /**
   * Set up event listeners for sidebar elements
   */
  function setupEventListeners(elements) {
    const { 
      sidebarOverlay, 
      chatSidebar,
      toggleSidebarBtn,
      closeSidebarBtn,
      newConversationBtn,
      conversationItems
    } = elements;
    
    // Toggle sidebar visibility on mobile
    if (toggleSidebarBtn && chatSidebar && sidebarOverlay) {
      toggleSidebarBtn.addEventListener('click', function() {
        chatSidebar.classList.toggle('-translate-x-full');
        sidebarOverlay.classList.toggle('hidden');
        document.body.classList.toggle('overflow-hidden');
      });
    }
    
    // Close sidebar on mobile
    if (closeSidebarBtn && chatSidebar && sidebarOverlay) {
      closeSidebarBtn.addEventListener('click', function() {
        chatSidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
      });
    }
    
    // Close sidebar when clicking overlay
    if (sidebarOverlay && chatSidebar) {
      sidebarOverlay.addEventListener('click', function() {
        chatSidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
      });
    }
    
    // New conversation button
    if (newConversationBtn) {
      newConversationBtn.addEventListener('click', startNewConversation);
    }
    
    // Conversation item click
    conversationItems.forEach(function(item) {
      item.addEventListener('click', function() {
        // Handle conversation selection
        selectConversation(this);
        
        // Close sidebar on mobile after selecting conversation
        if (window.innerWidth < 1024 && chatSidebar && sidebarOverlay) {
          chatSidebar.classList.add('-translate-x-full');
          sidebarOverlay.classList.add('hidden');
          document.body.classList.remove('overflow-hidden');
        }
      });
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
      if (window.innerWidth >= 1024 && chatSidebar && sidebarOverlay) {
        chatSidebar.classList.remove('-translate-x-full');
        sidebarOverlay.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
      }
    });
  }
  
  /**
   * Highlight the active conversation in the sidebar
   */
  function highlightActiveConversation() {
    // Get conversation ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get('conversation');
    
    if (conversationId) {
      // Find matching conversation item
      const conversationItems = document.querySelectorAll('.conversation-item');
      conversationItems.forEach(function(item) {
        item.classList.remove('active');
        
        if (item.getAttribute('data-conversation-id') === conversationId) {
          item.classList.add('active');
        }
      });
    }
  }
  
  /**
   * Handle conversation selection
   */
  function selectConversation(conversationItem) {
    // Remove active class from all conversations
    const conversationItems = document.querySelectorAll('.conversation-item');
    conversationItems.forEach(function(item) {
      item.classList.remove('active');
    });
    
    // Add active class to selected conversation
    conversationItem.classList.add('active');
    
    // Get conversation ID
    const conversationId = conversationItem.getAttribute('data-conversation-id');
    
    // Update URL without reload
    const url = new URL(window.location);
    url.searchParams.set('conversation', conversationId);
    window.history.pushState({}, '', url);
    
    // Load conversation if loadConversation function exists
    if (typeof window.loadConversation === 'function') {
      window.loadConversation(conversationId);
    } else {
      // Fallback - reload page with new URL
      window.location.href = url.toString();
    }
  }
  
  /**
   * Start a new conversation
   */
  function startNewConversation() {
    // Redirect to start conversation page
    window.location.href = '/chat/start-conversation';
  }
})();

/**
 * Chat Sidebar Functionality
 * Handles the conversation list and sidebar interactions
 */

(function() {
  // Initialize conversation list functionality when DOM is loaded
  window.initConversationList = function() {
    console.log('Initializing conversation list');
    
    // Get DOM elements
    const conversationItems = document.querySelectorAll('.conversation-item');
    const newConversationBtn = document.getElementById('new-conversation-btn');
    const conversationsList = document.querySelector('.conversations-list');
    
    // First load conversations from API to ensure user only sees their own
    loadUserConversations();
    
    // Handle clicking on conversation items
    conversationItems.forEach(item => {
      item.addEventListener('click', function() {
        const conversationId = this.dataset.conversationId;
        if (!conversationId) return;
        
        // Navigate to the selected conversation
        window.location.href = `/chat?conversation=${conversationId}`;
      });
    });
    
    // Handle new conversation button
    if (newConversationBtn) {
      newConversationBtn.addEventListener('click', function() {
        // Show new conversation modal or redirect to new conversation page
        // This could be expanded with a dialog to select a recipient
        alert('New conversation feature will be implemented soon!');
      });
    }
    
    console.log('Conversation list initialized');
    
    // Add function to load user's conversations from API
    function loadUserConversations() {
      // Get token
      const token = localStorage.getItem('token') || 
                    document.querySelector('meta[name="auth-token"]')?.content;
      
      if (!token) {
        console.warn('No authentication token available, can\'t load conversations');
        if (conversationsList) {
          conversationsList.innerHTML = `
            <div class="p-4 text-gray-500 text-center">
              <p>Please log in to view your conversations</p>
            </div>
          `;
        }
        return;
      }
      
      // Show loading state
      if (conversationsList) {
        conversationsList.innerHTML = `
          <div class="p-4 text-gray-500 text-center">
            <p>Loading conversations...</p>
          </div>
        `;
      }
      
      // Fetch conversations from API
      fetch('/api/chat/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load conversations');
        }
        return response.json();
      })
      .then(data => {
        if (!data.success) {
          throw new Error(data.error || 'Failed to load conversations');
        }
        
        // Render conversations
        renderConversationsList(data.conversations);
      })
      .catch(error => {
        console.error('Error loading conversations:', error);
        
        if (conversationsList) {
          conversationsList.innerHTML = `
            <div class="p-4 text-red-500 text-center">
              <p>Failed to load conversations</p>
              <button class="mt-2 text-blue-500 underline" 
                onclick="window.initConversationList()">Try Again</button>
            </div>
          `;
        }
      });
    }
    
    // Render the conversations list
    function renderConversationsList(conversations) {
      if (!conversationsList) return;
      
      if (conversations.length === 0) {
        conversationsList.innerHTML = `
          <div class="p-4 text-gray-500 text-center">
            <p>No conversations yet</p>
          </div>
        `;
        return;
      }
      
      // Sort conversations by updated_at (newest first)
      conversations.sort((a, b) => {
        return new Date(b.updated_at) - new Date(a.updated_at);
      });
      
      // Generate HTML for each conversation
      conversationsList.innerHTML = conversations.map(conversation => {
        // Format last message time
        const lastMessageTime = conversation.last_message_time ? 
          formatMessageTime(new Date(conversation.last_message_time)) : '';
        
        // Get recipient info
        const recipient = conversation.recipient || {};
        const recipientName = recipient.username || 'Unknown';
        const recipientPic = recipient.profile_picture || '/images/default-profile.png';
        
        // Build HTML for conversation item
        return `
          <div class="conversation-item p-3 border-b hover:bg-gray-50 cursor-pointer flex items-center"
               data-conversation-id="${conversation.id}">
            <div class="flex-shrink-0 mr-3">
              <img src="${recipientPic}" alt="${recipientName}" 
                class="w-10 h-10 rounded-full"
                onerror="this.src='/images/default-profile.png'">
            </div>
            <div class="flex-grow min-w-0">
              <div class="flex items-center justify-between">
                <h4 class="font-medium text-gray-900 truncate">${recipientName}</h4>
                <span class="text-xs text-gray-500">${lastMessageTime}</span>
              </div>
              <div class="flex items-center justify-between">
                <p class="text-sm text-gray-600 truncate">${conversation.last_message || ''}</p>
                ${conversation.unread_count > 0 ? 
                  `<span class="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    ${conversation.unread_count}
                   </span>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');
      
      // Add click handlers to new conversation items
      document.querySelectorAll('.conversation-item').forEach(item => {
        item.addEventListener('click', function() {
          const conversationId = this.dataset.conversationId;
          if (!conversationId) return;
          
          // Navigate to the selected conversation
          window.location.href = `/chat?conversation=${conversationId}`;
        });
      });
    }
    
    // Format message time
    function formatMessageTime(date) {
      const now = new Date();
      const diff = now - date;
      
      // Less than 24 hours, show hour:minute
      if (diff < 24 * 60 * 60 * 1000) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      
      // Within a week, show day of week
      if (diff < 7 * 24 * 60 * 60 * 1000) {
        return date.toLocaleDateString([], { weekday: 'short' });
      }
      
      // Otherwise show date
      return date.toLocaleDateString();
    }
  };
  
  // If document is already loaded, initialize immediately
  if (document.readyState !== 'loading') {
    window.initConversationList();
  }
  
  // Update conversation list with new messages or status changes
  window.updateConversationList = function(data) {
    // This would typically update the unread count or add a new conversation
    // For now, we'll just log it
    console.log('Conversation list update:', data);
    
    // To implement: update UI based on data
    // Could refresh the list or update specific conversations
  };
})();
