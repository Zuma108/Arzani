import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get AI assistant configuration
router.get('/config', (req, res) => {
  // Return configuration for the AI assistant
  res.json({
    version: '1.0',
    features: {
      leadCapture: true,
      documentSharing: true,
      marketplaceIntegration: true
    },
    creditLimits: {
      basic: 30,
      premium: 100,
      unlimited: -1
    }
  });
});

// Store user chat history
router.post('/history', authenticateToken, async (req, res) => {
  try {
    const { history } = req.body;
    const userId = req.user.id;
    
    // In a real implementation, you'd save this to a database
    console.log(`Storing chat history for user ${userId}`);
    
    res.status(200).json({ success: true, message: 'Chat history saved' });
  } catch (error) {
    console.error('Error saving chat history:', error);
    res.status(500).json({ success: false, error: 'Failed to save chat history' });
  }
});

// Fetch a business document and create a shareable link
router.get('/documents/:businessId/:documentType', authenticateToken, async (req, res) => {
  try {
    const { businessId, documentType } = req.params;
    
    // This would retrieve the actual document from your storage
    // For now, we'll just return a sample response
    res.json({
      documentId: `doc-${businessId}-${documentType}`,
      name: `${documentType.toUpperCase()} for Business ${businessId}`,
      url: `/documents/shared/${businessId}/${documentType}`,
      type: 'application/pdf',
      size: 1024 * 1024 * 2.1, // 2.1 MB
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error retrieving document:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve document' });
  }
});

// Get AI assistant metrics (for analytics)
router.get('/metrics', authenticateToken, async (req, res) => {
  // This endpoint would provide usage metrics for the AI assistant
  // In a real implementation, you'd query your database
  res.json({
    totalInteractions: 145,
    leadsGenerated: 23,
    popularTopics: ['valuation', 'financing', 'due diligence'],
    avgConversationLength: 8.4
  });
});

export default router;
