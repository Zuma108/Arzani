/**
 * Diagnostic middleware for debugging API requests and responses
 * Use DEBUG_MODE query parameter or environment variable to enable detailed logging
 */

export function diagnosticMiddleware(req, res, next) {
  // Only enable detailed logging when DEBUG_MODE is true
  const debugMode = req.query.debug === 'true' || process.env.DEBUG_MODE === 'true';
  
  if (!debugMode) {
    // Skip logging in normal mode
    return next();
  }
  
  const originalSend = res.send;
  const originalJson = res.json;
  const originalStatus = res.status;
  
  const startTime = Date.now();
  
  // Log request details in debug mode only
  console.log(`[DIAGNOSTIC] 📥 Request: ${req.method} ${req.path}`);
  
  // Capture the status
  res.status = function(code) {
    res.statusCode = code;
    return originalStatus.apply(this, arguments);
  };
  
  // Intercept the response to log it in debug mode only
  res.json = function(body) {
    const responseTime = Date.now() - startTime;
    
    // Only log errors by default, or everything in debug mode
    if (res.statusCode >= 400) {
      console.log(`[DIAGNOSTIC] ❌ Error Response: ${res.statusCode} (${responseTime}ms)`, body);
    } else if (debugMode) {
      console.log(`[DIAGNOSTIC] ✅ Response: ${res.statusCode} (${responseTime}ms)`);
    }
    
    return originalJson.apply(this, arguments);
  };
  
  res.send = function(body) {
    const responseTime = Date.now() - startTime;
    
    // Only log errors by default, or everything in debug mode
    if (res.statusCode >= 400) {
      console.log(`[DIAGNOSTIC] ❌ Error Response: ${res.statusCode} (${responseTime}ms)`);
    }
    
    return originalSend.apply(this, arguments);
  };
  
  next();
}

export default diagnosticMiddleware;
