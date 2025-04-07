/**
 * Route debugging utility to help diagnose routing issues
 */

/**
 * Function to print all registered routes to the console
 * @param {Express} app - Express application instance
 */
export function printRoutes(app) {
  const routeStacks = app._router.stack;
  
  console.log('\n=== REGISTERED ROUTES ===');
  
  routeStacks.forEach(middleware => {
    if (middleware.route) {
      // Routes registered directly on the app
      const path = middleware.route.path;
      const methods = Object.keys(middleware.route.methods).map(m => m.toUpperCase()).join(',');
      console.log(`${methods} ${path}`);
    } else if (middleware.name === 'router') {
      // Router middleware
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          const path = handler.route.path;
          const methods = Object.keys(handler.route.methods).map(m => m.toUpperCase()).join(',');
          let fullPath;
          
          // Try to determine the router's base path
          if (middleware.regexp && middleware.regexp.source) {
            // This is complex but tries to extract the base path from the regexp
            const regexSource = middleware.regexp.source;
            const basePathMatch = regexSource.match(/\^\\\/?([^\\]*)/);
            const basePath = basePathMatch ? `/${basePathMatch[1]}` : '';
            fullPath = `${basePath}${path === '/' ? '' : path}`;
          } else {
            fullPath = path;
          }
          
          console.log(`${methods} ${fullPath}`);
        }
      });
    }
  });
  
  console.log('=========================\n');
}

/**
 * Utility to find conflicting routes
 * @param {Express} app - Express application instance
 */
export function findConflictingRoutes(app) {
  const routes = [];
  const routeStacks = app._router.stack;
  
  // Extract all routes
  routeStacks.forEach(middleware => {
    if (middleware.route) {
      // Routes registered directly on the app
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods),
        layer: 'app'
      });
    } else if (middleware.name === 'router') {
      // Router middleware
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          let fullPath;
          
          // Try to determine the router's base path
          if (middleware.regexp && middleware.regexp.source) {
            const regexSource = middleware.regexp.source;
            const basePathMatch = regexSource.match(/\^\\\/?([^\\]*)/);
            const basePath = basePathMatch ? `/${basePathMatch[1]}` : '';
            fullPath = `${basePath}${handler.route.path === '/' ? '' : handler.route.path}`;
          } else {
            fullPath = handler.route.path;
          }
          
          routes.push({
            path: fullPath,
            methods: Object.keys(handler.route.methods),
            layer: 'router'
          });
        }
      });
    }
  });
  
  // Find potential conflicts
  const conflicts = [];
  for (let i = 0; i < routes.length; i++) {
    for (let j = i + 1; j < routes.length; j++) {
      const route1 = routes[i];
      const route2 = routes[j];
      
      // Check if paths could conflict
      if (route1.path === route2.path || 
          route1.path === '/' || route2.path === '/' ||
          route1.path === '*' || route2.path === '*') {
        
        // Check if methods overlap
        const sharedMethods = route1.methods.filter(m => route2.methods.includes(m));
        if (sharedMethods.length > 0) {
          conflicts.push({
            route1: `${route1.layer}: ${route1.methods.join(',')} ${route1.path}`,
            route2: `${route2.layer}: ${route2.methods.join(',')} ${route2.path}`,
            sharedMethods
          });
        }
      }
    }
  }
  
  if (conflicts.length > 0) {
    console.log('\n=== POTENTIAL ROUTE CONFLICTS ===');
    conflicts.forEach(conflict => {
      console.log(`Conflict between:\n  - ${conflict.route1}\n  - ${conflict.route2}`);
      console.log(`  Shared methods: ${conflict.sharedMethods.join(',')}`);
    });
    console.log('=================================\n');
  }
  
  return conflicts;
}

export default {
  printRoutes,
  findConflictingRoutes
};
