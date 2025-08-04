/**
 * AI Assistant Debug Helper
 * Troubleshoots AI Assistant issues and adds support for manual initialization
 */

// Run after a small delay to ensure elements have been created
setTimeout(() => {
  console.log('AI Debug Helper running');
  
  // Check if elements exist
  const container = document.getElementById('ai-assistant-container');
  const button = document.getElementById('ai-assistant-button');
  const buttonWrapper = document.querySelector('.ai-button-wrapper');
  
  console.log('AI Assistant element check:', {
    containerExists: !!container,
    buttonExists: !!button,
    buttonWrapperExists: !!buttonWrapper,
    assistantInstance: !!window.aiAssistant,
    assistantClass: !!window.AIAssistant
  });
  
  // If container doesn't have the proper styling, fix it
  if (container) {
    const styles = window.getComputedStyle(container);
    console.log('Container display:', styles.display);
    console.log('Container visibility:', styles.visibility);
    console.log('Container opacity:', styles.opacity);
    
    // Make sure the container has the right initial positioning and styling
    container.style.position = 'fixed';
    container.style.bottom = '80px';
    container.style.right = '20px';
    container.style.zIndex = '1000';
    
    // Add toggle function directly to the container for easier debugging
    container.toggle = function() {
      if (this.classList.contains('ai-assistant-hidden')) {
        this.classList.remove('ai-assistant-hidden');
      } else {
        this.classList.add('ai-assistant-hidden');
      }
    };
  }
  
  // Add manual toggle function for debugging
  window.toggleAIManually = function() {
    console.log('Manual toggle called');
    const container = document.getElementById('ai-assistant-container');
    if (container) {
      container.toggle();
    }
  };
  
  // Add click handler to button if missing
  if (button && !button.onclick) {
    console.log('Adding manual click handler to button');
    button.onclick = function(e) {
      console.log('Button clicked via manual handler');
      e.preventDefault();
      e.stopPropagation();
      
      if (window.aiAssistant && typeof window.aiAssistant.toggleAssistant === 'function') {
        window.aiAssistant.toggleAssistant();
      } else {
        window.toggleAIManually();
      }
      
      return false;
    };
  }
}, 1000);
