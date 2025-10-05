/**
 * Simple authentication test route
 * Add this to server.js temporarily to test auth flow
 */

// TEST ROUTE: Check authentication status
app.get('/api/test-auth', (req, res) => {
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const cookieToken = req.cookies?.token;
  const sessionUserId = req.session?.userId;
  const sessionToken = req.session?.token;

  console.log('🧪 AUTH TEST REQUEST:', {
    path: req.path,
    sessionID: req.sessionID,
    sessionUserId,
    hasAuthHeader: !!authHeader,
    hasHeaderToken: !!headerToken,
    hasCookieToken: !!cookieToken,
    hasSessionToken: !!sessionToken,
    hasReqUser: !!req.user,
    userAgent: req.headers['user-agent']?.substring(0, 50)
  });

  // Try to extract and verify tokens
  const tokenSources = [];
  
  if (headerToken) {
    try {
      const decoded = jwt.verify(headerToken, process.env.JWT_SECRET);
      tokenSources.push({ source: 'header', valid: true, userId: decoded.userId });
    } catch (err) {
      tokenSources.push({ source: 'header', valid: false, error: err.message });
    }
  }
  
  if (cookieToken) {
    try {
      const decoded = jwt.verify(cookieToken, process.env.JWT_SECRET);
      tokenSources.push({ source: 'cookie', valid: true, userId: decoded.userId });
    } catch (err) {
      tokenSources.push({ source: 'cookie', valid: false, error: err.message });
    }
  }
  
  if (sessionToken) {
    try {
      const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET);
      tokenSources.push({ source: 'session', valid: true, userId: decoded.userId });
    } catch (err) {
      tokenSources.push({ source: 'session', valid: false, error: err.message });
    }
  }

  res.json({
    authStatus: {
      hasSession: !!req.session,
      sessionID: req.sessionID,
      sessionUserId: req.session?.userId,
      hasReqUser: !!req.user,
      reqUserId: req.user?.userId
    },
    tokens: {
      headerToken: headerToken ? headerToken.substring(0, 20) + '...' : null,
      cookieToken: cookieToken ? cookieToken.substring(0, 20) + '...' : null,
      sessionToken: sessionToken ? sessionToken.substring(0, 20) + '...' : null
    },
    tokenValidation: tokenSources,
    recommendation: tokenSources.length > 0 ? 
      (tokenSources.some(t => t.valid) ? 'Valid authentication found' : 'All tokens invalid') :
      (sessionUserId ? 'Session exists but no JWT tokens found' : 'No authentication found')
  });
});