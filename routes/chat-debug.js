import express from 'express';

const router = express.Router();

// Simple endpoint to test if chat API routes are registered
router.get('/api-routes-check', (req, res) => {
  // Get all registered routes
  const routes = [];
  
  // Get the Express router stack
  const stack = req.app._router.stack;
  
  // Extract route paths
  stack.forEach(middleware => {
    if (middleware.route) {
      // Routes registered directly on the app
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods).join(', ')
      });
    } else if (middleware.name === 'router' && middleware.handle.stack) {
      // Routes registered via a router
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          routes.push({
            path: middleware.regexp.toString() + ' → ' + handler.route.path,
            methods: Object.keys(handler.route.methods).join(', ')
          });
        }
      });
    }
  });
  
  res.json({
    message: 'API routes diagnostic',
    routes: routes,
    chatRoutesCount: routes.filter(r => r.path.includes('chat')).length
  });
});

export default router;
