/**
 * Chat WebSocket Utilities (Server-side)
 * Helper functions for managing WebSocket connections in chat functionality
 */

import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';

/**
 * Initialize Socket.IO with an HTTP server
 * @param {http.Server} server - HTTP server instance
 * @returns {SocketIOServer} Socket.IO server instance
 */
export function initializeSocketIO(server) {
  // Get the actual port the server is running on
  const actualPort = server.address()?.port || process.env.PORT || 5000;
  console.log(`Initializing Socket.IO on port ${actualPort}`);
  
  // Create Socket.IO server
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? 'https://arzani.co.uk' 
        : [`http://localhost:${actualPort}`, 'http://127.0.0.1:5000'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout:
    60000, // 60 seconds
    pingInterval: 25000 // 25 seconds
  });
  
  // Set up connection event
  io.on('connection', (socket) => {
    console.log('New Socket.IO connection', socket.id);
    
    // Handle authentication
    socket.on('authenticate', async (data) => {
      try {
        const token = data.token;
        
        if (!token) {
          socket.emit('auth_error', { message: 'No token provided' });
          return;
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        
        // Store user ID in socket
        socket.userId = userId;
        console.log(`Socket ${socket.id} authenticated for user ${userId}`);
        
        // Join user's room
        socket.join(`user:${userId}`);
        
        // Let the client know authentication was successful
        socket.emit('authenticated', { success: true, userId });
      } catch (error) {
        console.error('Socket authentication error:', error);
        socket.emit('auth_error', { message: 'Authentication failed' });
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`Socket ${socket.id} disconnected: ${reason}`);
    });
  });
  
  return io;
}

/**
 * Send a message to a specific user
 * @param {SocketIOServer} io - Socket.IO server instance
 * @param {string} userId - User ID
 * @param {string} event - Event name
 * @param {any} data - Event data
 */
export function sendToUser(io, userId, event, data) {
  if (!io) {
    console.error('Socket.IO not initialized');
    return;
  }
  
  io.to(`user:${userId}`).emit(event, data);
}

/**
 * Send a message to all members of a conversation
 * @param {SocketIOServer} io - Socket.IO server instance
 * @param {string} conversationId - Conversation ID
 * @param {string} event - Event name
 * @param {any} data - Event data
 */
export function sendToConversation(io, conversationId, event, data) {
  if (!io) {
    console.error('Socket.IO not initialized');
    return;
  }
  
  io.to(`conversation:${conversationId}`).emit(event, data);
}

export default {
  initializeSocketIO,
  sendToUser,
  sendToConversation
};
