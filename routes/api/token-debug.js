import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

// Token debug endpoint to check token validity from various sources
router.get('/', (req, res) => {
  const authHeader = req.headers['authorization'];
  const cookieToken = req.cookies?.token;
  const sessionUserId = req.session?.userId;
  
  let headerTokenStatus = 'missing';
  let headerTokenUserId = null;
  let headerTokenExpiry = null;
  
  let cookieTokenStatus = 'missing';
  let cookieTokenUserId = null;
  let cookieTokenExpiry = null;
  
  // Check Authorization header token
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      headerTokenStatus = 'valid';
      headerTokenUserId = decoded.userId;
      headerTokenExpiry = new Date(decoded.exp * 1000).toISOString();
    } catch (err) {
      headerTokenStatus = `invalid: ${err.message}`;
    }
  }
  
  // Check cookie token
  if (cookieToken) {
    try {
      const decoded = jwt.verify(cookieToken, process.env.JWT_SECRET);
      cookieTokenStatus = 'valid';
      cookieTokenUserId = decoded.userId;
      cookieTokenExpiry = new Date(decoded.exp * 1000).toISOString();
    } catch (err) {
      cookieTokenStatus = `invalid: ${err.message}`;
    }
  }
  
  res.json({
    authHeader: {
      present: !!authHeader,
      status: headerTokenStatus,
      userId: headerTokenUserId,
      expiry: headerTokenExpiry
    },
    cookieToken: {
      present: !!cookieToken,
      status: cookieTokenStatus,
      userId: cookieTokenUserId,
      expiry: cookieTokenExpiry
    },
    session: {
      id: req.sessionID,
      userId: sessionUserId
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
