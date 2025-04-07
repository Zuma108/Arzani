/**
 * n8n Configuration
 * This file contains configuration settings for connecting to n8n workflows
 */

const config = {
  // Base URL for n8n server
  baseUrl: process.env.N8N_WEBHOOK_URL || 'http://localhost:5678',
  
  // API key for authentication with n8n
  apiKey: process.env.N8N_API_KEY || '',
  
  // Workflow IDs or names
  workflows: {
    publishBlog: process.env.N8N_PUBLISH_WORKFLOW || 'blog-publish',
    updateBlog: process.env.N8N_UPDATE_WORKFLOW || 'blog-update',
    refreshCache: process.env.N8N_REFRESH_CACHE_WORKFLOW || 'blog-cache-refresh'
  },
  
  // Whether to use production mode
  production: process.env.NODE_ENV === 'production'
};

export default config;