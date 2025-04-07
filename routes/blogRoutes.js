/**
 * Blog routes for Arzani blog functionality
 * Handles public blog page rendering
 */

import express from 'express';
import blogController from '../controllers/blogController.js';
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

// The main blog root URL
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

// Blog category page at /blog/category/[categorySlug]
router.get('/category/:categorySlug', blogController.getBlogPostsByCategory);

// Blog tag page at /blog/tag/[tagSlug]
router.get('/tag/:tagSlug', blogController.getBlogPostsByTag);

// Blog author page at /blog/author/[authorSlug]
router.get('/author/:authorSlug', blogController.getBlogPostsByAuthor);

// View blog post by slug (individual blog post) at /blog/[slug]
router.get('/:slug', blogController.getBlogPostBySlug);

// ------------------------------------
// Preview Routes (for content creators)
// ------------------------------------

// Preview a blog post (requires auth but less restrictive)
router.get('/preview/:slug', requireAuth, blogController.previewBlogPost);

export default router;