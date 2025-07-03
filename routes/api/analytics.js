import express from 'express';
import { getAnalyticsStats, generateAndSendWeeklyReport } from '../utils/analytics-tracker.js';

const router = express.Router();

/**
 * Get analytics dashboard data
 * @route GET /api/analytics/dashboard
 * @access Admin only
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Default to last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    // Get custom date range if provided
    if (req.query.startDate && req.query.endDate) {
      try {
        const customStart = new Date(req.query.startDate);
        const customEnd = new Date(req.query.endDate);
        
        if (!isNaN(customStart.getTime()) && !isNaN(customEnd.getTime())) {
          startDate.setTime(customStart.getTime());
          endDate.setTime(customEnd.getTime());
        }
      } catch (dateError) {
        console.error('Invalid date format in request:', dateError);
        // Continue with default dates
      }
    }
    
    // Get analytics data
    const stats = await getAnalyticsStats(startDate, endDate);
    
    // Return the data
    return res.status(200).json({
      success: true,
      data: {
        ...stats,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          days: Math.round((endDate - startDate) / (1000 * 60 * 60 * 24))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching analytics dashboard:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data'
    });
  }
});

/**
 * Manually trigger weekly report generation
 * @route POST /api/analytics/generate-report
 * @access Admin only
 */
router.post('/generate-report', async (req, res) => {
  try {
    const result = await generateAndSendWeeklyReport();
    
    if (result) {
      return res.status(200).json({
        success: true,
        message: 'Weekly report generated and sent successfully'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate weekly report'
      });
    }
  } catch (error) {
    console.error('Error generating weekly report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate weekly report'
    });
  }
});

export default router;
