/**
 * AI Chat Integration with Main Chat Interface
 */
document.addEventListener('DOMContentLoaded', function() {
  // Get relevant elements
  const startAiChatButtons = document.querySelectorAll('#startAiChat');
  const aiAssistantWrapper = document.getElementById('ai-assistant-container-wrapper');
  const aiAssistantContainer = document.getElementById('ai-assistant-container');
  const chatContainer = document.querySelector('.chat-container');
  
  // Function to toggle AI chat
  function toggleAiChat() {
    // Toggle visibility of AI container
    if (aiAssistantWrapper.classList.contains('hidden')) {
      // Show AI chat
      aiAssistantWrapper.classList.remove('hidden');
      aiAssistantWrapper.classList.add('visible');
      chatContainer.classList.add('ai-chat-active');
      
      // Ensure AI assistant is visible
      if (aiAssistantContainer) {
        aiAssistantContainer.classList.remove('ai-assistant-hidden');
      }
      
      // Update URL parameter to indicate AI chat is active
      const url = new URL(window.location);
      url.searchParams.set('ai', 'true');
      window.history.pushState({}, '', url);
    } else {
      // Hide AI chat
      aiAssistantWrapper.classList.add('hidden');
      aiAssistantWrapper.classList.remove('visible');
      chatContainer.classList.remove('ai-chat-active');
      
      // Update URL parameter
      const url = new URL(window.location);
      url.searchParams.delete('ai');
      window.history.pushState({}, '', url);
    }
  }
  
  // Add click handlers to AI chat buttons
  startAiChatButtons.forEach(button => {
    button.addEventListener('click', toggleAiChat);
  });
  
  // Check URL parameters on load
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('ai') === 'true') {
    toggleAiChat();
  }
  
  // Expose toggling function to window
  window.toggleAiChat = toggleAiChat;
});
