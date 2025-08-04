/**
 * A2A Database Operations
 * 
 * Database helper functions for A2A protocol persistence
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * A2A Database class for task and message persistence
 */
export class A2ADatabase {
  
  /**
   * Store a task in the database
   * @param {object} task - A2A task object
   * @param {string} jsonRpcId - JSON-RPC request ID
   * @param {object} metadata - Additional metadata
   * @returns {Promise<object>} Stored task with timestamps
   */
  async storeTask(task, jsonRpcId, metadata = {}) {
    const query = `
      INSERT INTO a2a_tasks (id, parent_id, agent_id, state, json_rpc_id, metadata, started_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        state = EXCLUDED.state,
        updated_at = NOW(),
        started_at = COALESCE(a2a_tasks.started_at, EXCLUDED.started_at),
        completed_at = CASE WHEN EXCLUDED.state IN ('completed', 'failed') THEN NOW() ELSE a2a_tasks.completed_at END,
        failed_at = CASE WHEN EXCLUDED.state = 'failed' THEN NOW() ELSE a2a_tasks.failed_at END
      RETURNING *
    `;
    
    const startedAt = task.state === 'working' ? new Date() : null;
    
    const values = [
      task.id,
      task.parentId || null,
      task.agentId || null,
      task.state,
      jsonRpcId,
      JSON.stringify(metadata),
      startedAt
    ];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('[A2ADatabase] Error storing task:', error);
      throw error;
    }
  }

  /**
   * Get a task by ID
   * @param {string} taskId - Task ID
   * @returns {Promise<object|null>} Task object or null if not found
   */
  async getTask(taskId) {
    const query = 'SELECT * FROM a2a_tasks WHERE id = $1';
    
    try {
      const result = await pool.query(query, [taskId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('[A2ADatabase] Error getting task:', error);
      throw error;
    }
  }

  /**
   * Update task state
   * @param {string} taskId - Task ID
   * @param {string} state - New task state
   * @param {object} options - Additional options
   * @returns {Promise<object>} Updated task
   */
  async updateTaskState(taskId, state, options = {}) {
    const { errorCode, errorMessage, metadata } = options;
    
    let query = `
      UPDATE a2a_tasks 
      SET state = $2, updated_at = NOW()
    `;
    let values = [taskId, state];
    let paramIndex = 3;

    if (state === 'completed') {
      query += `, completed_at = NOW()`;
    } else if (state === 'failed') {
      query += `, failed_at = NOW()`;
      if (errorCode) {
        query += `, error_code = $${paramIndex}`;
        values.push(errorCode);
        paramIndex++;
      }
      if (errorMessage) {
        query += `, error_message = $${paramIndex}`;
        values.push(errorMessage);
        paramIndex++;
      }
    }

    if (metadata) {
      query += `, metadata = $${paramIndex}`;
      values.push(JSON.stringify(metadata));
    }

    query += ` WHERE id = $1 RETURNING *`;

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('[A2ADatabase] Error updating task state:', error);
      throw error;
    }
  }

  /**
   * Store a message in the database
   * @param {string} taskId - Associated task ID
   * @param {object} message - A2A message object
   * @returns {Promise<object>} Stored message with timestamps
   */
  async storeMessage(taskId, message) {
    const query = `
      INSERT INTO a2a_messages (task_id, role, parts)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const values = [
      taskId,
      message.role || 'agent',
      JSON.stringify(message.parts)
    ];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('[A2ADatabase] Error storing message:', error);
      throw error;
    }
  }

  /**
   * Get messages for a task
   * @param {string} taskId - Task ID
   * @returns {Promise<Array>} Array of messages
   */
  async getTaskMessages(taskId) {
    const query = `
      SELECT * FROM a2a_messages 
      WHERE task_id = $1 
      ORDER BY created_at ASC
    `;
    
    try {
      const result = await pool.query(query, [taskId]);
      return result.rows.map(row => ({
        ...row,
        parts: typeof row.parts === 'string' ? JSON.parse(row.parts) : row.parts
      }));
    } catch (error) {
      console.error('[A2ADatabase] Error getting task messages:', error);
      throw error;
    }
  }

  /**
   * Get tasks that need to be retried (failed or stuck)
   * @param {number} timeoutMinutes - Consider tasks stuck after this many minutes
   * @returns {Promise<Array>} Array of tasks needing retry
   */
  async getTasksNeedingRetry(timeoutMinutes = 5) {
    const query = `
      SELECT * FROM a2a_tasks 
      WHERE (
        state = 'failed' 
        OR (state = 'working' AND updated_at < NOW() - INTERVAL '${timeoutMinutes} minutes')
      )
      AND created_at > NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
    `;
    
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('[A2ADatabase] Error getting tasks needing retry:', error);
      throw error;
    }
  }

  /**
   * Update agent health status
   * @param {string} agentId - Agent ID
   * @param {string} status - Health status
   * @param {object} healthData - Additional health data
   * @returns {Promise<object>} Updated agent record
   */
  async updateAgentHealth(agentId, status, healthData = {}) {
    const query = `
      UPDATE a2a_agents 
      SET status = $2, last_health_check = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [agentId, status]);
      return result.rows[0];
    } catch (error) {
      console.error('[A2ADatabase] Error updating agent health:', error);
      throw error;
    }
  }

  /**
   * Get all registered agents
   * @returns {Promise<Array>} Array of agent records
   */
  async getAgents() {
    const query = 'SELECT * FROM a2a_agents ORDER BY name';
    
    try {
      const result = await pool.query(query);
      return result.rows.map(row => ({
        ...row,
        capabilities: typeof row.capabilities === 'string' ? JSON.parse(row.capabilities) : row.capabilities,
        specialties: typeof row.specialties === 'string' ? JSON.parse(row.specialties) : row.specialties
      }));
    } catch (error) {
      console.error('[A2ADatabase] Error getting agents:', error);
      throw error;
    }
  }

  /**
   * Get task analytics
   * @param {object} options - Query options
   * @returns {Promise<object>} Analytics data
   */
  async getTaskAnalytics(options = {}) {
    const { since = '24 hours', agentId } = options;
    
    let whereClause = `WHERE created_at > NOW() - INTERVAL '${since}'`;
    const values = [];
    
    if (agentId) {
      whereClause += ` AND agent_id = $1`;
      values.push(agentId);
    }
    
    const query = `
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN state = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN state = 'failed' THEN 1 END) as failed_tasks,
        COUNT(CASE WHEN state = 'working' THEN 1 END) as working_tasks,
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_completion_time_seconds,
        agent_id
      FROM a2a_tasks 
      ${whereClause}
      GROUP BY agent_id
      ORDER BY total_tasks DESC
    `;
    
    try {
      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('[A2ADatabase] Error getting task analytics:', error);
      throw error;
    }
  }

  /**
   * Close database connection pool
   */
  async close() {
    await pool.end();
  }
}

// Export singleton instance
export const a2aDb = new A2ADatabase();
export default a2aDb;
