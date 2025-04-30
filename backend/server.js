/**
 * Main Express server for Arzani-AI
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const http = require('http');
const WebSocket = require('ws');
const logger = require('./utils/logger');
const config = require('./config');

// Import routes
const chatRoutes = require('./routes/chat');
const voiceRoutes = require('./routes/voice');
const a2aRoutes = require('./routes/a2a');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Log requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api/chat', chatRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/a2a', a2aRoutes); // A2A protocol routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  res.status(err.status || 500).json({
    error: {
      message: err.message,
      status: err.status || 500
    }
  });
});

// Create HTTP server
const server = http.createServer(app);

// Set up WebSocket server for real-time communication
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  logger.info('WebSocket client connected');
  
  ws.on('message', (message) => {
    // Handle incoming WebSocket messages
    try {
      const data = JSON.parse(message);
      logger.info(`WebSocket message received: ${data.type}`);
      
      // Handle different message types here
    } catch (error) {
      logger.error('Error processing WebSocket message:', error);
    }
  });
  
  ws.on('close', () => {
    logger.info('WebSocket client disconnected');
  });
});

// Start server
const PORT = config.port || 3000;
server.listen(PORT, () => {
  logger.info(`Arzani-AI server running on port ${PORT}`);
  logger.info(`A2A endpoints available at /api/a2a/{agent-type}`);
});

module.exports = server; // Export for testing
