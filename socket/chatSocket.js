/**
 * Chat Socket Initialization
 * Exports a function to initialize the chat socket service
 */

import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

/**
 * Initialize the chat socket service
 * @param {Server} server - HTTP server instance
 * @returns {ChatWebSocketService} The chat socket service instance
 */
export function initializeChatSocket(server) {
  console.log('Initializing chat socket service');
  
  // Create Socket.IO server with only polling transport enabled
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? 'https://arzani.co.uk' 
        : ['http://localhost:5000', 'http://127.0.0.1:5000', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    // Explicitly use only polling transport since WebSocket is failing
    transports: ['polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    allowUpgrades: false // Prevent upgrade to WebSocket
  });
  
  // Set up event handlers
  io.on('connection', (socket) => {
    console.log('New chat socket connection:', socket.id);
    
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
    
    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`Socket ${socket.id} disconnected: ${reason}`);
    });
  });
  
  return { io };
}

export default { initializeChatSocket };