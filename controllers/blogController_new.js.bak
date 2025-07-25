/**
 * Enhanced Blog Controller Integration
 * Implements the advanced interlinking features
 */

import { processContentWithLinks } from './enhance-blog-interlinking.js';
import pool from './db.js';

/**
 * Enhanced version of getBlogPostByPath that includes interlinking features
 * This function should be integrated into the existing blogController_new.js
 */
async function enhancedGetBlogPostByPath(req, res) {
  try {
    const { category, slug } = req.params;
    
    // Get the blog post using the blog model
    const post = await blogModel.getPostBySlug(slug);
    
    if (!post) {
      return res.status(404).render('error', {
        message: 'Blog post not found.'
      });
    }
    
    // Normalize category strings for comparison (remove spaces, lowercase)
    const normalizedRequestCategory = category.toLowerCase().replace(/\s+/g, '-');
    const normalizedPostCategory = post.content_category ? 
      post.content_category.toLowerCase().replace(/\s+/g, '-') : 
      'uncategorized';
    
    // Verify that the post is in the correct category
    // If category doesn't match the post's content_category, redirect to the correct URL
    if (normalizedPostCategory !== normalizedRequestCategory) {
      // Use the normalized version of post.content_category for the redirect
      return res.redirect(`/blog/${normalizedPostCategory}/${post.slug}`);
    }
    
    // Get all categories for the sidebar
    const categories = await blogModel.getAllCategories();
    
    // Get related posts (if not already included in the post object)
    let relatedPosts = post.relatedPosts || [];
    if (!relatedPosts.length) {
      // Get posts in the same category
      const relatedResult = await pool.query(`
        SELECT p.*
        FROM blog_posts p
        JOIN blog_post_categories pc1 ON p.id = pc1.post_id
        JOIN blog_post_categories pc2 ON pc1.category_id = pc2.category_id
        WHERE pc2.post_id = $1
        AND p.id != $1
        AND p.status = 'Published'
        ORDER BY p.publish_date DESC
        LIMIT 3
      `, [post.id]);
      
      relatedPosts = relatedResult.rows;
    }
    
    // ENHANCEMENT: Get semantic relationships for this blog post
    const semanticRelationships = await pool.query(`
      SELECT 
        r.relationship_type, 
        r.relationship_strength, 
        r.shared_keywords,
        p.id, p.title, p.slug, p.content_category, p.excerpt
      FROM blog_post_relationships r
      JOIN blog_posts p ON r.target_post_id = p.id
      WHERE r.source_post_id = $1
      AND p.status = 'Published'
      ORDER BY r.relationship_strength DESC
      LIMIT 10
    `, [post.id]);
    
    // ENHANCEMENT: Get link metrics for this blog post
    const linkMetricsResult = await pool.query(`
      SELECT * FROM blog_post_link_metrics
      WHERE post_id = $1
    `, [post.id]);
    
    const linkMetrics = linkMetricsResult.rows.length > 0 ? linkMetricsResult.rows[0] : null;
    
    // ENHANCEMENT: Process the content with embedded links if contentLinks exists
    let processedContent = post.content;
    if (post.content_links) {
      processedContent = processContentWithLinks(post.content, post.content_links);
    }
    
    // Process the blog content to extract clean HTML
    const cleanedPost = {
      ...post,
      content: extractBlogContent(processedContent),
      semantic_relationships: semanticRelationships.rows.map(row => {
        return {
          relationship_type: row.relationship_type,
          strength: row.relationship_strength,
          shared_keywords: row.shared_keywords,
          post: {
            id: row.id,
            title: row.title,
            slug: row.slug,
            content_category: row.content_category,
            excerpt: row.excerpt
          }
        };
      }),
      link_metrics: linkMetrics
    };
    
    // Check if user is admin
    const isAdmin = req.user && req.user.role === 'admin';
    
    // Render the blog post page
    return res.render('blog/blog-post_new', {
      title: `${post.seo_title || post.title} | Arzani`,
      description: post.meta_description || post.excerpt,
      blog: cleanedPost,
      categories,
      relatedPosts,
      isAdmin
    });
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return res.status(500).render('error', {
      message: 'Error loading blog post. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
}

/**
 * Integration instructions:
 * 
 * 1. Replace the existing getBlogPostByPath function in blogController_new.js
 *    with the enhanced version above
 * 
 * 2. Add the partial include at the end of blog-post_new.ejs:
 *    <%- include('./partials/enhanced-interlinking') %>
 * 
 * 3. Run the database migration:
 *    psql -U your_username -d your_database -f blog-interlinking-migration.sql
 * 
 * 4. Run the enhance-blog-interlinking.js script to set up relationships:
 *    node enhance-blog-interlinking.js
 */
