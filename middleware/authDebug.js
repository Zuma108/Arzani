/**
 * Debug middleware to help diagnose authentication issues
 */

export function debugAuth(req, res, next) {
  // Check all authentication sources
  const authInfo = {
    path: req.path,
    method: req.method,
    session: {
      exists: !!req.session,
      id: req.sessionID || null,
      userId: req.session?.userId || null
    },
    user: {
      exists: !!req.user,
      userId: req.user?.userId || null
    },
    token: {
      authHeader: req.headers.authorization ? 
        `${req.headers.authorization.substring(0, 15)}...` : null,
      cookie: req.cookies?.token ? 'Present' : 'Missing',
      query: req.query?.token ? 'Present' : 'Missing'
    },
    cookies: Object.keys(req.cookies || {})
  };

  console.log('🔍 AUTH DEBUG:', JSON.stringify(authInfo, null, 2));
  next();
}

export default { debugAuth };
