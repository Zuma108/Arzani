import dotenv from 'dotenv';
dotenv.config();

/**
 * Middleware to authenticate webhook requests from n8n
 * Checks for the API token in the Authorization header or X-Webhook-Token header
 */
export const requireWebhookAuth = (req, res, next) => {
  // Get the API key from the environment variables
  const apiSecret = process.env.SITEMAP_API_SECRET;

  // Get authorization header
  const authHeader = req.headers.authorization;
  const webhookToken = req.headers['x-webhook-token'];

  console.log('Webhook auth check - headers:', { 
    hasAuth: !!authHeader, 
    hasToken: !!webhookToken,
    authType: authHeader ? authHeader.split(' ')[0] : 'none'
  });

  // Check if there's an Authorization header with Bearer prefix
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    if (token === apiSecret) {
      console.log('Webhook authenticated via Authorization header');
      return next();
    }
  }
  
  // Alternative: Check for X-Webhook-Token header
  if (webhookToken && webhookToken === apiSecret) {
    console.log('Webhook authenticated via X-Webhook-Token header');
    return next();
  }

  console.log('Webhook authentication failed');
  return res.status(401).json({ 
    success: false, 
    error: 'Unauthorized - Invalid webhook token' 
  });
};
