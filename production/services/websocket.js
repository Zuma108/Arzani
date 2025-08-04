import jwt from 'jsonwebtoken';
import pool from '../db.js';

/**
 * WebSocket Service 
 * Handles real-time communication for chat
 */
class WebSocketService {
  constructor(io) {
    this.io = io;
    this.setupSocketHandlers();
    
    // Store io instance globally for notifications from other parts of the app
    global.io = io;
  }
  
  /**
   * Set up socket event handlers
   */
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('New WebSocket connection');
      
      // Handle authentication
      socket.on('authenticate', async (data) => {
        try {
          if (!data.token) {
            socket.emit('error', { message: 'Authentication required' });
            return;
          }
          
          // Verify the token
          const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
          const userId = decoded.userId;
          
          // Store user ID in socket for future reference
          socket.userId = userId;
          
          // Join user's personal room
          socket.join(`user:${userId}`);
          
          // Get user's conversations and join those rooms
          const conversationsResult = await pool.query(`
            SELECT conversation_id 
            FROM conversation_participants 
            WHERE user_id = $1
          `, [userId]);
          
          for (const row of conversationsResult.rows) {
            socket.join(`conversation:${row.conversation_id}`);
          }
          
          // Update user's status to online
          await pool.query(`
            UPDATE users SET last_active = NOW() WHERE id = $1
          `, [userId]);
          
          // Notify other users that this user is online
          this.io.emit('user_status', { userId, status: 'online' });
          
          socket.emit('authenticated', { success: true });
          
          // Dispatch event for other scripts
          socket.emit('ws-authenticated');
        } catch (error) {
          console.error('WebSocket authentication error:', error);
          socket.emit('error', { message: 'Authentication failed' });
        }
      });
      
      // Handle user typing event
      socket.on('typing', async (data) => {
        if (!socket.userId) return;
        
        const { conversationId, isTyping } = data;
        
        // Emit to everyone else in the conversation
        socket.to(`conversation:${conversationId}`).emit('user_typing', {
          userId: socket.userId,
          conversationId,
          isTyping
        });
      });
      
      // Handle disconnect
      socket.on('disconnect', async () => {
        if (socket.userId) {
          // Update user's last active timestamp
          await pool.query(`
            UPDATE users SET last_active = NOW() WHERE id = $1
          `, [socket.userId]);
          
          // Notify other users about status change
          this.io.emit('user_status', { 
            userId: socket.userId, 
            status: 'offline',
            lastActive: new Date()
          });
        }
      });
      
      // Dispatch connect event
      socket.emit('ws-connected');
    });
  }
}

// Export with default for ES modules
export default WebSocketService;
