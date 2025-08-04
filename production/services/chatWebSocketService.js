/**
 * Chat WebSocket Service
 * Handles Socket.IO connections for chat functionality
 */

import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

class ChatWebSocketService {
  /**
   * Initialize the chat WebSocket service
   * @param {Server} server - HTTP server instance
   */
  constructor(server) {
    // Create Socket.IO server with appropriate configuration
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? 'https://arzani.co.uk' 
          : ['http://localhost:5000', 'http://127.0.0.1:5000'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      // Based on diagnostics, use polling transport only - websocket is failing
      transports: ['polling'],
      pingTimeout: 60000, // 60 seconds
      pingInterval: 25000 // 25 seconds
    });
    
    // Set up event handlers
    this.setupSocketHandlers();
    
    // Make io available globally
    global.io = this.io;
    
    console.log('Chat WebSocket service initialized with polling transport only');
  }
  
  /**
   * Set up socket event handlers
   */
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('New chat client connected:', socket.id);
      
      // Handle authentication
      socket.on('authenticate', async (data) => {
        try {
          if (!data.token) {
            socket.emit('auth_error', { message: 'Authentication required' });
            return;
          }
          
          // Verify token
          const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
          const userId = decoded.userId;
          
          // Store user ID in socket for future reference
          socket.userId = userId;
          
          // Join user's personal room
          socket.join(`user:${userId}`);
          
          // Get user's conversations and join those rooms
          const conversationsResult = await pool.query(
            'SELECT session_id FROM conversation_participants WHERE user_id = $1',
            [userId]
          );
          
          for (const row of conversationsResult.rows) {
            socket.join(`conversation:${row.session_id}`);
          }
          
          // Update user's online status
          await pool.query(
            'UPDATE users SET last_active = NOW() WHERE id = $1',
            [userId]
          );
          
          // Notify other users that this user is online
          this.io.emit('user_status', { userId, status: 'online' });
          
          // Confirm authentication to client
          socket.emit('authenticated', { success: true });
        } catch (error) {
          console.error('Socket authentication error:', error);
          socket.emit('auth_error', { message: 'Authentication failed' });
        }
      });
      
      // Handle joining conversation
      socket.on('join', async (data) => {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }
        
        const { conversationId } = data;
        if (!conversationId) {
          socket.emit('error', { message: 'Conversation ID is required' });
          return;
        }
        
        // Verify user has access to this conversation
        const accessCheck = await pool.query(
          'SELECT 1 FROM conversation_participants WHERE session_id = $1 AND user_id = $2',
          [conversationId, socket.userId]
        );
        
        if (accessCheck.rows.length === 0) {
          socket.emit('error', { message: 'Access denied to this conversation' });
          return;
        }
        
        // Join the conversation room
        socket.join(`conversation:${conversationId}`);
        console.log(`User ${socket.userId} joined conversation ${conversationId}`);
      });
      
      // Handle sending messages
      socket.on('sendMessage', async (data) => {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }
        
        const { conversationId, content } = data;
        if (!conversationId || !content) {
          socket.emit('error', { message: 'Invalid message data' });
          return;
        }
        
        try {
          // Insert message into database
          const messageResult = await pool.query(
            `INSERT INTO a2a_chat_messages (session_id, sender_id, content, created_at)
             VALUES ($1, $2, $3, NOW())
             RETURNING id, content, created_at`,
            [conversationId, socket.userId, content]
          );
          
          // Get sender info
          const userResult = await pool.query(
            'SELECT username, profile_picture FROM users WHERE id = $1',
            [socket.userId]
          );
          
          // Create message object
          const message = {
            id: messageResult.rows[0].id,
            content: messageResult.rows[0].content,
            created_at: messageResult.rows[0].created_at,
            sender_id: socket.userId,
            sender_name: userResult.rows[0]?.username || 'User',
            sender_profile_pic: userResult.rows[0]?.profile_picture || null
          };
          
          // Broadcast to everyone in the conversation
          this.io.to(`conversation:${conversationId}`).emit('message', message);
          
          // Update conversation's last updated timestamp
          await pool.query(
            'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
            [conversationId]
          );
        } catch (error) {
          console.error('Error sending message:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });
      
      // Handle typing indicators
      socket.on('typing', (data) => {
        if (!socket.userId || !data.conversationId) return;
        
        // Broadcast to everyone else in the conversation
        socket.to(`conversation:${data.conversationId}`).emit('typing', {
          userId: socket.userId,
          conversationId: data.conversationId
        });
      });
      
      // Handle stop typing
      socket.on('stopTyping', (data) => {
        if (!socket.userId || !data.conversationId) return;
        
        // Broadcast to everyone else in the conversation
        socket.to(`conversation:${data.conversationId}`).emit('stop_typing', {
          userId: socket.userId,
          conversationId: data.conversationId
        });
      });
      
      // Handle mark conversation as read
      socket.on('markConversationRead', async (data) => {
        if (!socket.userId || !data.conversationId) return;
        
        try {
          // Update last read timestamp in database
          await pool.query(
            `UPDATE conversation_participants 
             SET last_read_at = NOW() 
             WHERE session_id = $1 AND user_id = $2`,
            [data.conversationId, socket.userId]
          );
          
          // Notify others that messages were read
          socket.to(`conversation:${data.conversationId}`).emit('message_read', {
            userId: socket.userId,
            conversationId: data.conversationId,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error marking conversation as read:', error);
        }
      });
      
      // Handle disconnect
      socket.on('disconnect', async () => {
        console.log(`Socket ${socket.id} disconnected`);
        
        if (socket.userId) {
          // Update user's last active timestamp
          await pool.query(
            'UPDATE users SET last_active = NOW() WHERE id = $1',
            [socket.userId]
          );
          
          // Notify other users about status change
          this.io.emit('user_status', { 
            userId: socket.userId, 
            status: 'offline',
            lastActive: new Date()
          });
        }
      });
    });
  }
  
  /**
   * Send a message to a specific user
   * @param {string} userId - User ID
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  sendToUser(userId, event, data) {
    this.io.to(`user:${userId}`).emit(event, data);
  }
  
  /**
   * Send a message to all members of a conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  sendToConversation(conversationId, event, data) {
    this.io.to(`conversation:${conversationId}`).emit(event, data);
  }
  
  /**
   * Broadcast a message to all connected clients
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  broadcast(event, data) {
    this.io.emit(event, data);
  }
}

export default ChatWebSocketService;