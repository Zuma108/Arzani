// microsoftAuth.js
const axios = require('axios');
const jwt = require('jsonwebtoken');
const querystring = require('querystring');
require('dotenv').config();

const clientId = process.env.MICROSOFT_CLIENT_ID;
const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
const redirectUri = 'http://localhost:5000/auth/microsoft/callback';
const JWT_SECRET = process.env.JWT_SECRET || '61a8f2d6-536a-4ab5-8696-c7615069e969';

module.exports = (app) => {
  // Route to handle Microsoft OAuth2 callback
  app.get('/auth/microsoft/callback', async (req, res) => {
    const code = req.query.code;

    try {
      // Exchange the authorization code for an access token
      const tokenResponse = await axios.post(
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        querystring.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code: code,
          grant_type: 'authorization_code',
        })
      );

      const { access_token, id_token } = tokenResponse.data;

      // Decode the ID token to get user information
      const decodedIdToken = jwt.decode(id_token);

      // Get user info from the decoded ID token
      const { sub, email, name, picture } = decodedIdToken;

      // Generate your own JWT (optional)
      const customToken = jwt.sign({ userId: sub, email }, JWT_SECRET, {
        expiresIn: '1h',
      });

      res.status(200).json({ message: 'User authenticated!', token: customToken });
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      res.status(400).json({ error: 'Authentication failed' });
    }
  });
};
