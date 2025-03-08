import express from 'express';
import { google } from 'googleapis';
import pool from '../db.js';
import jwt from 'jsonwebtoken';
import { getUserByEmail, createUser } from '../database.js';

const router = express.Router();

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

// Google auth callback route
router.get('/auth/google/callback', async (req, res) => {
    try {
        const { code, error } = req.query;

        if (error) {
            console.error('Google OAuth error:', error);
            return res.redirect('/login2?error=google_auth_failed&reason=' + error);
        }

        if (!code) {
            return res.redirect('/login2?error=google_auth_failed&reason=no_code');
        }

        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Get user info
        const oauth2 = google.oauth2('v2');
        const { data } = await oauth2.userinfo.get({ auth: oauth2Client });

        // Find or create user
        let user = await getUserByEmail(data.email);
        
        if (!user) {
            // Create new user
            user = await createUser({
                email: data.email,
                username: data.name,
                profile_picture: data.picture,
                auth_provider: 'google',
                google_tokens: tokens,
                verified: true
            });
        } else {
            // Update existing user's Google tokens
            await pool.query(
                'UPDATE users SET google_tokens = $1, auth_provider = $2, last_login = NOW() WHERE id = $3',
                [tokens, 'google', user.id]
            );
        }

        // Create JWT token
        const jwtToken = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '4h' }
        );

        // Save to session
        req.session.userId = user.id;
        req.session.token = jwtToken;
        await new Promise(resolve => req.session.save(resolve));

        // Redirect to stored URL or default
        const redirectTo = req.session.redirectAfterAuth || '/marketplace2';
        delete req.session.redirectAfterAuth;

        res.redirect(`${redirectTo}?token=${jwtToken}`);

    } catch (error) {
        console.error('Google OAuth callback error:', error);
        res.redirect('/login2?error=google_auth_failed&details=' + encodeURIComponent(error.message));
    }
});

export default router;
