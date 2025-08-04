/**
 * A2A Interaction Logger
 * Utility for logging agent-to-agent interactions and transitions to database
 */

import pool from '../db.js';

class A2AInteractionLogger {
  constructor() {
    this.db = pool;
  }  /**
   * Ensure a task exists in a2a_tasks table, create if it doesn't exist
   * @param {string} taskId - Task ID to ensure exists
   * @param {number} userId - User ID
   * @param {string} taskType - Type of task (default: 'interaction')
   * @param {Object} taskData - Additional task data
   * @returns {Promise<Object>} Task record
   * @private
   */
  async ensureTaskExists(taskId, userId, taskType = 'interaction', taskData = {}) {
    try {
      // First try to get existing task
      const existingQuery = `SELECT * FROM a2a_tasks WHERE task_id = $1`;
      const existingResult = await this.db.query(existingQuery, [taskId]);
      
      if (existingResult.rows.length > 0) {
        return existingResult.rows[0];
      }

      // Create new task if it doesn't exist
      const insertQuery = `
        INSERT INTO a2a_tasks (
          user_id, task_id, initial_query, task_type, status, primary_agent, created_at
        ) VALUES ($1, $2, $3, $4, 'active', $5, $6)
        ON CONFLICT (task_id) DO NOTHING
        RETURNING *
      `;

      const initialQuery = taskData.initialQuery || taskData.createdForInteraction || 'A2A interaction task';
      const primaryAgent = taskData.fromAgent || taskData.primaryAgent || 'orchestrator';

      const insertResult = await this.db.query(insertQuery, [
        userId,
        taskId,
        initialQuery,
        taskType,
        primaryAgent,
        new Date()
      ]);

      if (insertResult.rows.length > 0) {
        console.log(`📋 Task created: ${taskId}`);
        return insertResult.rows[0];
      }

      // If insert failed due to conflict, try to get the existing task again
      const retryResult = await this.db.query(existingQuery, [taskId]);
      return retryResult.rows[0];

    } catch (error) {
      console.warn(`⚠️ Could not ensure task exists: ${taskId}`, error.message);
      // Return a minimal task structure to allow the operation to continue
      return {
        task_id: taskId,
        user_id: userId,
        task_type: taskType,
        status: 'active'
      };
    }
  }

  /**
   * Log an agent interaction to the a2a_agent_interactions table
   * @param {Object} interaction - Interaction details
   * @param {number} interaction.userId - User ID for the session
   * @param {string} interaction.taskId - Unique task identifier
   * @param {string} interaction.interactionId - Unique interaction identifier
   * @param {string} interaction.interactionType - Type of interaction (delegation, handoff, query, etc.)
   * @param {string} interaction.fromAgent - Source agent name
   * @param {string} interaction.toAgent - Target agent name (optional)
   * @param {number} interaction.responseTimeMs - Response time in milliseconds
   * @param {boolean} interaction.success - Whether interaction was successful
   * @param {number} interaction.confidenceScore - Confidence score (0-1)
   * @param {string} interaction.reason - Reason for the interaction
   * @param {Object} interaction.contextPassed - Context data passed between agents
   * @param {Array} interaction.decisionFactors - Factors influencing the decision
   * @param {string} interaction.outcome - Outcome of the interaction
   * @param {Array} interaction.nextActions - Recommended next actions
   * @returns {Promise<Object>} Logged interaction record
   */  async logInteraction({
    userId,
    taskId,
    interactionId,
    interactionType,
    fromAgent,
    toAgent = null,
    responseTimeMs = null,
    success = true,
    confidenceScore = null,
    reason = null,
    contextPassed = {},
    decisionFactors = [],
    outcome = null,
    nextActions = []
  }) {
    try {
      // Ensure the task exists before logging the interaction
      await this.ensureTaskExists(taskId, userId, 'interaction', {
        interactionType,
        fromAgent,
        toAgent,
        createdForInteraction: interactionId
      });

      const query = `
        INSERT INTO a2a_agent_interactions (
          user_id, task_id, interaction_id, interaction_type, from_agent, to_agent,
          response_time_ms, success, confidence_score, reason, context_passed,
          decision_factors, outcome, next_actions, created_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `;

      const values = [
        userId,
        taskId,
        interactionId,
        interactionType,
        fromAgent,
        toAgent,
        responseTimeMs,
        success,
        confidenceScore,
        reason,
        JSON.stringify(contextPassed),
        JSON.stringify(decisionFactors),
        outcome,
        JSON.stringify(nextActions),
        new Date(),
        success ? new Date() : null
      ];

      const result = await this.db.query(query, values);
      
      console.log(`✅ A2A Interaction logged: ${fromAgent} → ${toAgent || 'system'} (${interactionType})`);
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error logging A2A interaction:', error);
      throw error;
    }
  }  /**
   * Ensure a chat session exists in a2a_chat_sessions table, create if it doesn't exist
   * @param {string} sessionIdentifier - Session identifier (string)
   * @param {number} userId - User ID
   * @returns {Promise<number>} Session ID (integer)
   * @private
   */
  async ensureSessionExists(sessionIdentifier, userId) {
    try {
      // First try to get existing session by a custom identifier approach
      // We'll use metadata to store the original identifier
      const existingQuery = `
        SELECT id FROM a2a_chat_sessions 
        WHERE user_id = $1 AND metadata->>'identifier' = $2
      `;
      const existingResult = await this.db.query(existingQuery, [userId, sessionIdentifier]);
      
      if (existingResult.rows.length > 0) {
        return existingResult.rows[0].id;
      }

      // Create new session if it doesn't exist
      const insertQuery = `
        INSERT INTO a2a_chat_sessions (
          user_id, session_name, agent_type, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;

      const sessionMetadata = {
        identifier: sessionIdentifier,
        createdForTransition: true
      };

      const insertResult = await this.db.query(insertQuery, [
        userId,
        `A2A Session ${sessionIdentifier}`,
        'agent_transition',
        JSON.stringify(sessionMetadata),
        new Date(),
        new Date()
      ]);

      console.log(`📋 Session created: ${sessionIdentifier} → ID: ${insertResult.rows[0].id}`);
      return insertResult.rows[0].id;

    } catch (error) {
      console.warn(`⚠️ Could not ensure session exists: ${sessionIdentifier}`, error.message);
      // Return a fallback approach - create a simple session
      try {
        const fallbackQuery = `
          INSERT INTO a2a_chat_sessions (user_id, session_name, agent_type, created_at, updated_at) 
          VALUES ($1, $2, 'fallback', $3, $4) 
          RETURNING id
        `;
        const fallbackResult = await this.db.query(fallbackQuery, [
          userId, 
          `Fallback Session ${Date.now()}`,
          new Date(), 
          new Date()
        ]);
        console.log(`📋 Fallback session created for: ${sessionIdentifier} → ID: ${fallbackResult.rows[0].id}`);
        return fallbackResult.rows[0].id;
      } catch (fallbackError) {
        console.error('Failed to create fallback session:', fallbackError.message);
        throw new Error(`Could not create session for identifier: ${sessionIdentifier}`);
      }
    }
  }/**
   * Log an agent transition to the a2a_agent_transitions table
   * @param {Object} transition - Transition details
   * @param {number} transition.userId - User ID for session creation
   * @param {string|number} transition.sessionId - Chat session ID (string identifier or integer)
   * @param {string} transition.fromAgent - Source agent
   * @param {string} transition.toAgent - Target agent
   * @param {string} transition.transitionReason - Reason for transition
   * @param {string} transition.transitionType - Type of transition (for reason if not provided)
   * @param {string} transition.reason - Alternative reason field
   * @param {number} transition.messageId - Associated message ID
   * @returns {Promise<Object>} Logged transition record
   */
  async logTransition({
    userId,
    sessionId,
    fromAgent,
    toAgent,
    transitionReason,
    transitionType,
    reason,
    messageId = null
  }) {
    try {
      // Ensure we have a proper session ID (integer)
      let actualSessionId;
      if (typeof sessionId === 'number') {
        actualSessionId = sessionId;
      } else {
        // sessionId is a string identifier, get or create the actual session
        actualSessionId = await this.ensureSessionExists(sessionId, userId);
      }

      // Use the most appropriate reason
      const finalReason = transitionReason || reason || transitionType || 'agent_delegation';

      const query = `
        INSERT INTO a2a_agent_transitions (
          session_id, from_agent, to_agent, transition_reason, message_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const values = [
        actualSessionId,
        fromAgent,
        toAgent,
        finalReason,
        messageId,
        new Date()
      ];

      const result = await this.db.query(query, values);
      
      console.log(`🔄 Agent transition logged: ${fromAgent} → ${toAgent} (${finalReason})`);
      
      // Update session analytics (use the actual session ID)
      await this.updateSessionAnalytics(actualSessionId, fromAgent, toAgent);
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error logging agent transition:', error);
      throw error;
    }
  }

  /**
   * Log file upload to a2a_file_uploads table
   * @param {Object} upload - File upload details
   * @param {number} upload.sessionId - Chat session ID
   * @param {number} upload.messageId - Message ID associated with upload
   * @param {string} upload.fileName - Original file name
   * @param {string} upload.fileUrl - URL to uploaded file
   * @param {string} upload.fileType - MIME type
   * @param {number} upload.fileSize - File size in bytes
   * @param {string} upload.uploadStatus - Upload status (pending, completed, failed)
   * @returns {Promise<Object>} Logged upload record
   */
  async logFileUpload({
    sessionId,
    messageId,
    fileName,
    fileUrl,
    fileType,
    fileSize,
    uploadStatus = 'completed'
  }) {
    try {
      const query = `
        INSERT INTO a2a_file_uploads (
          session_id, message_id, file_name, file_url, file_type, 
          file_size, upload_status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        sessionId,
        messageId,
        fileName,
        fileUrl,
        fileType,
        fileSize,
        uploadStatus,
        new Date()
      ];

      const result = await this.db.query(query, values);
      
      console.log(`📎 File upload logged: ${fileName} (${uploadStatus})`);
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error logging file upload:', error);
      throw error;
    }
  }  /**
   * Store message in a2a_messages table (comprehensive message logging)
   * @param {Object} message - Message details
   * @param {number} message.userId - User ID
   * @param {string} message.sessionId - Session ID (will be used to create taskId if not provided)
   * @param {string} message.taskId - Task ID (will be generated if not provided)
   * @param {string} message.messageId - Unique message ID (will be generated if not provided)
   * @param {string} message.content - Message content
   * @param {string} message.messageType - Type (user, assistant, system, etc.)
   * @param {string} message.format - Format (text, json, markdown, etc.)
   * @param {string} message.senderAgent - Sending agent
   * @param {string} message.recipientAgent - Recipient agent
   * @param {string} message.senderType - Sender type (user, agent, system)
   * @param {Object} message.metadata - Additional metadata
   * @param {Array} message.attachments - File attachments
   * @param {Array} message.referencedMessageIds - Referenced message IDs
   * @param {number} message.processingTimeMs - Processing time
   * @param {number} message.tokenCount - Token usage
   * @param {string} message.modelUsed - AI model used
   * @param {boolean} message.isInternal - Internal agent communication
   * @param {boolean} message.isError - Error message flag
   * @param {boolean} message.isSystem - System message flag
   * @param {boolean} message.requiresResponse - Requires response flag
   * @returns {Promise<Object>} Logged message record
   */
  async logMessage({
    userId,
    sessionId = null,
    taskId = null,
    messageId = null,
    content,
    messageType,
    format = 'text',
    senderAgent = null,
    recipientAgent = null,
    senderType,
    metadata = {},
    attachments = [],
    referencedMessageIds = [],
    processingTimeMs = null,
    tokenCount = null,
    modelUsed = null,
    isInternal = false,
    isError = false,
    isSystem = false,
    requiresResponse = false
  }) {
    try {
      // Generate taskId from sessionId if not provided
      const finalTaskId = taskId || (sessionId ? `session_task_${sessionId}` : `message_task_${userId}_${Date.now()}`);
      const finalMessageId = messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Ensure the task exists before logging the message
      await this.ensureTaskExists(finalTaskId, userId, 'message', {
        initialQuery: `Message: ${content.substring(0, 100)}...`,
        fromAgent: senderAgent || 'user',
        sessionId
      });

      const query = `
        INSERT INTO a2a_messages (
          user_id, task_id, message_id, content, message_type, format,
          sender_agent, recipient_agent, sender_type, metadata, attachments,
          referenced_message_ids, processing_time_ms, token_count, model_used,
          is_internal, is_error, is_system, requires_response, created_at,
          processed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING *
      `;

      const values = [
        userId,
        finalTaskId,
        finalMessageId,
        content,
        messageType,
        format,
        senderAgent,
        recipientAgent,
        senderType,
        JSON.stringify(metadata),
        JSON.stringify(attachments),
        JSON.stringify(referencedMessageIds),
        processingTimeMs,
        tokenCount,
        modelUsed,
        isInternal,
        isError,
        isSystem,
        requiresResponse,
        new Date(),
        !requiresResponse ? new Date() : null
      ];

      const result = await this.db.query(query, values);
      
      console.log(`💬 A2A Message logged: ${senderAgent || senderType} → ${recipientAgent || 'system'} (${messageType})`);
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error logging A2A message:', error);
      throw error;
    }
  }

  /**
   * Cache thread data in a2a_thread_cache table
   * @param {string} cacheKey - Unique cache key
   * @param {number} userId - User ID
   * @param {Object} cacheData - Data to cache
   * @param {number} ttlSeconds - Time to live in seconds (default: 30)
   * @returns {Promise<Object>} Cache record
   */  async cacheThreadData(cacheKey, userId, cacheData, ttlSeconds = 30) {
    try {
      const expiresAt = new Date(Date.now() + (ttlSeconds * 1000));
      
      // Ensure data is properly serialized
      let serializedData;
      try {
        serializedData = JSON.stringify(cacheData);
      } catch (serializeError) {
        console.error('❌ Error serializing cache data:', serializeError);
        throw new Error(`Failed to serialize cache data: ${serializeError.message}`);
      }
      
      const query = `
        INSERT INTO a2a_thread_cache (cache_key, user_id, cache_data, expires_at, created_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (cache_key) 
        DO UPDATE SET 
          cache_data = EXCLUDED.cache_data,
          expires_at = EXCLUDED.expires_at,
          created_at = EXCLUDED.created_at
        RETURNING *
      `;

      const values = [
        cacheKey,
        userId,
        serializedData,
        expiresAt,
        new Date()
      ];

      const result = await this.db.query(query, values);
      
      console.log(`🗄️ Thread data cached: ${cacheKey} (expires in ${ttlSeconds}s)`);
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error caching thread data:', error);
      throw error;
    }
  }
  /**
   * Retrieve cached thread data
   * @param {string} cacheKey - Cache key to retrieve
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Cached data or null if expired/not found
   */
  async getCachedThreadData(cacheKey, userId) {
    try {
      const query = `
        SELECT cache_data, expires_at 
        FROM a2a_thread_cache 
        WHERE cache_key = $1 AND user_id = $2 AND expires_at > NOW()
      `;

      const result = await this.db.query(query, [cacheKey, userId]);
      
      if (result.rows.length > 0) {
        console.log(`📥 Cache hit: ${cacheKey}`);
        const cacheData = result.rows[0].cache_data;
        
        // Handle different data types that might be stored
        if (typeof cacheData === 'string') {
          try {
            return JSON.parse(cacheData);
          } catch (parseError) {
            console.warn(`⚠️ Failed to parse cached JSON for ${cacheKey}:`, parseError.message);
            return null;
          }
        } else if (typeof cacheData === 'object') {
          // Already an object (JSONB column)
          return cacheData;
        } else {
          console.warn(`⚠️ Unexpected cache data type for ${cacheKey}:`, typeof cacheData);
          return null;
        }
      }
      
      console.log(`📭 Cache miss: ${cacheKey}`);
      return null;
    } catch (error) {
      console.error('❌ Error retrieving cached data:', error);
      return null;
    }
  }

  /**
   * Update session analytics in a2a_thread_analytics table
   * @param {number} sessionId - Session ID
   * @param {string} fromAgent - Previous agent
   * @param {string} toAgent - New agent
   * @private
   */  async updateSessionAnalytics(sessionId, fromAgent, toAgent) {
    try {
      // Update agents_involved array
      const query = `
        UPDATE a2a_thread_analytics 
        SET agents_involved = (
          SELECT DISTINCT jsonb_agg(agent) 
          FROM jsonb_array_elements_text(
            COALESCE(agents_involved, '[]'::jsonb) || 
            jsonb_build_array($2::text, $3::text)
          ) AS agent
        ),
        updated_at = NOW()
        WHERE session_id = $1
      `;

      await this.db.query(query, [sessionId, fromAgent, toAgent]);
      
    } catch (error) {
      console.error('❌ Error updating session analytics:', error);
    }
  }

  /**
   * Get interaction statistics for a user
   * @param {number} userId - User ID
   * @param {string} timeframe - Timeframe ('hour', 'day', 'week', 'month')
   * @returns {Promise<Object>} Interaction statistics
   */
  async getInteractionStats(userId, timeframe = 'day') {
    try {
      const intervals = {
        hour: '1 hour',
        day: '1 day',
        week: '1 week',
        month: '1 month'
      };

      const query = `
        SELECT 
          COUNT(*) as total_interactions,
          COUNT(CASE WHEN success = true THEN 1 END) as successful_interactions,
          AVG(response_time_ms) as avg_response_time,
          COUNT(DISTINCT from_agent) as unique_agents_used,
          array_agg(DISTINCT interaction_type) as interaction_types
        FROM a2a_agent_interactions 
        WHERE user_id = $1 
        AND created_at >= NOW() - INTERVAL '${intervals[timeframe] || '1 day'}'
      `;

      const result = await this.db.query(query, [userId]);
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error getting interaction stats:', error);
      throw error;
    }
  }

  /**
   * Clean up expired cache entries
   * @returns {Promise<number>} Number of entries cleaned
   */
  async cleanupExpiredCache() {
    try {
      const query = `
        DELETE FROM a2a_thread_cache 
        WHERE expires_at <= NOW()
      `;

      const result = await this.db.query(query);
      
      if (result.rowCount > 0) {
        console.log(`🧹 Cleaned up ${result.rowCount} expired cache entries`);
      }
      
      return result.rowCount;
    } catch (error) {
      console.error('❌ Error cleaning up cache:', error);
      return 0;
    }
  }

  /**
   * Store or update session context in a2a_session_context table
   * @param {Object} context - Session context details
   * @param {number} context.userId - User ID
   * @param {string} context.sessionId - Session identifier
   * @param {Array} context.conversationHistory - Conversation history
   * @param {Object} context.sharedContext - Shared context data
   * @param {Object} context.userPreferences - User preferences
   * @param {Array} context.activeTaskIds - Active task IDs
   * @param {string} context.currentAgent - Current active agent
   * @param {string} context.sessionState - Session state (active, paused, ended)
   * @param {Object} context.sessionMetadata - Additional metadata
   * @returns {Promise<Object>} Session context record
   */
  async updateSessionContext({
    userId,
    sessionId,
    conversationHistory = [],
    sharedContext = {},
    userPreferences = {},
    activeTaskIds = [],
    currentAgent = null,
    sessionState = 'active',
    sessionMetadata = {}
  }) {
    try {
      const query = `
        INSERT INTO a2a_session_context (
          user_id, session_id, conversation_history, shared_context,
          user_preferences, active_task_ids, current_agent, session_state,
          session_metadata, created_at, updated_at, last_activity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (user_id, session_id) 
        DO UPDATE SET
          conversation_history = EXCLUDED.conversation_history,
          shared_context = EXCLUDED.shared_context,
          user_preferences = EXCLUDED.user_preferences,
          active_task_ids = EXCLUDED.active_task_ids,
          current_agent = EXCLUDED.current_agent,
          session_state = EXCLUDED.session_state,
          session_metadata = EXCLUDED.session_metadata,
          updated_at = EXCLUDED.updated_at,
          last_activity = EXCLUDED.last_activity
        RETURNING *
      `;

      const values = [
        userId,
        sessionId,
        JSON.stringify(conversationHistory),
        JSON.stringify(sharedContext),
        JSON.stringify(userPreferences),
        JSON.stringify(activeTaskIds),
        currentAgent,
        sessionState,
        JSON.stringify(sessionMetadata),
        new Date(),
        new Date(),
        new Date()
      ];

      const result = await this.db.query(query, values);
      
      console.log(`📝 Session context updated for: ${sessionId}`);
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error updating session context:', error);
      throw error;
    }
  }

  /**
   * Get session context from a2a_session_context table
   * @param {number} userId - User ID
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object|null>} Session context or null
   */
  async getSessionContext(userId, sessionId) {
    try {
      const query = `
        SELECT 
          user_id,
          session_id,
          conversation_history,
          shared_context,
          user_preferences,
          active_task_ids,
          current_agent,
          session_state,
          session_metadata,
          created_at,
          updated_at,
          last_activity,
          expires_at
        FROM a2a_session_context 
        WHERE user_id = $1 AND session_id = $2
        AND (expires_at IS NULL OR expires_at > NOW())
      `;

      const result = await this.db.query(query, [userId, sessionId]);
      
      if (result.rows.length > 0) {
        const context = result.rows[0];
        // Parse JSON fields
        context.conversation_history = JSON.parse(context.conversation_history || '[]');
        context.shared_context = JSON.parse(context.shared_context || '{}');
        context.user_preferences = JSON.parse(context.user_preferences || '{}');
        context.active_task_ids = JSON.parse(context.active_task_ids || '[]');
        context.session_metadata = JSON.parse(context.session_metadata || '{}');
        
        console.log(`📖 Session context retrieved for: ${sessionId}`);
        return context;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting session context:', error);
      return null;
    }
  }

  /**
   * Add a task to session context active tasks
   * @param {number} userId - User ID
   * @param {string} sessionId - Session identifier
   * @param {string} taskId - Task ID to add
   * @returns {Promise<void>}
   */
  async addTaskToSessionContext(userId, sessionId, taskId) {
    try {
      const query = `
        UPDATE a2a_session_context 
        SET 
          active_task_ids = COALESCE(active_task_ids, '[]'::jsonb) || jsonb_build_array($3::text),
          updated_at = NOW(),
          last_activity = NOW()
        WHERE user_id = $1 AND session_id = $2
      `;

      await this.db.query(query, [userId, sessionId, taskId]);
      console.log(`📋 Task ${taskId} added to session context: ${sessionId}`);
    } catch (error) {
      console.error('❌ Error adding task to session context:', error);
    }
  }

  /**
   * Remove a task from session context active tasks
   * @param {number} userId - User ID
   * @param {string} sessionId - Session identifier
   * @param {string} taskId - Task ID to remove
   * @returns {Promise<void>}
   */
  async removeTaskFromSessionContext(userId, sessionId, taskId) {
    try {
      const query = `
        UPDATE a2a_session_context 
        SET 
          active_task_ids = (
            SELECT jsonb_agg(task_id) 
            FROM jsonb_array_elements_text(active_task_ids) task_id 
            WHERE task_id != $3
          ),
          updated_at = NOW(),
          last_activity = NOW()
        WHERE user_id = $1 AND session_id = $2
      `;

      await this.db.query(query, [userId, sessionId, taskId]);
      console.log(`📋 Task ${taskId} removed from session context: ${sessionId}`);
    } catch (error) {
      console.error('❌ Error removing task from session context:', error);
    }
  }
}

// Export singleton instance
const logger = new A2AInteractionLogger();

export default logger;