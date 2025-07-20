/**
 * Blog routes for Arzani programmatic blog strategy
 * Implements the new URL structure: /blog/[category]/[article-slug]
 */

import express from 'express';
import blogController from '../controllers/blogController_new.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Add debug middleware for this router
router.use((req, res, next) => {
  console.log('Blog router hit:', req.method, req.originalUrl);
  next();
});

// ------------------------------------
// Public blog page routes
// ------------------------------------

// The main blog root URL (Business Knowledge Center)
// This means the blog homepage is accessible via /blog
router.get('/', (req, res) => {
  console.log('Blog homepage route hit');
  try {
    return blogController.getBlogHomePage(req, res);
  } catch (error) {
    console.error('Error in blog homepage route:', error);
    return res.status(500).render('error', {
      message: 'Failed to load blog homepage. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Blog search results at /blog/search
router.get('/search', blogController.searchBlogPosts);

// Blog category index page at /blog/[category]
// Maps to the 6 main categories from the PRD
router.get('/buying-a-business', (req, res) => blogController.getBlogPostsByCategory(req, {...res, params: {categorySlug: 'buying-a-business'}}));
router.get('/selling-a-business', (req, res) => blogController.getBlogPostsByCategory(req, {...res, params: {categorySlug: 'selling-a-business'}}));
router.get('/business-valuation', (req, res) => blogController.getBlogPostsByCategory(req, {...res, params: {categorySlug: 'business-valuation'}}));
router.get('/industry-analysis', (req, res) => blogController.getBlogPostsByCategory(req, {...res, params: {categorySlug: 'industry-analysis'}}));
router.get('/ai-business-tools', (req, res) => blogController.getBlogPostsByCategory(req, {...res, params: {categorySlug: 'ai-business-tools'}}));
router.get('/location-guides', (req, res) => blogController.getBlogPostsByCategory(req, {...res, params: {categorySlug: 'location-guides'}}));

// Legacy category path support (redirects to new structure)
router.get('/category/:categorySlug', blogController.getBlogPostsByCategory);

// Blog tag page at /blog/tag/[tagSlug]
router.get('/tag/:tagSlug', blogController.getBlogPostsByTag);

// Blog author page at /blog/author/[authorSlug]
router.get('/author/:authorSlug', blogController.getBlogPostsByAuthor);

// New URL structure: /blog/[category]/[article-slug]
// This is the main route for individual blog posts
router.get('/:category/:slug', blogController.getBlogPostByPath);

// Legacy support for old URL structure: /blog/[slug]
// This will redirect to the new URL structure
router.get('/:slug', blogController.getBlogPostBySlug);

// ------------------------------------
// Preview Routes (for content creators)
// ------------------------------------

// Preview a blog post (requires auth but less restrictive)
router.get('/preview/:slug', requireAuth, blogController.previewBlogPost);

// ------------------------------------
// API Routes (for programmatic content creation)
// ------------------------------------

// Upload image for blog post
router.post('/api/upload-image', requireAuth, blogController.uploadImage);

// Create a content cluster (pillar + supporting posts)
router.post('/api/create-content-cluster', requireAuth, blogController.createContentCluster);

export default router;
