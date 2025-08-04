import express from 'express';
import { authenticateToken } from '../utils/auth.js';
import { checkGoogleAuth } from '../middleware/googleAuth.js';
import GoogleDriveService from '../services/googleDriveService.js';
import pool from '../db.js';
import { google } from 'googleapis';  // Changed this line

const router = express.Router();
const driveService = new GoogleDriveService();

// Export business listing to Google Drive
router.post('/export-listing/:businessId', authenticateToken, async (req, res) => {
    try {
        const { businessId } = req.params;
        const userId = req.user.userId;

        // Get business data
        const result = await pool.query(
            'SELECT * FROM businesses WHERE id = $1',
            [businessId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Business not found' });
        }

        const business = result.rows[0];
        
        // Get user's Google tokens from database
        const tokenResult = await pool.query(
            'SELECT google_tokens FROM users WHERE id = $1',
            [userId]
        );

        if (!tokenResult.rows[0]?.google_tokens) {
            return res.status(401).json({ error: 'Google authorization required' });
        }

        // Set credentials
        await driveService.setCredentials(tokenResult.rows[0].google_tokens);

        // Format content for export
        const content = JSON.stringify(business, null, 2);
        const fileName = `${business.business_name}_listing.json`;

        // Export to Drive
        const exportResult = await driveService.exportDocument(
            userId,
            content,
            fileName,
            'application/json'
        );

        res.json({
            success: true,
            fileId: exportResult.fileId,
            webViewLink: exportResult.webViewLink
        });

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Failed to export to Google Drive' });
    }
});

// Export market trends
router.post('/export-trends', authenticateToken, async (req, res) => {
    try {
        const { timeRange, trendsData } = req.body;
        const userId = req.user.userId;

        // Get user's Google tokens
        const tokenResult = await pool.query(
            'SELECT google_tokens FROM users WHERE id = $1',
            [userId]
        );

        if (!tokenResult.rows[0]?.google_tokens) {
            return res.status(401).json({ error: 'Google authorization required' });
        }

        // Set credentials
        await driveService.setCredentials(tokenResult.rows[0].google_tokens);

        // Format content for export
        const content = {
            timeRange,
            generatedAt: new Date().toISOString(),
            data: trendsData
        };

        const fileName = `Market_Trends_Report_${timeRange}days.json`;

        // Export to Drive
        const exportResult = await driveService.exportDocument(
            userId,
            JSON.stringify(content, null, 2),
            fileName,
            'application/json'
        );

        res.json({
            success: true,
            fileId: exportResult.fileId,
            webViewLink: exportResult.webViewLink
        });

    } catch (error) {
        console.error('Export trends error:', error);
        res.status(500).json({ error: 'Failed to export trends data' });
    }
});

// Export all saved businesses
router.post('/export-saved-businesses', authenticateToken, checkGoogleAuth, async (req, res) => {
    console.log('Export saved businesses route hit'); // Add this debug log
    try {
        const userId = req.user.userId;
        
        // Get user's saved businesses
        const savedBusinesses = await pool.query(
            `SELECT b.* 
             FROM businesses b 
             INNER JOIN saved_businesses sb ON b.id = sb.business_id 
             WHERE sb.user_id = $1`,
            [userId]
        );

        // Format content for export
        const content = {
            exportDate: new Date().toISOString(),
            businesses: savedBusinesses.rows
        };

        const fileName = `Saved_Businesses_${new Date().toISOString().split('T')[0]}.json`;

        // Set credentials from middleware
        await driveService.setCredentials(req.googleTokens);

        // Export to Drive
        const exportResult = await driveService.exportDocument(
            userId,
            JSON.stringify(content, null, 2),
            fileName,
            'application/json'
        );

        console.log('Export successful:', exportResult); // Add this debug log

        res.json({
            success: true,
            fileId: exportResult.fileId,
            webViewLink: exportResult.webViewLink
        });

    } catch (error) {
        console.error('Export saved businesses error:', error);
        res.status(500).json({ 
            error: 'Failed to export saved businesses',
            details: error.message
        });
    }
});

// Share exported document
router.post('/share/:fileId', authenticateToken, async (req, res) => {
    try {
        const { fileId } = req.params;
        const { email, role } = req.body;
        const userId = req.user.userId;

        // Get user's Google tokens
        const tokenResult = await pool.query(
            'SELECT google_tokens FROM users WHERE id = $1',
            [userId]
        );

        if (!tokenResult.rows[0]?.google_tokens) {
            return res.status(401).json({ error: 'Google authorization required' });
        }

        // Set credentials
        await driveService.setCredentials(tokenResult.rows[0].google_tokens);

        // Share document
        await driveService.shareDocument(fileId, email, role);

        res.json({ success: true });

    } catch (error) {
        console.error('Sharing error:', error);
        res.status(500).json({ error: 'Failed to share document' });
    }
});

export default router;
