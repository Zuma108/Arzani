import dotenv from 'dotenv';
dotenv.config();

// Simple authentication middleware for webhooks
export function requireWebhookAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const apiSecret = process.env.SITEMAP_API_SECRET;
  
  // Check if using Bearer token auth
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token === apiSecret) {
      return next();
    }
  }
  
  // Alternative: Allow n8n internal calls without auth (only if from local docker network)
  const clientIp = req.ip || req.connection.remoteAddress;
  if (clientIp === '::ffff:127.0.0.1' || clientIp === '127.0.0.1' || clientIp.includes('172.')) {
    console.log('Allowing internal n8n call from:', clientIp);
    return next();
  }
  
  console.error('Unauthorized webhook access attempt:', req.path);
  return res.status(401).json({ error: 'Unauthorized' });
}
