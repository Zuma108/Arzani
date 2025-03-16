/**
 * AI Assistant Position Control
 * This script allows for easy repositioning of the AI assistant container
 */

/**
 * Set the position of the AI Assistant container
 * @param {Object} position - Position object with bottom and right values
 */
function setAIPosition(position) {
  const container = document.getElementById('ai-assistant-container');
  const button = document.querySelector('.ai-button-wrapper');
  
  if (!container || !button) {
    console.error('AI Assistant elements not found');
    return;
  }
  
  if (position.bottom !== undefined) {
    // Convert to number and add px if it's a number
    const bottomValue = typeof position.bottom === 'number' ? 
      `${position.bottom}px` : position.bottom;
    
    container.style.setProperty('--ai-bottom', bottomValue);
    
    // Move button as well, 60px above the container
    if (typeof position.bottom === 'number') {
      button.style.setProperty('--ai-bottom', `${position.bottom - 60}px`);
    }
  }
  
  if (position.right !== undefined) {
    // Convert to number and add px if it's a number
    const rightValue = typeof position.right === 'number' ? 
      `${position.right}px` : position.right;
    
    container.style.setProperty('--ai-right', rightValue);
    button.style.setProperty('--ai-right', rightValue);
  }
  
  // Add the custom position class
  container.classList.add('ai-position-custom');
  button.classList.add('ai-position-custom');
  
  console.log('AI Assistant position updated:', position);
}

// Make this function globally available
window.setAIPosition = setAIPosition;

// Example usage: 
// setAIPosition({ bottom: 200, right: 30 });
