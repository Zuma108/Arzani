import express from 'express';
import pool from '../db.js';
import chatService from './chatService.js';
import RateLimiter from '../utils/rateLimit.js';
import BusinessMetricsService from '../services/businessMetricsService.js';

const router = express.Router();
const metricsService = new BusinessMetricsService(pool);
const chatServiceInstance = new chatService(metricsService);
const rateLimiter = new RateLimiter();

router.post('/', async (req, res) => {
    const userMessage = req.body.question || req.body.message;
    const clientId = req.ip;

    if (!userMessage) {
        return res.status(400).json({ error: 'Message is required' });
    }

    if (!rateLimiter.isAllowed(clientId)) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    try {
        // Fetch current marketplace data without is_active column
        const marketplaceData = await pool.query(`
            SELECT 
                b.id,
                b.business_name,
                b.industry,
                b.price,
                b.description,
                b.location,
                b.gross_revenue,
                b.ebitda
            FROM businesses b
            ORDER BY b.date_listed DESC
            LIMIT 50
        `);

        const reply = await chatServiceInstance.processQuery(userMessage, marketplaceData.rows);
        res.json({ reply });
    } catch (error) {
        console.error('Chat processing error:', error);
        res.status(500).json({ error: 'Failed to process message' });
    }
});

export default router;