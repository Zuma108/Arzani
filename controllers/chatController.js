const pool = require('../db');
const { formatProfilePicture } = require('../utils/imageHelper');

/**
 * Chat Controller
 * Handles business logic for chat functionality
 */
const chatController = {
  /**
   * Get all conversations for a user
   */
  getUserConversations: async (req, res) => {
    try {
      const userId = req.user.userId;
      
      // Get user's conversations with enhanced profile data
      const conversationsResult = await pool.query(`
        SELECT c.id, c.updated_at, c.is_group_chat, c.is_ai_chat, c.group_name, c.business_id,
               (SELECT COUNT(*) FROM messages m 
                WHERE m.conversation_id = c.id 
                AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamp)
                AND m.sender_id != $1) as unread_count
        FROM conversations c
        JOIN conversation_participants cp ON c.id = cp.conversation_id
        WHERE cp.user_id = $1
        ORDER BY c.updated_at DESC
      `, [userId]);
      
      const conversations = conversationsResult.rows;
      
      // Load other participants for each conversation
      for (const conversation of conversations) {
        // Get other participant's basic info for each conversation
        const otherParticipantResult = await pool.query(`
          SELECT u.id, u.username, u.profile_picture, u.last_active
          FROM conversation_participants cp
          JOIN users u ON cp.user_id = u.id
          WHERE cp.conversation_id = $1 AND u.id != $2
          LIMIT 1
        `, [conversation.id, userId]);
        
        if (otherParticipantResult.rows.length > 0) {
          conversation.participants = otherParticipantResult.rows;
          
          // Process profile pictures
          conversation.participants.forEach(participant => {
            if (participant.profile_picture) {
              participant.profile_picture = formatProfilePicture(participant.profile_picture);
            }
          });
        } else {
          conversation.participants = [];
        }
        
        // Get last message for preview
        const lastMessageResult = await pool.query(`
          SELECT id, sender_id, content, created_at, is_system_message
          FROM messages
          WHERE conversation_id = $1
          ORDER BY created_at DESC
          LIMIT 1
        `, [conversation.id]);
        
        if (lastMessageResult.rows.length > 0) {
          conversation.lastMessage = lastMessageResult.rows[0];
          
          // Get sender info if not a system message
          if (!conversation.lastMessage.is_system_message && conversation.lastMessage.sender_id) {
            const senderResult = await pool.query(`
              SELECT username FROM users WHERE id = $1
            `, [conversation.lastMessage.sender_id]);
            
            if (senderResult.rows.length > 0) {
              conversation.lastMessage.sender_name = senderResult.rows[0].username;
            }
          }
        }
      }
      
      return res.json({ success: true, conversations });
    } catch (error) {
      console.error('Error getting user conversations:', error);
      return res.status(500).json({ success: false, message: 'Failed to get conversations' });
    }
  },
  
  /**
   * Get a specific conversation with messages
   */
  getConversation: async (req, res) => {
    try {
      const userId = req.user.userId;
      const conversationId = req.params.id;
      
      // Check if user is a participant
      const participantCheck = await pool.query(
        'SELECT * FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, userId]
      );
      
      if (participantCheck.rows.length === 0) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this conversation' });
      }
      
      // Get conversation details with business info if related to a business
      const conversationResult = await pool.query(`
        SELECT c.*, 
               CASE WHEN c.is_group_chat THEN c.group_name ELSE NULL END as conversation_name,
               b.business_name, b.id as business_id, b.price, b.industry, b.location
        FROM conversations c
        LEFT JOIN businesses b ON c.business_id = b.id
        WHERE c.id = $1
      `, [conversationId]);
      
      if (conversationResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Conversation not found' });
      }
      
      const conversation = conversationResult.rows[0];
      
      // Check if this conversation was created from a business inquiry
      const inquiryResult = await pool.query(`
        SELECT id, timeframe, created_at
        FROM business_inquiries
        WHERE conversation_id = $1
        LIMIT 1
      `, [conversationId]);
      
      if (inquiryResult.rows.length > 0) {
        conversation.inquiry = inquiryResult.rows[0];
      }
      
      // Get participants with profile data
      const participantsResult = await pool.query(`
        SELECT u.id, u.username, u.profile_picture, u.last_active, cp.is_admin
        FROM conversation_participants cp
        JOIN users u ON cp.user_id = u.id
        WHERE cp.conversation_id = $1
      `, [conversationId]);
      
      conversation.participants = participantsResult.rows.map(participant => ({
        ...participant,
        profile_picture: formatProfilePicture(participant.profile_picture)
      }));
      
      // Get messages
      const messagesResult = await pool.query(`
        SELECT m.id, m.sender_id, m.content, m.created_at, m.is_system_message, m.parent_message_id,
               u.username as sender_name, u.profile_picture as sender_profile_pic
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = $1
        ORDER BY m.created_at ASC
      `, [conversationId]);
      
      // Process messages and add reactions
      const messages = messagesResult.rows;
      for (const message of messages) {
        // Format profile pic
        if (message.sender_profile_pic) {
          message.sender_profile_pic = formatProfilePicture(message.sender_profile_pic);
        }
        
        // Get reactions for this message
        const reactionsResult = await pool.query(`
          SELECT mr.reaction, u.username, u.id as user_id
          FROM message_reactions mr
          JOIN users u ON mr.user_id = u.id
          WHERE mr.message_id = $1
        `, [message.id]);
        
        message.reactions = reactionsResult.rows;
      }
      
      conversation.messages = messages;
      
      // Update last_read_at for this user
      await pool.query(`
        UPDATE conversation_participants 
        SET last_read_at = NOW() 
        WHERE conversation_id = $1 AND user_id = $2
      `, [conversationId, userId]);
      
      // Return conversation with business context
      return res.json({ 
        success: true, 
        conversation,
        businessContext: conversation.business_id ? {
          id: conversation.business_id,
          name: conversation.business_name,
          price: conversation.price,
          industry: conversation.industry,
          location: conversation.location
        } : null
      });
    } catch (error) {
      console.error('Error getting conversation:', error);
      return res.status(500).json({ success: false, message: 'Failed to get conversation details' });
    }
  },
  
  /**
   * Get all business inquiry conversations
   */
  getBusinessInquiryConversations: async (req, res) => {
    try {
      const userId = req.user.userId;
      
      // Get conversations related to business inquiries
      const conversationsResult = await pool.query(`
        SELECT c.id, c.updated_at, c.business_id, b.business_name,
               u.username as other_user_name, u.id as other_user_id, u.profile_picture,
               bi.timeframe, bi.created_at as inquiry_date
        FROM conversations c
        JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = $1
        JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id != $1
        JOIN users u ON cp2.user_id = u.id
        JOIN business_inquiries bi ON bi.conversation_id = c.id
        LEFT JOIN businesses b ON c.business_id = b.id
        ORDER BY c.updated_at DESC
      `, [userId]);
      
      return res.json({ 
        success: true, 
        inquiryConversations: conversationsResult.rows 
      });
    } catch (error) {
      console.error('Error getting business inquiry conversations:', error);
      return res.status(500).json({ success: false, message: 'Failed to get inquiry conversations' });
    }
  },

  /**
   * Start a new conversation
   */
  startConversation: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { otherUserId, businessId, initialMessage, formId } = req.body;
      
      // Validate other user exists
      const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [otherUserId]);
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      // Check if business exists if businessId is provided
      if (businessId) {
        const businessCheck = await pool.query('SELECT id FROM businesses WHERE id = $1', [businessId]);
        if (businessCheck.rows.length === 0) {
          return res.status(404).json({ success: false, message: 'Business not found' });
        }
      }
      
      // Check if conversation already exists between these users
      const existingConversationQuery = `
        SELECT c.id 
        FROM conversations c
        JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = $1
        JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = $2
        WHERE c.is_group_chat = FALSE
        ${businessId ? 'AND c.business_id = $3' : 'AND c.business_id IS NULL'}
      `;
      
      const params = businessId ? [userId, otherUserId, businessId] : [userId, otherUserId];
      const existingConversationResult = await pool.query(existingConversationQuery, params);
      
      let conversationId;
      
      // Begin transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        if (existingConversationResult.rows.length > 0) {
          // Use existing conversation
          conversationId = existingConversationResult.rows[0].id;
        } else {
          // Create new conversation
          const conversationResult = await client.query(`
            INSERT INTO conversations (is_group_chat, business_id)
            VALUES (FALSE, $1)
            RETURNING id
          `, [businessId || null]);
          
          conversationId = conversationResult.rows[0].id;
          
          // Add participants
          await client.query(`
            INSERT INTO conversation_participants (conversation_id, user_id, is_admin)
            VALUES ($1, $2, TRUE), ($1, $3, FALSE)
          `, [conversationId, userId, otherUserId]);
        }
        
        // Add initial message if provided
        if (initialMessage) {
          await client.query(`
            INSERT INTO messages (conversation_id, sender_id, content)
            VALUES ($1, $2, $3)
          `, [conversationId, userId, initialMessage]);
        }
        
        // If form ID was provided, update the contact form to link to this conversation
        if (formId) {
          await client.query(`
            UPDATE contact_forms 
            SET conversation_id = $1, status = 'connected' 
            WHERE id = $2 AND user_id = $3
          `, [conversationId, formId, userId]);
        }
        
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
      return res.json({ 
        success: true, 
        conversationId,
        redirectUrl: `/chat?conversation=${conversationId}&new=1` 
      });
    } catch (error) {
      console.error('Error starting conversation:', error);
      return res.status(500).json({ success: false, message: 'Failed to start conversation' });
    }
  },
  
  /**
   * Send a message
   */
  sendMessage: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { conversationId, content, replyTo } = req.body;
      
      if (!content || !conversationId) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }
      
      // Check if user is a participant
      const participantCheck = await pool.query(
        'SELECT * FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, userId]
      );
      
      if (participantCheck.rows.length === 0) {
        return res.status(403).json({ success: false, message: 'Not authorized to send message to this conversation' });
      }
      
      // Add message
      const messageResult = await pool.query(`
        INSERT INTO messages (conversation_id, sender_id, content, parent_message_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, created_at
      `, [conversationId, userId, content, replyTo || null]);
      
      const message = messageResult.rows[0];
      
      // Get sender info for response
      const userResult = await pool.query(
        'SELECT username, profile_picture FROM users WHERE id = $1',
        [userId]
      );
      
      const messageResponse = {
        id: message.id,
        sender_id: userId,
        content,
        created_at: message.created_at,
        parent_message_id: replyTo,
        sender_name: userResult.rows[0].username,
        sender_profile_pic: formatProfilePicture(userResult.rows[0].profile_picture)
      };
      
      // Notify WebSocket service
      if (global.io) {
        global.io.to(`conversation:${conversationId}`).emit('new_message', messageResponse);
      }
      
      return res.json({ success: true, message: messageResponse });
    } catch (error) {
      console.error('Error sending message:', error);
      return res.status(500).json({ success: false, message: 'Failed to send message' });
    }
  },
  
  /**
   * React to a message
   */
  reactToMessage: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { messageId, reaction } = req.body;
      
      if (!messageId || !reaction) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }
      
      // Get conversation ID to check permissions
      const messageResult = await pool.query(
        'SELECT conversation_id FROM messages WHERE id = $1',
        [messageId]
      );
      
      if (messageResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Message not found' });
      }
      
      const conversationId = messageResult.rows[0].conversation_id;
      
      // Check if user is a participant
      const participantCheck = await pool.query(
        'SELECT * FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, userId]
      );
      
      if (participantCheck.rows.length === 0) {
        return res.status(403).json({ success: false, message: 'Not authorized to react to this message' });
      }
      
      // Check if reaction already exists
      const existingReaction = await pool.query(
        'SELECT * FROM message_reactions WHERE message_id = $1 AND user_id = $2',
        [messageId, userId]
      );
      
      if (existingReaction.rows.length > 0) {
        // Update existing reaction
        await pool.query(
          'UPDATE message_reactions SET reaction = $3 WHERE message_id = $1 AND user_id = $2',
          [messageId, userId, reaction]
        );
      } else {
        // Add new reaction
        await pool.query(
          'INSERT INTO message_reactions (message_id, user_id, reaction) VALUES ($1, $2, $3)',
          [messageId, userId, reaction]
        );
      }
      
      // Get username for WebSocket notification
      const userResult = await pool.query(
        'SELECT username FROM users WHERE id = $1',
        [userId]
      );
      
      const reactionResponse = {
        messageId,
        reaction,
        userId,
        username: userResult.rows[0].username
      };
      
      // Notify WebSocket service
      if (global.io) {
        global.io.to(`conversation:${conversationId}`).emit('message_reaction', reactionResponse);
      }
      
      return res.json({ success: true, reaction: reactionResponse });
    } catch (error) {
      console.error('Error adding reaction:', error);
      return res.status(500).json({ success: false, message: 'Failed to add reaction' });
    }
  },
  
  /**
   * Upload a file attachment
   */
  uploadFile: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }
      
      const userId = req.user.userId;
      const { conversationId } = req.body;
      
      if (!conversationId) {
        return res.status(400).json({ success: false, message: 'Missing conversation ID' });
      }
      
      // Check if user is a participant
      const participantCheck = await pool.query(
        'SELECT * FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, userId]
      );
      
      if (participantCheck.rows.length === 0) {
        return res.status(403).json({ success: false, message: 'Not authorized to send file to this conversation' });
      }
      
      // Get file info
      const file = req.file;
      const filePath = `/uploads/chat/${file.filename}`;
      
      // Create a message with the file attachment
      const messageResult = await pool.query(`
        INSERT INTO messages (conversation_id, sender_id, content, is_system_message)
        VALUES ($1, $2, $3, FALSE)
        RETURNING id, created_at
      `, [conversationId, userId, `[File: ${file.originalname}]`]);
      
      const message = messageResult.rows[0];
      
      // Add file attachment record
      await pool.query(`
        INSERT INTO message_attachments (message_id, file_path, file_name, file_type, file_size)
        VALUES ($1, $2, $3, $4, $5)
      `, [message.id, filePath, file.originalname, file.mimetype, file.size]);
      
      // Get sender info for response
      const userResult = await pool.query(
        'SELECT username, profile_picture FROM users WHERE id = $1',
        [userId]
      );
      
      const fileResponse = {
        id: message.id,
        sender_id: userId,
        content: `[File: ${file.originalname}]`,
        created_at: message.created_at,
        file: {
          url: filePath,
          name: file.originalname,
          type: file.mimetype,
          size: file.size
        },
        sender_name: userResult.rows[0].username,
        sender_profile_pic: formatProfilePicture(userResult.rows[0].profile_picture)
      };
      
      // Notify WebSocket service
      if (global.io) {
        global.io.to(`conversation:${conversationId}`).emit('new_message', fileResponse);
      }
      
      return res.json({ success: true, file: fileResponse });
    } catch (error) {
      console.error('Error uploading file:', error);
      return res.status(500).json({ success: false, message: 'Failed to upload file' });
    }
  },
  
  /**
   * Send a voice message
   */
  sendVoiceMessage: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No audio file uploaded' });
      }
      
      const userId = req.user.userId;
      const { conversationId } = req.body;
      
      if (!conversationId) {
        return res.status(400).json({ success: false, message: 'Missing conversation ID' });
      }
      
      // Check if user is a participant
      const participantCheck = await pool.query(
        'SELECT * FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, userId]
      );
      
      if (participantCheck.rows.length === 0) {
        return res.status(403).json({ success: false, message: 'Not authorized to send voice message to this conversation' });
      }
      
      // Get file info
      const file = req.file;
      const filePath = `/uploads/chat/voice/${file.filename}`;
      
      // Create a message with the voice attachment
      const messageResult = await pool.query(`
        INSERT INTO messages (conversation_id, sender_id, content, is_system_message)
        VALUES ($1, $2, $3, FALSE)
        RETURNING id, created_at
      `, [conversationId, userId, `[Voice Message]`]);
      
      const message = messageResult.rows[0];
      
      // Add file attachment record
      await pool.query(`
        INSERT INTO message_attachments (message_id, file_path, file_name, file_type, file_size)
        VALUES ($1, $2, $3, $4, $5)
      `, [message.id, filePath, 'voice-message.wav', 'audio/wav', file.size]);
      
      // Get sender info for response
      const userResult = await pool.query(
        'SELECT username, profile_picture FROM users WHERE id = $1',
        [userId]
      );
      
      const voiceResponse = {
        id: message.id,
        sender_id: userId,
        content: `[Voice Message]`,
        created_at: message.created_at,
        file: {
          url: filePath,
          type: 'audio/wav',
          size: file.size
        },
        sender_name: userResult.rows[0].username,
        sender_profile_pic: formatProfilePicture(userResult.rows[0].profile_picture)
      };
      
      // Notify WebSocket service
      if (global.io) {
        global.io.to(`conversation:${conversationId}`).emit('new_message', voiceResponse);
      }
      
      return res.json({ success: true, message: voiceResponse });
    } catch (error) {
      console.error('Error sending voice message:', error);
      return res.status(500).json({ success: false, message: 'Failed to send voice message' });
    }
  },
  
  /**
   * Mark messages as read
   */
  markAsRead: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { conversationId } = req.body;
      
      if (!conversationId) {
        return res.status(400).json({ success: false, message: 'Missing conversation ID' });
      }
      
      // Update last_read_at timestamp
      await pool.query(`
        UPDATE conversation_participants 
        SET last_read_at = NOW() 
        WHERE conversation_id = $1 AND user_id = $2
      `, [conversationId, userId]);
      
      // Notify WebSocket service
      if (global.io) {
        global.io.to(`conversation:${conversationId}`).emit('messages_read', { userId, conversationId });
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return res.status(500).json({ success: false, message: 'Failed to mark messages as read' });
    }
  }
};

module.exports = chatController;