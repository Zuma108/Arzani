import express from 'express';
import { getUserById } from '../database.js';
import { authenticateToken } from '../utils/auth.js';
import pool from '../db/index.js';
import { formatProfilePicture } from '../utils/imageHelper.js';
import jwt from 'jsonwebtoken'; // Add JWT import for token verification

const router = express.Router();

// Use authenticateToken middleware for all chat routes
router.use(authenticateToken);

// Helper function to get user ID from various sources
async function getUserId(req) {
  // Try from user object (set by middleware)
  if (req.user?.userId) {
    return req.user.userId;
  }
  
  // Try from session
  if (req.session?.userId) {
    return req.session.userId;
  }
  
  // Try from Authorization header
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Verify user exists
      const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [decoded.userId]);
      if (userCheck.rows.length > 0) {
        // Update session for future requests
        req.session.userId = decoded.userId;
        await new Promise(resolve => req.session.save(resolve));
        return decoded.userId;
      }
    } catch (error) {
      console.error('Token validation error:', error);
    }
  }
  
  // Try from token cookie
  if (req.cookies?.token) {
    try {
      const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
      // Update session
      req.session.userId = decoded.userId;
      await new Promise(resolve => req.session.save(resolve));
      return decoded.userId;
    } catch (error) {
      console.error('Cookie token validation error:', error);
    }
  }
  
  return null;
}

// Helper function to verify user has access to a conversation
async function verifyConversationAccess(userId, conversationId) {
  if (!userId || !conversationId) return false;
  
  try {
    const result = await pool.query(`
      SELECT 1 FROM conversation_participants 
      WHERE conversation_id = $1 AND user_id = $2
    `, [conversationId, userId]);
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error verifying conversation access:', error);
    return false;
  }
}

// Chat interface route - main entry point
router.get('/', async (req, res) => {
  try {
    // If the user is already authenticated, proceed
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.redirect('/login2?returnTo=/chat');
    }
    
    // Get conversation ID from query parameters
    const conversationId = req.query.conversation;
    
    // Fetch user data
    const user = await getUserById(userId);
    if (!user) {
      return res.redirect('/login2?returnTo=/chat');
    }
    
    // Create token for client usage if not already in request
    const token = req.token || jwt.sign(
      { userId: userId },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Default empty arrays/objects to prevent template errors
    let conversations = [];
    let conversation = null;
    
    // Fetch conversations for sidebar if user is authenticated
    try {
      const conversationsQuery = await pool.query(`
        SELECT 
          c.id, 
          c.updated_at,
          c.is_group_chat,
          c.group_name,
          c.business_id
        FROM conversations c
        JOIN conversation_participants cp ON c.id = cp.conversation_id
        WHERE cp.user_id = $1
        ORDER BY c.updated_at DESC
      `, [userId]);
      
      conversations = conversationsQuery.rows.map(conv => ({
        ...conv,
        recipient: { username: 'User' }, // Default recipient
        messages: [] // Default empty messages
      }));
      
      // If we have a specific conversation ID, get its details
      if (conversationId) {
        const conversationData = conversations.find(c => c.id.toString() === conversationId);
        
        if (conversationData) {
          conversation = {
            ...conversationData,
            messages: [] // Initialize with empty messages array
          };
          
          // Get messages for this conversation
          try {
            const messagesQuery = await pool.query(`
              SELECT 
                m.id, 
                m.content, 
                m.created_at, 
                m.sender_id,
                u.username as sender_name,
                u.profile_picture
              FROM messages m
              LEFT JOIN users u ON m.sender_id = u.id
              WHERE m.conversation_id = $1
              ORDER BY m.created_at ASC
            `, [conversationId]);
            
            conversation.messages = messagesQuery.rows;
            
            // Get the other participant (for non-group chats)
            if (!conversation.is_group_chat) {
              const participantQuery = await pool.query(`
                SELECT 
                  u.id, 
                  u.username, 
                  u.profile_picture
                FROM conversation_participants cp
                JOIN users u ON cp.user_id = u.id
                WHERE cp.conversation_id = $1 AND cp.user_id != $2
                LIMIT 1
              `, [conversationId, userId]);
              
              if (participantQuery.rows.length > 0) {
                conversation.recipient = participantQuery.rows[0];
              }
            }
          } catch (msgError) {
            console.error('Error fetching messages:', msgError);
            // Continue with empty messages array
          }
        }
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      // Continue with empty conversations array
    }
    
    // Simple time formatter function for the template
    const formatTime = (timestamp) => {
      if (!timestamp) return '';
      
      const date = new Date(timestamp);
      const now = new Date();
      const diff = Math.floor((now - date) / 1000);
      
      if (diff < 60) return 'Just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      
      return date.toLocaleDateString();
    };
    
    // Render the chat template with properly initialized data
    res.render('chat', {
      title: conversation?.recipient?.username ? `Chat with ${conversation.recipient.username}` : 'Chat',
      user,
      userId,
      conversations,
      conversation,
      activeConversationId: conversationId,
      formatTime,
      token
    });
  } catch (error) {
    console.error('Error in chat route:', error);
    res.status(500).render('error', { 
      message: 'Failed to load chat interface',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Start a new conversation with improved error handling
router.get('/start-conversation', async (req, res) => {
  try {
    console.log('Start conversation route accessed:', {
      query: req.query,
      session: req.session?.userId ? 'Active' : 'None',
      cookies: req.cookies?.token ? 'Has token cookie' : 'No token cookie'
    });
    
    // Get user ID using our helper function
    const userId = await getUserId(req);
    
    // If no user ID found, redirect to login
    if (!userId) {
      const returnPath = `/chat/start-conversation?${new URLSearchParams(req.query).toString()}`;
      return res.redirect(`/login2?returnTo=${encodeURIComponent(returnPath)}`);
    }
    
    const { otherUserId, businessId, initialMessage, formId } = req.query;
    
    if (!otherUserId) {
      return res.status(400).render('error', {
        message: 'Missing required parameters',
        error: { details: 'Other user ID is required' }
      });
    }
    
    // Check if conversation already exists
    let existingConversationQuery = `
      SELECT c.id 
      FROM conversations c
      JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = $1
      JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = $2
      WHERE c.is_group_chat = FALSE
    `;
    
    let params = [userId, otherUserId];
    
    if (businessId) {
      existingConversationQuery += ` AND c.business_id = $3`;
      params.push(businessId);
    } else {
      existingConversationQuery += ` AND c.business_id IS NULL`;
    }
    
    const existingConversationResult = await pool.query(existingConversationQuery, params);
    
    let conversationId;
    
    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      if (existingConversationResult.rows.length > 0) {
        // Use existing conversation
        conversationId = existingConversationResult.rows[0].id;
        console.log(`Using existing conversation ${conversationId}`);
      } else {
        // Create new conversation
        const conversationResult = await client.query(`
          INSERT INTO conversations (is_group_chat, business_id)
          VALUES (FALSE, $1)
          RETURNING id
        `, [businessId || null]);
        
        conversationId = conversationResult.rows[0].id;
        console.log(`Created new conversation ${conversationId}`);
        
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
        
        // Update conversation's updated_at timestamp
        await client.query(`
          UPDATE conversations 
          SET updated_at = NOW() 
          WHERE id = $1
        `, [conversationId]);
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
    
    // Redirect to the conversation page with proper URL structure
    res.redirect(`/chat?conversation=${conversationId}&new=1`);
    
  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).render('error', {
      message: 'Error starting conversation',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Handle contact form submission and redirect to chat
router.post('/contact-seller', async (req, res) => {
  try {
    const { businessId, firstName, lastName, email, phone, timeframe, message, newsletter } = req.body;
    
    // Process contact form submission
    // ...existing processing code...
    
    // Create or find conversation
    // ...existing conversation code...
    
    // After successful processing, redirect to chat with the new conversation
    if (conversationId) {
      // Instead of just redirecting, also pass a success parameter and JWT token
      const token = jwt.sign({ userId: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
      
      // Set token cookie to ensure it's available for WebSocket authentication
      res.cookie('token', token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3600000 // 1 hour
      });
      
      // Redirect with success parameter
      return res.redirect(`/chat?conversation=${conversationId}&success=true`);
    } else {
      // Fallback if no conversation was created
      return res.redirect('/chat');
    }
  } catch (error) {
    console.error('Error processing contact form:', error);
    return res.status(500).send('Error processing contact form');
  }
});

// Redirect old /chat-interface routes to /chat
router.get('/interface', (req, res) => {
  const queryString = new URLSearchParams(req.query).toString();
  res.redirect(`/chat${queryString ? '?' + queryString : ''}`);
});

// If you have a separate route for chat-interface, make sure it's correctly defined
router.get('/interface', async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    // Get conversation ID from query parameters
    const conversationId = req.query.conversation;
    
    // Fetch conversations and messages as needed
    // ...existing code for fetching data...
    
    // Render chat-interface.ejs template for the enhanced version
    res.render('chat-interface', {
      title: 'Enhanced Chat',
      user: req.user,
      userId,
      // ...other data needed for the template
      token: req.token
    });
  } catch (error) {
    console.error('Error in chat interface route:', error);
    res.status(500).render('error', { message: 'Failed to load chat interface' });
  }
});

export default router;

