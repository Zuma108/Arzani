import jwt from 'jsonwebtoken';
import pool from '../db.js';

export const marketAuth = async (req, res, next) => {
    try {
        // Check for token
        const authHeader = req.headers['authorization'];
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Verify session
        const session = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (session.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid session' });
        }

        req.user = { userId: decoded.userId };
        next();
    } catch (error) {
        console.error('Market auth error:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
};

export default marketAuth;
