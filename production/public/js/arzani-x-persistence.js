/**
 * Arzani-X Persistence Helper
 * Handles database operations for Arzani-X conversations
 */

class ArzaniPersistenceManager {
  constructor() {
    this.currentSessionId = null;
    this.authToken = null;
    this.baseUrl = window.location.origin;
    
    // Message deduplication tracking
    this.messageDeduplication = {
      isSubmitting: false,
      pendingSubmissions: 0,
      lastSubmitTime: 0,
      lastMessageHash: null,
      minSubmitInterval: 1000, // 1 second minimum between messages
      recentMessages: new Map(), // content hash -> timestamp
      maxRecentMessages: 50 // Keep track of last 50 messages
    };
    
    // Session creation mutex
    this._creatingSession = false;
    
    // Register this instance globally for session synchronization
    window.arzaniPersistence = this;
    
    // Notify that persistence is ready (for session synchronizer)
    document.dispatchEvent(new CustomEvent('arzani:persistence:ready'));
    
    console.log('📋 ArzaniPersistenceManager initialized');
  }

  /**
   * Initialize with authentication token
   */
  setAuthToken(token) {
    this.authToken = token;
  }

  /**
   * Get authentication headers
   */
  getAuthHeaders() {
    if (!this.authToken) {
      throw new Error('Authentication token not set');
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authToken}`
    };
  }

  /**
   * Synchronize conversation ID across all components
   * This ensures consistency between persistence manager, client, and sidebar
   */
  syncConversationId() {
    try {
      // If we have a session synchronizer available, use it
      if (window.arzaniSessionSynchronizer && typeof window.arzaniSessionSynchronizer.synchronize === 'function') {
        console.log('🔄 Synchronizing conversation ID across components...');
        window.arzaniSessionSynchronizer.synchronize();
      }
      
      // Also update the session tracker if we have a current session
      if (this.currentSessionId && window._arzaniSessionTracker) {
        window._arzaniSessionTracker.trackSession(this.currentSessionId, 'persistence_manager');
        window._arzaniSessionTracker.updateAccessTime(this.currentSessionId);
      }
    } catch (error) {
      console.warn('⚠️ Failed to synchronize conversation ID:', error);
      // Don't throw - this is a best-effort operation
    }
  }

  /**
   * Create a new chat session using threads API
   */
  async createSession(agentType = 'orchestrator', title = null) {
    try {
      console.log(`📝 Creating conversation thread for agent: ${agentType}`);
      
      const response = await fetch(`${this.baseUrl}/api/threads`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          group_name: title || `New ${agentType} conversation`,
          agent_type: agentType,
          is_ai_chat: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }      const sessionData = await response.json();
      console.log('📡 Session creation response:', sessionData);
      
      this.currentSessionId = sessionData.id || sessionData.conversation_id;
      console.log(`📋 Session ID set to: ${this.currentSessionId} (type: ${typeof this.currentSessionId})`);
      
      if (!this.currentSessionId) {
        console.error('❌ No session ID found in response:', sessionData);
        throw new Error('Server did not return a valid session ID');
      }
      
      console.log(`✅ Conversation thread created: ${this.currentSessionId}`);
      return {
        id: this.currentSessionId,
        title: sessionData.group_name,
        created_at: sessionData.created_at,
        agent_type: agentType
      };
      
    } catch (error) {
      console.error('❌ Failed to create conversation thread:', error);
      throw error;
    }
  }

  /**
   * Generate a hash of message content for deduplication
   */
  generateMessageHash(content, senderType, agentType) {
    try {
      const hashData = {
        content: content.trim(),
        senderType: senderType,
        agentType: agentType,
        sessionId: this.currentSessionId
      };
      return JSON.stringify(hashData);
    } catch (e) {
      return Date.now().toString(); // Fallback
    }
  }

  /**
   * Check if message submission should be allowed
   */
  canSubmitMessage(messageHash) {
    const now = Date.now();
    
    // Don't allow multiple submissions in progress
    if (this.messageDeduplication.isSubmitting) {
      console.log('📝 Message submission already in progress, skipping');
      return false;
    }
    
    // Don't allow submissions too close together
    if (now - this.messageDeduplication.lastSubmitTime < this.messageDeduplication.minSubmitInterval) {
      console.log('📝 Too soon since last submission, skipping');
      return false;
    }
    
    // Don't submit the same message content twice in a row
    if (messageHash && messageHash === this.messageDeduplication.lastMessageHash) {
      console.log('📝 Same message as last submission, skipping');
      return false;
    }
    
    // Check if this message was recently submitted (within last 5 seconds)
    if (this.messageDeduplication.recentMessages.has(messageHash)) {
      const lastSubmission = this.messageDeduplication.recentMessages.get(messageHash);
      if (now - lastSubmission < 5000) {
        console.log('📝 Message recently submitted, skipping duplicate');
        return false;
      }
    }
    
    return true;
  }

  /**
   * Start message submission tracking
   */
  startMessageSubmission(messageHash) {
    this.messageDeduplication.isSubmitting = true;
    this.messageDeduplication.pendingSubmissions++;
    this.messageDeduplication.lastSubmitTime = Date.now();
    
    if (messageHash) {
      this.messageDeduplication.lastMessageHash = messageHash;
      
      // Add to recent messages
      this.messageDeduplication.recentMessages.set(messageHash, Date.now());
      
      // Clean up old recent messages
      if (this.messageDeduplication.recentMessages.size > this.messageDeduplication.maxRecentMessages) {
        const oldestKey = this.messageDeduplication.recentMessages.keys().next().value;
        this.messageDeduplication.recentMessages.delete(oldestKey);
      }
    }
  }
  /**
   * Finish message submission tracking
   */
  finishMessageSubmission() {
    this.messageDeduplication.isSubmitting = false;
    this.messageDeduplication.pendingSubmissions = Math.max(0, this.messageDeduplication.pendingSubmissions - 1);
  }    /**
   * Save a message to the current session using threads API
   */
  async saveMessage(content, senderType, agentType = null, metadata = {}) {
    try {
      // First, ensure we have a valid session before proceeding
      const sessionValid = await this.ensureValidSession(agentType);
      if (!sessionValid) {
        throw new Error('Unable to create or validate session');
      }

      // Validate session ID is a valid number
      const sessionIdNum = parseInt(this.currentSessionId);
      if (isNaN(sessionIdNum) || sessionIdNum <= 0) {
        console.error('❌ Invalid session ID format:', this.currentSessionId);
        throw new Error(`Invalid session ID: ${this.currentSessionId}`);
      }

      // Generate message hash for deduplication
      const messageHash = this.generateMessageHash(content, senderType, agentType);
      
      // Check if we should submit this message
      if (!this.canSubmitMessage(messageHash)) {
        console.log('📝 Message submission blocked by deduplication logic');
        return null;
      }

      // Start submission tracking
      this.startMessageSubmission(messageHash);

      // Ensure the client knows about this conversation ID
      this.syncConversationId();

      console.log(`💾 Saving ${senderType} message to thread ${sessionIdNum} (original: ${this.currentSessionId})`);
      console.log('📡 Request details:', {
        url: `${this.baseUrl}/api/threads/${sessionIdNum}/send`,
        headers: this.getAuthHeaders(),
        body: {
          content: content.substring(0, 100) + '...',
          sender_type: senderType,
          agent_type: agentType || 'orchestrator',
          metadata: metadata
        }
      });

      const response = await fetch(`${this.baseUrl}/api/threads/${sessionIdNum}/send`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          content: content,
          sender_type: senderType,
          agent_type: agentType || 'orchestrator',
          metadata: {
            ...metadata,
            session_id: sessionIdNum, // Include session ID in metadata for tracking
            client_timestamp: new Date().toISOString(),
            client_version: '2.0.0'
          }
        })
      });

      console.log(`📡 Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        console.error('❌ Server error response:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const messageData = await response.json();
      console.log(`✅ Message saved to thread: ${messageData.message?.id}`);
      
      // If this is the first user message, generate and save a title
      if (senderType === 'user') {
        await this.handleFirstMessageTitle(content);
      }
      
      // Update sidebar with new message
      await this.updateConversationPreview(content, senderType);
      
      return messageData.message;
    } catch (error) {
      console.error('❌ Failed to save message:', error);
      
      // Provide user-friendly error messages based on the error type
      if (error.message.includes('Invalid session ID')) {
        console.error('Session ID issue detected - this may indicate a conversation creation problem');
      } else if (error.message.includes('Authentication')) {
        console.error('Authentication issue detected - user may need to refresh the page');
      } else if (error.message.includes('Access denied')) {
        console.error('Access denied to conversation - user may not have permission');
      }
      
      // Don't throw error here - allow conversation to continue even if persistence fails
      // but provide a fallback mechanism to create a new session if the current one is invalid
      if (error.message.includes('Invalid session ID') || error.message.includes('Access denied')) {
        console.log('🔄 Attempting to create new session due to invalid session...');
        try {
          await this.startNewConversation(agentType || 'orchestrator');
          console.log(`✅ Recovery session created: ${this.currentSessionId}`);
          // Retry saving the message with the new session
          return await this.saveMessage(content, senderType, agentType, metadata);
        } catch (recoveryError) {
          console.error('❌ Failed to create recovery session:', recoveryError);
        }
      }
      
      return null;
    } finally {
      // Always finish submission tracking
      this.finishMessageSubmission();
    }
  }
  /**
   * Load messages for a session using threads API
   */
  async loadMessages(sessionId = null) {
    try {
      const targetSessionId = sessionId || this.currentSessionId;
      if (!targetSessionId) {
        throw new Error('No session ID provided');
      }

      console.log(`📖 Loading messages for thread: ${targetSessionId}`);

      const response = await fetch(`${this.baseUrl}/api/threads/${targetSessionId}/messages`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Loaded ${data.messages?.length || 0} messages`);
      return data;
      
    } catch (error) {
      console.error('❌ Failed to load messages:', error);
      throw error;
    }
  }

  /**
   * Get all sessions for the user using threads API
   */
  async getSessions() {
    try {
      console.log('📋 Fetching user A2A sessions via threads API...');

      const response = await fetch(`${this.baseUrl}/api/threads`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Convert threads API format to sessions format for compatibility
      let sessions = [];
      if (data.success && data.data) {
        // Flatten bucketed conversations into a single array
        const buckets = data.data;
        sessions = [
          ...(buckets.pinned || []),
          ...(buckets.today || []),
          ...(buckets.yesterday || []),
          ...(buckets.last7Days || []),
          ...(buckets.older || [])
        ];
      }
      
      console.log(`✅ Retrieved ${sessions.length} sessions via threads API`);
      return { sessions }; // Return in expected format
      
    } catch (error) {
      console.error('❌ Failed to fetch sessions:', error);
      throw error;
    }
  }
  /**
   * Update session title using threads API
   */
  async updateSessionTitle(title, sessionId = null) {
    try {
      const targetSessionId = sessionId || this.currentSessionId;
      if (!targetSessionId) {
        throw new Error('No session ID provided');
      }

      console.log(`📝 Updating thread title: ${title}`);

      const response = await fetch(`${this.baseUrl}/api/threads/${targetSessionId}/title`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          title: title
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Thread title updated: ${title}`);      
      // Refresh sidebar to show updated title (debounced)
      const sidebar = this.getSidebar();
      if (sidebar && typeof sidebar.refresh === 'function') {
        sidebar.refresh(); // This will now be debounced
      }
      
      return data;
      
    } catch (error) {
      console.error('❌ Failed to update thread title:', error);
      throw error;
    }
  }

  /**
   * Switch to a different session
   */
  async switchSession(sessionId) {
    // Clear deduplication state when switching sessions
    this.clearMessageDeduplication();
    
    this.currentSessionId = sessionId;
    console.log(`🔄 Switched to session: ${sessionId}`);
    return this.loadMessages(sessionId);
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId() {
    return this.currentSessionId;
  }

  /**
   * Check if there's an active session
   */
  hasActiveSession() {
    return !!this.currentSessionId;
  }

  /**
   * Clear current session and reset deduplication state
   */
  clearSession() {
    this.currentSessionId = null;
    this.clearMessageDeduplication();
    console.log('🧹 Session cleared');
  }

  /**
   * Clear message deduplication state
   */
  clearMessageDeduplication() {
    this.messageDeduplication = {
      isSubmitting: false,
      pendingSubmissions: 0,
      lastSubmitTime: 0,
      lastMessageHash: null,
      minSubmitInterval: 1000,
      recentMessages: new Map(),
      maxRecentMessages: 50
    };
    console.log('🧹 Message deduplication state cleared');
  }

  /**
   * Start a new conversation session with the given agent
   */
  async startNewConversation(agentType = 'orchestrator', welcomeMessage = null) {
    try {
      // Create new session
      const session = await this.createSession(agentType);
      
      // Save welcome message if provided
      if (welcomeMessage) {
        await this.saveMessage(welcomeMessage, 'assistant', agentType);
      }

      return session;
      
    } catch (error) {
      console.error('❌ Failed to start new conversation:', error);
      throw error;
    }
  }
  /**
   * Auto-generate and save conversation title based on first user message
   */
  async generateAndSaveTitle(firstMessage) {
    try {
      if (!this.currentSessionId) return;
      if (!firstMessage || firstMessage.trim().length === 0) return;

      console.log('🔤 Generating AI title for first message...');

      // Use the AI summarization function from arzani-x.js if available
      let title;
      if (window.ArzaniHelpers && typeof window.ArzaniHelpers.summarizeFirstMessage === 'function') {
        try {
          title = await window.ArzaniHelpers.summarizeFirstMessage(firstMessage);
          console.log('✅ AI-generated title:', title);
        } catch (error) {
          console.warn('AI title generation failed, using fallback:', error);
          title = this.generateSimpleTitle(firstMessage);
        }
      } else {
        console.log('AI summarization not available, using simple title generation');
        title = this.generateSimpleTitle(firstMessage);
      }

      // Save the generated title
      await this.updateSessionTitle(title);
      return title;

    } catch (error) {
      console.error('❌ Failed to generate and save title:', error);
      return null;
    }
  }

  /**
   * Generate a simple title from the first message (fallback)
   */
  generateSimpleTitle(message) {
    if (!message) return 'New Conversation';
    
    // Clean up the message and create a title
    let title = message.replace(/[^\w\s-]/g, '').trim();
    
    // Truncate if too long
    if (title.length > 50) {
      title = title.substring(0, 47) + '...';
    }
    
    // Ensure it's not empty
    if (!title) {
      title = 'New Conversation';
    }
    
    return title;
  }

  /**
   * Handle first message title generation
   */
  async handleFirstMessageTitle(firstMessage) {
    try {
      if (!this.currentSessionId) return;
      
      // Check if conversation already has a custom title by counting messages
      const messages = await this.loadMessages();
      if (!messages || !messages.messages) return;
      
      // Count user messages to see if this is the first one
      const userMessages = messages.messages.filter(msg => msg.sender_type === 'user');
      
      if (userMessages.length === 1) {
        console.log('📝 This is the first user message, generating title...');
        await this.generateAndSaveTitle(firstMessage);
      }
      
    } catch (error) {
      console.error('❌ Failed to handle first message title:', error);
    }
  }

  /**
   * A2A-Specific Persistence Methods
   */
  /**
   * Create a new A2A task
   */
  async createA2ATask(taskData) {
    try {
      console.log(`📋 Creating A2A task: ${taskData.task_name}`);
      
      // Ensure we have a valid session
      const sessionValid = await this.ensureValidSession();
      if (!sessionValid) {
        console.warn('⚠️ Cannot create A2A task - no valid session');
        return null;
      }
      
      const response = await fetch(`${this.baseUrl}/api/a2a/tasks`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          session_id: this.currentSessionId,
          task_name: taskData.task_name,
          task_description: taskData.task_description,
          assigned_agent: taskData.assigned_agent,
          priority: taskData.priority || 'medium',
          metadata: taskData.metadata || {}
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ A2A task created: ${result.task.id}`);
      return result.task;
      
    } catch (error) {
      console.error('❌ Failed to create A2A task:', error);
      return null;
    }
  }

  /**
   * Get active A2A tasks
   */
  async getActiveTasks() {
    try {
      console.log('📋 Fetching active A2A tasks...');

      const response = await fetch(`${this.baseUrl}/api/a2a/tasks/active`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Retrieved ${data.tasks.length} active tasks`);
      return data.tasks;
      
    } catch (error) {
      console.error('❌ Failed to fetch active tasks:', error);
      return [];
    }
  }

  /**
   * Update A2A task status
   */
  async updateTaskStatus(taskId, status, result = null) {
    try {
      console.log(`📝 Updating A2A task ${taskId} status to: ${status}`);

      const response = await fetch(`${this.baseUrl}/api/a2a/tasks/${taskId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          status: status,
          completion_time: status === 'completed' ? new Date().toISOString() : null,
          result: result
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Task status updated`);
      return data.task;
      
    } catch (error) {
      console.error('❌ Failed to update task status:', error);
      return null;
    }
  }  /**
   * Record agent interaction
   */
  async recordAgentInteraction(interactionData) {
    try {
      // Skip recording if no session ID (prevents unnecessary errors)
      if (!this.currentSessionId) {
        console.log('🤝 Skipping agent interaction recording - no active session');
        return null;
      }

      // Validate that the session exists before trying to record an interaction
      const isValidSession = await this.validateCurrentSession();
      if (!isValidSession) {
        console.log('🤝 Skipping agent interaction recording - invalid session ID');
        return null;
      }

      console.log(`🤝 Recording agent interaction: ${interactionData.interaction_type}`);

      const response = await fetch(`${this.baseUrl}/api/a2a/interactions`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          session_id: this.currentSessionId,
          agent_name: interactionData.agent_name,
          interaction_type: interactionData.interaction_type,
          interaction_data: interactionData.interaction_data,
          response_time_ms: interactionData.response_time_ms,
          success: interactionData.success
        })
      });

      if (!response.ok) {
        let errorText;
        try {
          // Try to parse the error as JSON
          const errorData = await response.json();
          errorText = JSON.stringify(errorData);
          
          // Check for foreign key violation
          if (errorData.details && errorData.details.includes("violates foreign key constraint")) {
            console.log('🔄 Foreign key violation detected. Session may no longer exist.');
            this.currentSessionId = null; // Clear the invalid session ID
          }
        } catch (e) {
          // If not JSON, get as text
          errorText = await response.text();
        }
        
        console.warn(`⚠️ Failed to record agent interaction (${response.status}): ${errorText}`);
        // Don't throw error - just log it and continue
        return null;
      }

      const result = await response.json();
      console.log(`✅ Agent interaction recorded: ${result.interaction?.id || 'unknown'}`);
      return result.interaction;
      
    } catch (error) {
      console.warn('⚠️ Agent interaction recording failed (non-critical):', error.message);
      // Don't throw error - this is a non-critical feature
      return null;
    }
  }

  /**
   * Get recent agent interactions
   */
  async getRecentInteractions(limit = 10) {
    try {
      console.log('🤝 Fetching recent agent interactions...');

      const response = await fetch(`${this.baseUrl}/api/a2a/interactions/recent?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Retrieved ${data.interactions.length} recent interactions`);
      return data.interactions;
      
    } catch (error) {
      console.error('❌ Failed to fetch recent interactions:', error);
      return [];
    }
  }
  /**
   * Update session context
   */
  async updateSessionContext(contextData) {
    try {
      console.log('📊 Updating session context...');
      
      // Ensure we have a valid session
      const sessionValid = await this.ensureValidSession();
      if (!sessionValid) {
        console.warn('⚠️ Cannot update session context - no valid session');
        return null;
      }

      const response = await fetch(`${this.baseUrl}/api/a2a/session-context`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          session_id: this.currentSessionId,
          context_data: contextData,
          last_updated: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Session context updated`);
      return result.context;
      
    } catch (error) {
      console.error('❌ Failed to update session context:', error);
      return null;
    }
  }

  /**
   * Get session context
   */
  async getSessionContext() {
    try {
      console.log('📊 Fetching session context...');

      const response = await fetch(`${this.baseUrl}/api/a2a/session-context?session_id=${this.currentSessionId}`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Retrieved session context`);
      return data.context;
      
    } catch (error) {
      console.error('❌ Failed to fetch session context:', error);
      return null;
    }
  }
  /**
   * Record file upload
   */
  async recordFileUpload(fileData) {
    try {
      console.log(`📁 Recording file upload: ${fileData.file_name}`);
      
      // Ensure we have a valid session
      const sessionValid = await this.ensureValidSession();
      if (!sessionValid) {
        console.warn('⚠️ Cannot record file upload - no valid session');
        return null;
      }

      const response = await fetch(`${this.baseUrl}/api/a2a/file-uploads`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          session_id: this.currentSessionId,
          file_name: fileData.file_name,
          file_path: fileData.file_path,
          file_size: fileData.file_size,
          file_type: fileData.file_type,
          upload_purpose: fileData.upload_purpose,
          metadata: fileData.metadata || {}
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ File upload recorded: ${result.upload.id}`);
      return result.upload;
      
    } catch (error) {
      console.error('❌ Failed to record file upload:', error);
      return null;
    }
  }

  /**
   * Get file uploads for session
   */
  async getFileUploads() {
    try {
      console.log('📁 Fetching file uploads...');

      const response = await fetch(`${this.baseUrl}/api/a2a/file-uploads?session_id=${this.currentSessionId}`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Retrieved ${data.uploads.length} file uploads`);
      return data.uploads;
      
    } catch (error) {
      console.error('❌ Failed to fetch file uploads:', error);
      return [];
    }
  }
  /**
   * Record agent transition
   */
  async recordAgentTransition(transitionData) {
    try {
      console.log(`🔄 Recording agent transition: ${transitionData.from_agent} → ${transitionData.to_agent}`);
      
      // Ensure we have a valid session
      const sessionValid = await this.ensureValidSession();
      if (!sessionValid) {
        console.warn('⚠️ Cannot record agent transition - no valid session');
        return null;
      }

      const response = await fetch(`${this.baseUrl}/api/a2a/agent-transitions`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          session_id: this.currentSessionId,
          from_agent: transitionData.from_agent,
          to_agent: transitionData.to_agent,
          transition_reason: transitionData.transition_reason,
          context_data: transitionData.context_data || {}
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Agent transition recorded: ${result.transition.id}`);
      return result.transition;
      
    } catch (error) {
      console.error('❌ Failed to record agent transition:', error);
      return null;
    }  }
  
  /**
   * Get the available sidebar instance (either modernSidebar or arzaniModernSidebar)
   */  getSidebar() {
    // Prioritize arzaniModernSidebar over modernSidebar since that's the correct instance
    const sidebar = window.arzaniModernSidebar || window.modernSidebar;
    // Verify it's actually a proper sidebar instance
    if (sidebar && (typeof sidebar.setArzaniClient === 'function' || sidebar.constructor?.name === 'ArzaniModernSidebar' || sidebar.constructor?.name === 'ModernSidebar')) {
      return sidebar;
    }
    return null;
  }

  /**
   * SIDEBAR INTEGRATION METHODS
   * These methods integrate with the enhanced ArzaniModernSidebar
   */  /**
   * Update conversation preview in sidebar after new message
   */
  async updateConversationPreview(messageContent, messageType = 'assistant') {
    try {
      if (!this.currentSessionId) return;

      // Get sidebar instance
      const sidebar = this.getSidebar();
      if (!sidebar) {
        console.log('📱 No sidebar instance found');
        return;
      }

      // Update the conversation preview if method exists
      if (typeof sidebar.updateConversationPreview === 'function') {
        await sidebar.updateConversationPreview(
          this.currentSessionId, 
          messageContent, 
          messageType
        );      }

      // Note: No immediate refresh needed here - the debounced refresh system
      // will handle updates automatically when needed
      console.log('✅ Conversation preview updated in sidebar (refresh will be handled by debounce system)');
    } catch (error) {
      console.error('❌ Failed to update conversation preview:', error);
    }
  }

  /**
   * Generate and update conversation title from first user message
   */
  async generateConversationTitle(firstMessage) {
    try {
      if (!this.currentSessionId) return;

      // Generate title using AI if sidebar method is available
      const sidebar = this.getSidebar();
      if (sidebar && typeof sidebar.autoGenerateConversationTitle === 'function') {
        await sidebar.autoGenerateConversationTitle(
          this.currentSessionId,
          firstMessage
        );
      } else {
        // Fallback to simple title generation
        await this.generateAndSaveTitle(firstMessage);
      }

      console.log('✅ Conversation title generated and updated');
    } catch (error) {
      console.error('❌ Failed to generate conversation title:', error);
    }
  }
  /**
   * Sync with main chat input when conversation is selected
   */
  async syncWithMainChat(conversationId) {
    try {
      // Load conversation and sync with main chat
      const sidebar = this.getSidebar();
      if (sidebar && typeof sidebar.syncConversationWithMainChat === 'function') {
        await sidebar.syncConversationWithMainChat(conversationId);
      }

      console.log(`✅ Synced conversation ${conversationId} with main chat`);
    } catch (error) {
      console.error('❌ Failed to sync with main chat:', error);
    }
  }
  /**
   * Handle new message event for real-time sidebar updates
   */  async onNewMessage(messageContent, messageType, agentName = null) {
    try {
      if (!this.currentSessionId) return;

      // NOTE: Do NOT save message here - it's already saved by the caller
      // This method is only for UI updates and sidebar integration
      
      // Update sidebar preview (but don't trigger immediate refresh)
      await this.updateConversationPreview(messageContent, messageType);

      // If this is the first user message, generate title
      if (messageType === 'user') {
        const messages = await this.loadMessages(this.currentSessionId);
        const userMessages = messages.messages.filter(m => m.sender_type === 'user');
        
        if (userMessages.length === 1) {
          await this.generateConversationTitle(messageContent);
        }
      }      // Update sidebar WITHOUT triggering full refresh to avoid UI clearing
      const sidebar = this.getSidebar();
      if (sidebar && typeof sidebar.onNewMessage === 'function') {
        // Use the more targeted onNewMessage method instead of full refresh
        await sidebar.onNewMessage(
          this.currentSessionId, 
          messageContent, 
          messageType
        );
        
        // NO immediate sidebar refresh - let it update naturally
        // Sidebar will refresh itself after conversations are properly persisted
      }

      console.log('✅ New message handled with sidebar integration (no immediate refresh)');
    } catch (error) {
      console.error('❌ Failed to handle new message:', error);
    }
  }

  /**
   * Setup real-time updates for sidebar synchronization
   */  setupRealTimeUpdates() {
    try {
      const sidebar = this.getSidebar();
      if (sidebar && typeof sidebar.setupRealTimeUpdates === 'function') {
        // Setup periodic refresh
        sidebar.setupRealTimeUpdates();
      }

      console.log('✅ Real-time updates setup for sidebar');
    } catch (error) {
      console.error('❌ Failed to setup real-time updates:', error);
    }
  }

  /**
   * Clear main chat input and prepare for new conversation
   */
  clearMainChatInput() {
    try {
      const sidebar = this.getSidebar();
      if (sidebar && typeof sidebar.clearMainChatInput === 'function') {
        sidebar.clearMainChatInput();
      }

      console.log('✅ Main chat input cleared');
    } catch (error) {
      console.error('❌ Failed to clear main chat input:', error);
    }
  }  /**
   * Update active conversation UI indicators
   */
  updateActiveConversationUI(conversationId) {
    try {
      const sidebar = this.getSidebar();
      if (sidebar && typeof sidebar.updateActiveConversationUI === 'function') {
        sidebar.updateActiveConversationUI(conversationId);
      }

      console.log(`✅ Active conversation UI updated for ${conversationId}`);
    } catch (error) {
      console.error('❌ Failed to update active conversation UI:', error);
    }
  }
  /**
   * Ensure a valid session exists before performing operations
   * @returns {Promise<boolean>} Whether a valid session exists or was created
   */
  async ensureValidSession(agentType = 'orchestrator') {
    try {
      // Use a mutex to prevent concurrent session creation
      if (this._creatingSession) {
        console.log('⚠️ Session creation already in progress, waiting...');
        // Wait for existing creation to complete
        let retries = 0;
        while (this._creatingSession && retries < 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }
        
        // After waiting, check if a session was created
        if (this.currentSessionId) {
          console.log(`✅ Using existing session created by another request: ${this.currentSessionId}`);
          return true;
        }
      }
      
      // Set mutex
      this._creatingSession = true;
      
      try {
        // If there's no session at all, create one
        if (!this.currentSessionId) {
          console.log('📝 No active session found. Creating a new session automatically...');
          try {
            await this.startNewConversation(agentType);
            console.log(`✅ New session created automatically: ${this.currentSessionId}`);
            
            // Store session ID in window context for better integration
            if (window.arzaniClient) {
              window.arzaniClient.currentConversationId = this.currentSessionId;
            }
            
            return true;
          } catch (sessionError) {
            console.error('❌ Failed to create a new session:', sessionError);
            return false;
          }
        }
        
        // If there is a session, validate it
        const isValidSession = await this.validateCurrentSession();
        if (!isValidSession) {
          console.log('🔄 Current session invalid, creating new session...');
          try {
            await this.startNewConversation(agentType);
            console.log(`✅ New session created automatically: ${this.currentSessionId}`);
            
            // Store session ID in window context for better integration
            if (window.arzaniClient) {
              window.arzaniClient.currentConversationId = this.currentSessionId;
            }
            
            return true;
          } catch (sessionError) {
            console.error('❌ Failed to create a new session:', sessionError);
            return false;
          }
        }
        
        // Session exists and is valid
        return true;
      } finally {
        // Release mutex
        this._creatingSession = false;
      }
    } catch (error) {
      console.error('❌ Error ensuring valid session:', error);
      this._creatingSession = false;
      return false;
    }
  }

  /**
   * Get agent transitions for session
   */
  async getAgentTransitions() {
    try {
      console.log('🔄 Fetching agent transitions...');

      const response = await fetch(`${this.baseUrl}/api/a2a/agent-transitions?session_id=${this.currentSessionId}`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Retrieved ${data.transitions.length} agent transitions`);
      return data.transitions;
      
    } catch (error) {
      console.error('❌ Failed to fetch agent transitions:', error);
      return [];
    }
  }
  /**
   * Cache A2A data
   */
  async cacheData(cacheKey, cacheData, ttl = 3600) {
    try {
      console.log(`💾 Caching A2A data with key: ${cacheKey}`);
      
      // Ensure we have a valid session
      const sessionValid = await this.ensureValidSession();
      if (!sessionValid) {
        console.warn('⚠️ Cannot cache data - no valid session');
        return null;
      }

      const response = await fetch(`${this.baseUrl}/api/a2a/cache`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          session_id: this.currentSessionId,
          cache_key: cacheKey,
          cache_data: cacheData,
          ttl_seconds: ttl
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Data cached successfully`);
      return result.cache;
      
    } catch (error) {
      console.error('❌ Failed to cache data:', error);
      return null;
    }
  }

  /**
   * Clear cache entry
   */
  async clearCache(cacheKey) {
    try {
      console.log(`🗑️ Clearing cache entry: ${cacheKey}`);

      const response = await fetch(`${this.baseUrl}/api/a2a/cache/${encodeURIComponent(cacheKey)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      console.log(`✅ Cache entry cleared`);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
      return false;
    }
  }

  /**
   * Save A2A message using threads API
   */
  async saveA2AMessage(sessionId, messageData) {
    try {
      console.log(`💬 Saving A2A message for session: ${sessionId} via threads API`);

      const response = await fetch(`${this.baseUrl}/api/threads/${sessionId}/send`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          content: messageData.message_content || messageData.content,
          sender_type: messageData.sender_type || 'user',
          agent_type: messageData.agent_type || 'orchestrator',
          message_id: messageData.message_id,
          metadata: messageData.metadata || {}
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ A2A message saved via threads API: ${result.data?.message?.id}`);
      return result.data?.message || result;
      
    } catch (error) {
      console.error('❌ Failed to save A2A message via threads API:', error);
      return null;
    }
  }

  /**
   * Get messages for a chat session (using threads.js API)
   */
  async getA2AMessages(sessionId) {
    try {
      console.log(`💬 Fetching chat messages for session: ${sessionId}`);

      const response = await fetch(`${this.baseUrl}/api/threads/${sessionId}/messages`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const messages = data.data?.messages || data.messages || [];
      console.log(`✅ Retrieved ${messages.length} chat messages`);
      return messages;
      
    } catch (error) {
      console.error('❌ Failed to fetch chat messages:', error);
      return [];
    }
  }  /**
   * Update an existing message in the database
   */
  async updateMessage(messageId, newContent, sessionId) {
    try {
      // Use provided sessionId or fallback to currentSessionId
      const targetSessionId = sessionId || this.currentSessionId;
      if (!targetSessionId) {
        throw new Error('No session ID available for message update.');
      }
      const response = await fetch(`${this.baseUrl}/api/threads/messages/${encodeURIComponent(messageId)}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          content: newContent,
          session_id: targetSessionId
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      return {
        success: true,
        data: data.message || {
          id: messageId,
          content: newContent,
          updated_at: new Date().toISOString(),
          is_edited: true,
          session_id: targetSessionId
        }
      };
    } catch (error) {
      console.error('❌ Error updating message:', error);
      throw error;
    }
  }

  /**
   * Resend a message (with the same messageId for idempotency)
   */
  async resendMessage(threadId, messageId, content, senderType = 'user', agentType = null, metadata = {}) {
    try {
      if (!threadId) throw new Error('No thread ID provided for resending message.');
      const response = await fetch(`${this.baseUrl}/api/threads/${encodeURIComponent(threadId)}/send`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          content,
          sender_type: senderType,
          agent_type: agentType,
          message_id: messageId,
          metadata
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      return data.message;
    } catch (error) {
      console.error('❌ Error resending message:', error);
      throw error;
    }
  }

  /**
   * Delete a message from the database
   */  async deleteMessage(messageId) {
    try {
      if (!this.currentSessionId) {
        throw new Error('No active session');
      }

      console.log(`🗑️ Message deletion via API has been disabled. Updating UI only.`);
      
      // Simply return success since the API has been removed
      return {
        success: true,
        data: {
          id: messageId,
          deleted_at: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Error deleting message:', error);
      throw error;
    }
  }
  
  /**
   * Find message ID by content - helps recover database message IDs when missing
   * @param {string} content - The message content to search for
   * @returns {Promise<string|null>} - The message ID if found, null otherwise
   */
  async findMessageIdByContent(content) {
    try {
      // First try to find in current session
      const sessionId = this.currentSessionId;
      if (!sessionId) {
        console.warn('⚠️ No current session to search for message');
        return null;
      }

      console.log(`🔍 Searching for message by content in session ${sessionId}`);
      
      // Load all messages for the current session
      const messagesData = await this.loadMessages(sessionId);
      if (!messagesData || !messagesData.messages || !Array.isArray(messagesData.messages)) {
        console.warn('⚠️ No messages found in current session');
        return null;
      }
      
      // Normalize the content by trimming whitespace
      const normalizedContent = content.trim();
      
      // Search for message with matching content
      // First try exact match with both content and message_content fields
      for (const message of messagesData.messages) {
        const messageContent = message.content || message.message_content || '';
        if (messageContent.trim() === normalizedContent) {
          console.log(`✅ Found exact match for message: ${message.id}`);
          return message.id;
        }
      }
      
      // If no exact match, try a fuzzy match (ignoring whitespace differences)
      for (const message of messagesData.messages) {
        const messageContent = message.content || message.message_content || '';
        // Remove all whitespace for comparison
        const strippedMessageContent = messageContent.replace(/\s+/g, '');
        const strippedSearchContent = normalizedContent.replace(/\s+/g, '');
        
        if (strippedMessageContent === strippedSearchContent) {
          console.log(`✅ Found fuzzy match for message: ${message.id}`);
          return message.id;
        }
      }
      
      // If still no match, look for partial content match (if the message is long)
      if (normalizedContent.length > 50) {
        for (const message of messagesData.messages) {
          const messageContent = message.content || message.message_content || '';
          // Check if at least 80% of the content matches
          if (messageContent.includes(normalizedContent.substring(0, Math.floor(normalizedContent.length * 0.8)))) {
            console.log(`✅ Found partial match for message: ${message.id}`);
            return message.id;
          }
        }
      }
      
      console.warn(`⚠️ No matching message found for content: "${normalizedContent.substring(0, 30)}..."`);
      return null;
    } catch (error) {
      console.error('❌ Error finding message by content:', error);
      return null;
    }
  }
  /**
   * Regenerate AI response from a specific message point
   */
  async regenerateFromMessage(messageId, newContent) {
    try {
      if (!this.currentSessionId) {
        throw new Error('No active session');
      }

      console.log(`🔄 Regenerating AI response from message ${messageId}...`);
      
      // Get the main A2A client to regenerate response
      if (window.arzaniClient && typeof window.arzaniClient.regenerateResponse === 'function') {
        await window.arzaniClient.regenerateResponse(messageId, newContent);
      } else {
        console.warn('A2A client not available for regeneration, falling back to simple resend');
        // Fallback: just resend the message
        if (window.arzaniClient && typeof window.arzaniClient.handleUnifiedMessage === 'function') {
          await window.arzaniClient.handleUnifiedMessage(newContent, 'edit_regenerate');
        } else {
          console.error('No fallback method available for regeneration');
        }
      }
      
    } catch (error) {
      console.error('❌ Error regenerating response:', error);
      throw error;
    }
  }

  /**
   * Validate if the current session ID exists in the database
   */  async validateCurrentSession() {
    if (!this.currentSessionId) {
      return false;
    }

    try {
      // Use the authToken from the instance or try to get it from window.ArzaniHelpers
      const token = this.authToken || window.ArzaniHelpers?.getAuthToken() || 
                    localStorage.getItem('token') || 
                    document.querySelector('meta[name="auth-token"]')?.content;
                    
      if (!token) {
        console.warn('⚠️ No auth token available for session validation');
        return false;
      }

      const response = await fetch(`${this.baseUrl}/api/threads/${this.currentSessionId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (response.status === 404) {
        console.warn(`⚠️ Session ${this.currentSessionId} no longer exists in database`);
        this.currentSessionId = null;
        return false;
      }

      if (!response.ok) {
        console.warn(`⚠️ Session validation failed with status ${response.status}`);
        return false;
      }

      const sessionData = await response.json();
      console.log(`✅ Session ${this.currentSessionId} validated successfully`);
      return true;

    } catch (error) {
      console.error('❌ Error validating session:', error);
      this.currentSessionId = null;
      return false;
    }
  }
}

// Legacy function for backward compatibility
async function saveMessageToDatabase(conversationId, content, senderType, agentType = 'orchestrator') {
  try {
    const token = window.ArzaniHelpers?.getAuthToken() || 
                  localStorage.getItem('token') || 
                  document.querySelector('meta[name="auth-token"]')?.content;

    if (!token) {
      console.warn('No authentication token available for saving message');
      return null;
    }

    if (!conversationId) {
      console.warn('No conversation ID available for saving message');
      return null;
    }

    const messageData = {
      content: content,
      sender_type: senderType,
      agent_type: agentType || 'orchestrator',
      metadata: {
        timestamp: new Date().toISOString(),
        ui_version: 'arzani-x'
      }
    };

    const response = await fetch(`/api/threads/${conversationId}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(messageData)
    });

    if (!response.ok) {
      throw new Error(`Failed to save message: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Message saved to chat session:', result.message?.id);
    return result.message;

  } catch (error) {
    console.error('❌ Failed to save message to database:', error);
    throw error;
  }
}

// Function to extend ArzaniA2AClient with persistence
function setupMessagePersistence() {
  // Wait for the ArzaniA2AClient to be available
  const checkForClient = () => {
    if (window.arzaniClient) {
      console.log('Setting up message persistence for ArzaniA2AClient');
      
      // Store original methods
      const originalAddMessage = window.arzaniClient.addMessage;
      const originalAddConversationMessage = window.arzaniClient.addConversationMessage;
      
      // Add conversation persistence setup method
      window.arzaniClient.setupConversationPersistence = function(conversationId) {
        console.log('Setting up persistence for conversation:', conversationId);
        this.currentConversationId = conversationId;
        this.messagePersistenceEnabled = true;
      };      // Override addMessage to include persistence
      // DISABLED: This was causing duplicate message saves
      // Message persistence is now handled directly by the main client
      /*
      window.arzaniClient.addMessage = function(content, sender, isLoading = false) {
        // Call original method
        const messageId = originalAddMessage.call(this, content, sender, isLoading);
        
        // Save to database if not loading and persistence is enabled
        if (!isLoading && this.messagePersistenceEnabled && this.currentConversationId) {
          saveMessageToDatabase(this.currentConversationId, content, sender, this.selectedAgent);
        }
        
        return messageId;
      };
      */// Override addConversationMessage to include persistence
      // REMOVED: This override was causing race conditions and message disappearing
      // Message persistence is now handled directly in the main client to avoid timing issues      // Add method to clear current conversation
      window.arzaniClient.clearCurrentConversation = function() {
        console.log('Clearing current conversation');
        try {
          this.currentConversationId = null;
          this.messagePersistenceEnabled = false;
          
          // Clear the messages container
          if (window.ArzaniHelpers?.clearMessagesContainer) {
            window.ArzaniHelpers.clearMessagesContainer();
          } else {
            // Fallback if ArzaniHelpers is not available
            const messagesContainer = document.getElementById('messagesContainer');
            if (messagesContainer) {
              messagesContainer.innerHTML = '';
            }
          }
        } catch (error) {
          console.error('Error in clearCurrentConversation:', error);
        }
      };
      
      // Add method to show welcome message
      window.arzaniClient.showWelcomeMessage = function() {
        console.log('Showing welcome message');
        try {
          if (window.ArzaniHelpers?.clearMessagesContainer) {
            window.ArzaniHelpers.clearMessagesContainer();
          } else {
            // Fallback if ArzaniHelpers is not available
            const messagesContainer = document.getElementById('messagesContainer');
            if (messagesContainer) {
              messagesContainer.innerHTML = '';
            }
          }
        } catch (error) {
          console.error('Error in showWelcomeMessage:', error);
        }
      };// Override handleUserMessage to create conversation if needed
      // DISABLED: This was causing duplicate conversation creation with sendToA2A()
      // Conversation creation is now handled centrally in sendToA2A() to avoid race conditions
      /*
      const originalHandleUserMessage = window.arzaniClient.handleUserMessage;
      window.arzaniClient.handleUserMessage = async function() {
        try {          
          // If no conversation exists, create one BEFORE processing the message
          if (!this.currentConversationId) {
            console.log('Creating new conversation for user message');
            // Use the main client's createNewChat method instead of the helper function
            // to avoid race conditions and ensure proper mutex handling
            if (this.createNewChat && typeof this.createNewChat === 'function') {
              await this.createNewChat();
            } else {
              console.warn('createNewChat method not available on client');
            }
          }          // Call original method
          const result = await originalHandleUserMessage.call(this);
          
          // Update sidebar AFTER message processing is complete
          const sidebar = window.modernSidebar || window.arzaniModernSidebar;
          if (this.currentConversationId && sidebar) {
            // Use setTimeout to defer sidebar update until after UI updates are complete
            setTimeout(() => {
              if (typeof sidebar.cache?.clear === 'function') {
                sidebar.cache.clear(); // Clear cache to get fresh data
              }
              if (typeof sidebar.loadConversations === 'function') {
                sidebar.loadConversations(); // Reload conversations
              }
            }, 1000); // 1 second delay to ensure persistence is complete
          }
          
          return result;
          
        } catch (error) {
          console.error('Error in enhanced handleUserMessage:', error);
          // Fall back to original method only if we haven't called it yet
          throw error; // Re-throw the error instead of calling the original method again
        }
      };
      */

      console.log('Message persistence setup complete');
    } else {
      // Try again in a short while
      setTimeout(checkForClient, 100);
    }
  };

  // Start checking for the client
  checkForClient();
}

// Function to ensure sidebar reflects current conversation
function syncSidebarWithConversation() {
  console.log('📱 Starting sidebar synchronization...');
  let retryCount = 0;
  const maxRetries = 20; // Reduced from 50 to prevent excessive retries
    const checkForSync = () => {
    retryCount++;
    
    // Prioritize arzaniModernSidebar over modernSidebar since that's the correct instance
    const sidebar = window.arzaniModernSidebar || window.modernSidebar;
    
    if (sidebar && window.arzaniClient) {      // Debug: Log what type of sidebar we found
      console.log(`🔍 Sidebar sync attempt ${retryCount}/${maxRetries} - Found:`, {
        source: window.arzaniModernSidebar ? 'arzaniModernSidebar' : 'modernSidebar',
        hasSetArzaniClient: typeof sidebar.setArzaniClient === 'function',
        constructorName: sidebar.constructor?.name,
        availableMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(sidebar)).filter(name => typeof sidebar[name] === 'function')
      });
        // Verify that the sidebar has the setArzaniClient method (indicating it's an ArzaniModernSidebar)
      const hasSetArzaniClient = typeof sidebar.setArzaniClient === 'function';
      const isCorrectType = sidebar.constructor && (sidebar.constructor.name === 'ArzaniModernSidebar' || sidebar.constructor.name === 'ModernSidebar');
      
      if (hasSetArzaniClient || isCorrectType) {
        // Connect sidebar to client if method exists
        if (hasSetArzaniClient) {
          sidebar.setArzaniClient(window.arzaniClient);
        }
        
        // Add method to sync current conversation
        window.arzaniClient.syncWithSidebar = function() {
          if (this.currentConversationId && sidebar) {
            sidebar.currentConversationId = this.currentConversationId;
            if (typeof sidebar.refresh === 'function') {
              sidebar.refresh();
            }
          }
        };
        
        console.log('✅ Sidebar synchronization setup complete for', sidebar.constructor.name);
        return; // Exit successfully
      } else {
        if (retryCount < maxRetries) {          console.warn(`⚠️ Sidebar found but not recognized as ArzaniModernSidebar (constructor: ${sidebar.constructor?.name}, hasSetArzaniClient: ${hasSetArzaniClient}), retrying... (${retryCount}/${maxRetries})`);
          setTimeout(checkForSync, 300); // Slightly longer delay
        } else {
          console.error('❌ Failed to find valid ArzaniModernSidebar after', maxRetries, 'attempts. Sidebar sync disabled.');
          console.error('Final sidebar state:', {
            exists: !!sidebar,
            constructor: sidebar?.constructor?.name,
            hasSetArzaniClient: typeof sidebar?.setArzaniClient === 'function',
            methods: sidebar ? Object.getOwnPropertyNames(Object.getPrototypeOf(sidebar)).filter(name => typeof sidebar[name] === 'function') : []
          });
          return; // Stop retrying
        }
      }    } else {
      if (retryCount < maxRetries) {
        console.log(`🔄 Waiting for sidebar and client... (${retryCount}/${maxRetries})`);
        setTimeout(checkForSync, 100);
      } else {
        console.error('❌ Failed to find sidebar and client after', maxRetries, 'attempts. Sidebar sync disabled.');
        return; // Stop retrying
      }
    }
  };
  
  checkForSync();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setupMessagePersistence();
    syncSidebarWithConversation();
  });
} else {
  setupMessagePersistence();
  syncSidebarWithConversation();
}

// Make it globally available
window.ArzaniPersistenceManager = ArzaniPersistenceManager;

// Auto-initialize if not already done
if (!window.arzaniPersistence) {
  window.arzaniPersistence = new ArzaniPersistenceManager();
  console.log('✅ Arzani Persistence Manager initialized');
}

// Export functions for testing
if (typeof window !== 'undefined') {
  window.ArzaniPersistence = {
    saveMessageToDatabase,
    setupMessagePersistence,
    syncSidebarWithConversation
  };
}
