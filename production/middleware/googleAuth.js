import { google } from 'googleapis';
import pool from '../db.js';

export const checkGoogleAuth = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Get user's Google tokens
        const result = await pool.query(
            'SELECT google_tokens FROM users WHERE id = $1',
            [userId]
        );

        if (!result.rows[0]?.google_tokens) {
            // Store current URL for redirect after auth
            req.session.redirectAfterAuth = req.originalUrl;
            await new Promise(resolve => req.session.save(resolve));

            // Generate auth URL
            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.GOOGLE_REDIRECT_URI
            );

            const authUrl = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: [
                    'https://www.googleapis.com/auth/drive.file',
                    'https://www.googleapis.com/auth/userinfo.profile',
                    'https://www.googleapis.com/auth/userinfo.email'
                ],
                prompt: 'consent',
                state: req.session.id // Add state parameter for security
            });

            return res.status(401).json({
                error: 'Google authorization required',
                redirectUrl: authUrl
            });
        }

        // Validate and refresh token if needed
        const tokens = result.rows[0].google_tokens;
        if (tokens.expiry_date && Date.now() >= tokens.expiry_date) {
            const oauth2Client = new google.auth.OAuth2();
            oauth2Client.setCredentials(tokens);
            
            try {
                const newTokens = await oauth2Client.refreshAccessToken();
                await pool.query(
                    'UPDATE users SET google_tokens = $1 WHERE id = $2',
                    [newTokens.credentials, userId]
                );
                req.googleTokens = newTokens.credentials;
            } catch (error) {
                console.error('Token refresh error:', error);
                return res.status(401).json({
                    error: 'Google authorization required',
                    redirectUrl: oauth2Client.generateAuthUrl({
                        access_type: 'offline',
                        scope: ['https://www.googleapis.com/auth/drive.file'],
                        prompt: 'consent'
                    })
                });
            }
        } else {
            req.googleTokens = tokens;
        }

        next();
    } catch (error) {
        console.error('Google auth middleware error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
