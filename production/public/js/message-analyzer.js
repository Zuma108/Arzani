/**
 * Message Analyzer for Chat Interface
 * Helps troubleshoot message display issues
 */

(function() {
  // Only initialize in development environment
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isDev) return;
  
  // Enable debug toggle
  const debugToggle = document.getElementById('debug-toggle');
  if (debugToggle) {
    debugToggle.style.display = 'block';
  }
  
  // Global debug flag
  window.chatDebug = false;
  
  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    console.log('Message Analyzer initialized');
    
    // Add keyboard shortcut for debug mode (Ctrl+Shift+D)
    document.addEventListener('keydown', function(e) {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        toggleDebugMode();
      }
    });
    
    // Add debug panel
    addDebugPanel();
  });
  
  // Toggle debug mode
  window.toggleDebugMode = function() {
    window.chatDebug = !window.chatDebug;
    
    // Update toggle button text
    const debugToggle = document.getElementById('debug-toggle');
    if (debugToggle) {
      debugToggle.textContent = 'Debug: ' + (window.chatDebug ? 'ON' : 'OFF');
    }
    
    // Toggle debug class on message containers
    document.querySelectorAll('.message').forEach(msg => {
      if (window.chatDebug) {
        msg.classList.add('debug');
      } else {
        msg.classList.remove('debug');
      }
    });
    
    // Toggle debug panel
    const debugPanel = document.getElementById('message-debug-panel');
    if (debugPanel) {
      debugPanel.style.display = window.chatDebug ? 'block' : 'none';
    }
    
    // Log current state
    if (window.chatDebug) {
      analyzeMessages();
    }
  };
  
  // Add debug panel to the page
  function addDebugPanel() {
    const panel = document.createElement('div');
    panel.id = 'message-debug-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 50px;
      right: 10px;
      width: 300px;
      max-height: 400px;
      background: rgba(0,0,0,0.8);
      color: white;
      border-radius: 5px;
      padding: 10px;
      font-size: 12px;
      font-family: monospace;
      z-index: 1000;
      overflow-y: auto;
      display: none;
    `;
    
    panel.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <h4 style="margin: 0; font-size: 14px;">Message Debug</h4>
        <button id="refresh-debug" style="background: #555; border: none; color: white; padding: 2px 5px; border-radius: 3px; cursor: pointer;">
          Refresh
        </button>
      </div>
      <div id="debug-content"></div>
    `;
    
    document.body.appendChild(panel);
    
    // Add event listener for refresh button
    document.getElementById('refresh-debug').addEventListener('click', analyzeMessages);
  }
  
  // Analyze messages and update debug panel
  function analyzeMessages() {
    const debugContent = document.getElementById('debug-content');
    if (!debugContent) return;
    
    const messages = document.querySelectorAll('.message');
    const incoming = document.querySelectorAll('.message.incoming');
    const outgoing = document.querySelectorAll('.message.outgoing');
    
    const currentUserId = getCurrentUserId();
    
    // Collect message data
    const messageData = [];
    messages.forEach(msg => {
      const senderId = msg.getAttribute('data-sender-id');
      const messageId = msg.getAttribute('data-message-id');
      const isIncoming = msg.classList.contains('incoming');
      const isOutgoing = msg.classList.contains('outgoing');
      const shouldBeOutgoing = String(senderId) === String(currentUserId);
      
      messageData.push({
        id: messageId,
        sender: senderId,
        direction: isIncoming ? 'incoming' : 'outgoing',
        correct: (shouldBeOutgoing && isOutgoing) || (!shouldBeOutgoing && isIncoming)
      });
    });
    
    // Generate HTML report
    let html = `
      <div style="margin-bottom: 10px;">
        <div><strong>Current User ID:</strong> ${currentUserId}</div>
        <div><strong>Total Messages:</strong> ${messages.length}</div>
        <div><strong>Incoming:</strong> ${incoming.length}</div>
        <div><strong>Outgoing:</strong> ${outgoing.length}</div>
      </div>
      <hr style="border: none; border-top: 1px solid #555; margin: 10px 0;">
    `;
    
    // Add message analysis
    if (messageData.length > 0) {
      html += '<div style="margin-bottom: 10px;"><strong>Message Analysis:</strong></div>';
      
      messageData.forEach((msg, index) => {
        const color = msg.correct ? '#4CAF50' : '#F44336';
        html += `
          <div style="margin-bottom: 5px; padding: 5px; background: rgba(255,255,255,0.1); border-left: 3px solid ${color};">
            <div><strong>Message ${index + 1}</strong> (${msg.id})</div>
            <div>Sender: ${msg.sender}</div>
            <div>Direction: ${msg.direction}</div>
            <div style="color: ${color};">${msg.correct ? '✓ Correct' : '✗ Incorrect'}</div>
          </div>
        `;
      });
      
      // Add fix button if there are issues
      const hasIssues = messageData.some(msg => !msg.correct);
      if (hasIssues) {
        html += `
          <div style="margin-top: 10px;">
            <button id="fix-messages" style="background: #4CAF50; border: none; color: white; padding: 5px 10px; border-radius: 3px; cursor: pointer; width: 100%;">
              Fix Message Alignment
            </button>
          </div>
        `;
      }
    }
    
    debugContent.innerHTML = html;
    
    // Add event listener for fix button
    const fixButton = document.getElementById('fix-messages');
    if (fixButton) {
      fixButton.addEventListener('click', fixMessageAlignment);
    }
  }
  
  // Fix message alignment issues
  function fixMessageAlignment() {
    const currentUserId = getCurrentUserId();
    const messages = document.querySelectorAll('.message');
    
    messages.forEach(msg => {
      const senderId = msg.getAttribute('data-sender-id');
      const isCurrentUser = String(senderId) === String(currentUserId);
      
      // Reset classes
      msg.classList.remove('incoming', 'outgoing');
      
      // Add correct class
      if (isCurrentUser) {
        msg.classList.add('outgoing');
      } else {
        msg.classList.add('incoming');
      }
    });
    
    // Update debug panel
    analyzeMessages();
    
    // Show success message
    alert('Message alignment fixed! ' + messages.length + ' messages processed.');
  }
  
  // Helper function to get current user ID
  function getCurrentUserId() {
    // From custom element
    const userDataElement = document.getElementById('current-user-data');
    if (userDataElement && userDataElement.dataset.userId) {
      return userDataElement.dataset.userId;
    }
    
    // From data attribute
    const userIdElement = document.querySelector('[data-user-id]');
    if (userIdElement && userIdElement.dataset.userId) {
      return userIdElement.dataset.userId;
    }
    
    // From meta tag
    const metaUserId = document.querySelector('meta[name="user-id"]')?.content;
    if (metaUserId) {
      return metaUserId;
    }
    
    // From global variable
    if (window.currentUserId) {
      return window.currentUserId;
    }
    
    // From localStorage (last resort)
    return localStorage.getItem('currentUserId') || 'unknown';
  }
})();
