/**
 * Helper functions for chat routes
 */

import pool from '../db.js';
import jwt from 'jsonwebtoken';

/**
 * Retrieve conversations for a user
 * @param {string} userId - The user ID to retrieve conversations for
 * @returns {Promise<Array>} - Array of conversation objects
 */
export async function getConversationsForUser(userId) {
  try {
    if (!userId) {
      console.error('Missing userId in getConversationsForUser');
      return [];
    }

    console.log(`Fetching conversations for user: ${userId}`);

    // SECURITY FIX: Ensure we only get conversations where the user is a participant
    const query = `
      SELECT 
        c.id, 
        c.updated_at,
        c.is_group_chat,
        c.group_name,
        c.business_id,
        COALESCE(m.sender_name, 'Unknown') AS last_sender,
        COALESCE(m.content, '') AS last_message,
        m.created_at AS last_message_time
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.user_id = $1
      LEFT JOIN (
        SELECT DISTINCT ON (conversation_id)
          m.conversation_id,
          m.content,
          m.created_at,
          u.username AS sender_name
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        ORDER BY m.conversation_id, m.created_at DESC
      ) m ON c.id = m.conversation_id
      WHERE cp.user_id = $1
      ORDER BY c.updated_at DESC
    `;

    const result = await pool.query(query, [userId]);
    
    // If you need to calculate unread count, do it in a separate query
    const conversations = await Promise.all(result.rows.map(async (conversation) => {
      // Get the recipient (other participant) info for each conversation
      const participantQuery = `
        SELECT 
          u.id, 
          u.username,
          COALESCE(
            pp.professional_picture_url,
            u.profile_picture,
            '/images/default-profile.png'
          ) as profile_picture
        FROM conversation_participants cp
        JOIN users u ON cp.user_id = u.id
        LEFT JOIN professional_profiles pp ON u.id = pp.user_id
        WHERE cp.conversation_id = $1 AND cp.user_id != $2
        LIMIT 1
      `;
      
      const participantResult = await pool.query(participantQuery, [conversation.id, userId]);
      
      // Calculate unread count with a more secure query
      const unreadQuery = `
        SELECT COUNT(*) as unread_count
        FROM messages m
        JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id AND cp.user_id = $1
        WHERE m.conversation_id = $2
          AND m.sender_id != $1
          AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
      `;
      
      const unreadResult = await pool.query(unreadQuery, [userId, conversation.id]);
      
      return {
        ...conversation,
        unread_count: parseInt(unreadResult.rows[0].unread_count, 10) || 0,
        recipient: participantResult.rows[0] || null
      };
    }));
    
    return conversations;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }
}

/**
 * Retrieve a specific conversation by ID
 * @param {string} conversationId - The conversation ID
 * @param {string} userId - The user ID requesting the conversation
 * @returns {Promise<Object|null>} - Conversation object or null if not found
 */
export async function getConversationById(conversationId, userId) {
  try {
    if (!conversationId || !userId) {
      console.error('Missing required parameters in getConversationById');
      return null;
    }

    console.log(`Fetching conversation ${conversationId} for user ${userId}`);

    // SECURITY FIX: First, check if the user has access to this conversation
    const accessCheck = await pool.query(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );

    if (accessCheck.rows.length === 0) {
      console.error(`User ${userId} does not have access to conversation ${conversationId}`);
      return null;
    }

    // Fetch the conversation details with proper JOIN to ensure access
    const query = `
      SELECT 
        c.id, 
        c.is_group_chat,
        c.group_name, 
        c.created_at, 
        c.updated_at,
        c.business_id,
        b.business_name as business_name,
        (
          SELECT json_build_object(
            'id', u.id, 
            'name', u.username,
            'profile_picture', COALESCE(
              pp.professional_picture_url,
              u.profile_picture,
              '/images/default-profile.png'
            )
          )
          FROM conversation_participants cp
          JOIN users u ON cp.user_id = u.id
          LEFT JOIN professional_profiles pp ON u.id = pp.user_id
          WHERE cp.conversation_id = c.id AND cp.user_id != $2
          LIMIT 1
        ) as recipient
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.user_id = $2
      LEFT JOIN businesses b ON c.business_id = b.id
      WHERE c.id = $1
    `;

    const result = await pool.query(query, [conversationId, userId]);

    if (result.rows.length === 0) {
      console.error(`Conversation ${conversationId} not found`);
      return null;
    }

    const conversation = result.rows[0];

    // Mark the conversation as read
    await pool.query(
      `UPDATE conversation_participants 
       SET last_read_at = NOW()
       WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );

    // Fetch messages for this conversation with secure JOIN
    const messagesQuery = `
      SELECT 
        m.id,
        m.content,
        m.sender_id,
        m.created_at,
        m.message_type,
        m.quote_id,
        u.username as sender_name,
        u.profile_picture as sender_profile_pic,
        m.is_system_message
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id AND cp.user_id = $2
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC
    `;

    const messagesResult = await pool.query(messagesQuery, [conversationId, userId]);
    conversation.messages = messagesResult.rows;

    return conversation;
  } catch (error) {
    console.error('Error fetching conversation by ID:', error);
    return null;
  }
}

/**
 * Get token from request (header, cookie, or session)
 * @param {Object} req - Express request object
 * @returns {string|null} - JWT token or null if not found
 */
export function getTokenFromRequest(req) {
  // Check Authorization header
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  
  // Check cookies
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  
  // Check session if we have userId to create token
  if (req.session && req.session.userId) {
    try {
      return jwt.sign(
        { userId: req.session.userId },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    } catch (err) {
      console.error('Error creating token from session:', err);
    }
  }
  
  return null;
}

export default {
  getConversationsForUser,
  getConversationById,
  getTokenFromRequest
};