// Create a root-route-fix.js module to properly handle the chat interface and route conflicts
// This ensures that other routes like /marketplace2 won't be affected

import express from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';

/**
 * This function attaches a special handler to the Express app
 * that ensures root routes don't conflict with the chat interface
 * and properly handles authentication for all routes
 */
export function attachRootRoute(app) {
  // This function prevents the chat-interface route from overriding other routes
  
  // Store original route handlers
  const originalGet = app.get;
  
  // Create a map to track explicit routes
  const explicitRoutes = new Set();
  
  // Override the app.get method to keep track of registered routes
  app.get = function(path, ...handlers) {
    // Add the explicit route to our tracking set
    if (typeof path === 'string') {
      explicitRoutes.add(path);
    }
    
    // Call the original method
    return originalGet.apply(this, [path, ...handlers]);
  };
  
  // Add middleware that runs before routes are processed
  app.use((req, res, next) => {
    // Extract the path from the request
    const requestPath = req.path;
    
    // Debug the route resolution for troubleshooting
    if (process.env.NODE_ENV === 'production') {
      console.log(`Route resolution for: ${requestPath}`);
    }
    
    // List of paths that should never use the chat interface
    const nonChatPaths = [
      '/marketplace2',
      '/marketplace',
      '/history',
      '/saved-searches',
      '/post-business',
      '/profile',
      '/market-trends',
      '/off-market-leads',
      '/login',
      '/login2',
      '/signup',
      '/auth',
      '/api'
    ];
    
    // Check if this is a known non-chat path
    if (nonChatPaths.some(path => 
        requestPath === path || 
        requestPath.startsWith(path + '/'))) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Identified as non-chat path: ${requestPath}`);
      }
      // Set explicit flag to ensure it's never treated as a chat page
      res.locals.isChatPage = false;
      return next(); // Let it be handled by its proper route
    }
    
    // Only apply special handling for chat-related paths
    if (requestPath === '/chat-interface' || 
        requestPath === '/chat' || 
        requestPath.startsWith('/chat/')) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Identified as chat path: ${requestPath}`);
      }
      
      // Set flag to indicate this is a chat page (will be used in templates)
      res.locals.isChatPage = true;
    }
    
    // Authentication enhancement: Try to extract token from multiple sources
    tryExtractToken(req);
    
    // Always proceed to normal route handling
    next();
  });
  
  // Add a high-priority handler for the root route
  const existingRoutes = app._router ? app._router.stack : [];
  
  // Create our root route handler
  const rootHandler = (req, res, next) => {
    if (req.path === '/') {
      return res.render('homepage', { 
        title: 'Welcome to Arzani Marketplace'
      });
    }
    next();
  };
  
  // Insert it at the beginning of the middleware stack, right after built-in middleware
  if (existingRoutes && existingRoutes.length > 0) {
    // Find the right position (after query parser middleware)
    let insertPosition = 0;
    for (let i = 0; i < existingRoutes.length; i++) {
      const layer = existingRoutes[i];
      if (layer.name === 'query' || layer.name === 'expressInit') {
        insertPosition = i + 1;
      }
    }
    
    // Add our handler - use app object directly to ensure proper insertion
    app.use('/', rootHandler);
    
    console.log('Root route handler attached with high priority');
  } else {
    // Fallback if router not initialized
    app.get('/', rootHandler);
    console.log('Root route handler attached (fallback method)');
  }
}

/**
 * Helper function to extract authentication token from multiple sources
 * This consolidates token handling for better auth reliability
 */
function tryExtractToken(req) {
  if (!req.headers) req.headers = {};
  
  // Skip if auth header is already set
  if (req.headers['authorization'] && req.headers['authorization'].startsWith('Bearer ')) {
    return;
  }
  
  // Try getting from cookie
  const token = req.cookies?.token;
  if (token) {
    req.headers['authorization'] = `Bearer ${token}`;
    return;
  }
  
  // Try getting from session if userId exists
  if (req.session?.userId) {
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (jwtSecret) {
        // Create a new token from the session
        const newToken = jwt.sign(
          { userId: req.session.userId },
          jwtSecret,
          { expiresIn: '1h' }
        );
        
        // Set the Authorization header
        req.headers['authorization'] = `Bearer ${newToken}`;
      }
    } catch (error) {
      console.error('Error creating token from session:', error);
    }
  }
}

export default { attachRootRoute };