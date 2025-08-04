#!/usr/bin/env node

/**
 * Minimal server startup test
 * This helps identify what's preventing the container from starting
 */

import express from 'express';

const app = express();
const PORT = process.env.PORT || 8080;

console.log('🚀 Starting minimal server test...');
console.log(`📡 NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`🔌 Target PORT: ${PORT}`);

// Basic health endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Basic root endpoint
app.get('/', (req, res) => {
  res.json({ status: 'Server is running', port: PORT, timestamp: new Date().toISOString() });
});

// Start server with error handling
try {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Minimal server successfully listening on port ${PORT}`);
    console.log(`🌐 Server bound to 0.0.0.0:${PORT}`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
  });

  server.on('error', (error) => {
    console.error('❌ Server error:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });

} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}
