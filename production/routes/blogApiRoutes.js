/**
 * Blog API routes for Arzani blog functionality
 * Handles API endpoints for blog CRUD operations
 */

import express from 'express';
import blogController from '../controllers/blogController.js';
import { requireAuth } from '../middleware/auth.js';
import webhookMiddleware from '../middleware/webhookMiddleware.js';
import blogService from '../services/blogService.js';

const router = express.Router();

// Debug middleware for this router
router.use((req, res, next) => {
  console.log('Blog API router hit:', req.method, req.originalUrl);
  next();
});

// Public API endpoints
router.get('/posts', blogController.getAllBlogPosts);
router.get('/posts/featured', blogController.getFeaturedBlogPosts);
router.get('/posts/recent', blogController.getRecentBlogPosts);
router.get('/posts/related/:slug', blogController.getRelatedBlogPosts);
router.get('/posts/:slug', blogController.getBlogPostBySlugJson);
router.get('/categories', blogController.getAllCategories);
router.get('/tags', blogController.getAllTags);

// Protected API endpoints (require authentication)
router.post('/posts', requireAuth, blogController.createBlogPost);
router.put('/posts/:id', requireAuth, blogController.updateBlogPost);
router.delete('/posts/:id', requireAuth, blogController.deleteBlogPost);
router.put('/posts/:id/approve', requireAuth, blogController.approveBlogPost);
router.post('/upload/image', requireAuth, blogController.uploadBlogImage);
router.post('/cache/refresh/:slug', requireAuth, blogController.refreshBlogCache);

// n8n webhook handler - add logging middleware
router.post('/n8n/webhook', webhookMiddleware.logWebhookRequest, blogController.handleN8nWebhook);

// Add webhook status/debug endpoint
router.get('/n8n/status', async (req, res) => {
  try {
    const logs = await blogService.getRecentLogs(10);
    const webhookRequests = await webhookMiddleware.getRecentWebhookRequests(10);
    
    res.json({
      success: true,
      status: 'active',
      webhookUrl: `${req.protocol}://${req.get('host')}/api/blog/n8n/webhook`,
      recentLogs: logs,
      recentRequests: webhookRequests
    });
  } catch (error) {
    console.error('Error fetching webhook status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch webhook status'
    });
  }
});

export default router;
