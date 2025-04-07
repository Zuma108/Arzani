/**
 * Webhook Middleware
 * Provides enhanced logging and validation for webhooks
 */

import db from '../db.js';

/**
 * Middleware to log webhook requests before they reach handlers
 */
function logWebhookRequest(req, res, next) {
  // Capture the original URL, method, and headers
  const requestInfo = {
    url: req.originalUrl,
    method: req.method,
    headers: { ...req.headers },
    body: req.body,
    timestamp: new Date().toISOString()
  };
  
  // Remove sensitive data from logs
  if (requestInfo.headers.authorization) {
    requestInfo.headers.authorization = '***REDACTED***';
  }
  
  // Log basic request info
  console.log(`[WEBHOOK] ${req.method} ${req.originalUrl} received at ${requestInfo.timestamp}`);
  
  // Store full request for debugging
  req.webhookRequestInfo = requestInfo;
  
  // Log request to database
  try {
    logToDatabase(requestInfo)
      .catch(err => console.error('Error logging webhook to database:', err));
  } catch (err) {
    console.error('Error in webhook logging:', err);
  }
  
  next();
}

/**
 * Log webhook request to database
 */
async function logToDatabase(requestInfo) {
  try {
    // Create webhook_requests table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS webhook_requests (
        id SERIAL PRIMARY KEY,
        url TEXT,
        method VARCHAR(10),
        headers JSONB,
        body JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Insert the log
    await db.query(
      'INSERT INTO webhook_requests (url, method, headers, body, created_at) VALUES ($1, $2, $3, $4, $5)',
      [
        requestInfo.url,
        requestInfo.method,
        requestInfo.headers,
        requestInfo.body || {},
        new Date(requestInfo.timestamp)
      ]
    );
  } catch (error) {
    console.error('Error logging webhook to database:', error);
  }
}

/**
 * Get recent webhook requests from database
 */
async function getRecentWebhookRequests(limit = 50) {
  try {
    const result = await db.query(
      'SELECT * FROM webhook_requests ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error fetching webhook requests:', error);
    return [];
  }
}

export default {
  logWebhookRequest,
  getRecentWebhookRequests
};
