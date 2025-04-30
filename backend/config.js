/**
 * Configuration for Arzani-AI
 * 
 * Loads environment variables and provides default values
 */

require('dotenv').config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  
  // Database configuration
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'arzani',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    url: process.env.DATABASE_URL
  },
  
  // A2A protocol configuration
  a2a: {
    authToken: process.env.A2A_AUTH_TOKEN,
    jwtSecret: process.env.A2A_JWT_SECRET || 'arzani-development-secret-key',
    skipAuthInDev: process.env.A2A_SKIP_AUTH_IN_DEV === 'true',
    endpoints: {
      generalist: process.env.A2A_GENERALIST_ENDPOINT || 'http://localhost:3000/api/a2a/generalist',
      broker: process.env.A2A_BROKER_ENDPOINT || 'http://localhost:3000/api/a2a/broker',
      legal: process.env.A2A_LEGAL_ENDPOINT || 'http://localhost:3000/api/a2a/legal',
      finance: process.env.A2A_FINANCE_ENDPOINT || 'http://localhost:3000/api/a2a/finance'
    },
    webhookSecret: process.env.A2A_WEBHOOK_SECRET
  },
  
  // OpenAI API configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    organizationId: process.env.OPENAI_ORGANIZATION_ID
  },
  
  // MCP configuration
  mcp: {
    endpoint: process.env.MCP_ENDPOINT || 'http://localhost:8080',
    apiKey: process.env.MCP_API_KEY
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json'
  }
};
