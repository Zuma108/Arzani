/**
 * A2A Database Service
 * 
 * Provides database operations for A2A tasks, messages, and agent interactions
 * Integrates with the orchestrator to persist task state and message history
 */

import pool from '../../db/index.js';
import { generateTaskId } from '../../libs/a2a/utils.js';

/**
 * A2A Database Service class for task and message persistence
 */
export class A2ADatabaseService {
  constructor() {
    this.pool = pool;
  }

  /**
   * Create a new A2A task and persist to database
   * @param {object} options - Task creation options
   * @returns {Promise<object>} Created task data
   */
  async createA2ATask({
    userId,
    taskId = generateTaskId(),
    initialQuery,
    taskType,
    primaryAgent,
    classificationConfidence,
    classificationReasoning,
    aiInsights = {},
    assignedAgents = [],
    metadata = {},
    context = {},
    requirements = {},
    priority = 5
  }) {
    try {
      const query = `
        INSERT INTO a2a_tasks (
          user_id, task_id, initial_query, task_type, status,
          primary_agent, classification_confidence, classification_reasoning, ai_insights,
          assigned_agents, metadata, context, requirements, priority,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        RETURNING *
      `;

      const values = [
        userId,
        taskId,
        initialQuery,
        taskType,
        primaryAgent,
        classificationConfidence,
        classificationReasoning,
        JSON.stringify(aiInsights),
        JSON.stringify(assignedAgents),
        JSON.stringify(metadata),
        JSON.stringify(context),
        JSON.stringify(requirements),
        priority
      ];

      const result = await this.pool.query(query, values);
      const task = result.rows[0];

      console.log(`[A2A-DB] Created task ${taskId} for user ${userId}`);
      return task;

    } catch (error) {
      console.error('[A2A-DB] Error creating task:', error);
      throw new Error(`Failed to create A2A task: ${error.message}`);
    }
  }

  /**
   * Log an A2A message to the database
   * @param {object} options - Message logging options
   * @returns {Promise<object>} Created message data
   */
  async logA2AMessage({
    userId,
    taskId,
    messageId = generateTaskId(),
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
      const query = `
        INSERT INTO a2a_messages (
          user_id, task_id, message_id, content, message_type, format,
          sender_agent, recipient_agent, sender_type, metadata, attachments,
          referenced_message_ids, processing_time_ms, token_count, model_used,
          is_internal, is_error, is_system, requires_response,
          created_at, processed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
        RETURNING *
      `;

      const values = [
        userId,
        taskId,
        messageId,
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
        requiresResponse
      ];

      const result = await this.pool.query(query, values);
      const message = result.rows[0];

      console.log(`[A2A-DB] Logged message ${messageId} for task ${taskId}`);
      return message;

    } catch (error) {
      console.error('[A2A-DB] Error logging message:', error);
      throw new Error(`Failed to log A2A message: ${error.message}`);
    }
  }

  /**
   * Update A2A task status and metadata
   * @param {string} taskId - Task ID to update
   * @param {object} updates - Fields to update
   * @returns {Promise<object>} Updated task data
   */
  async updateA2ATaskStatus(taskId, updates) {
    try {
      const allowedFields = [
        'status', 'current_agent', 'progress_percentage', 'steps_completed',
        'total_steps', 'current_step', 'result', 'final_response',
        'deliverables', 'error_count', 'last_error', 'retry_count',
        'started_at', 'completed_at', 'estimated_completion', 'agent_handoffs'
      ];

      const setClause = [];
      const values = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (allowedFields.includes(key)) {
          if (['result', 'deliverables'].includes(key) && typeof value === 'object') {
            setClause.push(`${key} = $${paramIndex}`);
            values.push(JSON.stringify(value));
          } else {
            setClause.push(`${key} = $${paramIndex}`);
            values.push(value);
          }
          paramIndex++;
        }
      });

      if (setClause.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Always update the updated_at timestamp
      setClause.push(`updated_at = NOW()`);

      const query = `
        UPDATE a2a_tasks 
        SET ${setClause.join(', ')}
        WHERE task_id = $${paramIndex}
        RETURNING *
      `;

      values.push(taskId);
      const result = await this.pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error(`Task ${taskId} not found`);
      }

      const task = result.rows[0];
      console.log(`[A2A-DB] Updated task ${taskId} status to ${updates.status || 'unchanged'}`);
      return task;

    } catch (error) {
      console.error('[A2A-DB] Error updating task status:', error);
      throw new Error(`Failed to update A2A task status: ${error.message}`);
    }
  }

  /**
   * Record an agent interaction for collaboration tracking
   * @param {object} options - Agent interaction options
   * @returns {Promise<object>} Created interaction data
   */
  async recordAgentInteraction({
    userId,
    taskId,
    interactionId = generateTaskId(),
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
      const query = `
        INSERT INTO a2a_agent_interactions (
          user_id, task_id, interaction_id, interaction_type,
          from_agent, to_agent, response_time_ms, success,
          confidence_score, reason, context_passed, decision_factors,
          outcome, next_actions, created_at, completed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
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
        JSON.stringify(nextActions)
      ];

      const result = await this.pool.query(query, values);
      const interaction = result.rows[0];

      console.log(`[A2A-DB] Recorded ${interactionType} interaction from ${fromAgent} to ${toAgent || 'user'}`);
      return interaction;

    } catch (error) {
      console.error('[A2A-DB] Error recording agent interaction:', error);
      throw new Error(`Failed to record agent interaction: ${error.message}`);
    }
  }

  /**
   * Get A2A task by task ID
   * @param {string} taskId - Task ID to retrieve
   * @returns {Promise<object|null>} Task data or null if not found
   */
  async getA2ATask(taskId) {
    try {
      const query = `
        SELECT * FROM a2a_tasks 
        WHERE task_id = $1
      `;

      const result = await this.pool.query(query, [taskId]);
      return result.rows[0] || null;

    } catch (error) {
      console.error('[A2A-DB] Error retrieving task:', error);
      throw new Error(`Failed to retrieve A2A task: ${error.message}`);
    }
  }

  /**
   * Get A2A messages for a task
   * @param {string} taskId - Task ID to get messages for
   * @param {number} limit - Maximum number of messages to return
   * @returns {Promise<Array>} Array of message data
   */
  async getA2AMessages(taskId, limit = 50) {
    try {
      const query = `
        SELECT * FROM a2a_messages 
        WHERE task_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `;

      const result = await this.pool.query(query, [taskId, limit]);
      return result.rows;

    } catch (error) {
      console.error('[A2A-DB] Error retrieving messages:', error);
      throw new Error(`Failed to retrieve A2A messages: ${error.message}`);
    }
  }

  /**
   * Get recent A2A tasks for a user
   * @param {number} userId - User ID to get tasks for
   * @param {number} limit - Maximum number of tasks to return
   * @returns {Promise<Array>} Array of task data
   */
  async getUserA2ATasks(userId, limit = 20) {
    try {
      const query = `
        SELECT * FROM a2a_tasks 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `;

      const result = await this.pool.query(query, [userId, limit]);
      return result.rows;

    } catch (error) {
      console.error('[A2A-DB] Error retrieving user tasks:', error);
      throw new Error(`Failed to retrieve user A2A tasks: ${error.message}`);
    }
  }

  /**
   * Initialize database tables if they don't exist
   * @returns {Promise<boolean>} True if initialization successful
   */
  async initializeDatabase() {
    try {
      // Check if a2a_tasks table exists
      const tableCheck = await this.pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'a2a_tasks'
        )
      `);

      if (!tableCheck.rows[0].exists) {
        console.log('[A2A-DB] A2A tables not found. Please run the a2a_database_tables.sql script first.');
        return false;
      }

      console.log('[A2A-DB] Database tables verified successfully');
      return true;

    } catch (error) {
      console.error('[A2A-DB] Error initializing database:', error);
      return false;
    }
  }

  /**
   * Get performance metrics for A2A system
   * @param {number} daysBack - Number of days to look back for metrics
   * @returns {Promise<object>} Performance metrics data
   */
  async getPerformanceMetrics(daysBack = 7) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_tasks,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tasks,
          AVG(classification_confidence) as avg_confidence,
          AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_completion_time_seconds,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT primary_agent) as agents_used
        FROM a2a_tasks 
        WHERE created_at >= NOW() - INTERVAL '${daysBack} days'
      `;

      const result = await this.pool.query(query);
      const metrics = result.rows[0];

      // Calculate success rate
      const successRate = metrics.total_tasks > 0 
        ? (metrics.completed_tasks / metrics.total_tasks * 100).toFixed(2)
        : 0;

      return {
        ...metrics,
        success_rate: parseFloat(successRate),
        avg_completion_time_minutes: metrics.avg_completion_time_seconds 
          ? (metrics.avg_completion_time_seconds / 60).toFixed(2)
          : null
      };

    } catch (error) {
      console.error('[A2A-DB] Error retrieving performance metrics:', error);
      throw new Error(`Failed to retrieve performance metrics: ${error.message}`);
    }
  }

  /**
   * Get a specific task by ID
   * @param {string} taskId - Task ID to retrieve
   * @returns {Promise<object>} Task data
   */
  async getTaskById(taskId) {
    try {
      const query = `
        SELECT * FROM a2a_tasks 
        WHERE task_id = $1
      `;

      const result = await this.pool.query(query, [taskId]);
      return result.rows[0] || null;

    } catch (error) {
      console.error('[A2A-DB] Error retrieving task by ID:', error);
      throw new Error(`Failed to retrieve task: ${error.message}`);
    }
  }

  /**
   * Get all messages for a specific task
   * @param {string} taskId - Task ID to get messages for
   * @returns {Promise<Array>} Array of message data
   */
  async getMessagesByTaskId(taskId) {
    try {
      const query = `
        SELECT * FROM a2a_messages 
        WHERE task_id = $1 
        ORDER BY created_at ASC
      `;

      const result = await this.pool.query(query, [taskId]);
      return result.rows;

    } catch (error) {
      console.error('[A2A-DB] Error retrieving messages by task ID:', error);
      throw new Error(`Failed to retrieve messages: ${error.message}`);
    }
  }

  /**
   * Get all agent interactions for a specific task
   * @param {string} taskId - Task ID to get interactions for
   * @returns {Promise<Array>} Array of interaction data
   */
  async getAgentInteractionsByTaskId(taskId) {
    try {
      const query = `
        SELECT * FROM a2a_agent_interactions 
        WHERE task_id = $1 
        ORDER BY created_at ASC
      `;

      const result = await this.pool.query(query, [taskId]);
      return result.rows;

    } catch (error) {
      console.error('[A2A-DB] Error retrieving agent interactions by task ID:', error);
      throw new Error(`Failed to retrieve agent interactions: ${error.message}`);
    }
  }
}

// Export singleton instance
export const a2aDatabase = new A2ADatabaseService();
export default a2aDatabase;
