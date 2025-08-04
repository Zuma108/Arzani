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

/**
 * GET /api/blog-automation/quality-metrics
 * Get detailed content quality analysis and SEO metrics
 */
router.get('/quality-metrics', requireAuth, async (req, res) => {
  try {
    // Only allow admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Admin access required' 
      });
    }

    const status = await blogGenerator.getStatus();
    
    // Get additional quality analysis
    const pool = (await import('../../db.js')).default;
    const client = await pool.connect();
    
    try {
      // Analyze recent post quality in detail
      const detailedQualityQuery = `
        SELECT 
          title,
          word_count,
          CASE 
            WHEN content LIKE '%faq-section%' THEN true 
            ELSE false 
          END as has_faq,
          CASE 
            WHEN content LIKE '%table-of-contents%' THEN true 
            ELSE false 
          END as has_toc,
          CASE 
            WHEN content LIKE '%[0-9]%-step%' OR content LIKE '%[0-9]%-phase%' THEN true
            ELSE false 
          END as has_framework,
          (LENGTH(content) - LENGTH(REPLACE(content, 'href="http', ''))) / LENGTH('href="http') as external_links,
          created_at,
          category
        FROM blog_posts 
        WHERE status = 'Published' 
        AND created_at >= NOW() - INTERVAL '30 days'
        ORDER BY created_at DESC
        LIMIT 20
      `;
      
      const qualityDetails = await client.query(detailedQualityQuery);
      
      // Calculate quality scores per post
      const postAnalysis = qualityDetails.rows.map(post => {
        const qualityScore = [
          post.word_count >= 1800,
          post.has_faq,
          post.has_toc,
          post.has_framework,
          post.external_links >= 4
        ].filter(Boolean).length / 5 * 100;
        
        return {
          title: post.title,
          wordCount: post.word_count,
          category: post.category,
          qualityScore: Math.round(qualityScore),
          hasFAQ: post.has_faq,
          hasTOC: post.has_toc,
          hasFramework: post.has_framework,
          externalLinks: post.external_links,
          createdAt: post.created_at
        };
      });
      
      // Calculate category performance
      const categoryPerformance = {};
      postAnalysis.forEach(post => {
        if (!categoryPerformance[post.category]) {
          categoryPerformance[post.category] = {
            totalPosts: 0,
            avgQualityScore: 0,
            avgWordCount: 0,
            faqCompliance: 0,
            tocCompliance: 0
          };
        }
        
        const cat = categoryPerformance[post.category];
        cat.totalPosts++;
        cat.avgQualityScore += post.qualityScore;
        cat.avgWordCount += post.wordCount;
        cat.faqCompliance += post.hasFAQ ? 1 : 0;
        cat.tocCompliance += post.hasTOC ? 1 : 0;
      });
      
      // Calculate averages
      Object.keys(categoryPerformance).forEach(category => {
        const cat = categoryPerformance[category];
        cat.avgQualityScore = Math.round(cat.avgQualityScore / cat.totalPosts);
        cat.avgWordCount = Math.round(cat.avgWordCount / cat.totalPosts);
        cat.faqCompliance = Math.round((cat.faqCompliance / cat.totalPosts) * 100);
        cat.tocCompliance = Math.round((cat.tocCompliance / cat.totalPosts) * 100);
      });
      
      res.json({
        success: true,
        data: {
          ...status,
          detailedAnalysis: {
            recentPosts: postAnalysis,
            categoryPerformance,
            qualityTrends: {
              averageQualityScore: Math.round(
                postAnalysis.reduce((sum, post) => sum + post.qualityScore, 0) / postAnalysis.length
              ),
              wordCountTrend: postAnalysis.map(post => ({
                date: post.createdAt,
                wordCount: post.wordCount
              })),
              complianceRates: {
                faq: Math.round((postAnalysis.filter(p => p.hasFAQ).length / postAnalysis.length) * 100),
                toc: Math.round((postAnalysis.filter(p => p.hasTOC).length / postAnalysis.length) * 100),
                framework: Math.round((postAnalysis.filter(p => p.hasFramework).length / postAnalysis.length) * 100)
              }
            }
          }
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error getting quality metrics:', error);
    res.status(500).json({
      error: 'Failed to get quality metrics',
      details: error.message
    });
  }
});

/**
 * POST /api/blog-automation/validate-content
 * Validate a specific blog post against quality standards
 */
router.post('/validate-content', requireAuth, async (req, res) => {
  try {
    // Only allow admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Admin access required' 
      });
    }

    const { postId } = req.body;
    
    if (!postId) {
      return res.status(400).json({
        error: 'Post ID is required'
      });
    }

    // Validate the content using internal validation functions
    const pool = (await import('../../db.js')).default;
    const client = await pool.connect();
    
    try {
      const postQuery = 'SELECT * FROM blog_posts WHERE id = $1';
      const postResult = await client.query(postQuery, [postId]);
      
      if (postResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Blog post not found'
        });
      }
      
      const post = postResult.rows[0];
      
      // Run validation using the blog generator's validation functions
      const contentValidation = blogGenerator.validateContentQuality(
        post.content, 
        blogGenerator.seoTemplates.supporting // Use supporting template as baseline
      );
      
      const fleschScore = blogGenerator.estimateFleschScore(post.content);
      const externalLinks = blogGenerator.countExternalLinks(post.content);
      const internalLinks = blogGenerator.countInternalLinks(post.content);
      
      res.json({
        success: true,
        data: {
          postId: post.id,
          title: post.title,
          category: post.category,
          wordCount: post.word_count,
          validation: contentValidation,
          metrics: {
            fleschScore,
            externalLinks,
            internalLinks,
            hasTableOfContents: post.content.includes('table-of-contents'),
            hasFAQSection: post.content.includes('faq-section'),
            hasNumberedFramework: blogGenerator.hasNumberedFramework(post.content)
          },
          recommendations: blogGenerator.generateContentRecommendations(contentValidation, fleschScore)
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error validating content:', error);
    res.status(500).json({
      error: 'Failed to validate content',
      details: error.message
    });
  }
});

export default router;
