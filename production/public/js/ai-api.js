/**
 * AI Assistant API Integration
 * Handles communication with the server-side AI assistant API
 */

// Use IIFE to avoid global namespace pollution
const AIAssistantAPI = (function() {
  // Base API URL for assistant endpoints
  const baseUrl = '/api/assistant';
  
  /**
   * Sends a chat message to the AI assistant
   * @param {string} message - The user's message
   * @param {Array} history - Optional conversation history
   * @returns {Promise} - Resolves with the AI response
   */
  async function sendMessage(message, history = []) {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch(`${baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          conversationHistory: history
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get AI response');
      }
      
      return await response.json();
    } catch (error) {
      console.error('AI API error:', error);
      throw error;
    }
  }
  
  /**
   * Gets user's AI credit information
   * @returns {Promise} - Resolves with credit information
   */
  async function getCreditInfo() {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return { remaining: 30, limit: 30, nextReset: null };
      }
      
      const response = await fetch(`${baseUrl}/info`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        // If we get a 404 user not found error, it might be because the credit record doesn't exist yet
        if (response.status === 404) {
          return { remaining: 30, limit: 30, nextReset: null, needsSetup: true };
        }
        throw new Error('Failed to fetch credit info');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching credits:', error);
      // Return default values on error
      return { remaining: 30, limit: 30, error: error.message };
    }
  }
  
  /**
   * Enhances a message with marketplace context
   * @param {string} message - The user's message
   * @returns {Promise} - Resolves with enhanced message
   */
  async function enhanceWithContext(message) {
    // Get last search criteria from localStorage
    const searchContext = localStorage.getItem('lastSearchCriteria');
    let enhancedMessage = message;
    
    if (searchContext) {
      try {
        const criteria = JSON.parse(searchContext);
        const contextPrefix = `(Consider that I was recently looking for businesses`;
        
        // Add location context if available
        if (criteria.location) {
          enhancedMessage = `${contextPrefix} in ${criteria.location}`;
        }
        
        // Add industry context if available
        if (criteria.industries && criteria.industries.length > 0) {
          enhancedMessage += ` in the ${criteria.industries.join(', ')} industry`;
        }
        
        // Add price range context if available
        if (criteria.priceRange) {
          const [min, max] = criteria.priceRange.split('-');
          enhancedMessage += ` with price range ${min}-${max}`;
        }
        
        enhancedMessage += `) ${message}`;
      } catch (error) {
        console.error('Error processing search context:', error);
      }
    }
    
    return enhancedMessage;
  }
  
  return {
    sendMessage,
    getCreditInfo,
    enhanceWithContext
  };
})();

// Export the API for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIAssistantAPI;
} else {
  window.AIAssistantAPI = AIAssistantAPI;
}
