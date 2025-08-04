/**
 * Blog Approval Routes
 * Handles approval/rejection of AI-generated blog content
 */

import express from 'express';
import blogApprovalController from '../controllers/blogApprovalController.js';
import blogService from '../services/blogService.js';
import webhookMiddleware from '../middleware/webhookMiddleware.js';

const router = express.Router();

// Preview the AI-generated content
router.get('/preview', blogApprovalController.previewContent);

// Approve the AI-generated content
router.get('/approve', blogApprovalController.approveContent);

// Reject the AI-generated content
router.get('/reject', blogApprovalController.rejectContent);

// n8n webhook endpoint for creating blog content
// This route specifically handles the format coming from your n8n workflow
router.post('/webhook', webhookMiddleware.logWebhookRequest, async (req, res) => {
  try {
    console.log('Received webhook from n8n for blog approval:', {
      method: req.method,
      path: req.path,
      headers: Object.keys(req.headers),
      bodyKeys: req.body ? Object.keys(req.body) : 'no body'
    });
    
    // Check if the payload has the expected structure
    const { title, metaDescription, author, content, categoriesAndTags, slug, imageUrls, publishDate } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        requiredFields: ['title', 'content']
      });
    }
    
    // Transform the payload to match what the workflow service expects from n8n
    const transformedPayload = {
      title,
      content,
      meta_description: metaDescription,
      excerpt: metaDescription,
      author_name: author || 'Arzani Team',
      slug: slug || undefined,
      hero_image: Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls[0] : undefined,
      publish_date: publishDate || new Date().toISOString(),
      action: 'create_post', // Set explicit action to route correctly
    };
    
    // Parse categoriesAndTags if provided
    if (categoriesAndTags) {
      try {
        const parsed = typeof categoriesAndTags === 'string' ? 
          JSON.parse(categoriesAndTags) : categoriesAndTags;
        
        if (parsed.categories) transformedPayload.categories = parsed.categories;
        if (parsed.tags) transformedPayload.tags = parsed.tags;
      } catch (error) {
        console.error('Error parsing categoriesAndTags:', error);
      }
    }
    
    // Forward the transformed payload to the n8n workflow service
    req.body = transformedPayload;
    return await blogService.handleWebhook(req, res);
    
  } catch (error) {
    console.error('Error handling blog approval webhook:', error);
    return res.status(500).json({
      success: false,
      error: 'Error processing webhook request',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
});

export default router;
