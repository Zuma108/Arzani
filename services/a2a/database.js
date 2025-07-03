import pool from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * A2A Database Service
 * Provides database persistence functions for A2A protocol operations
 * Used by the orchestrator for task state management and message logging
 */
class A2ADatabase {
  constructor() {
    this.pool = pool;
  }

  // ========== TASK STATE PERSISTENCE ==========
  
  /**
   * Create a new A2A task
   * @param {Object} taskData - Task creation data
   * @returns {Promise<Object>} Created task record
   */
  async createTask(taskData) {
    const {
      sessionId,
      userId,
      taskType,
      taskDescription,
      taskContext = {},
      assignedAgents = [],
      priority = 'medium',
      metadata = {}
    } = taskData;

    const taskId = uuidv4();
    
    const query = `
      INSERT INTO a2a_tasks (
        task_id, session_id, user_id, task_type, task_description,
        task_context, assigned_agents, priority, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      taskId,
      sessionId,
      userId,
      taskType,
      taskDescription,
      JSON.stringify(taskContext),
      JSON.stringify(assignedAgents),
      priority,
      JSON.stringify(metadata)
    ];

    try {
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating A2A task:', error);
      throw new Error(`Failed to create A2A task: ${error.message}`);
    }
  }

  /**
   * Update task state and progress
   * @param {string} taskId - Task ID to update
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated task record
   */
  async updateTask(taskId, updateData) {
    const allowedFields = [
      'task_state', 'progress_data', 'current_agent', 'started_at', 
      'completed_at', 'error_data', 'metadata'
    ];

    const setClause = [];
    const values = [];
    let paramIndex = 1;

    // Build dynamic update query
    Object.entries(updateData).forEach(([key, value]) => {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = $${paramIndex}`);
        
        // Handle JSON fields
        if (['progress_data', 'error_data', 'metadata'].includes(key)) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
        paramIndex++;
      }
    });

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Always update the updated_at timestamp
    setClause.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(taskId);

    const query = `
      UPDATE a2a_tasks 
      SET ${setClause.join(', ')}
      WHERE task_id = $${paramIndex}
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, values);
      if (result.rows.length === 0) {
        throw new Error(`Task with ID ${taskId} not found`);
      }
      return result.rows[0];
    } catch (error) {
      console.error('Error updating A2A task:', error);
      throw new Error(`Failed to update A2A task: ${error.message}`);
    }
  }

  /**
   * Get task by ID
   * @param {string} taskId - Task ID
   * @returns {Promise<Object|null>} Task record or null
   */
  async getTask(taskId) {
    const query = 'SELECT * FROM a2a_tasks WHERE task_id = $1';
    
    try {
      const result = await this.pool.query(query, [taskId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting A2A task:', error);
      throw new Error(`Failed to get A2A task: ${error.message}`);
    }
  }

  /**
   * Get tasks by session ID
   * @param {string} sessionId - Session ID
   * @param {string} state - Optional task state filter
   * @returns {Promise<Array>} Array of task records
   */
  async getTasksBySession(sessionId, state = null) {
    let query = 'SELECT * FROM a2a_tasks WHERE session_id = $1';
    const values = [sessionId];

    if (state) {
      query += ' AND task_state = $2';
      values.push(state);
    }

    query += ' ORDER BY created_at DESC';

    try {
      const result = await this.pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error getting A2A tasks by session:', error);
      throw new Error(`Failed to get A2A tasks: ${error.message}`);
    }
  }

  /**
   * Get active tasks for a user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of active task records
   */
  async getActiveTasks(userId) {
    const query = `
      SELECT * FROM a2a_tasks 
      WHERE user_id = $1 
        AND task_state IN ('pending', 'processing', 'active')
      ORDER BY created_at DESC
    `;

    try {
      const result = await this.pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting active A2A tasks:', error);
      throw new Error(`Failed to get active A2A tasks: ${error.message}`);
    }
  }

  // ========== MESSAGE LOGGING ==========

  /**
   * Log an A2A protocol message
   * @param {Object} messageData - Message data to log
   * @returns {Promise<Object>} Created message record
   */
  async logMessage(messageData) {
    const {
      taskId,
      sessionId,
      userId,
      senderType,
      senderAgent = null,
      receiverType,
      receiverAgent = null,
      messageType,
      content,
      structuredData = {},
      attachments = [],
      protocolVersion = '1.0',
      classificationData = null,
      metadata = {}
    } = messageData;

    const messageId = uuidv4();
    
    const query = `
      INSERT INTO a2a_messages (
        message_id, task_id, session_id, user_id, sender_type, sender_agent,
        receiver_type, receiver_agent, message_type, content, structured_data,
        attachments, protocol_version, classification_data, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const values = [
      messageId, taskId, sessionId, userId, senderType, senderAgent,
      receiverType, receiverAgent, messageType, content,
      JSON.stringify(structuredData), JSON.stringify(attachments),
      protocolVersion, classificationData ? JSON.stringify(classificationData) : null,
      JSON.stringify(metadata)
    ];

    try {
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error logging A2A message:', error);
      throw new Error(`Failed to log A2A message: ${error.message}`);
    }
  }

  /**
   * Get messages for a task
   * @param {string} taskId - Task ID
   * @param {number} limit - Maximum number of messages to return
   * @returns {Promise<Array>} Array of message records
   */
  async getMessagesByTask(taskId, limit = 100) {
    const query = `
      SELECT * FROM a2a_messages 
      WHERE task_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;

    try {
      const result = await this.pool.query(query, [taskId, limit]);
      return result.rows;
    } catch (error) {
      console.error('Error getting A2A messages by task:', error);
      throw new Error(`Failed to get A2A messages: ${error.message}`);
    }
  }

  /**
   * Get messages for a session
   * @param {string} sessionId - Session ID
   * @param {number} limit - Maximum number of messages to return
   * @returns {Promise<Array>} Array of message records
   */
  async getMessagesBySession(sessionId, limit = 100) {
    const query = `
      SELECT * FROM a2a_messages 
      WHERE session_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;

    try {
      const result = await this.pool.query(query, [sessionId, limit]);
      return result.rows;
    } catch (error) {
      console.error('Error getting A2A messages by session:', error);
      throw new Error(`Failed to get A2A messages: ${error.message}`);
    }
  }

  /**
   * Update message processing status
   * @param {string} messageId - Message ID
   * @param {string} status - Processing status
   * @returns {Promise<Object>} Updated message record
   */
  async updateMessageStatus(messageId, status) {
    const query = `
      UPDATE a2a_messages 
      SET processing_status = $1, processed_at = CURRENT_TIMESTAMP
      WHERE message_id = $2
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, [status, messageId]);
      if (result.rows.length === 0) {
        throw new Error(`Message with ID ${messageId} not found`);
      }
      return result.rows[0];
    } catch (error) {
      console.error('Error updating A2A message status:', error);
      throw new Error(`Failed to update A2A message status: ${error.message}`);
    }
  }

  // ========== AGENT INTERACTION TRACKING ==========

  /**
   * Log an agent interaction
   * @param {Object} interactionData - Interaction data to log
   * @returns {Promise<Object>} Created interaction record
   */
  async logAgentInteraction(interactionData) {
    const {
      taskId,
      messageId,
      userId,
      agentName,
      actionType,
      inputData = {},
      outputData = {},
      executionTimeMs = null,
      tokensUsed = 0,
      success = true,
      errorMessage = null,
      confidenceScore = null,
      reasoning = null,
      metadata = {}
    } = interactionData;

    const interactionId = uuidv4();
    
    const query = `
      INSERT INTO a2a_agent_interactions (
        interaction_id, task_id, message_id, user_id, agent_name, action_type,
        input_data, output_data, execution_time_ms, tokens_used, success,
        error_message, confidence_score, reasoning, completed_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      interactionId, taskId, messageId, userId, agentName, actionType,
      JSON.stringify(inputData), JSON.stringify(outputData), executionTimeMs,
      tokensUsed, success, errorMessage, confidenceScore, reasoning,
      new Date(), JSON.stringify(metadata)
    ];

    try {
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error logging A2A agent interaction:', error);
      throw new Error(`Failed to log A2A agent interaction: ${error.message}`);
    }
  }

  /**
   * Get agent interactions for a task
   * @param {string} taskId - Task ID
   * @returns {Promise<Array>} Array of interaction records
   */
  async getInteractionsByTask(taskId) {
    const query = `
      SELECT * FROM a2a_agent_interactions 
      WHERE task_id = $1 
      ORDER BY created_at DESC
    `;

    try {
      const result = await this.pool.query(query, [taskId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting A2A agent interactions by task:', error);
      throw new Error(`Failed to get A2A agent interactions: ${error.message}`);
    }
  }

  // ========== SESSION STATE MANAGEMENT ==========

  /**
   * Create or update session state
   * @param {Object} sessionData - Session data
   * @returns {Promise<Object>} Session state record
   */
  async upsertSessionState(sessionData) {
    const {
      sessionId,
      userId,
      conversationId = null,
      activeTasks = [],
      sessionContext = {},
      orchestratorState = {},
      expiresAt = null,
      metadata = {}
    } = sessionData;

    // Default to 24 hours from now if no expiration set
    const defaultExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const query = `
      INSERT INTO a2a_session_state (
        session_id, user_id, conversation_id, active_tasks, session_context,
        orchestrator_state, expires_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (session_id) 
      DO UPDATE SET
        active_tasks = EXCLUDED.active_tasks,
        session_context = EXCLUDED.session_context,
        orchestrator_state = EXCLUDED.orchestrator_state,
        last_activity = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP,
        expires_at = COALESCE(EXCLUDED.expires_at, a2a_session_state.expires_at),
        metadata = EXCLUDED.metadata
      RETURNING *
    `;

    const values = [
      sessionId, userId, conversationId,
      JSON.stringify(activeTasks), JSON.stringify(sessionContext),
      JSON.stringify(orchestratorState), expiresAt || defaultExpiry,
      JSON.stringify(metadata)
    ];

    try {
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error upserting A2A session state:', error);
      throw new Error(`Failed to upsert A2A session state: ${error.message}`);
    }
  }

  /**
   * Get session state by session ID
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object|null>} Session state record or null
   */
  async getSessionState(sessionId) {
    const query = `
      SELECT * FROM a2a_session_state 
      WHERE session_id = $1 AND is_active = true
    `;

    try {
      const result = await this.pool.query(query, [sessionId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting A2A session state:', error);
      throw new Error(`Failed to get A2A session state: ${error.message}`);
    }
  }

  /**
   * Update session activity timestamp
   * @param {string} sessionId - Session ID
   * @returns {Promise<void>}
   */
  async updateSessionActivity(sessionId) {
    const query = `
      UPDATE a2a_session_state 
      SET last_activity = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE session_id = $1 AND is_active = true
    `;

    try {
      await this.pool.query(query, [sessionId]);
    } catch (error) {
      console.error('Error updating A2A session activity:', error);
      throw new Error(`Failed to update A2A session activity: ${error.message}`);
    }
  }

  /**
   * Deactivate session
   * @param {string} sessionId - Session ID
   * @returns {Promise<void>}
   */
  async deactivateSession(sessionId) {
    const query = `
      UPDATE a2a_session_state 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE session_id = $1
    `;

    try {
      await this.pool.query(query, [sessionId]);
    } catch (error) {
      console.error('Error deactivating A2A session:', error);
      throw new Error(`Failed to deactivate A2A session: ${error.message}`);
    }
  }

  /**
   * Get active sessions view
   * @param {number} userId - Optional user ID filter
   * @returns {Promise<Array>} Array of active session records with tasks
   */
  async getActiveSessions(userId = null) {
    let query = 'SELECT * FROM a2a_active_sessions';
    const values = [];

    if (userId) {
      query += ' WHERE user_id = $1';
      values.push(userId);
    }

    query += ' ORDER BY last_activity DESC LIMIT 50';

    try {
      const result = await this.pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error getting A2A active sessions:', error);
      throw new Error(`Failed to get A2A active sessions: ${error.message}`);
    }
  }

  // ========== UTILITY FUNCTIONS ==========

  /**
   * Clean up expired sessions and completed tasks
   * @returns {Promise<Object>} Cleanup statistics
   */
  async cleanup() {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Deactivate expired sessions
      const expiredSessionsResult = await client.query(`
        UPDATE a2a_session_state 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE expires_at < CURRENT_TIMESTAMP AND is_active = true
        RETURNING session_id
      `);

      // Mark old completed tasks for archival (older than 30 days)
      const oldTasksResult = await client.query(`
        UPDATE a2a_tasks 
        SET metadata = COALESCE(metadata, '{}')::jsonb || '{"archived": true}'::jsonb
        WHERE task_state IN ('completed', 'failed', 'cancelled') 
          AND completed_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
          AND NOT (COALESCE(metadata, '{}')::jsonb ? 'archived')
        RETURNING task_id
      `);

      await client.query('COMMIT');

      return {
        expiredSessions: expiredSessionsResult.rows.length,
        archivedTasks: oldTasksResult.rows.length,
        cleanupTime: new Date()
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error during A2A cleanup:', error);
      throw new Error(`Failed to cleanup A2A data: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get A2A database statistics
   * @returns {Promise<Object>} Database statistics
   */
  async getStats() {
    try {
      const stats = await this.pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM a2a_tasks) as total_tasks,
          (SELECT COUNT(*) FROM a2a_tasks WHERE task_state IN ('pending', 'processing', 'active')) as active_tasks,
          (SELECT COUNT(*) FROM a2a_messages) as total_messages,
          (SELECT COUNT(*) FROM a2a_agent_interactions) as total_interactions,
          (SELECT COUNT(*) FROM a2a_session_state WHERE is_active = true) as active_sessions,
          (SELECT COUNT(*) FROM a2a_session_state WHERE expires_at < CURRENT_TIMESTAMP) as expired_sessions
      `);

      return stats.rows[0];
    } catch (error) {
      console.error('Error getting A2A stats:', error);
      throw new Error(`Failed to get A2A stats: ${error.message}`);
    }
  }
}

// Create singleton instance
const a2aDB = new A2ADatabase();

export default a2aDB;
export { A2ADatabase };
