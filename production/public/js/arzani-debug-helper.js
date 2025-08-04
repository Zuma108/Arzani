/**
 * Arzani Client Debug Helper
 * Validates the initialization of Arzani client components
 */

function validateArzaniSetup() {
  console.log('=== Arzani Client Debug Helper ===');
  
  // Check ArzaniHelpers
  const helpersValid = Boolean(window.ArzaniHelpers);
  console.log(`ArzaniHelpers available: ${helpersValid}`);
  
  if (helpersValid) {
    console.log('- clearMessagesContainer method: ', 
      typeof window.ArzaniHelpers.clearMessagesContainer === 'function' ? '✅ Available' : '❌ Missing');
    console.log('- getMainChatInput method: ', 
      typeof window.ArzaniHelpers.getMainChatInput === 'function' ? '✅ Available' : '❌ Missing');
  }
  
  // Check arzaniClient
  const clientValid = Boolean(window.arzaniClient);
  console.log(`arzaniClient available: ${clientValid}`);
  
  if (clientValid) {
    console.log('- clearCurrentConversation method: ', 
      typeof window.arzaniClient.clearCurrentConversation === 'function' ? '✅ Available' : '❌ Missing');
    console.log('- showWelcomeMessage method: ', 
      typeof window.arzaniClient.showWelcomeMessage === 'function' ? '✅ Available' : '❌ Missing');
  }
  
  // Check arzaniModernSidebar
  const sidebarValid = Boolean(window.arzaniModernSidebar);
  console.log(`arzaniModernSidebar available: ${sidebarValid}`);
  
  if (sidebarValid) {
    console.log('- arzaniClient reference: ', 
      window.arzaniModernSidebar.arzaniClient ? '✅ Set' : '❌ Not set');
    console.log('- persistenceManager reference: ', 
      window.arzaniModernSidebar.persistenceManager ? '✅ Set' : '❌ Not set');
    console.log('- setArzaniClient method: ', 
      typeof window.arzaniModernSidebar.setArzaniClient === 'function' ? '✅ Available' : '❌ Missing');
  }
  
  // Check persistence manager
  const persistenceValid = Boolean(window.arzaniPersistenceManager);
  console.log(`arzaniPersistenceManager available: ${persistenceValid}`);
  
  // Final assessment
  const allValid = helpersValid && clientValid && sidebarValid && persistenceValid;
  
  console.log(`\nOverall initialization status: ${allValid ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);
  
  if (!allValid) {
    console.log('\nIssues detected:');
    if (!helpersValid) console.log('- ArzaniHelpers is not available');
    if (!clientValid) console.log('- arzaniClient is not available');
    if (!sidebarValid) console.log('- arzaniModernSidebar is not available');
    if (!persistenceValid) console.log('- arzaniPersistenceManager is not available');
    
    console.log('\nRecommended fix: Ensure all components are properly initialized in the correct order.');
  }
  
  return allValid;
}

// Add the validation function to the window object
window.validateArzaniSetup = validateArzaniSetup;

// Run validation automatically after a short delay
setTimeout(() => {
  console.log('Running automatic Arzani setup validation...');
  validateArzaniSetup();
}, 3000);

// Add event listener to run validation again after all resources are loaded
window.addEventListener('load', () => {
  setTimeout(() => {
    console.log('Running post-load Arzani setup validation...');
    validateArzaniSetup();
  }, 2000);
});

// Error recovery for client initialization issues
window.addEventListener('error', function(event) {
  // Only handle specific errors related to Arzani client components
  if (event.error && event.error.message && (
      event.error.message.includes('Cannot read properties of undefined') ||
      event.error.message.includes('Arzani') ||
      event.error.message.includes('clearCurrentConversation') ||
      event.error.message.includes('showWelcomeMessage')
  )) {
    console.warn('Arzani error detected, attempting recovery:', event.error.message);
    
    // Attempt to recover by ensuring fallback methods exist
    try {
      // Ensure window.arzaniClient exists
      if (!window.arzaniClient) {
        console.log('Creating fallback arzaniClient');
        window.arzaniClient = {
          clearCurrentConversation: function() {
            console.log('Fallback clearCurrentConversation called');
            const messagesContainer = document.getElementById('messagesContainer');
            if (messagesContainer) {
              messagesContainer.innerHTML = '';
            }
          },
          showWelcomeMessage: function() {
            console.log('Fallback showWelcomeMessage called');
            const messagesContainer = document.getElementById('messagesContainer');
            if (messagesContainer) {
              messagesContainer.innerHTML = `
                <div class="message-group ai-message">
                  <div class="flex items-start space-x-3">
                    <div class="message-bubble bg-gray-100 rounded-lg rounded-tl-none p-4 max-w-[80%]">
                      <div class="message-content">Welcome to Arzani-X! How can I help you today?</div>
                    </div>
                  </div>
                </div>
              `;
            }
          }
        };
      }
      
      // Ensure critical methods exist
      if (window.arzaniClient && !window.arzaniClient.clearCurrentConversation) {
        window.arzaniClient.clearCurrentConversation = function() {
          console.log('Fallback clearCurrentConversation called');
          const messagesContainer = document.getElementById('messagesContainer');
          if (messagesContainer) {
            messagesContainer.innerHTML = '';
          }
        };
      }
      
      // Re-establish sidebar connection if needed
      if (window.arzaniModernSidebar && window.arzaniClient && 
          typeof window.arzaniModernSidebar.setArzaniClient === 'function') {
        console.log('Re-establishing sidebar-client connection');
        window.arzaniModernSidebar.setArzaniClient(window.arzaniClient);
      }
      
      console.log('Recovery completed');
    } catch (recoveryError) {
      console.error('Error during recovery attempt:', recoveryError);
    }
  }
});

console.log('Arzani Client Debug Helper loaded.');
