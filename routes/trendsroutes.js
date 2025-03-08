import express from 'express';
import pool from '../db.js';
import TrendsChatService from './trendschat.js';
import BusinessMetricsService from '../services/businessMetricsService.js';
import RateLimiter from '../utils/rateLimit.js';

const router = express.Router();
const metricsService = new BusinessMetricsService(pool);
const trendsChatService = new TrendsChatService(metricsService);
const rateLimiter = new RateLimiter();

router.post('/chat', async (req, res) => {
    const userMessage = req.body.question || req.body.message;
    const clientId = req.ip;
    const context = req.body.context || {}; // Chart context from frontend

    if (!userMessage) {
        return res.status(400).json({ error: 'Message is required' });
    }

    if (!rateLimiter.isAllowed(clientId)) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    try {
        // Fetch market trends data based on context
        const timeRange = context.filters?.timeRange || '30';
        const industry = context.filters?.industry || '';
        const location = context.filters?.location || '';
        
        // Build query with filters
        let query = `
            SELECT 
                DATE_TRUNC('day', date_listed) as date,
                industry,
                location,
                AVG(price::numeric) as avg_price,
                COUNT(*) as listings_count,
                AVG(CASE 
                    WHEN gross_revenue::numeric > 0 
                    THEN price::numeric / gross_revenue::numeric 
                    ELSE NULL 
                END) as avg_multiple
            FROM businesses
            WHERE date_listed >= NOW() - INTERVAL '${timeRange} days'
        `;

        if (industry) {
            query += ` AND industry = '${industry}'`;
        }

        if (location) {
            query += ` AND location = '${location}'`;
        }

        query += `
            GROUP BY DATE_TRUNC('day', date_listed), industry, location
            ORDER BY date DESC
        `;

        const trendsData = await pool.query(query);

        const reply = await trendsChatService.processQuery(userMessage, trendsData.rows);
        res.json({ reply });
    } catch (error) {
        console.error('Trends chat processing error:', error);
        res.status(500).json({ error: 'Failed to process message' });
    }
});

export default router;
