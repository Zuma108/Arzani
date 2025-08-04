/**
 * Debug and safety middleware for authentication and page rendering
 */

// Middleware to block chat interface on specific pages
export const enforceNonChatPage = (req, res, next) => {
  // Triple protection against chat interface loading
  res.locals.isChatPage = false;
  
  // Make the isChatPage property non-writable
  Object.defineProperty(res.locals, 'isChatPage', {
    value: false,
    writable: false,
    configurable: false
  });
  
  // Mark as marketplace page
  res.locals.isMarketplacePage = true;
  
  next();
};

// Route debugger middleware
export const routeDebugger = (req, res, next) => {
  // Only log for important routes, not static assets
  if (!req.path.match(/\.(js|css|png|jpg|ico|svg|woff|ttf)$/i) && 
      !req.path.startsWith('/public/') &&
      !req.path.startsWith('/images/')) {
        
    console.log(`Route debug: ${req.method} ${req.path}`, {
      auth: req.headers.authorization ? 'present' : 'none',
      session: req.sessionID ? 'present' : 'none'
    });
  }
  
  next();
};

// Authentication debugging middleware
export const authDebug = (req, res, next) => {
  // Store auth debug information for later use
  req.authDebug = {
    path: req.path,
    method: req.method,
    hasAuthHeader: !!req.headers.authorization,
    hasSession: !!req.session,
    sessionID: req.sessionID,
    userId: req.session?.userId
  };
  
  next();
};

// Debug middleware for authentication issues
export const debugAuth = (req, res, next) => {
  if (req.path === '/api/token-debug' || 
      req.path === '/api/auth/debug' ||
      req.path.includes('/debug/')) {
    
    // Allow debugging routes
    return next();
  }
  
  // For non-debug routes, just log info and continue
  if (req.headers.authorization || req.session?.userId) {
    console.log(`Auth present: ${req.path}`);
  }
  
  next();
};

export default {
  enforceNonChatPage,
  routeDebugger,
  authDebug,
  debugAuth
};
