/**
 * A2A Protocol Discovery Middleware
 * 
 * Express middleware for implementing A2A agent discovery
 * Serves the agent card from .well-known/agent.json
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateAgentCard } from './schema.js';
import fs from 'fs/promises';

/**
 * Create middleware for agent discovery
 * 
 * @param {object} options - Discovery middleware options
 * @param {string} options.servicePath - Path to the service directory containing .well-known
 * @returns {Function} Express middleware function
 */
export function createDiscoveryMiddleware({ servicePath }) {
  const router = express.Router();
  
  // Route for agent card discovery
  router.get('/.well-known/agent.json', async (req, res) => {
    try {
      const agentCardPath = path.join(servicePath, '.well-known', 'agent.json');
      
      // Check if agent card exists
      try {
        await fs.access(agentCardPath);
      } catch (err) {
        console.error(`Agent card not found at ${agentCardPath}`);
        return res.status(404).json({ 
          error: 'Agent card not found',
          code: 'AGENT_CARD_NOT_FOUND'
        });
      }
      
      // Read and parse agent card
      const agentCardContent = await fs.readFile(agentCardPath, 'utf-8');
      const agentCard = JSON.parse(agentCardContent);
      
      // Validate agent card against schema
      if (!validateAgentCard(agentCard)) {
        const errors = validateAgentCard.errors || [];
        console.error(`Invalid agent card: ${JSON.stringify(errors)}`);
        return res.status(500).json({
          error: 'Invalid agent card',
          details: errors,
          code: 'INVALID_AGENT_CARD'
        });
      }
      
      // Set appropriate headers and return agent card
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.status(200).json(agentCard);
    } catch (err) {
      console.error(`Error serving agent card: ${err.message}`);
      res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  return router;
}

/**
 * Helper function to get the directory path of a service
 * 
 * @param {string} importMetaUrl - import.meta.url of the service
 * @returns {string} Absolute path to the service directory
 */
export function getServicePath(importMetaUrl) {
  const __filename = fileURLToPath(importMetaUrl);
  const __dirname = path.dirname(__filename);
  return __dirname;
}

export default createDiscoveryMiddleware;