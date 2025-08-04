import express from 'express';
import pool from '../../db/index.js';
import { authenticateToken } from '../../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { uploadToS3 } from '../../utils/s3.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set up file storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Create directory if it doesn't exist
    const dir = path.join(__dirname, '../../uploads/chat');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// Voice message storage
const voiceStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Create directory if it doesn't exist
    const dir = path.join(__dirname, '../../uploads/chat/voice');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `voice-message-${uniqueSuffix}.wav`);
  }
});

const fileUpload = multer({ storage });
const voiceUpload = multer({ storage: voiceStorage });

// Define controller functions that were previously undefined
const chatController = {
  // Get user's conversations
  getUserConversations: async (req, res) => {
    try {
      const userId = req.user.userId;
      
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
        JOIN conversation_participants cp ON c.id = cp.conversation_id
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
      
      res.json({
        success: true,
        conversations: result.rows
      });
    } catch (error) {
      console.error('Error getting user conversations:', error);
      res.status(500).json({ success: false, error: 'Failed to get conversations' });
    }
  },
  
  // Get a specific conversation with messages
  getConversation: async (req, res) => {
    try {
      const conversationId = req.params.id;
      const userId = req.user.userId;
      
      if (!conversationId) {
        return res.status(400).json({ success: false, error: 'Conversation ID is required' });
      }
      
      // Check if user has access to this conversation
      const accessQuery = `
        SELECT 1 FROM conversation_participants 
        WHERE conversation_id = $1 AND user_id = $2
      `;
      
      const accessResult = await pool.query(accessQuery, [conversationId, userId]);
      
      if (accessResult.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Access denied to this conversation' });
      }
      
      // Get conversation details
      const conversationQuery = `
        SELECT 
          c.id, 
          c.is_group_chat, 
          c.group_name,
          c.created_at,
          c.updated_at,
          c.business_id,
          b.business_name
        FROM conversations c
        LEFT JOIN businesses b ON c.business_id = b.id
        WHERE c.id = $1
      `;
      
      const conversationResult = await pool.query(conversationQuery, [conversationId]);
      
      if (conversationResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }
      
      const conversation = conversationResult.rows[0];
      
      // Get messages
      const messagesQuery = `
        SELECT 
          m.id,
          m.content,
          m.sender_id,
          m.created_at,
          u.username as sender_name,
          u.profile_picture as sender_profile_pic,
          m.is_system_message
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = $1
        ORDER BY m.created_at ASC
      `;
      
      const messagesResult = await pool.query(messagesQuery, [conversationId]);
      
      // Get other participants
      const participantsQuery = `
        SELECT 
          u.id,
          u.username,
          u.profile_picture
        FROM conversation_participants cp
        JOIN users u ON cp.user_id = u.id
        WHERE cp.conversation_id = $1 AND cp.user_id != $2
      `;
      
      const participantsResult = await pool.query(participantsQuery, [conversationId, userId]);
      
      // Update last read timestamp
      await pool.query(`
        UPDATE conversation_participants 
        SET last_read_at = NOW() 
        WHERE conversation_id = $1 AND user_id = $2
      `, [conversationId, userId]);
      
      res.json({
        success: true,
        conversation: {
          ...conversation,
          participants: participantsResult.rows,
          messages: messagesResult.rows
        }
      });
    } catch (error) {
      console.error('Error getting conversation:', error);
      res.status(500).json({ success: false, error: 'Failed to get conversation' });
    }
  },
  
  // Start a new conversation
  startConversation: async (req, res) => {
    try {
      const { recipient_id, business_id, initial_message } = req.body;
      const userId = req.user.userId;
      
      if (!recipient_id) {
        return res.status(400).json({ success: false, error: 'Recipient ID is required' });
      }
      
      // Check if a conversation already exists between these users
      const existingQuery = `
        SELECT c.id
        FROM conversations c
        JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
        JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
        WHERE cp1.user_id = $1 AND cp2.user_id = $2
          AND c.is_group_chat = false
          AND (c.business_id IS NULL OR c.business_id = $3)
        LIMIT 1
      `;
      
      const existingResult = await pool.query(existingQuery, [
        userId, 
        recipient_id,
        business_id || null
      ]);
      
      let conversationId;
      
      if (existingResult.rows.length > 0) {
        // Use existing conversation
        conversationId = existingResult.rows[0].id;
      } else {
        // Create new conversation
        const createQuery = `
          INSERT INTO conversations (is_group_chat, business_id, created_at, updated_at)
          VALUES (false, $1, NOW(), NOW())
          RETURNING id
        `;
        
        const createResult = await pool.query(createQuery, [business_id || null]);
        conversationId = createResult.rows[0].id;
        
        // Add participants
        await pool.query(
          `INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
           VALUES ($1, $2, NOW()), ($1, $3, NOW())`,
          [conversationId, userId, recipient_id]
        );
      }
      
      // Add initial message if provided
      if (initial_message) {
        await pool.query(
          `INSERT INTO messages (conversation_id, sender_id, content, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [conversationId, userId, initial_message]
        );
      }
      
      res.json({
        success: true,
        conversation_id: conversationId
      });
    } catch (error) {
      console.error('Error starting conversation:', error);
      res.status(500).json({ success: false, error: 'Failed to start conversation' });
    }
  },
  
  // React to a message
  reactToMessage: async (req, res) => {
    try {
      const { message_id, reaction } = req.body;
      const userId = req.user.userId;
      
      if (!message_id || !reaction) {
        return res.status(400).json({ success: false, error: 'Message ID and reaction are required' });
      }
      
      // Check if user has access to this message
      const accessQuery = `
        SELECT m.conversation_id
        FROM messages m
        JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
        WHERE m.id = $1 AND cp.user_id = $2
      `;
      
      const accessResult = await pool.query(accessQuery, [message_id, userId]);
      
      if (accessResult.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Access denied to this message' });
      }
      
      // Upsert reaction
      const upsertQuery = `
        INSERT INTO message_reactions (message_id, user_id, reaction, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (message_id, user_id)
        DO UPDATE SET reaction = $3, updated_at = NOW()
        RETURNING id
      `;
      
      await pool.query(upsertQuery, [message_id, userId, reaction]);
      
      res.json({
        success: true,
        message: 'Reaction added'
      });
    } catch (error) {
      console.error('Error adding reaction:', error);
      res.status(500).json({ success: false, error: 'Failed to add reaction' });
    }
  },
  
  // Upload file attachment
  uploadFile: async (req, res) => {
    try {
      const { conversation_id } = req.body;
      const userId = req.user.userId;
      
      if (!conversation_id || !req.file) {
        return res.status(400).json({ success: false, error: 'Conversation ID and file are required' });
      }
      
      // Check if user has access to this conversation
      const accessQuery = `
        SELECT 1 FROM conversation_participants 
        WHERE conversation_id = $1 AND user_id = $2
      `;
      
      const accessResult = await pool.query(accessQuery, [conversation_id, userId]);
      
      if (accessResult.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Access denied to this conversation' });
      }
      
      // Create file path that can be accessed from web
      const filePath = `/uploads/chat/${req.file.filename}`;
      
      // Add message with file attachment
      const messageQuery = `
        INSERT INTO messages (conversation_id, sender_id, content, attachment_url, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id
      `;
      
      const messageResult = await pool.query(messageQuery, [
        conversation_id,
        userId,
        'File attachment',
        filePath
      ]);
      
      // Update conversation's last updated timestamp
      await pool.query(`
        UPDATE conversations SET updated_at = NOW() WHERE id = $1
      `, [conversation_id]);
      
      res.json({
        success: true,
        message_id: messageResult.rows[0].id,
        file_url: filePath
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ success: false, error: 'Failed to upload file' });
    }
  },
  
  // Send voice message
  sendVoiceMessage: async (req, res) => {
    try {
      const { conversation_id } = req.body;
      const userId = req.user.userId;
      
      if (!conversation_id || !req.file) {
        return res.status(400).json({ success: false, error: 'Conversation ID and audio file are required' });
      }
      
      // Check if user has access to this conversation
      const accessQuery = `
        SELECT 1 FROM conversation_participants 
        WHERE conversation_id = $1 AND user_id = $2
      `;
      
      const accessResult = await pool.query(accessQuery, [conversation_id, userId]);
      
      if (accessResult.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Access denied to this conversation' });
      }
      
      // Create file path that can be accessed from web
      const filePath = `/uploads/chat/voice/${req.file.filename}`;
      
      // Add message with voice attachment
      const messageQuery = `
        INSERT INTO messages (conversation_id, sender_id, content, voice_url, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id
      `;
      
      const messageResult = await pool.query(messageQuery, [
        conversation_id,
        userId,
        'Voice message',
        filePath
      ]);
      
      // Update conversation's last updated timestamp
      await pool.query(`
        UPDATE conversations SET updated_at = NOW() WHERE id = $1
      `, [conversation_id]);
      
      res.json({
        success: true,
        message_id: messageResult.rows[0].id,
        voice_url: filePath
      });
    } catch (error) {
      console.error('Error sending voice message:', error);
      res.status(500).json({ success: false, error: 'Failed to send voice message' });
    }
  },
  
  // Mark as read
  markAsRead: async (req, res) => {
    try {
      const { conversation_id } = req.body;
      const userId = req.user.userId;
      
      if (!conversation_id) {
        return res.status(400).json({ success: false, error: 'Conversation ID is required' });
      }
      
      // Update last read timestamp
      await pool.query(`
        UPDATE conversation_participants 
        SET last_read_at = NOW() 
        WHERE conversation_id = $1 AND user_id = $2
      `, [conversation_id, userId]);
      
      res.json({
        success: true,
        message: 'Marked as read'
      });
    } catch (error) {
      console.error('Error marking as read:', error);
      res.status(500).json({ success: false, error: 'Failed to mark as read' });
    }
  }
};

// Get user's conversations
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    
    const userId = req.user.userId;

    console.log(`Fetching conversations for user: ${userId}`);

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
      INNER JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.user_id = $1
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
      ORDER BY c.updated_at DESC
    `;

    const result = await pool.query(query, [userId]);
    
    console.log(`Found ${result.rows.length} conversations for user ${userId}`);
    
    // Process and return conversations with access verification
    const conversations = await Promise.all(result.rows.map(async (conversation) => {
      // Get participants excluding current user
      const participantQuery = `
        SELECT 
          u.id, 
          u.username,
          u.profile_picture
        FROM conversation_participants cp
        JOIN users u ON cp.user_id = u.id
        WHERE cp.conversation_id = $1 AND cp.user_id != $2
      `;
      
      const participantResult = await pool.query(participantQuery, [conversation.id, userId]);
      
      // Calculate unread count
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
        unread_count: parseInt(unreadResult.rows[0]?.unread_count || '0', 10),
        recipient: participantResult.rows[0] || null
      };
    }));
      res.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch conversations' });
  }
});

// Create a new conversation (specifically for Arzani-x.ejs)
router.post('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { group_name, business_id, is_ai_chat = true } = req.body;
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    console.log(`Creating new conversation for user: ${userId}`);

    // Create new conversation with Arzani AI chat settings
    const createQuery = `
      INSERT INTO conversations (is_group_chat, is_ai_chat, group_name, business_id, created_at, updated_at)
      VALUES (false, $1, $2, $3, NOW(), NOW())
      RETURNING id, created_at, updated_at
    `;
    
    const conversationResult = await pool.query(createQuery, [
      is_ai_chat,
      group_name || `Arzani Chat ${new Date().toLocaleString()}`,
      business_id || null
    ]);
    
    const conversation = conversationResult.rows[0];
    
    // Add the user as a participant
    await pool.query(
      `INSERT INTO conversation_participants (conversation_id, user_id, joined_at, is_admin)
       VALUES ($1, $2, NOW(), true)`,
      [conversation.id, userId]
    );
    
    console.log(`New conversation created: ${conversation.id}`);
    
    res.json({
      success: true,
      id: conversation.id,
      conversation_id: conversation.id,
      group_name: group_name || `Arzani Chat ${new Date().toLocaleString()}`,
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
      is_ai_chat: true
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ success: false, error: 'Failed to create conversation' });
  }
});

// Add a middleware to verify conversation access
const verifyConversationAccess = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const conversationId = req.params.id || req.query.conversationId || req.body.conversationId;
    
    if (!conversationId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Conversation ID is required' 
      });
    }
    
    // Check if user is a participant in this conversation
    const accessQuery = `
      SELECT 1 FROM conversation_participants 
      WHERE conversation_id = $1 AND user_id = $2
    `;
    
    const result = await pool.query(accessQuery, [conversationId, userId]);
    
    if (result.rows.length === 0) {
      // Log unauthorized access attempt
      console.warn(`Unauthorized conversation access attempt: User ${userId} tried to access conversation ${conversationId}`);
      
      return res.status(403).json({ 
        success: false, 
        error: 'You do not have access to this conversation' 
      });
    }
    
    // User has access, continue
    next();
  } catch (error) {
    console.error('Error verifying conversation access:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Apply the verification middleware to routes that need it
router.get('/conversation/:id', authenticateToken, verifyConversationAccess, chatController.getConversation);

// CONSOLIDATED MESSAGES ENDPOINT - This is the only /messages GET endpoint we should have
router.get('/messages', authenticateToken, async (req, res) => {
  const requestId = Math.random().toString(36).substring(2, 10);
  console.log(`[${requestId}] GET /api/chat/messages endpoint reached`);
  console.log(`[${requestId}] Auth: ${req.user ? 'Authenticated' : 'Not authenticated'} User ID: ${req.user?.userId}`);
  console.log(`[${requestId}] Query params:`, req.query);
  
  try {
    const { conversationId } = req.query;
    const userId = req.user?.userId;
    
    if (!conversationId) {
      console.log(`[${requestId}] Error: Missing conversationId parameter`);
      return res.status(400).json({ 
        success: false, 
        error: 'Conversation ID is required',
        requestId
      });
    }
    
    if (!userId) {
      console.log(`[${requestId}] Error: No userId found in request after authentication`);
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        requestId
      });
    }
    
    console.log(`[${requestId}] Checking access for user ${userId} to conversation ${conversationId}`);
    
    // First check if the conversation exists
    const conversationExists = await pool.query(
      'SELECT EXISTS(SELECT 1 FROM conversations WHERE id = $1)', 
      [conversationId]
    );
    
    if (!conversationExists.rows[0].exists) {
      console.log(`[${requestId}] Conversation ${conversationId} not found`);
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
        requestId
      });
    }
    
    // Check if user has access to this conversation
    const accessQuery = `
      SELECT EXISTS (
        SELECT 1 FROM conversation_participants 
        WHERE conversation_id = $1 AND user_id = $2
      ) AS has_access
    `;
    
    const accessResult = await pool.query(accessQuery, [conversationId, userId]);
    const hasAccess = accessResult.rows[0]?.has_access || false;
    
    console.log(`[${requestId}] Access check result: ${hasAccess ? 'Access granted' : 'Access denied'}`);
    
    // If user doesn't have access, check if they're a sender in this conversation
    if (!hasAccess) {
      console.log(`[${requestId}] Performing fallback access check using message history`);
      
      const senderCheckQuery = `
        SELECT EXISTS (
          SELECT 1 FROM messages
          WHERE conversation_id = $1 AND sender_id = $2
        ) AS is_sender
      `;
      
      const senderCheckResult = await pool.query(senderCheckQuery, [conversationId, userId]);
      const isSender = senderCheckResult.rows[0]?.is_sender || false;
      
      console.log(`[${requestId}] Fallback check result: ${isSender ? 'User is a sender' : 'User is not a sender'}`);
      
      if (isSender) {
        // User has sent messages but is missing from participants table
        // Let's fix this by adding them as a participant
        console.log(`[${requestId}] Repairing access: Adding user ${userId} to conversation ${conversationId}`);
        
        try {
          const repairQuery = `
            INSERT INTO conversation_participants (conversation_id, user_id, joined_at, last_read_at)
            VALUES ($1, $2, NOW(), NOW())
            ON CONFLICT (conversation_id, user_id) DO NOTHING
          `;
          
          await pool.query(repairQuery, [conversationId, userId]);
          console.log(`[${requestId}] Access repaired successfully`);
        } catch (err) {
          console.error(`[${requestId}] Could not repair access:`, err);
          // Continue anyway since the user has messages in this conversation
        }
      } else {
        // User truly doesn't have access
        console.log(`[${requestId}] Access denied: User ${userId} doesn't have access to conversation ${conversationId}`);
        return res.status(403).json({
          success: false,
          error: 'You do not have access to this conversation',
          requestId
        });
      }
    }
    
    // Get messages
    console.log(`[${requestId}] Fetching messages for conversation ${conversationId}`);
    const messagesQuery = `
      SELECT 
        m.id,
        m.content,
        m.sender_id,
        m.created_at,
        COALESCE(m.is_system_message, false) as is_system_message,
        COALESCE(m.attachment_url, '') as attachment_url,
        COALESCE(m.voice_url, '') as voice_url,
        u.username as sender_name,
        u.profile_picture as sender_profile_pic
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC
    `;
    
    const messagesResult = await pool.query(messagesQuery, [conversationId]);
    console.log(`[${requestId}] Found ${messagesResult.rows.length} messages`);
    
    // Update last_read_at timestamp
    try {
      await pool.query(`
        UPDATE conversation_participants 
        SET last_read_at = NOW() 
        WHERE conversation_id = $1 AND user_id = $2
      `, [conversationId, userId]);
    } catch (err) {
      console.error(`[${requestId}] Non-critical error updating last_read_at:`, err);
      // Non-critical error, continue
    }
    
    // Success response
    console.log(`[${requestId}] Successfully returning messages`);
    return res.json({
      success: true,
      messages: messagesResult.rows,
      requestId
    });
    
  } catch (error) {
    console.error(`[${requestId}] Error in /api/chat/messages endpoint:`, error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error when fetching messages',
      message: error.message,
      requestId
    });
  }
});

// Send a message
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { conversationId, content, attachments, replyTo, type } = req.body;
    const userId = req.user.userId;
    
    // Validate input
    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: 'Conversation ID is required'
      });
    }
    
    // Check if content or attachments exist
    if (!content && (!attachments || attachments.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'Message content or attachments are required'
      });
    }
    
    // Check if user is a participant in the conversation
    const participantCheck = await pool.query(`
      SELECT * FROM conversation_participants 
      WHERE conversation_id = $1 AND user_id = $2
    `, [conversationId, userId]);
    
    if (participantCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'You are not a participant in this conversation'
      });
    }
    
    // Begin transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert message
      const messageResult = await client.query(`
        INSERT INTO messages (
          conversation_id, 
          sender_id, 
          content, 
          reply_to_id,
          message_type
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        conversationId,
        userId,
        content || '',
        replyTo || null,
        type || 'text'
      ]);
      
      const message = messageResult.rows[0];
      
      // If there are attachments, link them to the message
      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          // If attachment has an ID, it was already uploaded
          if (attachment.id) {
            await client.query(`
              UPDATE message_attachments
              SET message_id = $1, conversation_id = $2
              WHERE id = $3
            `, [message.id, conversationId, attachment.id]);
          } else {
            // If not, create a new attachment record
            await client.query(`
              INSERT INTO message_attachments (
                message_id,
                user_id,
                file_name,
                original_name,
                file_url,
                file_type,
                file_size,
                conversation_id
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
              message.id,
              userId,
              attachment.name,
              attachment.name,
              attachment.url,
              attachment.type || 'application/octet-stream',
              attachment.size || 0,
              conversationId
            ]);
          }
        }
        
        // Fetch attachments for the response
        const attachmentsResult = await client.query(`
          SELECT * FROM message_attachments WHERE message_id = $1
        `, [message.id]);
        
        message.attachments = attachmentsResult.rows;
      }
      
      // Update conversation last activity
      await client.query(`
        UPDATE conversations
        SET updated_at = NOW()
        WHERE id = $1
      `, [conversationId]);
      
      // Mark as unread for other participants
      await client.query(`
        UPDATE conversation_participants
        SET unread_count = unread_count + 1,
            last_read_at = NULL
        WHERE conversation_id = $1 AND user_id != $2
      `, [conversationId, userId]);
      
      await client.query('COMMIT');
      
      // Enrich message with sender info
      const enrichedMessage = await enrichMessageWithSenderInfo(message, userId);
      
      // Notify participants via WebSocket if available
      if (global.io) {
        notifyMessageParticipants(conversationId, userId, enrichedMessage);
      }
      
      // Return success with the message
      return res.json({
        success: true,
        message: enrichedMessage
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error sending message:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

// React to a message
router.post('/react', authenticateToken, chatController.reactToMessage);

// Upload file attachment
router.post('/upload-file', authenticateToken, fileUpload.single('file'), chatController.uploadFile);

// Send voice message
router.post('/send-voice', authenticateToken, voiceUpload.single('audio'), chatController.sendVoiceMessage);

// Mark messages as read
router.post('/mark-read', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.body;
    const userId = req.user.userId;
    
    if (!conversationId) {
      return res.status(400).json({ success: false, error: 'Conversation ID is required' });
    }
    
    // Update last read timestamp
    await pool.query(`
      UPDATE conversation_participants 
      SET last_read_at = NOW() 
      WHERE conversation_id = $1 AND user_id = $2
    `, [conversationId, userId]);
    
    res.json({
      success: true,
      message: 'Conversation marked as read'
    });
    
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark conversation as read' });
  }
});

// Update user activity status
router.post('/update-activity', authenticateToken, async (req, res) => {
  try {
    const { conversationId, status } = req.body;
    const userId = req.user.userId;
    
    if (!conversationId) {
      return res.status(400).json({ success: false, error: 'Conversation ID is required' });
    }
    
    // Update user's last active timestamp
    await pool.query(`
      UPDATE users 
      SET last_active = NOW(), 
          chat_status = $1
      WHERE id = $2
    `, [status || 'active', userId]);
    
    // Also update conversation participant record
    await pool.query(`
      UPDATE conversation_participants 
      SET last_active_at = NOW() 
      WHERE conversation_id = $1 AND user_id = $2
    `, [conversationId, userId]);
    
    res.json({
      success: true,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({ success: false, error: 'Failed to update activity status' });
  }
});

// Add new endpoint for saving contact form data
router.post('/save-contact-form', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { 
      businessId, 
      otherUserId, 
      interest, 
      timeline, 
      message, 
      questions, 
      contactConsent 
    } = req.body;
    
    // Validate required fields
    if (!otherUserId) {
      return res.status(400).json({ success: false, message: 'Seller ID is required' });
    }
    
    // Insert contact form data
    const result = await pool.query(`
      INSERT INTO contact_forms (
        user_id, 
        business_id, 
        seller_id, 
        interest_level, 
        purchase_timeline, 
        message, 
        questions, 
        contact_consent
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      userId, 
      businessId || null, 
      otherUserId, 
      interest, 
      timeline, 
      message, 
      questions, 
      contactConsent
    ]);
    
    // Return success with form ID
    return res.json({ 
      success: true, 
      message: 'Contact form data saved successfully',
      formId: result.rows[0].id
    });
    
  } catch (error) {
    console.error('Error saving contact form data:', error);
    return res.status(500).json({ success: false, message: 'Failed to save contact form data' });
  }
});

// Single consolidated ping endpoint
router.get('/ping', (req, res) => {
  console.log('Chat API ping received from:', req.ip);
  res.json({
    success: true,
    message: 'Chat API is working',
    timestamp: new Date().toISOString(),
    auth: !!req.user
  });
});

// Debug information endpoint to help troubleshoot auth issues
router.get('/auth-debug', authenticateToken, (req, res) => {
  res.json({
    success: true,
    authenticated: !!req.user,
    user: req.user || null,
    headers: {
      authorization: req.headers.authorization ? 'Present (not shown for security)' : 'Missing',
      cookie: req.headers.cookie ? 'Present (not shown for security)' : 'Missing'
    },
    timestamp: new Date().toISOString()
  });
});

export default router;

// Configure multer for memory storage with improved error handling
const memoryStorage = multer.memoryStorage();
const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files at once
  },
  fileFilter: (req, file, cb) => {
    // Log incoming file
    console.log('Received file:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype
    });
    
    // Accept all file types temporarily for debugging
    cb(null, true);
  }
}).single('file'); // Explicitly define that we expect a single file with field name 'file'

// Improved file upload endpoint with more robust error handling
router.post('/upload-file', authenticateToken, (req, res) => {
  console.log('Upload endpoint hit', {
    contentType: req.headers['content-type'],
    hasUser: !!req.user
  });

  // Use upload middleware with error handling
  upload(req, res, async function(err) {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({
        success: false,
        error: 'File upload error',
        details: err.message
      });
    }

    try {
      // Check if file was provided
      if (!req.file) {
        console.error('No file in request');
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
          details: 'Make sure you are sending a file with field name "file"'
        });
      }

      // Log the file details
      console.log('Processing file:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        hasBuffer: !!req.file.buffer
      });
      
      // Get user ID from token
      const userId = req.user.userId;
      
      // Get conversation ID from form data
      const conversationId = req.body.conversationId || 'temp';
      console.log('Conversation ID:', conversationId);
      
      // Create unique filename
      const fileExtension = path.extname(req.file.originalname) || '.bin';
      const fileName = `${Date.now()}-${uuidv4()}${fileExtension}`;
      
      // Use conversation ID in path for better organization
      const s3Key = `chat/attachments/${conversationId}/${fileName}`;
      
      // Upload to S3
      console.log('Preparing S3 upload...');
      const fileUrl = await uploadToS3(req.file, s3Key);
      console.log('S3 upload complete:', fileUrl);
      
      // Check if this is an image
      const isImage = req.file.mimetype.startsWith('image/');
      
      // Store attachment in database
      const attachmentResult = await pool.query(`
        INSERT INTO message_attachments (
          user_id,
          file_name,
          original_name,
          file_url,
          file_type,
          file_size,
          conversation_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        userId,
        fileName,
        req.file.originalname,
        fileUrl,
        req.file.mimetype || 'application/octet-stream',
        req.file.size || 0,
        conversationId !== 'temp' ? conversationId : null
      ]);
      
      const attachmentId = attachmentResult.rows[0].id;
      console.log('File recorded in database with ID:', attachmentId);
      
      return res.json({
        success: true,
        file: {
          id: attachmentId,
          name: req.file.originalname,
          url: fileUrl,
          size: req.file.size,
          type: req.file.mimetype
        },
        fileType: isImage ? 'image' : 'file'
      });
    } catch (error) {
      console.error('Error in file upload:', error);
      return res.status(500).json({
        success: false,
        error: 'File upload failed',
        message: error.message
      });
    }
  });
});

// Add debug endpoint to test file uploads without authentication
router.post('/test-upload', (req, res) => {
  upload(req, res, function(err) {
    if (err) {
      console.error('Test upload multer error:', err);
      return res.status(400).json({
        success: false,
        error: err.message,
        type: 'multer_error'
      });
    }
    
    console.log('Test upload request received:', {
      file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        hasBuffer: !!req.file.buffer
      } : 'No file',
      body: req.body
    });
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file received',
        headers: {
          contentType: req.headers['content-type'] || 'not set',
          contentLength: req.headers['content-length'] || 'not set'
        },
        bodyFields: Object.keys(req.body)
      });
    }
    
    res.json({
      success: true,
      file: {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        hasBuffer: !!req.file.buffer
      }
    });
  });
});

// Helper function to enrich message with sender info
async function enrichMessageWithSenderInfo(message, currentUserId) {
  try {
    // Get sender information
    const userResult = await pool.query(`
      SELECT id, username, profile_picture
      FROM users WHERE id = $1
    `, [message.sender_id]);
    
    if (userResult.rows.length > 0) {
      const sender = userResult.rows[0];
      
      // Get message attachments if any
      const attachmentsResult = await pool.query(`
        SELECT id, file_name, original_name, file_url, file_type, file_size
        FROM message_attachments
        WHERE message_id = $1
      `, [message.id]);
      
      return {
        ...message,
        sender_name: sender.username,
        sender_profile_pic: sender.profile_picture,
        is_current_user: message.sender_id === currentUserId,
        attachments: attachmentsResult.rows.map(attachment => ({
          id: attachment.id,
          name: attachment.original_name,
          url: attachment.file_url,
          type: attachment.file_type,
          size: attachment.file_size
        }))
      };
    }
    
    return message;
    
  } catch (error) {
    console.error('Error enriching message:', error);
    return message;
  }
}

// Helper function to notify participants via WebSocket
function notifyMessageParticipants(conversationId, senderId, message) {
  try {
    // Get participants room name
    const roomName = `conversation:${conversationId}`;
    
    // Emit to everyone in the room
    global.io.to(roomName).emit('new_message', {
      conversation_id: conversationId,
      message: message
    });
    
    // Also notify individual participants for push notifications
    global.io.to(`user:${senderId}`).emit('message_sent', {
      success: true,
      message_id: message.id
    });
    
  } catch (error) {
    console.error('Error notifying participants:', error);
  }
}
