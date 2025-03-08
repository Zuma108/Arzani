import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();
import pool from '../db.js';

export async function getUserId(req) {
    // First try to get from session
    if (req.session?.userId) {
        return req.session.userId;
    }

    // Then try to get from token
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userCheck = await pool.query(
                'SELECT id FROM users WHERE id = $1',
                [decoded.userId]
            );
            if (userCheck.rows.length > 0) {
                req.session.userId = decoded.userId;
                await new Promise(resolve => req.session.save(resolve));
                return decoded.userId;
            }
        } catch (error) {
            console.error('Token verification error:', error);
        }
    }
    return null;
}

export const authenticateToken = async (req, res, next) => {
    try {
        // First check session
        if (req.session?.userId) {
            req.user = { userId: req.session.userId };
            return next();
        }

        // Then check token
        const authHeader = req.headers['authorization'];
        if (!authHeader?.startsWith('Bearer ')) {
            if (req.headers.accept?.includes('application/json')) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            return res.redirect(`/login2?returnUrl=${encodeURIComponent(req.originalUrl)}`);
        }

        const token = authHeader.split(' ')[1];
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = { userId: decoded.userId };
            
            // Set session from token
            req.session.userId = decoded.userId;
            await new Promise(resolve => req.session.save(resolve));
            
            next();
        } catch (error) {
            console.error('Token verification failed:', error);
            if (req.headers.accept?.includes('application/json')) {
                return res.status(401).json({ error: 'Invalid token' });
            }
            return res.redirect(`/login2?returnUrl=${encodeURIComponent(req.originalUrl)}`);
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        if (req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ error: 'Authentication failed' });
        }
        res.redirect('/login2');
    }
};

export default { authenticateToken };
