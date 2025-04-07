/**
 * Authentication debugging utilities
 * Helps troubleshoot auth-related issues in development environments
 */

// Middleware to log auth-related information for each request
const routeDebugger = (req, res, next) => {
  // Only log in development environment
  if (process.env.NODE_ENV !== 'production') {
    // Skip logging for static resources
    if (!req.path.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
      console.log(`[Auth Debug] ${req.method} ${req.path}`);
      
      const authHeader = req.headers['authorization'];
      const hasAuthHeader = !!authHeader;
      const hasCookieToken = !!req.cookies?.token;
      const hasSessionToken = !!req.session?.token;
      const hasSessionUserId = !!req.session?.userId;
      
      console.log(`[Auth Debug] Auth sources: ` + 
        `header=${hasAuthHeader ? 'yes' : 'no'}, ` + 
        `cookie=${hasCookieToken ? 'yes' : 'no'}, ` + 
        `session=${hasSessionToken || hasSessionUserId ? 'yes' : 'no'}`);
      
      if (req.user) {
        console.log(`[Auth Debug] User authenticated: userId=${req.user.userId}`);
      }
    }
  }
  
  next();
};

// Test if a specific route has authentication issues
const testRouteAuth = async (url, token = null) => {
  try {
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, { headers });
    const status = response.status;
    
    console.log(`[Auth Test] ${url} - Status: ${status}`);
    
    if (status === 401) {
      console.log('[Auth Test] Authentication required but token was missing or invalid');
    } else if (status === 403) {
      console.log('[Auth Test] Authentication successful but access denied (insufficient permissions)');
    } else if (status >= 200 && status < 300) {
      console.log('[Auth Test] Request successful');
    } else {
      console.log('[Auth Test] Unexpected status code');
    }
    
    return { url, status, success: status >= 200 && status < 300 };
  } catch (error) {
    console.error(`[Auth Test] Error testing ${url}:`, error.message);
    return { url, error: error.message, success: false };
  }
};

// Decode and analyze JWT token
const analyzeToken = (token) => {
  if (!token) {
    return { valid: false, error: 'No token provided' };
  }
  
  try {
    // Split the token into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' };
    }
    
    // Decode the payload (middle part)
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp && payload.exp < now;
    
    return {
      valid: !isExpired,
      expired: isExpired,
      payload,
      expiresIn: payload.exp ? `${Math.max(0, payload.exp - now)} seconds` : 'unknown',
      issuedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : 'unknown',
      expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'unknown'
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

export { routeDebugger, testRouteAuth, analyzeToken };
export default { routeDebugger, testRouteAuth, analyzeToken };
