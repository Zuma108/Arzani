/**
 * Test helper for message editing in Arzani-X
 * This script provides functions to test and debug message editing functionality
 */

window.ArzaniTestEditHelper = {
  /**
   * Test editing a message with explicit session ID override
   */
  testEditWithSessionIdOverride: function(messageId, newContent, sessionId) {
    console.log(`📝 Testing edit with session override: messageId=${messageId}, sessionId=${sessionId}`);
    
    if (!window.arzaniPersistence) {
      console.error('❌ Cannot test: arzaniPersistence is not available');
      return false;
    }
    
    return window.arzaniPersistence.updateMessage(messageId, newContent, sessionId)
      .then(result => {
        console.log('✅ Test edit successful:', result);
        return true;
      })
      .catch(error => {
        console.error('❌ Test edit failed:', error);
        return false;
      });
  },
  
  /**
   * Test detection and recovery of session ID
   */
  checkSessionAlignment: function() {
    const persistenceSessionId = window.arzaniPersistence ? 
      window.arzaniPersistence.getCurrentSessionId() : null;
    
    const sidebarSessionId = window.arzaniSidebar ? 
      window.arzaniSidebar.currentConversationId : null;
    
    const clientSessionId = window.arzaniClient && window.arzaniClient.getCurrentConversation ? 
      window.arzaniClient.getCurrentConversation() : null;
    
    console.log('📊 Session alignment check:');
    console.log(`  • Persistence Manager: ${persistenceSessionId}`);
    console.log(`  • Sidebar: ${sidebarSessionId}`);
    console.log(`  • Main Client: ${clientSessionId}`);
    
    const aligned = persistenceSessionId === sidebarSessionId && 
                    (clientSessionId === null || clientSessionId === sidebarSessionId);
    
    console.log(`${aligned ? '✅ Sessions aligned' : '⚠️ Sessions misaligned'}`);
    
    // Try to recover if misaligned
    if (!aligned && sidebarSessionId && window.arzaniPersistence) {
      console.log('🔄 Attempting to align sessions...');
      return window.arzaniPersistence.switchSession(sidebarSessionId)
        .then(() => {
          console.log('✅ Session alignment fixed');
          return true;
        })
        .catch(error => {
          console.error('❌ Failed to align sessions:', error);
          return false;
        });
    }
    
    return Promise.resolve(aligned);
  },
  
  /**
   * Run a complete set of diagnostic tests for message editing
   */
  runDiagnostics: function() {
    console.log('🔍 Running message editing diagnostics...');
    
    // Check components availability
    const checks = {
      persistenceAvailable: !!window.arzaniPersistence,
      persistenceHasUpdateMessage: window.arzaniPersistence && typeof window.arzaniPersistence.updateMessage === 'function',
      persistenceHasSwitchSession: window.arzaniPersistence && typeof window.arzaniPersistence.switchSession === 'function',
      sidebarAvailable: !!window.arzaniSidebar,
      clientAvailable: !!window.arzaniClient
    };
    
    console.log('📋 Component checks:', checks);
    
    // Check session alignment
    this.checkSessionAlignment()
      .then(aligned => {
        if (aligned) {
          console.log('✅ Message editing should work correctly');
        } else {
          console.warn('⚠️ Message editing may still have issues');
        }
      });
  }
};

// Auto-run diagnostics on load
(function() {
  console.log('🔧 Message editing helper loaded');
  
  // Wait for page to be fully loaded
  if (document.readyState === 'complete') {
    setTimeout(() => window.ArzaniTestEditHelper.runDiagnostics(), 1000);
  } else {
    window.addEventListener('load', () => {
      setTimeout(() => window.ArzaniTestEditHelper.runDiagnostics(), 1000);
    });
  }
})();
