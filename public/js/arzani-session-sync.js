/**
 * Conversation Session Synchronizer
 * A helper utility to ensure that conversation IDs are consistent across components
 * and prevent the issue of user messages and AI responses being stored in different conversations.
 */

// Global session tracker for debugging
window._arzaniSessionTracker = {
  activeSessions: new Map(),
  trackSession: function(sessionId, source) {
    this.activeSessions.set(sessionId, {
      timestamp: new Date().toISOString(),
      source: source,
      lastAccessed: new Date().toISOString()
    });
    console.log(`🔍 Session tracked: ${sessionId} from ${source}`);
    return sessionId;
  },
  getActiveSession: function() {
    // Find most recently accessed session
    let latestSession = null;
    let latestTime = null;
    
    this.activeSessions.forEach((info, sessionId) => {
      const accessTime = new Date(info.lastAccessed).getTime();
      if (!latestTime || accessTime > latestTime) {
        latestTime = accessTime;
        latestSession = sessionId;
      }
    });
    
    return latestSession;
  },
  updateAccessTime: function(sessionId) {
    if (this.activeSessions.has(sessionId)) {
      const info = this.activeSessions.get(sessionId);
      info.lastAccessed = new Date().toISOString();
      this.activeSessions.set(sessionId, info);
    }
  },
  logSessionStatus: function() {
    console.log('📋 Active Sessions:');
    this.activeSessions.forEach((info, sessionId) => {
      console.log(`  - ${sessionId} (${info.source}): Last accessed ${info.lastAccessed}`);
    });
    
    // Also log component session IDs
    console.log('📋 Component Session IDs:');
    if (window.arzaniClient) {
      console.log(`  - Client: ${window.arzaniClient.currentConversationId || 'none'}`);
    }
    if (window.arzaniPersistence) {
      console.log(`  - Persistence: ${window.arzaniPersistence.currentSessionId || 'none'}`);
    }
    if (window.arzaniModernSidebar) {
      console.log(`  - Sidebar: ${window.arzaniModernSidebar.currentConversationId || 'none'}`);
    }
  }
};

/**
 * Synchronize session IDs across all components to prevent mismatches
 */
function synchronizeSessionIds() {
  try {
    // First collect all active session IDs from components
    const sessions = {
      client: window.arzaniClient?.currentConversationId,
      persistence: window.arzaniPersistence?.currentSessionId,
      sidebar: window.arzaniModernSidebar?.currentConversationId
    };
    
    console.log('🔄 Starting session synchronization:', sessions);
    
    // Find the most reliable session ID (prioritize persistence manager > client > sidebar)
    let primarySessionId = sessions.persistence || sessions.client || sessions.sidebar;
    
    // If no session ID found, check the session tracker
    if (!primarySessionId) {
      primarySessionId = window._arzaniSessionTracker.getActiveSession();
      console.log(`⚠️ No active session in components, using tracked session: ${primarySessionId}`);
    }
    
    // If still no session, we can't synchronize
    if (!primarySessionId) {
      console.warn('⚠️ No active session ID found in any component, cannot synchronize');
      return false;
    }
    
    console.log(`🔑 Using primary session ID: ${primarySessionId}`);
    
    // Update session tracker
    window._arzaniSessionTracker.trackSession(primarySessionId, 'synchronizer');
    window._arzaniSessionTracker.updateAccessTime(primarySessionId);
    
    // Synchronize to persistence manager
    if (window.arzaniPersistence) {
      if (window.arzaniPersistence.currentSessionId !== primarySessionId) {
        console.log(`🔄 Updating persistence manager session ID to: ${primarySessionId}`);
        window.arzaniPersistence.currentSessionId = primarySessionId;
        
        // Also try to switch session if method exists
        if (typeof window.arzaniPersistence.switchSession === 'function') {
          window.arzaniPersistence.switchSession(primarySessionId)
            .catch(err => console.error('❌ Error switching persistence session:', err));
        }
      }
    }
    
    // Synchronize to client
    if (window.arzaniClient) {
      if (window.arzaniClient.currentConversationId !== primarySessionId) {
        console.log(`🔄 Updating client session ID to: ${primarySessionId}`);
        window.arzaniClient.currentConversationId = primarySessionId;
        
        // Also enable persistence if method exists
        if (typeof window.arzaniClient.setupConversationPersistence === 'function') {
          window.arzaniClient.setupConversationPersistence(primarySessionId);
        }
      }
    }
    
    // Synchronize to sidebar
    if (window.arzaniModernSidebar) {
      if (window.arzaniModernSidebar.currentConversationId !== primarySessionId) {
        console.log(`🔄 Updating sidebar session ID to: ${primarySessionId}`);
        window.arzaniModernSidebar.currentConversationId = primarySessionId;
        
        // Refresh sidebar if method exists
        if (typeof window.arzaniModernSidebar.refresh === 'function') {
          setTimeout(() => window.arzaniModernSidebar.refresh(), 100);
        }
      }
    }
    
    console.log('✅ Session synchronization complete');
    return true;
  } catch (error) {
    console.error('❌ Error synchronizing session IDs:', error);
    return false;
  }
}

/**
 * Track a new conversation creation
 */
function trackNewConversation(conversationId, source) {
  // Track the session
  window._arzaniSessionTracker.trackSession(conversationId, source);
  
  // Immediately synchronize all components
  synchronizeSessionIds();
  
  // Set up periodic synchronization for the next 10 seconds
  // to catch any delayed initialization
  let syncCount = 0;
  const syncInterval = setInterval(() => {
    synchronizeSessionIds();
    syncCount++;
    
    if (syncCount >= 5) {
      clearInterval(syncInterval);
    }
  }, 2000);
  
  return conversationId;
}

/**
 * Initialize session synchronization on page load
 */
function initSessionSynchronizer() {
  console.log('🚀 Initializing session synchronizer');
  
  // First synchronization
  synchronizeSessionIds();
  
  // Set up regular synchronization
  setInterval(synchronizeSessionIds, 5000);
  
  // Add event listeners for component initialization
  document.addEventListener('arzani:client:ready', () => {
    console.log('🔄 Arzani client ready, synchronizing session');
    synchronizeSessionIds();
  });
  
  document.addEventListener('arzani:persistence:ready', () => {
    console.log('🔄 Arzani persistence ready, synchronizing session');
    synchronizeSessionIds();
  });
  
  document.addEventListener('arzani:sidebar:ready', () => {
    console.log('🔄 Arzani sidebar ready, synchronizing session');
    synchronizeSessionIds();
  });
  
  // Override key methods in the persistence manager to ensure consistent sessions
  if (window.ArzaniPersistenceManager && ArzaniPersistenceManager.prototype) {
    const originalCreateSession = ArzaniPersistenceManager.prototype.createSession;
    ArzaniPersistenceManager.prototype.createSession = async function(agentType, title) {
      const session = await originalCreateSession.call(this, agentType, title);
      if (session && session.id) {
        trackNewConversation(session.id, 'persistence_manager_create');
      }
      return session;
    };
    
    const originalSwitchSession = ArzaniPersistenceManager.prototype.switchSession;
    ArzaniPersistenceManager.prototype.switchSession = async function(sessionId) {
      const result = await originalSwitchSession.call(this, sessionId);
      window._arzaniSessionTracker.trackSession(sessionId, 'persistence_manager_switch');
      window._arzaniSessionTracker.updateAccessTime(sessionId);
      synchronizeSessionIds();
      return result;
    };
    
    const originalSaveMessage = ArzaniPersistenceManager.prototype.saveMessage;
    ArzaniPersistenceManager.prototype.saveMessage = async function(content, senderType, agentType, metadata) {
      // Ensure session IDs are synchronized before saving
      synchronizeSessionIds();
      
      // If we have a current session ID, update its access time
      if (this.currentSessionId) {
        window._arzaniSessionTracker.updateAccessTime(this.currentSessionId);
      }
      
      return await originalSaveMessage.call(this, content, senderType, agentType, metadata);
    };
  }
  
  console.log('✅ Session synchronizer initialized');
}

// Initialize on page load
if (document.readyState === 'complete') {
  initSessionSynchronizer();
} else {
  window.addEventListener('load', initSessionSynchronizer);
}

// Export global functions
window.arzaniSessionSynchronizer = {
  synchronize: synchronizeSessionIds,
  trackConversation: trackNewConversation,
  getStatus: () => window._arzaniSessionTracker.logSessionStatus()
};
