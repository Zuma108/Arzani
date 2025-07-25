/**
 * API Routes for Automated Blog Generation System
 * Provides endpoints for monitoring and controlling the automated blog system
 */

import express from 'express';
import AutomatedBlogGenerator from '../../services/automated-blog-generator.js';
import { requireAuth } from '../../middleware/auth.js';

const router = express.Router();

// Initialize the automated blog generator
const blogGenerator = new AutomatedBlogGenerator();

// Initialize on startup
blogGenerator.initialize().catch(console.error);

/**
 * GET /api/blog-automation/status
 * Get current status of the automated blog generation system
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    // Only allow admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Admin access required' 
      });
    }

    const status = await blogGenerator.getStatus();
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    console.error('Error getting blog automation status:', error);
    res.status(500).json({
      error: 'Failed to get automation status',
      details: error.message
    });
  }
});

/**
 * POST /api/blog-automation/generate
 * Manually trigger immediate blog post generation
 */
router.post('/generate', requireAuth, async (req, res) => {
  try {
    // Only allow admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Admin access required' 
      });
    }

    // Trigger immediate generation
    blogGenerator.generateImmediately()
      .then(() => {
        console.log('✅ Manual blog generation completed');
      })
      .catch(error => {
        console.error('❌ Manual blog generation failed:', error);
      });
    
    res.json({
      success: true,
      message: 'Blog generation triggered successfully',
      note: 'Generation is running in background, check status for updates'
    });
    
  } catch (error) {
    console.error('Error triggering blog generation:', error);
    res.status(500).json({
      error: 'Failed to trigger blog generation',
      details: error.message
    });
  }
});

/**
 * POST /api/blog-automation/update-interlinking
 * Manually trigger interlinking analysis update
 */
router.post('/update-interlinking', requireAuth, async (req, res) => {
  try {
    // Only allow admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Admin access required' 
      });
    }

    // Trigger interlinking update
    blogGenerator.updateSemanticRelationships()
      .then(() => {
        console.log('✅ Interlinking update completed');
      })
      .catch(error => {
        console.error('❌ Interlinking update failed:', error);
      });
    
    res.json({
      success: true,
      message: 'Interlinking update triggered successfully',
      note: 'Update is running in background'
    });
    
  } catch (error) {
    console.error('Error triggering interlinking update:', error);
    res.status(500).json({
      error: 'Failed to trigger interlinking update',
      details: error.message
    });
  }
});

/**
 * POST /api/blog-automation/seo-audit
 * Manually trigger comprehensive SEO audit
 */
router.post('/seo-audit', requireAuth, async (req, res) => {
  try {
    // Only allow admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Admin access required' 
      });
    }

    // Trigger SEO audit
    blogGenerator.runSEOAudit()
      .then(() => {
        console.log('✅ SEO audit completed');
      })
      .catch(error => {
        console.error('❌ SEO audit failed:', error);
      });
    
    res.json({
      success: true,
      message: 'SEO audit triggered successfully',
      note: 'Audit is running in background'
    });
    
  } catch (error) {
    console.error('Error triggering SEO audit:', error);
    res.status(500).json({
      error: 'Failed to trigger SEO audit',
      details: error.message
    });
  }
});

/**
 * GET /api/blog-automation/checklist-progress
 * Get progress on the 200 blog post checklist
 */
router.get('/checklist-progress', requireAuth, async (req, res) => {
  try {
    // Only allow admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Admin access required' 
      });
    }

    // Parse checklist to get progress
    const nextPost = await blogGenerator.parseChecklistForNextPost();
    
    // Count completed vs total posts from checklist
    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    const checklistPath = path.join(__dirname, '..', 'PRD_200_Blog_Post_Strategy_Checklist.md');
    const checklistContent = await fs.readFile(checklistPath, 'utf-8');
    
    const completedMatches = checklistContent.match(/- \[x\] \*\*([0-9]+\.[0-9]+)\*\*/g);
    const totalMatches = checklistContent.match(/- \[ \] \*\*([0-9]+\.[0-9]+)\*\*|^- \[x\] \*\*([0-9]+\.[0-9]+)\*\*/g);
    
    const completed = completedMatches ? completedMatches.length : 0;
    const total = totalMatches ? totalMatches.length : 200;
    const percentage = Math.round((completed / total) * 100);
    
    res.json({
      success: true,
      data: {
        completed,
        total,
        percentage,
        remaining: total - completed,
        nextPost: nextPost ? nextPost.title : 'All posts completed',
        nextCategory: nextPost ? nextPost.category : null,
        nextContentType: nextPost ? nextPost.contentType : null
      }
    });
    
  } catch (error) {
    console.error('Error getting checklist progress:', error);
    res.status(500).json({
      error: 'Failed to get checklist progress',
      details: error.message
    });
  }
});

/**
 * POST /api/blog-automation/stop
 * Stop the automated blog generation system
 */
router.post('/stop', requireAuth, async (req, res) => {
  try {
    // Only allow admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Admin access required' 
      });
    }

    blogGenerator.stop();
    
    res.json({
      success: true,
      message: 'Automated blog generation system stopped successfully'
    });
    
  } catch (error) {
    console.error('Error stopping blog automation:', error);
    res.status(500).json({
      error: 'Failed to stop blog automation',
      details: error.message
    });
  }
});

/**
 * POST /api/blog-automation/start
 * Start/restart the automated blog generation system
 */
router.post('/start', requireAuth, async (req, res) => {
  try {
    // Only allow admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Admin access required' 
      });
    }

    await blogGenerator.initialize();
    
    res.json({
      success: true,
      message: 'Automated blog generation system started successfully'
    });
    
  } catch (error) {
    console.error('Error starting blog automation:', error);
    res.status(500).json({
      error: 'Failed to start blog automation',
      details: error.message
    });
  }
});

export default router;
