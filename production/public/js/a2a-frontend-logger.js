/**
 * A2A Frontend Logger
 * Client-side utility for logging user interactions and agent delegations
 */

class A2AFrontendLogger {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.taskId = this.generateTaskId();
    this.currentAgent = 'orchestrator';
    this.userId = this.getUserId();
    this.interactions = [];
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  generateTaskId() {
    return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getUserId() {
    // Try to get user ID from various sources
    const metaUserId = document.querySelector('meta[name="user-id"]')?.content;
    if (metaUserId) return parseInt(metaUserId);
    
    const localUserId = localStorage.getItem('userId');
    if (localUserId) return parseInt(localUserId);
    
    // Fallback for testing
    return 1;
  }

  getAuthToken() {
    const metaToken = document.querySelector('meta[name="auth-token"]')?.content;
    if (metaToken) return metaToken;
    
    const localToken = localStorage.getItem('token');
    if (localToken) return localToken;
    
    const cookieToken = this.getCookie('token');
    if (cookieToken) return cookieToken;
    
    return null;
  }

  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  /**
   * Log user interaction (message send, button click, etc.)
   */
  async logUserInteraction(interactionType, details = {}) {
    try {
      const interaction = {
        userId: this.userId,
        sessionId: this.sessionId,
        interactionType,
        timestamp: new Date().toISOString(),
        currentAgent: this.currentAgent,
        details
      };

      this.interactions.push(interaction);

      // Send to backend A2A logging endpoint
      await this.sendToBackend('/api/a2a/log-interaction', {
        userId: this.userId,
        taskId: `frontend_${this.sessionId}`,
        interactionId: `frontend_${Date.now()}`,
        interactionType: `user_${interactionType}`,
        fromAgent: 'frontend',
        toAgent: this.currentAgent,
        success: true,
        contextPassed: {
          sessionId: this.sessionId,
          userInteraction: true,
          ...details
        },
        outcome: `user_${interactionType}_logged`
      });

      console.log('📊 A2A User Interaction Logged:', interactionType, details);
    } catch (error) {
      console.warn('⚠️ Failed to log user interaction:', error);
    }
  }

  /**
   * Log agent delegation/transition
   */
  async logAgentTransition(fromAgent, toAgent, reason, context = {}) {
    try {
      const transition = {
        userId: this.userId,
        sessionId: this.sessionId,
        fromAgent,
        toAgent,
        reason,
        timestamp: new Date().toISOString(),
        context
      };

      this.interactions.push(transition);
      this.currentAgent = toAgent;

      // Send to backend A2A logging endpoint
      await this.sendToBackend('/api/a2a/log-transition', {
        userId: this.userId,
        sessionId: this.sessionId,
        fromAgent,
        toAgent,
        transitionType: 'delegation',
        reason,
        success: true,
        contextPassed: {
          sessionId: this.sessionId,
          userInitiated: true,
          ...context
        }
      });

      console.log('🔄 A2A Agent Transition Logged:', fromAgent, '->', toAgent, reason);
    } catch (error) {
      console.warn('⚠️ Failed to log agent transition:', error);
    }
  }

  /**
   * Log file upload interaction
   */
  async logFileUpload(fileName, fileType, fileSize, uploadContext = {}) {
    try {
      await this.sendToBackend('/api/a2a/log-file-upload', {
        userId: this.userId,
        sessionId: this.sessionId,
        fileName,
        fileType,
        fileSize,
        uploadContext: {
          sessionId: this.sessionId,
          currentAgent: this.currentAgent,
          ...uploadContext
        }
      });

      console.log('📎 A2A File Upload Logged:', fileName, fileType, fileSize);
    } catch (error) {
      console.warn('⚠️ Failed to log file upload:', error);
    }
  }  /**
   * Log message being sent - disabled for threads API integration
   * Messages are now logged directly by the threads API
   */
  async logMessage(content, messageType = 'user', metadata = {}) {
    try {
      // NOTE: Logging is now handled by threads API automatically
      // No need for separate message logging to avoid foreign key constraints
      console.log('💬 Message logged via threads API:', messageType, content.substring(0, 50) + '...');
    } catch (error) {
      console.warn('⚠️ Failed to log message:', error);
    }
  }
  /**
   * Send data to backend A2A logging endpoint
   */
  async sendToBackend(endpoint, data) {
    try {
      const token = this.getAuthToken();
      
      // Skip sending if no auth token available - logging should not fail the application
      if (!token) {
        console.warn('⚠️ A2A logging skipped: No authentication token available');
        return { success: false, skipped: true };
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        // Don't throw for 401/403 errors - just log and continue
        if (response.status === 401 || response.status === 403) {
          console.warn(`⚠️ A2A logging auth failed: ${response.status}`);
          return { success: false, authError: true };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('⚠️ Backend A2A logging failed:', error);
      // Don't throw - logging should be non-blocking
      return { success: false, error: error.message };
    }
  }

  /**
   * Get interaction statistics
   */
  getStats() {
    return {
      totalInteractions: this.interactions.length,
      sessionId: this.sessionId,
      currentAgent: this.currentAgent,
      userId: this.userId,
      sessionDuration: Date.now() - parseInt(this.sessionId.split('_')[1])
    };
  }

  /**
   * Track page navigation
   */
  async logPageNavigation(fromPage, toPage) {
    await this.logUserInteraction('page_navigation', {
      fromPage,
      toPage,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track conversation creation
   */
  async logConversationCreation(conversationId, agentType) {
    await this.logUserInteraction('conversation_creation', {
      conversationId,
      agentType,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track conversation switching
   */
  async logConversationSwitch(fromConversationId, toConversationId) {
    await this.logUserInteraction('conversation_switch', {
      fromConversationId,
      toConversationId,
      timestamp: new Date().toISOString()
    });
  }
}

// Global instance
window.a2aFrontendLogger = new A2AFrontendLogger();

// Auto-log page load
window.addEventListener('load', () => {
  window.a2aFrontendLogger.logUserInteraction('page_load', {
    page: window.location.pathname,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  });
});

// Auto-log page unload
window.addEventListener('beforeunload', () => {
  window.a2aFrontendLogger.logUserInteraction('page_unload', {
    page: window.location.pathname,
    sessionStats: window.a2aFrontendLogger.getStats(),
    timestamp: new Date().toISOString()
  });
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = A2AFrontendLogger;
}
