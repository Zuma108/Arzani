// Run this in the browser console to test the fixes
function testArzaniNewChat() {
  console.log('=== Testing Arzani New Chat ===');
  
  // First, validate the setup
  window.validateArzaniSetup();
  
  console.log('\nAttempting to create a new chat...');
  
  try {
    // Try using the sidebar method
    if (window.arzaniModernSidebar && typeof window.arzaniModernSidebar.createNewChat === 'function') {
      console.log('Using arzaniModernSidebar.createNewChat()');
      window.arzaniModernSidebar.createNewChat();
      return true;
    }
    
    // Fallback to direct API call
    console.log('Sidebar method not available, using direct API call');
    fetch('/api/threads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        title: 'Test Chat',
        agent_type: 'orchestrator'
      })
    })
    .then(response => response.json())
    .then(data => {
      console.log('New chat created:', data);
      
      // Clear current conversation
      if (window.arzaniClient && typeof window.arzaniClient.clearCurrentConversation === 'function') {
        console.log('Clearing current conversation');
        window.arzaniClient.clearCurrentConversation();
      } else {
        console.log('Using fallback to clear messages');
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
          messagesContainer.innerHTML = '';
        }
      }
      
      // Refresh sidebar if available
      if (window.arzaniModernSidebar && typeof window.arzaniModernSidebar.refresh === 'function') {
        console.log('Refreshing sidebar');
        window.arzaniModernSidebar.refresh();
      }
      
      return true;
    })
    .catch(error => {
      console.error('Error creating new chat:', error);
      return false;
    });
  } catch (error) {
    console.error('Error in testArzaniNewChat:', error);
    return false;
  }
}

// Helper to get auth token
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

// Add to window for console access
window.testArzaniNewChat = testArzaniNewChat;
