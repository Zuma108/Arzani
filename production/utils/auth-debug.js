/**
 * Auth Debug Middleware
 * Provides utilities for debugging authentication issues
 */

export function createAuthDebugMiddleware() {
  return {
    enforceNonChatPage: (req, res, next) => {
      // Ensure this is not treated as a chat page
      res.locals.isChatPage = false;
      
      // Add a protected property to prevent overriding
      Object.defineProperty(res.locals, '_isChatPageProtected', {
        value: false,
        writable: false,
        configurable: false
      });
      
      next();
    },
    
    routeDebugger: (req, res, next) => {
      // Skip for static assets
      if (/^\/(css|js|images|uploads|favicon\.ico)/.test(req.path)) {
        return next();
      }

      console.log('Auth debug:', {
        path: req.path,
        isChatPage: req.path.startsWith('/chat'),
        hasAuthHeader: !!req.headers['authorization'],
        hasSession: !!req.session,
        userInSession: !!req.session?.userId
      });
      
      next();
    }
  };
}

export default { createAuthDebugMiddleware };
