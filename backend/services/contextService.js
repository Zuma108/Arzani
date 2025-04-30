/**
 * Conversation Context Service
 * Manages persistent memory and conversation context for AI agents
 */

import pool from '../../db.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create or update conversation session
 * @param {Object} sessionData - Session data
 * @returns {Promise<Object>} - Session object
 */
export const createOrUpdateSession = async (sessionData) => {
  try {
    const { sessionId, userId, anonymousId, metadata = {} } = sessionData;
    
    // If session ID provided, try to update existing session
    if (sessionId) {
      const updateResult = await pool.query(
        `UPDATE ai_sessions
         SET updated_at = NOW(),
             metadata = metadata || $1
         WHERE id = $2
         RETURNING *`,
        [metadata, sessionId]
      );
      
      if (updateResult.rows.length > 0) {
        return updateResult.rows[0];
      }
      
      // Session not found with provided ID, create new one
      console.log(`Session ${sessionId} not found, creating new session`);
    }
    
    // Generate new session ID if not provided
    const newSessionId = sessionId || uuidv4();
    
    // Create new session
    const result = await pool.query(
      `INSERT INTO ai_sessions 
       (id, user_id, anonymous_id, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [newSessionId, userId || null, anonymousId || null, metadata]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating/updating session:', error);
    throw error;
  }
};

/**
 * Save message to conversation history
 * @param {Object} messageData - Message data
 * @returns {Promise<Object>} - Saved message
 */
export const saveMessage = async (messageData) => {
  try {
    const { 
      sessionId, 
      role, 
      content,
      tokens = 0,
      agentType = 'generalist',
      embedding = null,
      metadata = {}
    } = messageData;
    
    if (!sessionId || !role || !content) {
      throw new Error('Session ID, role, and content are required');
    }
    
    // Insert message
    const result = await pool.query(
      `INSERT INTO ai_messages
       (session_id, role, content, tokens, agent_type, embedding, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [sessionId, role, content, tokens, agentType, embedding, metadata]
    );
    
    // Update session last activity
    await pool.query(
      `UPDATE ai_sessions
       SET updated_at = NOW(),
           message_count = message_count + 1
       WHERE id = $1`,
      [sessionId]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error saving message:', error);
    throw error;
  }
};

/**
 * Get conversation history for a session
 * @param {string} sessionId - Session ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Messages array
 */
export const getConversationHistory = async (sessionId, options = {}) => {
  try {
    const {
      limit = 20,
      offset = 0,
      includeMetadata = false,
      includeEmbeddings = false
    } = options;
    
    // Build SELECT clause based on options
    const selectClause = includeMetadata && includeEmbeddings
      ? '*'
      : `id, session_id, role, content, tokens, agent_type, created_at${
          includeMetadata ? ', metadata' : ''
        }${includeEmbeddings ? ', embedding' : ''}`;
    
    // Get messages
    const result = await pool.query(
      `SELECT ${selectClause}
       FROM ai_messages
       WHERE session_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [sessionId, limit, offset]
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error getting conversation history:', error);
    throw error;
  }
};

/**
 * Save session state for workflow resumption
 * @param {string} sessionId - Session ID
 * @param {string} stage - Current workflow stage
 * @param {Object} payload - State data
 * @returns {Promise<Object>} - Saved state
 */
export const saveSessionState = async (sessionId, stage, payload) => {
  try {
    // Check if state exists
    const stateCheck = await pool.query(
      `SELECT id FROM session_state WHERE session_id = $1`,
      [sessionId]
    );
    
    if (stateCheck.rows.length > 0) {
      // Update existing state
      const result = await pool.query(
        `UPDATE session_state
         SET stage = $1, payload = $2, updated_at = NOW()
         WHERE session_id = $3
         RETURNING *`,
        [stage, payload, sessionId]
      );
      
      return result.rows[0];
    } else {
      // Create new state
      const result = await pool.query(
        `INSERT INTO session_state
         (session_id, stage, payload, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING *`,
        [sessionId, stage, payload]
      );
      
      return result.rows[0];
    }
  } catch (error) {
    console.error('Error saving session state:', error);
    throw error;
  }
};

/**
 * Get session state
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object|null>} - Session state or null if not found
 */
export const getSessionState = async (sessionId) => {
  try {
    const result = await pool.query(
      `SELECT * FROM session_state WHERE session_id = $1`,
      [sessionId]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error getting session state:', error);
    throw error;
  }
};

/**
 * Find similar conversations using vector similarity
 * @param {Array} embedding - Query embedding vector
 * @param {Object} options - Search options
 * @returns {Promise<Array>} - Similar messages
 */
export const findSimilarMessages = async (embedding, options = {}) => {
  try {
    const {
      limit = 5,
      threshold = 0.8,
      userId = null
    } = options;
    
    // If pgvector extension is available, use vector similarity search
    const result = await pool.query(
      `SELECT m.id, m.session_id, m.role, m.content, m.created_at,
              s.user_id, 1 - (m.embedding <-> $1) as similarity
       FROM ai_messages m
       JOIN ai_sessions s ON m.session_id = s.id
       WHERE m.embedding IS NOT NULL
       ${userId ? 'AND s.user_id = $3' : ''}
       ORDER BY m.embedding <-> $1
       LIMIT $2`,
      userId ? [embedding, limit, userId] : [embedding, limit]
    );
    
    // Filter by similarity threshold
    return result.rows.filter(row => row.similarity >= threshold);
  } catch (error) {
    console.error('Error finding similar messages:', error);
    
    // If pgvector error, return empty array
    if (error.message.includes('operator does not exist')) {
      console.warn('pgvector extension not available or embedding column not vector type');
      return [];
    }
    
    throw error;
  }
};

export default {
  createOrUpdateSession,
  saveMessage,
  getConversationHistory,
  saveSessionState,
  getSessionState,
  findSimilarMessages
};
