const express = require('express');
const jwt = require('jsonwebtoken');
const appleSignin = require('apple-signin-auth');
require('dotenv').config();

const app = express();

const clientId = process.env.APPLE_CLIENT_ID; // Your Apple Service ID
const teamId = process.env.APPLE_TEAM_ID; // Your Apple Developer Team ID
const keyId = process.env.APPLE_KEY_ID; // Your Apple Key ID
const privateKey = process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'); // Your Apple .p8 file contents
const redirectUri = 'http://localhost:5000/auth/apple/callback'; // Your Apple Redirect URI
const JWT_SECRET = process.env.JWT_SECRET || 'supersecureandrandomkeythatnoonecanguess123456'; // Your own secret for issuing JWT

// Route to initiate Apple Sign-In
app.get('/auth/apple', (req, res) => {
    const authUrl = appleSignin.getAuthorizationUrl({
        clientID: clientId,
        redirectUri,
        scope: 'name email',
        response_mode: 'form_post', // 'query' or 'form_post'
        state: 'your-random-state', // Optional, can be used for CSRF protection
    });
    res.redirect(authUrl);
});

// Route to handle Apple OAuth2 callback
app.post('/auth/apple/callback', async (req, res) => {
    const { code, id_token } = req.body; // The authorization code and ID token sent by Apple

    try {
        // Exchange authorization code for access token
        const tokenResponse = await appleSignin.getClientSecret({
            clientID: clientId,
            teamID: teamId,
            keyID: keyId,
            privateKey: privateKey,
            redirectUri,
            code, // Authorization code from Apple
        });

        const { access_token } = tokenResponse;

        // Decode the ID token to get user info
        const decodedIdToken = jwt.decode(id_token);

        // Extract user info from the decoded token
        const { sub, email, name } = decodedIdToken;

        // Check if the user exists in your database and authenticate or register the user
        // (Similar logic to what you used for Google or Microsoft sign-in)

        // Generate your own JWT (optional)
        const customToken = jwt.sign({ userId: sub, email }, JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ message: 'User authenticated!', token: customToken });
    } catch (error) {
        console.error('Error during Apple sign-in:', error);
        res.status(400).json({ error: 'Authentication failed' });
    }
});
