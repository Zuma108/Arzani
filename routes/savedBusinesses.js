import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../utils/auth.js';

const router = express.Router();

// First ensure the saved_businesses table exists
const createTableQuery = `
CREATE TABLE IF NOT EXISTS saved_businesses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, business_id)
);`;

// Execute table creation
pool.query(createTableQuery)
    .then(() => console.log('Saved businesses table verified'))
    .catch(err => console.error('Error creating saved_businesses table:', err));

// Add helper function to get userId
const getUserId = (req) => {
    // Try to get userId from session first
    if (req.session?.userId) {
        return req.session.userId;
    }
    
    // Then try to get from user object (set by authenticateToken)
    if (req.user?.userId) {
        return req.user.userId;
    }
    
    return null;
};

// Add separate route for the saved-searches page
router.get('/saved-searches', async (req, res) => {
    // Render the page template first
    res.render('saved-searches');
});

// Save a business
router.post('/save', authenticateToken, async (req, res) => {
    try {
        const { businessId } = req.body;
        const userId = getUserId(req);

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const result = await pool.query(
            `INSERT INTO saved_businesses (user_id, business_id) 
             VALUES ($1, $2) 
             ON CONFLICT (user_id, business_id) DO NOTHING 
             RETURNING id`,
            [userId, businessId]
        );

        res.json({ 
            success: true, 
            saved: result.rowCount > 0,
            message: result.rowCount > 0 ? 'Business saved' : 'Business already saved'
        });
    } catch (error) {
        console.error('Error saving business:', error);
        res.status(500).json({ error: 'Failed to save business' });
    }
});

// Unsave a business
router.delete('/unsave/:businessId', authenticateToken, async (req, res) => {
    try {
        const { businessId } = req.params;
        const userId = getUserId(req);

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const result = await pool.query(
            `DELETE FROM saved_businesses 
             WHERE user_id = $1 AND business_id = $2 
             RETURNING id`,
            [userId, businessId]
        );

        res.json({ 
            success: true, 
            removed: result.rowCount > 0,
            message: result.rowCount > 0 ? 'Business unsaved' : 'Business was not saved'
        });
    } catch (error) {
        console.error('Error unsaving business:', error);
        res.status(500).json({ error: 'Failed to unsave business' });
    }
});

// Get user's saved businesses
router.get('/saved', authenticateToken, async (req, res) => {
    console.log('Fetching saved businesses');
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const result = await pool.query(
            `SELECT b.*, sb.saved_at 
             FROM businesses b 
             INNER JOIN saved_businesses sb ON b.id = sb.business_id 
             WHERE sb.user_id = $1 
             ORDER BY sb.saved_at DESC`,
            [userId]
        );

        console.log(`Found ${result.rows.length} saved businesses`);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching saved businesses:', error);
        res.status(500).json({ error: 'Failed to fetch saved businesses' });
    }
});

// Check if a business is saved
router.get('/is-saved/:businessId', authenticateToken, async (req, res) => {
    console.log('Checking saved status:', req.params);
    try {
        const { businessId } = req.params;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const result = await pool.query(
            `SELECT EXISTS(
                SELECT 1 FROM saved_businesses 
                WHERE user_id = $1 AND business_id = $2
            )`,
            [userId, businessId]
        );

        console.log('Save check result:', result.rows[0]);
        res.json({ isSaved: result.rows[0].exists });
    } catch (error) {
        console.error('Error checking saved status:', error);
        res.status(500).json({ error: 'Failed to check saved status' });
    }
});

export default router;
