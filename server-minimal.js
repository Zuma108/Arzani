#!/usr/bin/env node

/**
 * MINIMAL CONTAINER TEST SERVER
 * This is a minimal version of server.js designed to test container startup
 * Use this to isolate the container startup issue
 */

// Essential imports only
import express from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🚀 MINIMAL CONTAINER TEST SERVER STARTING...');
console.log('============================================');

// Environment check
const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log(`📊 Environment: ${NODE_ENV}`);
console.log(`🔌 Port: ${PORT}`);
console.log(`🕐 Start time: ${new Date().toISOString()}`);

// Create Express app
const app = express();

// Essential middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Critical health endpoint for Cloud Run
app.get('/health', (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'arzani-marketplace-minimal',
    version: '1.0.0',
    port: PORT,
    environment: NODE_ENV,
    uptime: process.uptime(),
    message: 'Minimal container test successful'
  };
  
  console.log('🏥 Health check requested:', healthData.timestamp);
  res.status(200).json(healthData);
});

// Basic root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Arzani Marketplace - Minimal Container Test',
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: NODE_ENV
  });
});

// Test API endpoints that caused issues
app.get('/api/valuation/test', (req, res) => {
  res.status(200).json({
    message: 'Valuation API test successful',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/public-valuation/test', (req, res) => {
  res.status(200).json({
    message: 'Public Valuation API test successful',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('💥 Express error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start server with error handling
try {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('✅ MINIMAL SERVER STARTED SUCCESSFULLY');
    console.log(`🌐 Server URL: http://0.0.0.0:${PORT}`);
    console.log(`🏥 Health check: http://0.0.0.0:${PORT}/health`);
    console.log(`🧪 API test: http://0.0.0.0:${PORT}/api/valuation/test`);
    console.log('🚀 Container ready to receive traffic');
    console.log('============================================');
  });

  server.on('error', (error) => {
    console.error('💥 SERVER ERROR:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`🚨 Port ${PORT} is already in use`);
    }
    process.exit(1);
  });

} catch (error) {
  console.error('💥 STARTUP ERROR:', error);
  console.error('📋 Error details:', error.message);
  console.error('📊 Stack trace:', error.stack);
  process.exit(1);
}

console.log('📝 Minimal server script completed');
