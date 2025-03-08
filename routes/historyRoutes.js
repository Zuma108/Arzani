import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { addHistoryRecord, getHistoryForUser } from '../services/history.js';

const router = express.Router();

// Add history record
router.post('/history/track', authenticateToken, async (req, res) => {
    try {
        const { businessId, actionType } = req.body;
        const userId = req.user.userId;

        // Validate businessId is a number
        const businessIdNum = parseInt(businessId, 10);
        if (isNaN(businessIdNum)) {
            return res.status(400).json({ error: 'Invalid business ID' });
        }

        const record = await addHistoryRecord(userId, businessIdNum, actionType);
        res.json(record);
    } catch (error) {
        console.error('History tracking error:', error);
        res.status(500).json({ error: 'Failed to track history' });
    }
});

// Get history for user
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const history = await getHistoryForUser(userId, page, limit);
        res.json(history);
    } catch (error) {
        console.error('History retrieval error:', error);
        res.status(500).json({ error: 'Failed to retrieve history' });
    }
});

export default router;
