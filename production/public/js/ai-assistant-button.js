/**
 * Lightweight script for the AI assistant button
 * This doesn't load the full chat interface
 */

document.addEventListener('DOMContentLoaded', function() {
    const assistantButton = document.getElementById('aiAssistantButton');
    
    if (assistantButton) {
        // Add animation to the button
        assistantButton.addEventListener('mouseenter', () => {
            assistantButton.querySelector('.ai-button').classList.add('hover');
        });
        
        assistantButton.addEventListener('mouseleave', () => {
            assistantButton.querySelector('.ai-button').classList.remove('hover');
        });
        
        // Handle click to redirect to chat page
        assistantButton.addEventListener('click', () => {
            window.location.href = '/chat';
        });
    }
});
