import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get market trends by time period
router.get('/trends/:period', authenticateToken, async (req, res) => {
    try {
        const { period } = req.params;
        let interval;
        
        // Determine SQL interval based on requested period
        switch (period) {
            case 'week':
                interval = '7 days';
                break;
            case 'month':
                interval = '30 days';
                break;
            case 'quarter':
                interval = '90 days';
                break;
            case 'year':
                interval = '365 days';
                break;
            default:
                interval = '30 days'; // Default to month
        }
        
        // Update to use the correct date column
        const query = `
            SELECT * FROM market_trends_mv
            WHERE date_listed >= NOW() - INTERVAL '${interval}'
            ORDER BY date_listed ASC
        `;
        
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Market trends error:', error);
        res.status(500).json({ error: 'Failed to fetch market trends' });
    }
});

// Get available industries for filtering
router.get('/industries', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT industry FROM market_trends_mv
            WHERE industry IS NOT NULL
            ORDER BY industry
        `;
        
        const result = await pool.query(query);
        res.json(result.rows.map(row => row.industry));
    } catch (error) {
        console.error('Industries fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch industries' });
    }
});

// Get available locations for filtering
router.get('/locations', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT location FROM market_trends_mv
            WHERE location IS NOT NULL
            ORDER BY location
        `;
        
        const result = await pool.query(query);
        res.json(result.rows.map(row => row.location));
    } catch (error) {
        console.error('Locations fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch locations' });
    }
});

// Get trends with filters
router.post('/filtered', authenticateToken, async (req, res) => {
    try {
        const { timeRange = '30', industry, location } = req.body;
        
        // Build query conditions
        let conditions = [];
        let params = [];
        let paramCounter = 1;
        
        // Update to use the correct date column
        if (timeRange) {
            conditions.push(`date_listed >= NOW() - INTERVAL '${timeRange} days'`);
        }
        
        if (industry) {
            conditions.push(`industry = $${paramCounter}`);
            params.push(industry);
            paramCounter++;
        }
        
        if (location) {
            conditions.push(`location = $${paramCounter}`);
            params.push(location);
            paramCounter++;
        }
        
        // Build WHERE clause
        const whereClause = conditions.length > 0 
            ? `WHERE ${conditions.join(' AND ')}` 
            : '';
        
        const query = `
            SELECT * FROM market_trends_mv
            ${whereClause}
            ORDER BY date_listed ASC
        `;
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Filtered trends error:', error);
        res.status(500).json({ error: 'Failed to fetch filtered trends' });
    }
});

export default router;
