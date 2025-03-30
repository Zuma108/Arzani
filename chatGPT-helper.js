import OpenAI from 'openai';
import pool from './db.js';
import config from './config.js';
import { v4 as uuidv4 } from 'uuid';

// Initialize OpenAI configuration
const openai = new OpenAI({
  apiKey: config.openaiApiKey
});

/**
 * ChatGPT helper class that integrates with the existing chat system
 * and provides AI-powered responses to user messages
 */
class ChatGPTHelper {
  constructor() {
    this.contextWindow = 10; // Number of previous messages to include for context
    this.defaultSystemPrompt = `You are an AI assistant for a business marketplace platform. 
    You help users with information about businesses, market trends, and using the platform.
    Be helpful, concise, and professional.`;
  }

  /**
   * Create a new AI assistant conversation
   * @param {number} userId - The user ID initiating the conversation
   * @param {string} initialPrompt - Optional initial prompt from the user
   * @returns {Promise<object>} The created conversation details
   */
  async createAssistantConversation(userId, initialPrompt = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create a conversation with the AI assistant
      const conversationResult = await client.query(
        `INSERT INTO conversations (title, type, is_archived) 
         VALUES ($1, $2, $3) 
         RETURNING id, created_at`,
        ['AI Assistant', 'assistant', false]
      );

      const conversationId = conversationResult.rows[0].id;

      // Add the user as a participant
      await client.query(
        `INSERT INTO conversation_participants (conversation_id, user_id, role) 
         VALUES ($1, $2, $3)`,
        [conversationId, userId, 'owner']
      );

      // Add the system (AI) as a participant with ID -1 (special ID for the system)
      await client.query(
        `INSERT INTO conversation_participants (conversation_id, user_id, role) 
         VALUES ($1, $2, $3)`,
        [conversationId, -1, 'assistant']
      );

      // Add initial system message
      await client.query(
        `INSERT INTO messages (conversation_id, sender_id, content, is_system_message) 
         VALUES ($1, $2, $3, $4)`,
        [conversationId, -1, this.defaultSystemPrompt, true]
      );

      // If there's an initial prompt, add it too
      if (initialPrompt) {
        await client.query(
          `INSERT INTO messages (conversation_id, sender_id, content) 
           VALUES ($1, $2, $3)`,
          [conversationId, userId, initialPrompt]
        );

        // Generate AI response to the initial prompt
        const response = await this.generateResponse(conversationId, userId, initialPrompt);
        
        await client.query(
          `INSERT INTO messages (conversation_id, sender_id, content, is_system_message) 
           VALUES ($1, $2, $3, $4)`,
          [conversationId, -1, response, false]
        );
      }

      await client.query('COMMIT');

      // Return the created conversation
      return {
        conversationId,
        createdAt: conversationResult.rows[0].created_at
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating assistant conversation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate a response from the AI for a specific message
   * @param {number} conversationId - The conversation ID
   * @param {number} userId - The user ID sending the message
   * @param {string} userMessage - The message content from the user
   * @returns {Promise<string>} The AI-generated response
   */
  async generateResponse(conversationId, userId, userMessage) {
    let requestId = uuidv4();
    try {
      // Get conversation context (previous messages)
      const context = await this.getConversationContext(conversationId);

      // Record the request to track API usage
      await this.recordApiRequest(userId, 'chat', requestId);

      // Prepare the messages array for the OpenAI API
      const messages = [
        { role: 'system', content: this.defaultSystemPrompt },
        ...context.map(msg => ({
          role: msg.is_system_message ? 'system' : (msg.sender_id === -1 ? 'assistant' : 'user'),
          content: msg.content
        })),
        { role: 'user', content: userMessage }
      ];

      // Call the OpenAI API
      const response = await openai.chat.completions.create({
        model: 'gpt-4', // Use GPT-4 for best results, or gpt-3.5-turbo for lower cost
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      });

      // Record successful API usage
      await this.recordApiUsage(userId, requestId, 
        response.usage.prompt_tokens, 
        response.usage.completion_tokens
      );

      // Return the AI response
      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating AI response:', error);
      
      // Record failed API request
      await this.recordApiFailure(userId, requestId, error.message || 'Unknown error');
      
      // Return a fallback message
      return "I'm sorry, I encountered an error processing your request. Please try again later.";
    }
  }

  /**
   * Get previous messages from a conversation for context
   * @param {number} conversationId - The conversation ID
   * @returns {Promise<Array>} Array of previous messages
   */
  async getConversationContext(conversationId) {
    try {
      const result = await pool.query(
        `SELECT sender_id, content, is_system_message, created_at
         FROM messages
         WHERE conversation_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [conversationId, this.contextWindow]
      );

      // Return messages in chronological order
      return result.rows.reverse();
    } catch (error) {
      console.error('Error getting conversation context:', error);
      return [];
    }
  }

  /**
   * Record an API request before making the call
   * @param {number} userId - User ID making the request
   * @param {string} requestType - Type of request (chat, image, etc.)
   * @param {string} requestId - Unique ID for this request
   */
  async recordApiRequest(userId, requestType, requestId) {
    try {
      await pool.query(
        `INSERT INTO ai_credits_usage (user_id, request_id, request_type, status, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, requestId, requestType, 'pending']
      );
    } catch (error) {
      console.error('Error recording API request:', error);
    }
  }

  /**
   * Record successful API usage with token counts
   * @param {number} userId - User ID making the request
   * @param {string} requestId - Unique ID for this request
   * @param {number} promptTokens - Number of prompt tokens used
   * @param {number} completionTokens - Number of completion tokens used
   */
  async recordApiUsage(userId, requestId, promptTokens, completionTokens) {
    try {
      await pool.query(
        `UPDATE ai_credits_usage
         SET status = 'completed', 
             prompt_tokens = $1, 
             completion_tokens = $2,
             completed_at = NOW()
         WHERE request_id = $3 AND user_id = $4`,
        [promptTokens, completionTokens, requestId, userId]
      );
    } catch (error) {
      console.error('Error recording API usage:', error);
    }
  }

  /**
   * Record a failed API request
   * @param {number} userId - User ID making the request
   * @param {string} requestId - Unique ID for this request
   * @param {string} errorMessage - Error message from the API
   */
  async recordApiFailure(userId, requestId, errorMessage) {
    try {
      await pool.query(
        `UPDATE ai_credits_usage
         SET status = 'failed', 
             error_message = $1,
             completed_at = NOW()
         WHERE request_id = $2 AND user_id = $3`,
        [errorMessage.substring(0, 255), requestId, userId]
      );
    } catch (error) {
      console.error('Error recording API failure:', error);
    }
  }

  /**
   * Archive a conversation
   * @param {number} conversationId - The conversation ID to archive
   * @param {number} userId - The user ID requesting the archive
   * @returns {Promise<boolean>} Success status
   */
  async archiveConversation(conversationId, userId) {
    try {
      // Check if user is a participant
      const participantCheck = await pool.query(
        `SELECT user_id FROM conversation_participants 
         WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, userId]
      );

      if (participantCheck.rows.length === 0) {
        return false;
      }

      // Update archive status
      await pool.query(
        `UPDATE conversations 
         SET is_archived = TRUE 
         WHERE id = $1`,
        [conversationId]
      );

      return true;
    } catch (error) {
      console.error('Error archiving conversation:', error);
      return false;
    }
  }

  /**
   * Unarchive a conversation
   * @param {number} conversationId - The conversation ID to unarchive
   * @param {number} userId - The user ID requesting the unarchive
   * @returns {Promise<boolean>} Success status
   */
  async unarchiveConversation(conversationId, userId) {
    try {
      // Check if user is a participant
      const participantCheck = await pool.query(
        `SELECT user_id FROM conversation_participants 
         WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, userId]
      );

      if (participantCheck.rows.length === 0) {
        return false;
      }

      // Update archive status
      await pool.query(
        `UPDATE conversations 
         SET is_archived = FALSE 
         WHERE id = $1`,
        [conversationId]
      );

      return true;
    } catch (error) {
      console.error('Error unarchiving conversation:', error);
      return false;
    }
  }
}

export default new ChatGPTHelper();