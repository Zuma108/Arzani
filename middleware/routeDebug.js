import express from 'express';

export default function printRoutes(app) {
  const routes = [];
  
  // Function to collect route information
  const collectRoutes = (stack, basePath = '') => {
    stack.forEach(layer => {
      if (layer.route) {
        // Routes registered directly on the app
        const methods = Object.keys(layer.route.methods)
          .filter(method => layer.route.methods[method])
          .join(', ').toUpperCase();
          
        routes.push({
          path: basePath + (layer.route.path || ''),
          methods
        });
      } else if (layer.name === 'router' && layer.handle.stack) {
        // Routes registered via router
        const newBasePath = basePath + (layer.regexp.toString().replace(/[\\^$.*+?()[\]{}|]/g, '') || '');
        collectRoutes(layer.handle.stack, newBasePath);
      }
    });
  };

  // Collect routes from the Express app
  if (app._router && app._router.stack) {
    collectRoutes(app._router.stack);
  }

  // Sort and console log routes
  routes.sort((a, b) => a.path.localeCompare(b.path));
  routes.forEach(route => {
    console.log(`${route.methods} ${route.path}`);
  });
  
  return routes;
}
