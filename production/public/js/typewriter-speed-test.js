/**
 * Typewriter Speed Test Helper
 * 
 * This script helps test the typewriter animation speed in the Arzani-X application.
 * It adds a button to inject test messages with different lengths to verify the speed improvements.
 */

// Add this after the page loads
document.addEventListener('DOMContentLoaded', function() {
  // Wait a bit to ensure arzaniClient is initialized
  setTimeout(() => {
    initializeTypewriterTest();
  }, 1000);
  
  function initializeTypewriterTest() {
    // Check if arzaniClient is available
    if (!window.arzaniClient) {
      console.warn('⚠️ arzaniClient not available, typewriter test cannot run');
      return;
    }

    console.log('🧪 Typewriter Speed Test initialized');
    
    // Create the test container
    const testContainer = document.createElement('div');
    testContainer.className = 'fixed bottom-20 right-4 z-50 flex flex-col gap-2';
    
    // Add test buttons
    const testButton1 = createTestButton('Test Short Message', () => testTypewriterSpeed('short'));
    const testButton2 = createTestButton('Test Medium Message', () => testTypewriterSpeed('medium'));
    const testButton3 = createTestButton('Test Long Message', () => testTypewriterSpeed('long'));
    
    testContainer.appendChild(testButton1);
    testContainer.appendChild(testButton2);
    testContainer.appendChild(testButton3);
    document.body.appendChild(testContainer);
  }
  
  function createTestButton(text, onClick) {
    const button = document.createElement('button');
    button.innerText = text;
    button.className = 'px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium';
    button.onclick = onClick;
    return button;
  }
  
  function testTypewriterSpeed(length) {
    console.log(`🧪 Testing typewriter speed with ${length} message`);
    
    // Generate test content based on length
    let content = '';
    
    switch(length) {
      case 'short':
        content = `# Quick Typewriter Test
        
This is a short message to test the typewriter animation speed. It should appear quickly on the screen.`;
        break;
      case 'medium':
        content = `# Medium Typewriter Test
        
This is a medium-length message to test the typewriter animation speed. It includes multiple paragraphs and some formatting.

## Features
- Bold text for **emphasis**
- Italics for *highlighting*
- Code blocks for \`examples\`

The typewriter should render this at a comfortable reading speed without making users wait too long.`;
        break;
      case 'long':
        content = `# Comprehensive Typewriter Test
        
This is a longer message to thoroughly test the typewriter animation speed with different markdown elements and a table.

## Section 1: Text Content
This paragraph contains standard text content that should be rendered quickly and efficiently by the improved typewriter animation. Users should not have to wait too long for the content to appear.

## Section 2: Formatted Elements
- **Bold text** for important points
- *Italic text* for emphasis
- \`Inline code\` for technical terms
- > Blockquotes for important notes
- Numbered lists for sequential items
  1. First item
  2. Second item
  3. Third item

## Section 3: Table
Here's a sample table to test how tables are rendered:

| Feature | Before | After | Improvement |
|---------|--------|-------|-------------|
| Speed | Slow | Fast | 4x faster |
| User Experience | Waiting | Responsive | Much better |
| Resource Usage | High | Lower | More efficient |

## Conclusion
The typewriter should handle this content efficiently and provide a good user experience.`;
        break;
    }
    
    // Add the test message to the chat
    if (window.arzaniClient) {
      const startTime = performance.now();
      console.log(`⏱️ Starting typewriter test at ${startTime}ms`);
      
      // Add event listener to detect when animation is complete
      const detectAnimationComplete = () => {
        const messages = document.querySelectorAll('.message-bubble');
        const lastMessage = messages[messages.length - 1];
        
        if (lastMessage && !lastMessage.querySelector('.typewriter-cursor')) {
          const endTime = performance.now();
          const duration = endTime - startTime;
          console.log(`✅ Typewriter animation completed in ${duration.toFixed(0)}ms`);
          document.removeEventListener('DOMSubtreeModified', detectAnimationComplete);
        }
      };
      
      document.addEventListener('DOMSubtreeModified', detectAnimationComplete);
      
      // Add message to chat
      window.arzaniClient.addMessageToCurrentSection(content, 'assistant');
      console.log('🔄 Test message added to chat');
    } else {
      console.error('❌ arzaniClient not available');
    }
  }
});
