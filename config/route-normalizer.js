/**
 * This utility normalizes route paths by removing problematic patterns
 * and ensuring consistent formatting
 */

export function normalizeRoutePaths(app) {
  console.log('Normalizing route paths...');
  
  // Get all registered routes
  const routes = [];
  app._router.stack.forEach(middleware => {
    if (middleware.route) { // Routes registered directly
      routes.push(middleware.route);
    } else if (middleware.name === 'router') { // Router middleware
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          routes.push(handler.route);
        }
      });
    }
  });

  // Clean up route paths
  routes.forEach(route => {
    if (route.path && route.path.includes('=//i')) {
      const originalPath = route.path;
      route.path = route.path.replace(/\/=\/\/i\//g, '/');
      console.log(`Fixed route: ${originalPath} → ${route.path}`);
    }
  });
  
  console.log('Route normalization complete');
}
