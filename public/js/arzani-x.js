/**
 * Arzani-X Chat Interface JavaScript
 * Dedicated JS file for handling Arzani-X specific functionality
 */

// Utility Functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// DOM Helper Functions for Arzani-X
function getMessagesContainer() {
  return document.getElementById('messagesContainer');
}

function getMainChatInput() {
  return document.getElementById('mainChatInput');
}

function getBottomChatInput() {
  return document.getElementById('bottomChatInput');
}

// Authentication Helper
function getAuthToken() {
  // Try meta tag first
  const metaToken = document.querySelector('meta[name="auth-token"]')?.content;
  if (metaToken) return metaToken;
  
  // Try localStorage
  const localToken = localStorage.getItem('token');
  if (localToken) return localToken;
  
  // Try cookie
  const cookieToken = getCookie('token');
  if (cookieToken) return cookieToken;
  
  return null;
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// API Helper Functions
async function createNewConversation() {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }    const response = await fetch('/api/threads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'New Chat',
        agent_type: 'orchestrator'
      })
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }
      if (response.status === 403) {
        throw new Error('Access denied.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to create conversation');
    }

    // Return the conversation data - API returns conversation data directly, not nested
    return {
      id: data.id || data.conversation_id,
      title: data.group_name || 'New Chat',
      created_at: data.created_at,
      updated_at: data.updated_at,
      is_ai_chat: data.is_ai_chat
    };
  } catch (error) {
    console.error('Error creating new conversation:', error);
    throw error;
  }
}

async function loadConversations() {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    console.log('🔄 Making API call to /api/threads from standalone function...');
    console.trace('loadConversations called from:'); // This will show the call stack

    const response = await fetch('/api/threads', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to load conversations');
    }

    return data.data;
  } catch (error) {
    console.error('Error loading conversations:', error);
    throw error;
  }
}

// DOM Manipulation Helpers
function addMessageToContainer(content, sender, isLoading = false, clientMessageId = null) {
  const messagesContainer = getMessagesContainer();
  if (!messagesContainer) {
    console.error('Messages container not found');
    return null;
  }

  // Use provided client message ID or generate a new one
  const messageId = clientMessageId || 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  const messageElement = document.createElement('div');
  messageElement.id = messageId;
  messageElement.className = `message-group ${sender === 'user' ? 'user-message' : 'ai-message'}`;
  messageElement.setAttribute('data-message-id', messageId);
  messageElement.setAttribute('data-sender', sender);
  messageElement.setAttribute('data-original-content', content);
  
  // Store the client message ID for editing/updating purposes
  if (clientMessageId) {
    messageElement.setAttribute('data-client-message-id', clientMessageId);
    console.log(`Message element created with client ID: ${clientMessageId}`);
  }

  let messageContent;
  if (isLoading) {
    messageContent = '<div class="loading-dots">Thinking</div>';
  } else if (sender === 'user') {
    // User messages with action buttons
    messageContent = `
      <div class="message-content-wrapper">
        <div class="message-text" data-original-text="${escapeHtml(content)}">
          <p class="text-white">${escapeHtml(content)}</p>
        </div>
        <div class="message-actions">
          <button class="action-btn copy-btn" onclick="copyMessage('${messageId}')" title="Copy message">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button class="action-btn edit-btn" onclick="editMessage('${messageId}')" title="Edit message">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="action-btn delete-btn" onclick="deleteMessage('${messageId}')" title="Delete message">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3,6 5,6 21,6"></polyline>
              <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </div>
    `;
  } else {
    // AI messages get markdown rendering
    messageContent = window.arzaniRenderer ? 
      window.arzaniRenderer.renderToHtml(content, 'orchestrator') : 
      `<p class="text-gray-800">${content}</p>`;
  }

  const messageHtml = `
    <div class="flex items-start space-x-3 ${sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}">
      <div class="message-bubble ${sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100'} rounded-lg ${sender === 'user' ? 'rounded-tr-none' : 'rounded-tl-none'} p-4 max-w-[80%] relative group">
        ${messageContent}
      </div>
    </div>
  `;

  messageElement.innerHTML = messageHtml;
  messagesContainer.appendChild(messageElement);

  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  return messageId;
}

function removeMessageFromContainer(messageId) {
  const messageElement = document.getElementById(messageId);
  if (messageElement) {
    messageElement.remove();
  }
}

function clearMessagesContainer() {
  const messagesContainer = getMessagesContainer();
  if (messagesContainer) {
    messagesContainer.innerHTML = `
      <!-- Welcome message -->
      <div class="message-group ai-message">
        <div class="flex items-start space-x-3">
          <div class="message-bubble bg-gray-100 rounded-lg rounded-tl-none p-4 max-w-[80%]">
            <p class="text-gray-800">Hello! I'm Arzani, your AI business marketplace assistant. I can help you with business valuations, finding listings, legal advice, and financial guidance. What would you like to know?</p>
          </div>
        </div>
      </div>
    `;
  }
}

// Enhanced ModernSidebar class specifically for Arzani-X
class ArzaniModernSidebar {  constructor() {
    this.conversations = {};
    this.currentConversationId = null;
    this.searchTimeout = null;
    this.cache = new Map();
    this.cacheExpiry = 30000; // 30 seconds
    this.arzaniClient = null; // Reference to the main client

    // Debounced refresh to prevent excessive API calls
    this.refreshTimeout = null;
    this.refreshDelay = 1000; // 1 second debounce
    this.isRefreshing = false;

    this.initializeElements();
    this.bindEvents();
    
    // Defer initial load to prevent conflicts with main client initialization
    console.log('📋 Sidebar initialized, deferring initial conversation load...');
    setTimeout(() => {
      console.log('📋 Loading initial conversations...');
      this.loadConversations();
    }, 2000); // Wait 2 seconds to ensure all components are ready
  }

  // Set reference to the main Arzani client
  setArzaniClient(client) {
    this.arzaniClient = client;
  }
  initializeElements() {
    this.sidebar = document.getElementById('modernSidebar');
    this.newChatBtn = document.getElementById('newChatBtn');
    this.searchInput = document.getElementById('conversationSearch');
    this.sidebarOverlay = document.getElementById('sidebarOverlay');
    
    this.sections = {
      pinned: {
        section: document.getElementById('pinnedSection'),
        list: document.getElementById('pinnedConversations')
      },
      today: {
        section: document.getElementById('todaySection'),
        list: document.getElementById('todayConversations')
      },
      yesterday: {
        section: document.getElementById('yesterdaySection'),
        list: document.getElementById('yesterdayConversations')
      },
      last7Days: {
        section: document.getElementById('last7DaysSection'),
        list: document.getElementById('last7DaysConversations')
      },
      older: {
        section: document.getElementById('olderSection'),
        list: document.getElementById('olderConversations')
      }
    };

    this.loadingEl = document.getElementById('conversationsLoading');
    this.emptyEl = document.getElementById('conversationsEmpty');
    
    // Check for missing elements and provide warnings
    const missingElements = [];
    Object.keys(this.sections).forEach(sectionKey => {
      const { section, list } = this.sections[sectionKey];
      if (!section) missingElements.push(`${sectionKey}Section`);
      if (!list) missingElements.push(`${sectionKey}Conversations`);
    });
    
    if (missingElements.length > 0) {
      console.warn('Missing sidebar elements:', missingElements);
      console.warn('Some conversation sections may not display properly');
    }
  }

  bindEvents() {
    // New chat button
    if (this.newChatBtn) {
      this.newChatBtn.addEventListener('click', () => this.createNewChat());
    }

    // Search functionality
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
    }

    // Mobile sidebar toggle
    const mobileSidebarToggle = document.getElementById('mobileSidebarToggle');
    if (mobileSidebarToggle) {
      mobileSidebarToggle.addEventListener('click', () => this.openMobileSidebar());
    }

    // Mobile sidebar overlay
    if (this.sidebarOverlay) {
      this.sidebarOverlay.addEventListener('click', () => this.closeMobileSidebar());
    }

    // Handle window resize
    window.addEventListener('resize', () => this.handleResize());
  }  async createNewChat() {
    // Close mobile sidebar immediately for better UX
    this.closeMobileSidebarIfOpen();
    
    // Show contextual options if user is already in a workflow
    if (this.shouldShowContextualOptions()) {
      this.showContextualNewChatDialog();
      return;
    }
    
    try {
      console.log('Creating new chat...');
      
      // Show loading state
      this.showLoading();
      
      const newConversation = await createNewConversation();
      console.log('New conversation created:', newConversation);
        // Clear the current conversation in the main client
      if (this.arzaniClient && typeof this.arzaniClient.clearCurrentConversation === 'function') {
        this.arzaniClient.clearCurrentConversation();
        if (typeof this.arzaniClient.showWelcomeMessage === 'function') {
          this.arzaniClient.showWelcomeMessage();
        }
      } else if (window.ArzaniHelpers && typeof window.ArzaniHelpers.clearMessagesContainer === 'function') {
        window.ArzaniHelpers.clearMessagesContainer();
      } else {
        // Final fallback
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
          messagesContainer.innerHTML = '';
        }
      }
      
      // Select the new conversation
      await this.selectConversation(newConversation.id);
      
      // Reload conversations to update the sidebar
      this.cache.clear();
      await this.loadConversations();
      
    } catch (error) {
      console.error('Error creating new chat:', error);
      this.showError('Failed to create new chat: ' + error.message);
        // Fall back to clearing the current conversation without creating a new one
      this.currentConversationId = null;
      if (this.arzaniClient && typeof this.arzaniClient.clearCurrentConversation === 'function') {
        this.arzaniClient.clearCurrentConversation();
        if (typeof this.arzaniClient.showWelcomeMessage === 'function') {
          this.arzaniClient.showWelcomeMessage();
        }
      } else if (window.ArzaniHelpers && typeof window.ArzaniHelpers.clearMessagesContainer === 'function') {
        window.ArzaniHelpers.clearMessagesContainer();
      } else {
        // Final fallback
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
          messagesContainer.innerHTML = '';
        }
      }
    }
  }

  // Check if we should show contextual options
  shouldShowContextualOptions() {
    // Check if user is in an active business transaction workflow
    const currentConversation = this.conversations[this.currentConversationId];
    if (!currentConversation) return false;
    
    // Check for business-related keywords in recent conversation
    const lastMessage = (currentConversation.last_message || '').toLowerCase();
    const businessKeywords = [
      'property', 'investment', 'acquisition', 'purchase', 'sale', 
      'financing', 'legal', 'contract', 'commercial', 'residential'
    ];
    
    return businessKeywords.some(keyword => lastMessage.includes(keyword));
  }

  // Show contextual new chat dialog
  showContextualNewChatDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'contextual-chat-dialog';
    dialog.innerHTML = `
      <div class="dialog-overlay" onclick="this.parentElement.remove()"></div>
      <div class="dialog-content">
        <h3>Start a New Conversation</h3>
        <p>What type of assistance do you need?</p>
        <div class="dialog-options">
          <button class="dialog-option" data-type="buy">
            <div class="option-icon">🏠</div>
            <div class="option-text">
              <strong>Buy Property</strong>
              <span>Investment opportunities & acquisitions</span>
            </div>
          </button>
          <button class="dialog-option" data-type="sell">
            <div class="option-icon">💰</div>
            <div class="option-text">
              <strong>Sell Property</strong>
              <span>Listing & market analysis</span>
            </div>
          </button>
          <button class="dialog-option" data-type="finance">
            <div class="option-icon">📊</div>
            <div class="option-text">
              <strong>Financing</strong>
              <span>Loans & financial structuring</span>
            </div>
          </button>
          <button class="dialog-option" data-type="legal">
            <div class="option-icon">⚖️</div>
            <div class="option-text">
              <strong>Legal Matters</strong>
              <span>Contracts & compliance</span>
            </div>
          </button>
          <button class="dialog-option" data-type="general">
            <div class="option-icon">💬</div>
            <div class="option-text">
              <strong>General Chat</strong>
              <span>Open conversation</span>
            </div>
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Bind option clicks
    dialog.querySelectorAll('.dialog-option').forEach(button => {
      button.addEventListener('click', async (e) => {
        const type = e.currentTarget.dataset.type;
        dialog.remove();
        await this.createContextualChat(type);
      });
    });
  }

  // Create new chat with contextual setup
  async createContextualChat(type) {
    try {
      this.showLoading();
      
      const newConversation = await createNewConversation();
      
      // Clear current conversation
      if (this.arzaniClient) {
        this.arzaniClient.clearCurrentConversation();
        
        // Set contextual welcome message based on type
        const welcomeMessages = {
          'buy': "I'm here to help you find and acquire the perfect property. What type of investment are you considering?",
          'sell': "I'll help you list and sell your property for the best possible outcome. Tell me about your property.",
          'finance': "Let's explore financing options for your real estate goals. What's your investment plan?",
          'legal': "I can assist with legal aspects of your real estate transaction. What legal matters need attention?",
          'general': "How can I assist you with your real estate needs today?"
        };
        
        const welcomeMessage = welcomeMessages[type] || welcomeMessages.general;
        this.arzaniClient.addConversationMessage(welcomeMessage, 'assistant');
      }
      
      await this.selectConversation(newConversation.id);
      this.cache.clear();
      await this.loadConversations();
      
    } catch (error) {
      console.error('Error creating contextual chat:', error);
      this.hideLoading();
    }
  }
  async loadConversations() {
    try {
      this.showLoading();
      
      console.log('🔄 Making API call to /api/threads from sidebar class method...');
      console.trace('loadConversations (class method) called from:'); // This will show the call stack
      
      // Check cache first
      const cacheKey = 'conversations';
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
        console.log('📦 Using cached conversations data');
        this.conversations = cached.data;
        this.renderConversations(cached.data);
        return;
      }

      const data = await loadConversations();
      
      // Cache the response
      this.cache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
      });

      this.conversations = data;
      this.renderConversations(data);
      
    } catch (error) {
      console.error('Error loading conversations:', error);
      this.showError('Failed to load conversations: ' + error.message);
    }
  }

  renderConversations(conversations) {
    this.hideLoading();

    // Check if there are any conversations
    const hasConversations = Object.values(conversations).some(section => 
      Array.isArray(section) && section.length > 0
    );
    
    if (!hasConversations) {
      this.showEmpty();
      return;
    }

    this.hideEmpty();    // Render each section
    Object.keys(this.sections).forEach(sectionKey => {
      const sectionData = conversations[sectionKey] || [];
      const sectionElements = this.sections[sectionKey];
      
      if (!sectionElements || !sectionElements.section || !sectionElements.list) {
        console.debug(`Section elements not found for ${sectionKey} - skipping`);
        return;
      }

      const { section, list } = sectionElements;

      if (Array.isArray(sectionData) && sectionData.length > 0) {
        section.style.display = 'block';
        list.innerHTML = sectionData.map(conversation => 
          this.createConversationHTML(conversation)
        ).join('');
        
        // Add click handlers
        list.querySelectorAll('.conversation-item').forEach(item => {
          item.addEventListener('click', () => {
            const conversationId = item.dataset.conversationId;
            this.selectConversation(conversationId);
          });
        });
      } else {
        section.style.display = 'none';
      }
    });
  }  createConversationHTML(conversation) {
    // Use the correct date field from threads API
    const dateField = conversation.last_message_time || conversation.last_active_at || conversation.updated_at || conversation.created_at;
    const timeAgo = this.formatTimeAgo(new Date(dateField));
    const avatarIcon = this.getAvatarIcon(conversation.agent_type);
    const unreadBadge = conversation.unread_count > 0 ? 
      `<div class="conversation-unread-badge">${conversation.unread_count}</div>` : '';
    const unreadDot = conversation.unread_count > 0 ? 
      `<div class="conversation-unread-dot"></div>` : '';
    const isActive = conversation.id === this.currentConversationId;

    // Enhanced conversation title with context
    const conversationTitle = this.getEnhancedTitle(conversation);
    const conversationPreview = this.getEnhancedPreview(conversation);
    const conversationSubtitle = this.getConversationSubtitle(conversation);

    return `
      <div class="conversation-item ${isActive ? 'active' : ''}" 
           data-conversation-id="${conversation.id}">
        ${unreadDot}
        <div class="conversation-avatar">${avatarIcon}</div>
        <div class="conversation-details">
          <div class="conversation-header">
            <div class="conversation-title">${this.escapeHtml(conversationTitle)}</div>
            <div class="conversation-time">${timeAgo}</div>
          </div>
          ${conversationSubtitle ? `<div class="conversation-subtitle">${this.escapeHtml(conversationSubtitle)}</div>` : ''}
          <div class="conversation-preview">${this.escapeHtml(conversationPreview)}</div>
        </div>
        ${unreadBadge}
      </div>
    `;
  }

  // Enhanced title generation with meaningful names
  getEnhancedTitle(conversation) {
    if (conversation.group_name && conversation.group_name !== 'Arzani Chat' && !conversation.group_name.startsWith('Chat ')) {
      return conversation.group_name;
    }
    
    // Generate meaningful title from last message or context
    if (conversation.last_message) {
      const lastMsg = conversation.last_message;
      // Extract key topics or questions
      const keywords = this.extractKeywords(lastMsg);
      if (keywords.length > 0) {
        return keywords.slice(0, 3).join(' • ');
      }
    }
    
    // Fallback to agent-based naming
    const agentName = this.getAgentDisplayName(conversation.agent_type);
    const date = new Date(conversation.created_at).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    return `${agentName} Inquiry - ${date}`;
  }

  // Enhanced preview with better content extraction
  getEnhancedPreview(conversation) {
    if (!conversation.last_message) {
      return 'Start a new conversation...';
    }
    
    let preview = conversation.last_message;
    
    // Clean up common prefixes and formatting
    preview = preview.replace(/^(Assistant:|User:|AI:|Human:)/i, '');
    preview = preview.replace(/^\s*[-•]\s*/, '');
    preview = preview.trim();
    
    // Truncate intelligently at sentence or clause boundaries
    if (preview.length > 80) {
      const sentences = preview.split(/[.!?]+/);
      if (sentences[0] && sentences[0].length <= 80) {
        preview = sentences[0] + (sentences.length > 1 ? '...' : '');
      } else {
        preview = preview.substring(0, 75) + '...';
      }
    }
    
    return preview;
  }

  // Generate contextual subtitle
  getConversationSubtitle(conversation) {
    const agentName = this.getAgentDisplayName(conversation.agent_type);
    const messageCount = conversation.message_count || 0;
    
    if (messageCount > 1) {
      return `${agentName} • ${messageCount} messages`;
    } else if (agentName !== 'Arzani') {
      return agentName;
    }
    
    return null;
  }

  // Extract keywords from text for meaningful titles
  extractKeywords(text) {
    if (!text) return [];
    
    // Common business/real estate terms to prioritize
    const priorityTerms = [
      'property', 'acquisition', 'investment', 'financing', 'legal', 'contract',
      'purchase', 'sale', 'lease', 'development', 'zoning', 'valuation',
      'due diligence', '1031', 'commercial', 'residential', 'portfolio'
    ];
    
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will', 'what', 'when', 'where', 'help', 'need', 'like', 'just', 'know'].includes(word));
    
    // Prioritize business terms
    const keywords = [];
    priorityTerms.forEach(term => {
      if (text.toLowerCase().includes(term) && !keywords.includes(term)) {
        keywords.push(term);
      }
    });
    
    // Add other meaningful words
    const commonWords = [...new Set(words)]
      .filter(word => !keywords.includes(word))
      .slice(0, 3);
    
    return [...keywords, ...commonWords].slice(0, 3);
  }  getAvatarIcon(agentType) {
    const icons = {
      'revenue': '🏢',
      'legal': '⚖️',
      'finance': '💰',
      'orchestrator': '🎯',
      'default': '<img src="/figma design exports/images.webp/arzani-icon-nobackground.png" alt="Arzani" style="width: 20px; height: 20px; object-fit: contain;">'
    };
    return icons[agentType] || icons.default;
  }

  // Get display name for agents
  getAgentDisplayName(agentType) {
    const names = {
      'revenue': 'Revenue Agent',
      'legal': 'Legal Agent',
      'finance': 'Finance Agent',
      'orchestrator': 'Orchestrator',
      'default': 'Arzani'
    };
    return names[agentType] || names.default;
  }
  formatTimeAgo(date) {
    // Validate the date input
    if (!date) {
      return 'recently';
    }

    // Convert to Date object if it's a string
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return 'recently';
    }

    const now = new Date();
    const diffMs = now - dateObj;
    
    // Handle future dates or invalid differences
    if (diffMs < 0) {
      return 'recently';
    }

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    try {
      return dateObj.toLocaleDateString();
    } catch (error) {
      console.warn('Error formatting date:', error);
      return 'recently';
    }
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  async selectConversation(conversationId) {
    if (this.currentConversationId === conversationId) return;

    try {
      // Close mobile sidebar if open (for mobile UX)
      this.closeMobileSidebarIfOpen();

      // Update active state in UI
      this.sidebar.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.toggle('active', item.dataset.conversationId === conversationId);
      });

      this.currentConversationId = conversationId;

      console.log('Selected conversation:', conversationId);
      
      // Update the session ID in the persistence manager
      if (window.arzaniPersistence && typeof window.arzaniPersistence.switchSession === 'function') {
        try {
          console.log(`🔄 Updating persistence manager with session ID: ${conversationId}`);
          await window.arzaniPersistence.switchSession(conversationId);
        } catch (persistenceError) {
          console.error('Error updating persistence manager session:', persistenceError);
          // Continue despite this error, as we might still be able to load the conversation
        }
      } else {
        console.warn('⚠️ Unable to update persistence manager: not available or missing switchSession method');
      }
        
      // Ensure the main UI transitions to conversation mode
      if (this.arzaniClient) {
        // Force transition to conversation layout regardless of current state
        this.arzaniClient.forceTransitionToConversationLayout();
        // Set the current conversation ID
        this.arzaniClient.setCurrentConversation(conversationId);
      } else if (window.ensureConversationAccess) {
        // Fallback if main client isn't available
        window.ensureConversationAccess(conversationId);
      }
      
      // Load conversation messages
      await this.loadConversationMessages(conversationId);
      
    } catch (error) {
      console.error('Error selecting conversation:', error);
    }
  }

  // Load conversation messages
  async loadConversationMessages(conversationId) {
    try {
      const token = getAuthToken();
      if (!token) {
        console.error('No authentication token available');
        return;
      }

      console.log('Loading messages for conversation:', conversationId);      const response = await fetch(`/api/threads/${conversationId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load messages');
      }      // Clear current messages but stay in conversation mode
      if (this.arzaniClient) {
        this.arzaniClient.clearConversation(false); // Don't return to main layout
      } else {
        clearMessagesContainer();
      }      // Display messages
      if (data.messages && data.messages.length > 0) {
        data.messages.forEach(message => {
          const role = message.sender_type === 'user' ? 'user' : 'assistant';
          const content = message.content || message.message_content || '';
          const messageId = message.message_id || message.id; // Use message_id first, fallback to database id
          
          if (this.arzaniClient && typeof this.arzaniClient.addConversationMessage === 'function') {
            // Check if the client's addConversationMessage accepts message ID
            if (this.arzaniClient.addConversationMessage.length >= 5) {
              // Method signature may accept the message ID parameter
              this.arzaniClient.addConversationMessage(content, role, false, message.created_at, true, messageId);
            } else {
              // Older method signature without message ID support
              this.arzaniClient.addConversationMessage(content, role, false, message.created_at, true);
              // Try to find and update the element after rendering
              setTimeout(() => {
                const messages = document.querySelectorAll('.message-group');
                const lastMessage = messages[messages.length - 1];
                if (lastMessage && !lastMessage.hasAttribute('data-message-id') && messageId) {
                  lastMessage.setAttribute('data-message-id', messageId);
                  lastMessage.setAttribute('data-db-message-id', message.id);
                  console.log(`Updated last message with message ID: ${messageId} (DB ID: ${message.id})`);
                }
              }, 100);
            }
          } else {
            addMessageToContainer(content, role, false, messageId);
          }
        });
      } else {// Show welcome message for empty conversation
        if (this.arzaniClient) {
          this.arzaniClient.showWelcomeMessageInConversation();
        }
      }

      // Update the main client's current conversation ID
      if (this.arzaniClient) {
        this.arzaniClient.currentConversationId = conversationId;
      }

    } catch (error) {
      console.error('Error loading conversation messages:', error);
      
      // Show error message
      if (this.arzaniClient) {
        this.arzaniClient.addConversationMessage('❌ Failed to load conversation messages. Please try again.', 'assistant');
      } else {
        addMessageToContainer('❌ Failed to load conversation messages. Please try again.', 'assistant');
      }
    }
  }
  async handleSearch(query) {
    clearTimeout(this.searchTimeout);
    
    if (!query.trim()) {
      this.loadConversations();
      return;
    }

    this.searchTimeout = setTimeout(async () => {
      try {
        this.showLoading();
        
        // Enhanced search with filters
        const searchResults = this.performAdvancedSearch(query, this.conversations);
        
        if (searchResults.length === 0) {
          this.showEmpty('No conversations found matching your search.');
          return;
        }
        
        // Display filtered results
        this.displaySearchResults(searchResults);
        
      } catch (error) {
        console.error('Error searching conversations:', error);
        this.showEmpty('Error occurred while searching.');
      }
    }, 300);
  }

  // Advanced search with multiple filters
  performAdvancedSearch(query, conversations) {
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    
    return Object.values(conversations).filter(conversation => {
      // Search in title
      const title = (conversation.group_name || '').toLowerCase();
      const titleMatch = searchTerms.some(term => title.includes(term));
      
      // Search in last message
      const lastMessage = (conversation.last_message || '').toLowerCase();
      const messageMatch = searchTerms.some(term => lastMessage.includes(term));
      
      // Search by agent type
      const agentType = (conversation.agent_type || '').toLowerCase();
      const agentMatch = searchTerms.some(term => {
        return agentType.includes(term) || 
               this.getAgentDisplayName(conversation.agent_type).toLowerCase().includes(term);
      });
      
      // Date-based search
      const dateMatch = this.searchByDate(query, conversation);
      
      // Unread filter
      const unreadMatch = query.toLowerCase().includes('unread') && conversation.unread_count > 0;
      
      return titleMatch || messageMatch || agentMatch || dateMatch || unreadMatch;
    });
  }

  // Search by date keywords
  searchByDate(query, conversation) {
    const queryLower = query.toLowerCase();
    const conversationDate = new Date(conversation.last_message_time || conversation.created_at);
    const now = new Date();
    
    if (queryLower.includes('today')) {
      return this.isToday(conversationDate);
    }
    
    if (queryLower.includes('yesterday')) {
      return this.isYesterday(conversationDate);
    }
    
    if (queryLower.includes('week') || queryLower.includes('recent')) {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return conversationDate >= oneWeekAgo;
    }
    
    return false;
  }

  // Display search results in a special section
  displaySearchResults(results) {
    this.hideLoading();
    
    // Hide all sections
    Object.values(this.sections).forEach(({ section }) => {
      if (section) section.style.display = 'none';
    });
    
    // Create or show search results section
    let searchSection = document.getElementById('searchResultsSection');
    if (!searchSection) {
      searchSection = document.createElement('div');
      searchSection.id = 'searchResultsSection';
      searchSection.className = 'conversation-section';
      searchSection.innerHTML = `
        <div class="section-header">
          <h3 class="section-title">Search Results</h3>
          <span class="section-count" id="searchResultsCount">0</span>
        </div>
        <div class="conversation-list" id="searchResultsList"></div>
      `;
      this.sidebar.appendChild(searchSection);
    }
    
    const resultsList = document.getElementById('searchResultsList');
    const resultsCount = document.getElementById('searchResultsCount');
    
    searchSection.style.display = 'block';
    resultsCount.textContent = results.length;
    
    resultsList.innerHTML = results.map(conversation => 
      this.createConversationHTML(conversation)
    ).join('');
    
    // Bind click handlers
    this.bindConversationClickHandlers(resultsList);
  }

  showLoading() {
    if (this.loadingEl) {
      this.loadingEl.style.display = 'block';
    }
    if (this.emptyEl) {
      this.emptyEl.style.display = 'none';
    }
    Object.values(this.sections).forEach(({ section }) => {
      if (section) {
        section.style.display = 'none';
      }
    });
  }

  hideLoading() {
    if (this.loadingEl) {
      this.loadingEl.style.display = 'none';
    }
  }

  showEmpty() {
    if (this.emptyEl) {
      this.emptyEl.style.display = 'block';
    }
    this.hideLoading();
  }

  hideEmpty() {
    if (this.emptyEl) {
      this.emptyEl.style.display = 'none';
    }
  }

  showError(message) {
    this.hideLoading();
    if (this.loadingEl) {
      this.loadingEl.textContent = message;
      this.loadingEl.style.display = 'block';
    }
  }

  openMobileSidebar() {
    if (window.innerWidth <= 768 && this.sidebar) {
      this.sidebar.classList.add('mobile-open');
      if (this.sidebarOverlay) {
        this.sidebarOverlay.classList.add('active');
      }
    }
  }

  closeMobileSidebar() {
    if (this.sidebar) {
      this.sidebar.classList.remove('mobile-open');
    }
    if (this.sidebarOverlay) {
      this.sidebarOverlay.classList.remove('active');
    }
  }

  handleResize() {
    if (window.innerWidth > 768) {
      this.closeMobileSidebar();
    }
  }  refresh() {
    // Debounce refresh calls to prevent excessive API requests
    if (this.refreshTimeout) {
      console.log('🔄 Debouncing refresh call...');
      clearTimeout(this.refreshTimeout);
    }
    
    this.refreshTimeout = setTimeout(() => {
      if (!this.isRefreshing) {
        this.performRefresh();
      } else {
        console.log('🔄 Refresh already in progress, rescheduling...');
        // Reschedule if already refreshing
        setTimeout(() => this.refresh(), 500);
      }
    }, this.refreshDelay);
  }
  async performRefresh() {
    if (this.isRefreshing) {
      console.log('🔄 Refresh already in progress, skipping...');
      return;
    }

    this.isRefreshing = true;
    try {
      console.log('🔄 Performing sidebar refresh...');
      console.trace('performRefresh called from:');
      this.cache.clear();
      await this.loadConversations();
      console.log('✅ Sidebar refresh completed');
    } catch (error) {
      console.error('❌ Sidebar refresh failed:', error);
    } finally {
      this.isRefreshing = false;
    }
  }

  // Add missing methods expected by persistence manager
  async updateConversationPreview(sessionId, messageContent, messageType) {
    try {
      // Find and update the conversation preview in the sidebar
      const conversationElement = document.querySelector(`[data-conversation-id="${sessionId}"]`);
      if (conversationElement) {
        const previewElement = conversationElement.querySelector('.conversation-preview');
        if (previewElement) {
          // Truncate long messages for preview
          const truncatedContent = messageContent.length > 50 
            ? messageContent.substring(0, 50) + '...' 
            : messageContent;
          previewElement.textContent = this.escapeHtml(truncatedContent);
        }
        
        // Update timestamp
        const timeElement = conversationElement.querySelector('.conversation-time');
        if (timeElement) {
          timeElement.textContent = 'now';
        }
      }

      // Refresh conversation list to maintain proper ordering
      await this.loadConversations();
      
      console.log(`✅ Updated conversation preview for session ${sessionId}`);
    } catch (error) {
      console.error(`❌ Failed to update conversation preview for session ${sessionId}:`, error);
    }
  }

  async onNewMessage(sessionId, messageContent, messageType) {
    try {
      // Update the conversation preview
      await this.updateConversationPreview(sessionId, messageContent, messageType);
      
      // If this is the current conversation, ensure it's marked as active
      if (sessionId === this.currentConversationId) {
        const conversationElement = document.querySelector(`[data-conversation-id="${sessionId}"]`);
        if (conversationElement && !conversationElement.classList.contains('active')) {
          // Remove active from other conversations
          document.querySelectorAll('.conversation-item.active').forEach(el => {
            el.classList.remove('active');
          });
          // Add active to current conversation
          conversationElement.classList.add('active');
        }
      }
      
      console.log(`✅ Handled new message for session ${sessionId}`);
    } catch (error) {
      console.error(`❌ Failed to handle new message for session ${sessionId}:`, error);
    }
  }

  async autoGenerateConversationTitle(sessionId, firstMessage) {
    try {
      // Generate a title from the first message
      const title = await summarizeFirstMessage(firstMessage);
      
      if (title) {
        // Update the title via API
        await updateConversationTitle(sessionId, title);
        
        // Update the UI
        const conversationElement = document.querySelector(`[data-conversation-id="${sessionId}"]`);
        if (conversationElement) {
          const titleElement = conversationElement.querySelector('.conversation-title');
          if (titleElement) {
            titleElement.textContent = this.escapeHtml(title);
          }
        }
      }
      
      console.log(`✅ Generated title for session ${sessionId}: ${title}`);
    } catch (error) {
      console.error(`❌ Failed to generate title for session ${sessionId}:`, error);
    }
  }

  async syncConversationWithMainChat(conversationId) {
    try {
      // Select the conversation and load its messages
      await this.selectConversation(conversationId);
      
      console.log(`✅ Synced conversation ${conversationId} with main chat`);
    } catch (error) {
      console.error(`❌ Failed to sync conversation ${conversationId} with main chat:`, error);
    }
  }

  // Close mobile sidebar if open (for mobile UX)
  closeMobileSidebarIfOpen() {
    if (window.arzaniClient && typeof window.arzaniClient.closeMobileSidebar === 'function') {
      // Check if mobile sidebar is open
      const modernSidebar = document.getElementById('modernSidebar');
      if (modernSidebar && modernSidebar.classList.contains('mobile-open')) {
        window.arzaniClient.closeMobileSidebar();
        console.log('📱 Mobile sidebar auto-closed after conversation selection');
      }
    }
  }

  // Open mobile sidebar (for direct calls from sidebar)
  openMobileSidebar() {
    const modernSidebar = document.getElementById('modernSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (modernSidebar && sidebarOverlay) {
      modernSidebar.classList.add('mobile-open');
      sidebarOverlay.classList.add('active');
      document.body.style.overflow = 'hidden'; // Prevent body scroll
      console.log('📱 Mobile sidebar opened');
    }
  }

  // Close mobile sidebar (for direct calls from sidebar)
  closeMobileSidebar() {
    const modernSidebar = document.getElementById('modernSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (modernSidebar && sidebarOverlay) {
      modernSidebar.classList.remove('mobile-open');
      sidebarOverlay.classList.remove('active');
      document.body.style.overflow = ''; // Restore body scroll
      console.log('📱 Mobile sidebar closed');
    }
  }
}

// Title summarization functionality
async function summarizeFirstMessage(message) {
  try {
    const token = getAuthToken();
    if (!token) {
      console.warn('No auth token for title summarization');
      return null;
    }

    // Don't summarize very short messages
    if (message.length < 10) {
      return message.length > 50 ? message.substring(0, 50) + '...' : message;
    }

    const response = await fetch('/api/ai/summarize-title', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        message: message
      })
    });

    if (!response.ok) {
      throw new Error('Failed to summarize title');
    }

    const data = await response.json();
    return data.title || (message.length > 50 ? message.substring(0, 50) + '...' : message);
  } catch (error) {
    console.error('Error summarizing title:', error);
    // Fallback to truncated message
    return message.length > 50 ? message.substring(0, 50) + '...' : message;
  }
}

async function updateConversationTitle(conversationId, title) {
  try {
    const token = getAuthToken();
    if (!token) {
      console.warn('No auth token for updating title');
      return false;
    }

    const response = await fetch(`/api/threads/${conversationId}/title`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: title
      })
    });

    if (!response.ok) {
      throw new Error('Failed to update conversation title');
    }

    console.log('✅ Conversation title updated:', title);
    return true;
  } catch (error) {
    console.error('Error updating conversation title:', error);
    return false;
  }
}

// Global functions for Arzani-X
window.ArzaniHelpers = {
  getMessagesContainer,
  getMainChatInput,
  getBottomChatInput,
  getAuthToken,
  createNewConversation,
  loadConversations,
  addMessageToContainer,
  removeMessageFromContainer,
  clearMessagesContainer,
  summarizeFirstMessage,  updateConversationTitle
};

// Global message action functions
window.copyMessage = function(messageId) {
  const messageElement = document.getElementById(messageId);
  if (!messageElement) {
    console.error('Message not found:', messageId);
    return;
  }
  
  const originalContent = messageElement.getAttribute('data-original-content');
  if (!originalContent) {
    console.error('Original content not found for message:', messageId);
    return;
  }
  
  // Copy to clipboard
  navigator.clipboard.writeText(originalContent).then(() => {
    // Show feedback
    const copyBtn = messageElement.querySelector('.copy-btn');
    if (copyBtn) {
      const originalTitle = copyBtn.title;
      copyBtn.title = 'Copied!';
      copyBtn.style.color = '#10b981';
      setTimeout(() => {
        copyBtn.title = originalTitle;
        copyBtn.style.color = '';
      }, 2000);
    }
    console.log('Message copied to clipboard');
  }).catch(err => {
    console.error('Failed to copy message:', err);
    alert('Failed to copy message to clipboard');
  });
};

window.editMessage = function(messageId) {
  const messageElement = document.getElementById(messageId);
  if (!messageElement) {
    console.error('Message not found:', messageId);
    return;
  }
  
  const originalContent = messageElement.getAttribute('data-original-content');
  const messageContentWrapper = messageElement.querySelector('.message-content-wrapper');
  
  if (!messageContentWrapper) {
    console.error('Message content wrapper not found');
    return;
  }
  
  // Check if already in edit mode
  if (messageElement.classList.contains('editing')) {
    return;
  }
  
  // Set editing state
  messageElement.classList.add('editing');
  
  // Create edit interface
  const editHtml = `
    <div class="message-edit-wrapper">
      <textarea class="message-edit-textarea" rows="3" placeholder="Edit your message...">${originalContent}</textarea>
      <div class="message-edit-actions">        <button class="edit-action-btn send-btn" onclick="saveEditedMessage('${messageId}')" title="Send edited message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
          </svg>
          Send
        </button>
        <button class="edit-action-btn cancel-btn" onclick="cancelEditMessage('${messageId}')" title="Cancel editing">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          Cancel
        </button>
      </div>
    </div>
  `;
  
  // Store original content for cancellation
  messageContentWrapper.setAttribute('data-editing-original', messageContentWrapper.innerHTML);
  messageContentWrapper.innerHTML = editHtml;
  
  // Focus on textarea
  const textarea = messageContentWrapper.querySelector('.message-edit-textarea');
  if (textarea) {
    textarea.focus();
    textarea.select();
    
    // Auto-resize textarea
    textarea.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = this.scrollHeight + 'px';
    });
  }
};

window.saveEditedMessage = async function(messageId) {
  // Synchronize session IDs before editing
  if (window.arzaniSessionSynchronizer && typeof window.arzaniSessionSynchronizer.synchronize === 'function') {
    window.arzaniSessionSynchronizer.synchronize();
  }

  const messageElement = document.getElementById(messageId);
  if (!messageElement) {
    console.error('Message not found:', messageId);
    alert('Message not found. Please try again.');
    return;
  }

  const textarea = messageElement.querySelector('.message-edit-textarea');
  if (!textarea) {
    console.error('Edit textarea not found for message:', messageId);
    alert('Edit box not found. Please try again.');
    return;
  }

  const newContent = textarea.value.trim();
  if (!newContent) {
    alert('Message content cannot be empty.');
    return;
  }
  // Get the client message ID from the data attribute (this is what the threads API expects)
  const clientMessageId = messageElement.getAttribute('data-client-message-id') || messageElement.getAttribute('data-message-id');
  if (!clientMessageId) {
    console.error('Client message ID not found for message:', messageId);
    console.log('Message element attributes:', 
      Object.keys(messageElement.attributes).map(k => 
        `${messageElement.attributes[k].name}="${messageElement.attributes[k].value}"`
      ).join(', ')
    );
    
    alert('This message cannot be edited because it doesn\'t have a valid message ID. Please try refreshing the conversation.');
    return;
  }

  // Get the current session ID from persistence
  const sessionId = window.arzaniPersistence?.getCurrentSessionId?.() || null;

  console.log(`🔧 Editing message with client ID: ${clientMessageId}`);

  try {
    // Call persistence layer to save changes using the client message ID
    if (window.arzaniPersistence && typeof window.arzaniPersistence.updateMessage === 'function') {
      const updatedMessage = await window.arzaniPersistence.updateMessage(clientMessageId, newContent, sessionId);
      console.log('✅ Message updated successfully:', updatedMessage);
      
      // Update message content in DOM
      messageElement.setAttribute('data-original-content', newContent);

      // Restore original display with new content
      const messageContentWrapper = messageElement.querySelector('.message-content-wrapper');
      if (messageContentWrapper) {
        const originalContent = messageContentWrapper.getAttribute('data-editing-original');
        messageContentWrapper.innerHTML = originalContent;
        messageContentWrapper.removeAttribute('data-editing-original');
        
        // Update the displayed text with new content
        const messageText = messageContentWrapper.querySelector('.message-text p');
        if (messageText) {
          messageText.textContent = newContent;
        }
      }

      // Remove editing state
      messageElement.classList.remove('editing');

      // Optionally regenerate AI response from this point
      if (window.arzaniPersistence && typeof window.arzaniPersistence.resendMessage === 'function') {
        // Use the resendMessage method to resend with the same messageId
        const threadId = sessionId;
        await window.arzaniPersistence.resendMessage(threadId, clientMessageId, newContent, 'user');
        console.log('🔄 Resent message to backend with same messageId.');
      }
      
    } else {
      throw new Error('Persistence layer not available');
    }
  } catch (error) {
    console.error('❌ Failed to update message:', error);
    alert(`Failed to save message changes: ${error.message}`);
    
    // Restore editing state on error
    return;
  }
};

window.cancelEditMessage = function(messageId) {
  const messageElement = document.getElementById(messageId);
  if (!messageElement) {
    console.error('Message not found:', messageId);
    return;
  }
  
  const messageContentWrapper = messageElement.querySelector('.message-content-wrapper');
  const originalContent = messageContentWrapper.getAttribute('data-editing-original');
  
  if (originalContent) {
    messageContentWrapper.innerHTML = originalContent;
  }
  
  // Remove editing state
  messageElement.classList.remove('editing');
};

window.deleteMessage = function(messageId) {
  if (!confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
    return;
  }
  
  const messageElement = document.getElementById(messageId);
  if (!messageElement) {
    console.error('Message not found:', messageId);
    return;
  }
  
  // Call persistence layer to delete message
  if (window.arzaniPersistence) {
    window.arzaniPersistence.deleteMessage(messageId)
      .then(() => {
        // Remove from DOM
        messageElement.remove();
        console.log('Message deleted successfully');
      })
      .catch(error => {
        console.error('Failed to delete message:', error);
        alert('Failed to delete message');
      });
  } else {
    // Fallback: just remove from DOM
    messageElement.remove();
  }
};

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ArzaniModernSidebar,
    getMessagesContainer,
    getAuthToken,
    createNewConversation,
    loadConversations
  };
}
