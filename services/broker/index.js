/**
 * Broker Agent Server
 * 
 * Implements the Broker Specialist Agent for the Arzani A2A system
 * - Handles business valuation requests
 * - Provides marketplace comparables data
 * - Offers deal structuring advice
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createDiscoveryMiddleware, getServicePath } from '../../libs/a2a/discovery-middleware.js';
import { createErrorResponse, ERROR_CODES } from '../../libs/a2a/utils.js';
import { registerBrokerRoutes } from './routes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.BROKER_AGENT_PORT || 5002;
const servicePath = getServicePath(import.meta.url);

// Middleware
app.use(express.json());
app.use(cors());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} (broker-agent)`);
  next();
});

// Authentication middleware for A2A protocol
app.use((req, res, next) => {
  // Skip auth for discovery endpoints and when auth is disabled
  if (req.path === '/.well-known/agent.json' || process.env.A2A_AUTH_ENABLED !== 'true') {
    return next();
  }
  
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(
      createErrorResponse(req.body?.id || 'auth-error', ERROR_CODES.UNAUTHORIZED, 'Missing or invalid authentication token')
    );
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  if (token !== process.env.A2A_AUTH_TOKEN) {
    return res.status(401).json(
      createErrorResponse(req.body?.id || 'auth-error', ERROR_CODES.UNAUTHORIZED, 'Invalid authentication token')
    );
  }
  
  next();
});

// Agent discovery middleware
app.use(createDiscoveryMiddleware({ servicePath }));

// Register broker agent routes
registerBrokerRoutes(app);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'broker-agent',
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Broker Agent running on port ${PORT}`);
  console.log(`Agent card available at: http://localhost:${PORT}/.well-known/agent.json`);
});

export default app;