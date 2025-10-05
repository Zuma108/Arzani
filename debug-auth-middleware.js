/**
 * Debug middleware to log all authentication-related data in requests
 * Add this temporarily to server.js to debug authentication issues
 */

export const debugAuthMiddleware = (req, res, next) => {
  // Only log for specific paths to avoid spam
  const relevantPaths = ['/marketplace2', '/auth/', '/api/', '/login', '/profile'];
  const shouldLog = relevantPaths.some(path => req.path.startsWith(path)) || req.path === '/';
  
  if (shouldLog && !req.path.match(/\.(css|js|png|jpg|gif|ico|svg|woff|woff2)$/i)) {
    console.log('\n🔍 AUTH DEBUG for', req.method, req.path);
    console.log('📧 Headers:');
    console.log('   Authorization:', req.headers['authorization'] ? 'Present' : 'None');
    console.log('   Cookie:', req.headers['cookie'] ? 'Present' : 'None');
    
    console.log('🍪 Cookies:');
    console.log('   token:', req.cookies?.token ? 'Present (' + req.cookies.token.substring(0, 20) + '...)' : 'None');
    console.log('   refreshToken:', req.cookies?.refreshToken ? 'Present' : 'None');
    console.log('   connect.sid:', req.cookies?.['connect.sid'] ? 'Present' : 'None');
    
    console.log('📋 Session:');
    console.log('   sessionID:', req.sessionID || 'None');
    console.log('   userId:', req.session?.userId || 'None');
    console.log('   token:', req.session?.token ? 'Present (' + req.session.token.substring(0, 20) + '...)' : 'None');
    
    console.log('👤 User Object:');
    console.log('   req.user:', req.user ? `{ userId: ${req.user.userId} }` : 'None');
    
    console.log('🔐 Auth Results (after middleware):');
    // This will be filled by the next middleware
    res.locals.authDebugPath = req.path;
  }
  
  next();
};

// Add this after authentication middleware to see results
export const debugAuthResults = (req, res, next) => {
  if (res.locals.authDebugPath === req.path) {
    console.log('   Final req.user:', req.user ? `{ userId: ${req.user.userId} }` : 'None');
    console.log('   Authentication status:', req.user ? '✅ Authenticated' : '❌ Not authenticated');
    console.log(''); // Empty line for readability
  }
  
  next();
};

export default { debugAuthMiddleware, debugAuthResults };