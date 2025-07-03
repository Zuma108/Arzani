// Helper script to debug markdown rendering in real AI responses
// Run this in the browser console after receiving an AI response that doesn't render markdown correctly

(function() {
  console.log('🔍 Running Markdown Debugging Helper');
  
  // Function to find AI messages in the conversation
  function findAIMessages() {
    const aiMessages = document.querySelectorAll('.ai-message .message-bubble');
    console.log(`Found ${aiMessages.length} AI messages in the conversation`);
    return Array.from(aiMessages);
  }
  
  // Function to extract text content from a message
  function extractMessageContent(messageElement) {
    // Try to find the typewriter-text element first
    const typewriterText = messageElement.querySelector('.typewriter-text');
    if (typewriterText) {
      // Get both the original content (if available) and the rendered content
      const originalContent = typewriterText.getAttribute('data-original-content');
      const renderedHtml = typewriterText.innerHTML;
      
      return {
        element: messageElement,
        typewriterElement: typewriterText,
        originalContent: originalContent || '(Not available)',
        renderedHtml: renderedHtml,
        hasOriginalContent: !!originalContent
      };
    }
    
    // Fallback to getting the full message bubble content
    return {
      element: messageElement,
      typewriterElement: null,
      originalContent: messageElement.textContent,
      renderedHtml: messageElement.innerHTML,
      hasOriginalContent: false
    };
  }
  
  // Function to analyze message content for markdown
  function analyzeMessageContent(messageData) {
    if (!window.arzaniRenderer) {
      console.error('❌ Markdown renderer not available');
      return null;
    }
    
    const analysis = window.arzaniRenderer.analyzeContent(messageData.originalContent);
    return {
      ...messageData,
      analysis
    };
  }
  
  // Function to re-render a message with markdown
  function reRenderWithMarkdown(messageData) {
    if (!window.arzaniRenderer || !messageData.typewriterElement) {
      console.error('❌ Cannot re-render - renderer or typewriter element not available');
      return false;
    }
    
    try {
      const renderedHtml = window.arzaniRenderer.renderToHtml(messageData.originalContent);
      messageData.typewriterElement.innerHTML = renderedHtml;
      console.log('✅ Message re-rendered with markdown');
      return true;
    } catch (error) {
      console.error('❌ Error re-rendering message:', error);
      return false;
    }
  }
  
  // Main function to debug markdown rendering
  function debugMarkdownRendering() {
    const messages = findAIMessages();
    if (messages.length === 0) {
      console.log('❌ No AI messages found in conversation');
      return;
    }
    
    // Process the last message by default
    const lastMessage = messages[messages.length - 1];
    const messageData = extractMessageContent(lastMessage);
    console.log('📄 Last message content:', messageData);
    
    // Analyze the content
    const analysisData = analyzeMessageContent(messageData);
    console.log('🔍 Markdown analysis:', analysisData?.analysis);
    
    // Offer to re-render the message
    console.log('To re-render this message with markdown, run:');
    console.log('window.reRenderLastAIMessage()');
    
    // Make the re-render function available globally
    window.reRenderLastAIMessage = function() {
      return reRenderWithMarkdown(messageData);
    };
    
    return analysisData;
  }
  
  // Run the debug function
  const result = debugMarkdownRendering();
  return result;
})();
