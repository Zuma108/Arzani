/**
 * AI Crawler Analytics Routes
 * Dashboard and API endpoints for monitoring AI crawler activity
 * Created: July 28, 2025
 */

import express from 'express';
import { getCrawlerStats, AI_CRAWLERS } from '../middleware/aiCrawlerMonitoring.js';

const router = express.Router();

// AI Crawler Dashboard
router.get('/ai-crawler-dashboard', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const stats = getCrawlerStats(days);
    
    res.render('ai-crawler-dashboard', {
      title: 'AI Crawler Analytics Dashboard',
      stats,
      days,
      aiCrawlers: AI_CRAWLERS,
      user: req.user || null
    });
  } catch (error) {
    console.error('Error rendering AI crawler dashboard:', error);
    res.status(500).send('Error loading AI crawler dashboard');
  }
});

// API endpoint for real-time stats
router.get('/api/ai-crawler-stats', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const stats = getCrawlerStats(days);
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching AI crawler stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch crawler statistics',
      details: error.message
    });
  }
});

// Export crawlers list
router.get('/api/ai-crawlers', (req, res) => {
  res.json({
    success: true,
    data: AI_CRAWLERS,
    timestamp: new Date().toISOString()
  });
});

export default router;
