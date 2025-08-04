/**
 * Chat Socket Initialization
 * Exports a function to initialize the chat socket service
 */

import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pool from '../db.js';

dotenv.config();

/**
 * Initialize the chat socket service
 * @param {Server} server - HTTP server instance
 * @returns {Object} The chat socket service instance
 */
export function initializeChatSocket(server) {
  console.log('Initializing chat socket service');
  
  if (!server) {
    console.error('Cannot initialize chat socket: No server instance provided');
    return null;
  }
  
  // Create Socket.IO server with both WebSocket and polling transports
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? 'https://arzani.co.uk' 
        : ['http://localhost:5000', 'http://127.0.0.1:5000', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    // Support both WebSocket and polling for maximum compatibility
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });
  
  // Set up authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || 
                    socket.handshake.query.token;
                   
      if (!token) {
        return next(new Error('Authentication token is required'));
      }
      
      // Verify token
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        socket.user = decoded;
        next();
      } catch (jwtError) {
        console.error('Socket JWT verification failed:', jwtError.message);
        return next(new Error('Invalid authentication token'));
      }
    } catch (error) {
      console.error('Socket authentication error:', error);
      return next(new Error('Authentication failed'));
    }
  });
  
  // Set up event handlers
  io.on('connection', (socket) => {
    console.log(`New chat socket connection: ${socket.id} for user ${socket.userId || 'unknown'}`);
    
    // Join user's personal room for direct messages
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
      console.log(`User ${socket.userId} joined their personal room`);
      
      // Notify client of successful connection
      socket.emit('connected', { 
        success: true, 
        userId: socket.userId,
        socketId: socket.id
      });
    }
    
    // Handle joining a conversation
    socket.on('join', (data) => {
      try {
        const { conversationId } = data;
        if (!conversationId) return;
        
        // Join the conversation room
        socket.join(`conversation:${conversationId}`);
        console.log(`User ${socket.userId} joined conversation ${conversationId}`);
        
        // Notify others in the room
        socket.to(`conversation:${conversationId}`).emit('user_joined', {
          userId: socket.userId,
          conversationId
        });
      } catch (error) {
        console.error('Error joining conversation:', error);
      }
    });
    
    // Handle sending a message
    socket.on('message', async (data) => {
      try {
        const { conversationId, content } = data;
        if (!conversationId || !content) return;
        
        // Save message to database
        const message = await saveMessageToDatabase(socket.userId, conversationId, content);
        
        // Broadcast to all clients in the conversation room
        io.to(`conversation:${conversationId}`).emit('new_message', message);
      } catch (error) {
        console.error('Error handling message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    
    // Handle typing indicator
    socket.on('typing', (data) => {
      const { conversationId } = data;
      if (!conversationId) return;
      
      socket.to(`conversation:${conversationId}`).emit('typing', {
        userId: socket.userId,
        conversationId
      });
    });
    
    // Handle stop typing indicator
    socket.on('stopTyping', (data) => {
      const { conversationId } = data;
      if (!conversationId) return;
      
      socket.to(`conversation:${conversationId}`).emit('stop_typing', {
        userId: socket.userId,
        conversationId
      });
    });
    
    // Handle marking messages as read
    socket.on('markRead', async (data) => {
      try {
        const { conversationId } = data;
        if (!conversationId || !socket.userId) return;
        
        // Update message status in database
        await markMessagesAsRead(socket.userId, conversationId);
        
        // Notify other users in the conversation
        socket.to(`conversation:${conversationId}`).emit('messages_read', {
          userId: socket.userId,
          conversationId
        });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`Socket ${socket.id} disconnected: ${reason}`);
    });
  });
  
  // Helper function to save message to database
  async function saveMessageToDatabase(senderId, conversationId, content) {
    try {
      const query = `
        INSERT INTO messages (sender_id, conversation_id, content, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING id, sender_id, conversation_id, content, created_at
      `;
      
      const result = await pool.query(query, [senderId, conversationId, content]);
      return result.rows[0];
    } catch (error) {
      console.error('Database error saving message:', error);
      throw error;
    }
  }
  
  // Helper function to mark messages as read
  async function markMessagesAsRead(userId, conversationId) {
    try {
      const query = `
        UPDATE messages
        SET read = true, read_at = NOW()
        WHERE conversation_id = $1
          AND sender_id != $2
          AND read = false
      `;
      
      await pool.query(query, [conversationId, userId]);
    } catch (error) {
      console.error('Database error marking messages as read:', error);
      throw error;
    }
  }
  
  // Return the io instance for external use if needed
  return { io };
}

export default { initializeChatSocket };