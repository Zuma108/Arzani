/**
 * Debug middleware for troubleshooting authentication issues
 * Add this as a middleware in your app.js: app.use('/auth', debugMiddleware, authRoutes);
 */
export default function debugMiddleware(req, res, next) {
  // Only attach to login routes
  if (req.path === '/login' && req.method === 'POST') {
    console.log('==== LOGIN DEBUG INFO ====');
    console.log('Login attempt with email:', req.body.email || 'not provided');
    
    // Clone the response functions we need to wrap
    const originalJson = res.json;
    const originalStatus = res.status;
    
    // Track status code
    let statusCode = 200;
    
    // Wrap status function
    res.status = function(code) {
      console.log('Login response status:', code);
      statusCode = code;
      return originalStatus.apply(this, arguments);
    };
    
    // Wrap json function
    res.json = function(data) {
      console.log('Login response payload:', JSON.stringify(data, null, 2));
      
      if (statusCode >= 400) {
        console.log('Login FAILED with status:', statusCode);
        if (data.message === 'Invalid account configuration') {
          console.log('This likely means the account exists but either:');
          console.log('1. The password_hash is missing or null');
          console.log('2. The users_auth record might be missing for this user');
          console.log('Check database entries for user with email:', req.body.email);
        }
      } else {
        console.log('Login SUCCESS with status:', statusCode);
      }
      
      console.log('==== END LOGIN DEBUG INFO ====');
      return originalJson.apply(this, arguments);
    };
  }
  
  next();
}
