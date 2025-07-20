/**
 * Blog Controller (Updated)
 * Implements the new programmatic blog strategy without n8n workflows
 */

import blogModel from '../models/blogModel.js';
import programmaticContentService from '../services/programmaticContentService.js';
import blogService from '../services/blogService.js';
import db from '../db.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get current directory name (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../public/uploads/blog');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const fileExt = path.extname(file.originalname);
    cb(null, 'blog-image-' + uniqueSuffix + fileExt);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
}).single('image');

/**
 * Ensure image URL is properly formatted
 * This helper ensures we have a proper S3 URL for images
 */
function ensureProperImageUrl(imageUrl) {
  if (!imageUrl) {
    return 'https://arzani-images1.s3.eu-west-2.amazonaws.com/blogs/default-blog-hero.jpg';
  }
  
  // If already a full URL, return it
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  
  // If it's a relative path, convert to S3 URL
  if (imageUrl.startsWith('/blogs/') || imageUrl.startsWith('/uploads/blogs/')) {
    return `https://arzani-images1.s3.eu-west-2.amazonaws.com${imageUrl}`;
  }
  
  // Default image if we can't process it
  return 'https://arzani-images1.s3.eu-west-2.amazonaws.com/blogs/default-blog-hero.jpg';
}

/**
 * Get blog home page
 */
async function getBlogHomePage(req, res) {
  try {
    // Get featured, recent posts and categories using the blog model
    const featuredPostsResult = await blogModel.getAllPosts(1, 3, { is_featured: true });
    const recentPostsResult = await blogModel.getAllPosts(1, 6);
    const categories = await blogModel.getAllCategories();
    
    // Get pillar posts for the featured content
    const pillarPosts = await blogModel.getPillarPosts();
    
    // Render the blog home page
    return res.render('blog/index', {
      title: 'Business Knowledge Center | Arzani Marketplace',
      description: 'Expert insights on buying, selling, and valuing businesses using AI-powered tools and traditional methods.',
      featuredPost: featuredPostsResult.posts[0] || null,
      blogPosts: recentPostsResult.posts,
      pillarPosts: pillarPosts || [],
      categories: categories,
      pagination: recentPostsResult.pagination,
      currentCategory: null
    });
  } catch (error) {
    console.error('Error fetching blog home page data:', error);
    return res.status(500).render('error', {
      message: 'Error loading blog page. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
}

/**
 * Get category page with posts
 */
async function getBlogPostsByCategory(req, res) {
  try {
    const { categorySlug } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    
    // Get posts for this category with pagination
    const result = await blogModel.getPostsByCategory(categorySlug, page, limit);
    
    if (!result) {
      return res.status(404).render('error', {
        message: 'Category not found.'
      });
    }
    
    // Get all categories for the sidebar
    const categories = await blogModel.getAllCategories();
    
    // Find the current category object for display
    const currentCategory = categories.find(cat => cat.slug === categorySlug);
    
    return res.render('blog/category', {
      title: `${currentCategory?.name || categorySlug} | Arzani Business Knowledge Center`,
      description: currentCategory?.description || `Articles about ${categorySlug.replace(/-/g, ' ')} in the UK business marketplace.`,
      blogPosts: result.posts,
      categories,
      pagination: result.pagination,
      currentCategory
    });
  } catch (error) {
    console.error('Error fetching category posts:', error);
    return res.status(500).render('error', {
      message: 'Error loading category page. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
}

/**
 * Get posts by tag
 */
async function getBlogPostsByTag(req, res) {
  try {
    const { tagSlug } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    
    // Get posts with this tag
    const result = await blogModel.getAllPosts(page, limit, { tag: tagSlug });
    
    // Get the tag information
    const tagResult = await db.query(`
      SELECT * FROM blog_tags WHERE slug = $1
    `, [tagSlug]);
    
    if (tagResult.rows.length === 0) {
      return res.status(404).render('error', {
        message: 'Tag not found.'
      });
    }
    
    const tag = tagResult.rows[0];
    
    // Get all categories for the sidebar
    const categories = await blogModel.getAllCategories();
    
    return res.render('blog/tag', {
      title: `${tag.name} | Arzani Business Knowledge Center`,
      description: `Articles tagged with ${tag.name} in the Arzani business marketplace.`,
      blogPosts: result.posts,
      categories,
      pagination: result.pagination,
      currentTag: tag
    });
  } catch (error) {
    console.error('Error fetching tag posts:', error);
    return res.status(500).render('error', {
      message: 'Error loading tag page. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
}

/**
 * Get posts by author
 */
async function getBlogPostsByAuthor(req, res) {
  try {
    const { authorSlug } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    
    // Get posts by this author
    const result = await blogModel.getAllPosts(page, limit, { author: authorSlug });
    
    if (result.posts.length === 0) {
      return res.status(404).render('error', {
        message: 'Author not found or has no published posts.'
      });
    }
    
    // Get author info from the first post
    const author = result.posts[0].author;
    
    // Get all categories for the sidebar
    const categories = await blogModel.getAllCategories();
    
    return res.render('blog/author', {
      title: `Articles by ${author.name} | Arzani Business Knowledge Center`,
      description: `Read articles by ${author.name} on business buying, selling, and valuation in the UK marketplace.`,
      blogPosts: result.posts,
      categories,
      pagination: result.pagination,
      author
    });
  } catch (error) {
    console.error('Error fetching author posts:', error);
    return res.status(500).render('error', {
      message: 'Error loading author page. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
}

/**
 * Get a blog post by its slug
 * New URL structure: /blog/[category]/[article-slug]
 */
async function getBlogPostByPath(req, res) {
  try {
    const { category, slug } = req.params;
    
    // Get the blog post using the blog model
    const post = await blogModel.getPostBySlug(slug);
    
    if (!post) {
      return res.status(404).render('error', {
        message: 'Blog post not found.'
      });
    }
    
    // Verify that the post is in the correct category
    // If category doesn't match the post's content_category, redirect to the correct URL
    if (post.content_category !== category) {
      return res.redirect(`/blog/${post.content_category}/${post.slug}`);
    }
    
    // Get all categories for the sidebar
    const categories = await blogModel.getAllCategories();
    
    // Get related posts (if not already included in the post object)
    let relatedPosts = post.relatedPosts || [];
    if (!relatedPosts.length) {
      // Get posts in the same category
      const relatedResult = await db.query(`
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
    
    // Render the blog post page
    return res.render('blog/blog-post_new', {
      title: `${post.seo_title || post.title} | Arzani`,
      description: post.meta_description || post.excerpt,
      blog: post,
      categories,
      relatedPosts
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
 * Legacy handler for old URL structure: /blog/[slug]
 * Redirects to the new URL structure
 */
async function getBlogPostBySlug(req, res) {
  try {
    const { slug } = req.params;
    
    // Get the blog post
    const post = await blogModel.getPostBySlug(slug);
    
    if (!post) {
      return res.status(404).render('error', {
        message: 'Blog post not found.'
      });
    }
    
    // Redirect to the new URL structure
    return res.redirect(`/blog/${post.content_category}/${post.slug}`);
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return res.status(500).render('error', {
      message: 'Error loading blog post. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
}

/**
 * Search blog posts
 */
async function searchBlogPosts(req, res) {
  try {
    const { q } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    
    if (!q || q.trim() === '') {
      return res.redirect('/blog');
    }
    
    // Search posts
    const result = await blogModel.getAllPosts(page, limit, { search: q });
    
    // Get all categories for the sidebar
    const categories = await blogModel.getAllCategories();
    
    return res.render('blog/search-results', {
      title: `Search Results: ${q} | Arzani Business Knowledge Center`,
      description: `Blog articles matching your search for ${q} on the Arzani business marketplace.`,
      blogPosts: result.posts,
      categories,
      pagination: result.pagination,
      searchQuery: q
    });
  } catch (error) {
    console.error('Error searching blog posts:', error);
    return res.status(500).render('error', {
      message: 'Error searching blog posts. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
}

/**
 * Preview a blog post (for content creators)
 */
async function previewBlogPost(req, res) {
  try {
    const { slug } = req.params;
    
    // Get the blog post (including drafts)
    const postResult = await db.query(`
      SELECT p.* FROM blog_posts p 
      WHERE p.slug = $1
    `, [slug]);
    
    if (postResult.rows.length === 0) {
      return res.status(404).render('error', {
        message: 'Blog post not found.'
      });
    }
    
    const post = postResult.rows[0];
    
    // Get categories
    const categoriesResult = await db.query(`
      SELECT c.* 
      FROM blog_categories c
      JOIN blog_post_categories pc ON c.id = pc.category_id
      WHERE pc.post_id = $1
    `, [post.id]);
    
    // Get tags
    const tagsResult = await db.query(`
      SELECT t.* 
      FROM blog_tags t
      JOIN blog_post_tags pt ON t.id = pt.tag_id
      WHERE pt.post_id = $1
    `, [post.id]);
    
    // Format author info
    const author = {
      name: post.author_name || 'Arzani Team',
      avatar: post.author_image || '/figma design exports/images/default-avatar.png',
      bio: post.author_bio || ''
    };
    
    // Format the post for rendering
    const formattedPost = {
      ...post,
      categories: categoriesResult.rows || [],
      tags: tagsResult.rows || [],
      author
    };
    
    // Get all categories for the sidebar
    const categories = await blogModel.getAllCategories();
    
    // Render the preview page
    return res.render('blog/preview', {
      title: `PREVIEW: ${post.title}`,
      description: post.meta_description || post.excerpt,
      blog: formattedPost,
      categories,
      isPreview: true
    });
  } catch (error) {
    console.error('Error previewing blog post:', error);
    return res.status(500).render('error', {
      message: 'Error previewing blog post. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
}

/**
 * Handle image uploads for blog posts
 */
async function uploadImage(req, res) {
  upload(req, res, function(err) {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    // Create the URL path for the uploaded file
    const filePath = `/uploads/blog/${req.file.filename}`;
    
    return res.json({
      success: true,
      filePath,
      url: filePath
    });
  });
}

/**
 * Create a programmatic content cluster with a pillar post and supporting posts
 * This replaces the old n8n workflow for creating content
 */
async function createContentCluster(req, res) {
  try {
    const { pillarData, supportingPostsData } = req.body;
    
    if (!pillarData || !pillarData.title || !pillarData.content) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields for pillar post'
      });
    }
    
    // Create the content cluster using the programmatic content service
    const contentCluster = await programmaticContentService.createContentCluster(
      pillarData,
      supportingPostsData || []
    );
    
    // Update the sitemap
    await blogService.triggerSitemapUpdate(contentCluster.pillarPost.slug, 'create');
    
    // Send notification about new content
    await blogService.sendPublicationNotification(contentCluster.pillarPost, ['email']);
    
    return res.json({
      success: true,
      message: 'Content cluster created successfully',
      data: contentCluster
    });
  } catch (error) {
    console.error('Error creating content cluster:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating content cluster',
      error: error.message
    });
  }
}

/**
 * API Functions for blog routes
 */

// Get all blog posts for API
async function getAllBlogPosts(req, res) {
  try {
    const { page = 1, limit = 10, category, tag, author } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT p.*, c.name as category_name, u.name as author_name
      FROM blog_posts p
      LEFT JOIN blog_categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.status = 'published'
    `;
    const params = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      query += ` AND c.slug = $${paramCount}`;
      params.push(category);
    }

    if (tag) {
      paramCount++;
      query += ` AND p.id IN (
        SELECT bt.blog_post_id FROM blog_tags_posts bt
        JOIN blog_tags t ON bt.blog_tag_id = t.id
        WHERE t.slug = $${paramCount}
      )`;
      params.push(tag);
    }

    if (author) {
      paramCount++;
      query += ` AND u.slug = $${paramCount}`;
      params.push(author);
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: result.rows.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Get featured blog posts
async function getFeaturedBlogPosts(req, res) {
  try {
    const { limit = 5 } = req.query;
    
    const result = await db.query(
      `SELECT p.*, c.name as category_name, u.name as author_name
       FROM blog_posts p
       LEFT JOIN blog_categories c ON p.category_id = c.id
       LEFT JOIN users u ON p.author_id = u.id
       WHERE p.status = 'published' AND p.is_featured = true
       ORDER BY p.created_at DESC
       LIMIT $1`,
      [limit]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching featured posts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Get recent blog posts
async function getRecentBlogPosts(req, res) {
  try {
    const { limit = 10 } = req.query;
    
    const result = await db.query(
      `SELECT p.*, c.name as category_name, u.name as author_name
       FROM blog_posts p
       LEFT JOIN blog_categories c ON p.category_id = c.id
       LEFT JOIN users u ON p.author_id = u.id
       WHERE p.status = 'published'
       ORDER BY p.created_at DESC
       LIMIT $1`,
      [limit]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching recent posts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Get related blog posts by slug
async function getRelatedBlogPosts(req, res) {
  try {
    const { slug } = req.params;
    const { limit = 5 } = req.query;
    
    // First get the current post to find related posts
    const currentPost = await db.query(
      'SELECT * FROM blog_posts WHERE slug = $1 AND status = $2',
      [slug, 'published']
    );
    
    if (currentPost.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    
    const post = currentPost.rows[0];
    
    // Get related posts by category, excluding current post
    const result = await db.query(
      `SELECT p.*, c.name as category_name, u.name as author_name
       FROM blog_posts p
       LEFT JOIN blog_categories c ON p.category_id = c.id
       LEFT JOIN users u ON p.author_id = u.id
       WHERE p.status = 'published' 
         AND p.category_id = $1 
         AND p.id != $2
       ORDER BY p.created_at DESC
       LIMIT $3`,
      [post.category_id, post.id, limit]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching related posts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Get blog post by slug (JSON response)
async function getBlogPostBySlugJson(req, res) {
  try {
    const { slug } = req.params;
    
    const result = await db.query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug,
              u.name as author_name, u.bio as author_bio
       FROM blog_posts p
       LEFT JOIN blog_categories c ON p.category_id = c.id
       LEFT JOIN users u ON p.author_id = u.id
       WHERE p.slug = $1 AND p.status = $2`,
      [slug, 'published']
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    
    // Get tags for this post
    const tagsResult = await db.query(
      `SELECT t.name, t.slug
       FROM blog_tags t
       JOIN blog_tags_posts btp ON t.id = btp.blog_tag_id
       WHERE btp.blog_post_id = $1`,
      [result.rows[0].id]
    );
    
    const post = {
      ...result.rows[0],
      tags: tagsResult.rows
    };
    
    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Get all categories
async function getAllCategories(req, res) {
  try {
    const result = await db.query(
      `SELECT c.*, COUNT(p.id) as post_count
       FROM blog_categories c
       LEFT JOIN blog_posts p ON c.id = p.category_id AND p.status = 'published'
       GROUP BY c.id, c.name, c.slug, c.description
       ORDER BY c.name ASC`
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Get all tags
async function getAllTags(req, res) {
  try {
    const result = await db.query(
      `SELECT t.*, COUNT(btp.blog_post_id) as post_count
       FROM blog_tags t
       LEFT JOIN blog_tags_posts btp ON t.id = btp.blog_tag_id
       LEFT JOIN blog_posts p ON btp.blog_post_id = p.id AND p.status = 'published'
       GROUP BY t.id, t.name, t.slug
       ORDER BY t.name ASC`
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Create blog post
async function createBlogPost(req, res) {
  try {
    const {
      title,
      content,
      excerpt,
      category_id,
      tags,
      meta_description,
      is_featured = false
    } = req.body;
    
    const author_id = req.user.id; // From auth middleware
    const slug = title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
    
    // Insert blog post
    const result = await db.query(
      `INSERT INTO blog_posts (
        title, slug, content, excerpt, category_id, author_id,
        meta_description, is_featured, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *`,
      [title, slug, content, excerpt, category_id, author_id, meta_description, is_featured, 'published']
    );
    
    const post = result.rows[0];
    
    // Add tags if provided
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        // Get or create tag
        let tagResult = await db.query('SELECT id FROM blog_tags WHERE name = $1', [tagName]);
        let tagId;
        
        if (tagResult.rows.length === 0) {
          const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
          const newTag = await db.query(
            'INSERT INTO blog_tags (name, slug) VALUES ($1, $2) RETURNING id',
            [tagName, tagSlug]
          );
          tagId = newTag.rows[0].id;
        } else {
          tagId = tagResult.rows[0].id;
        }
        
        // Link tag to post
        await db.query(
          'INSERT INTO blog_tags_posts (blog_post_id, blog_tag_id) VALUES ($1, $2)',
          [post.id, tagId]
        );
      }
    }
    
    res.json({
      success: true,
      data: post,
      message: 'Blog post created successfully'
    });
  } catch (error) {
    console.error('Error creating blog post:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Update blog post
async function updateBlogPost(req, res) {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      excerpt,
      category_id,
      tags,
      meta_description,
      is_featured,
      status
    } = req.body;
    
    // Update blog post
    const result = await db.query(
      `UPDATE blog_posts SET
        title = COALESCE($1, title),
        content = COALESCE($2, content),
        excerpt = COALESCE($3, excerpt),
        category_id = COALESCE($4, category_id),
        meta_description = COALESCE($5, meta_description),
        is_featured = COALESCE($6, is_featured),
        status = COALESCE($7, status),
        updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [title, content, excerpt, category_id, meta_description, is_featured, status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    
    // Update tags if provided
    if (tags) {
      // Remove existing tags
      await db.query('DELETE FROM blog_tags_posts WHERE blog_post_id = $1', [id]);
      
      // Add new tags
      for (const tagName of tags) {
        let tagResult = await db.query('SELECT id FROM blog_tags WHERE name = $1', [tagName]);
        let tagId;
        
        if (tagResult.rows.length === 0) {
          const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
          const newTag = await db.query(
            'INSERT INTO blog_tags (name, slug) VALUES ($1, $2) RETURNING id',
            [tagName, tagSlug]
          );
          tagId = newTag.rows[0].id;
        } else {
          tagId = tagResult.rows[0].id;
        }
        
        await db.query(
          'INSERT INTO blog_tags_posts (blog_post_id, blog_tag_id) VALUES ($1, $2)',
          [id, tagId]
        );
      }
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Blog post updated successfully'
    });
  } catch (error) {
    console.error('Error updating blog post:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Delete blog post
async function deleteBlogPost(req, res) {
  try {
    const { id } = req.params;
    
    // Delete tag associations first
    await db.query('DELETE FROM blog_tags_posts WHERE blog_post_id = $1', [id]);
    
    // Delete the post
    const result = await db.query(
      'DELETE FROM blog_posts WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    
    res.json({
      success: true,
      message: 'Blog post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Approve blog post
async function approveBlogPost(req, res) {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      `UPDATE blog_posts SET 
        status = 'published',
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Blog post approved and published'
    });
  } catch (error) {
    console.error('Error approving blog post:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Upload blog image
async function uploadBlogImage(req, res) {
  upload(req, res, function (err) {
    if (err) {
      console.error('Image upload error:', err);
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }
    
    const imageUrl = `/uploads/blog/${req.file.filename}`;
    
    res.json({
      success: true,
      imageUrl,
      message: 'Image uploaded successfully'
    });
  });
}

// Refresh blog cache
async function refreshBlogCache(req, res) {
  try {
    const { slug } = req.params;
    
    // Clear any caching for this post
    // This would integrate with your caching system (Redis, etc.)
    console.log(`Cache refresh requested for blog post: ${slug}`);
    
    res.json({
      success: true,
      message: `Cache refreshed for post: ${slug}`
    });
  } catch (error) {
    console.error('Error refreshing cache:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Handle n8n webhook
async function handleN8nWebhook(req, res) {
  try {
    console.log('N8N Webhook received:', req.body);
    
    // Process the webhook data
    const webhookData = req.body;
    
    // Log the webhook request
    await blogService.logWebhookRequest(webhookData);
    
    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export default {
  getBlogHomePage,
  getBlogPostsByCategory,
  getBlogPostsByTag,
  getBlogPostsByAuthor,
  getBlogPostByPath,
  getBlogPostBySlug,
  searchBlogPosts,
  previewBlogPost,
  uploadImage,
  createContentCluster,
  getAllBlogPosts,
  getFeaturedBlogPosts,
  getRecentBlogPosts,
  getRelatedBlogPosts,
  getBlogPostBySlugJson,
  getAllCategories,
  getAllTags,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  approveBlogPost,
  uploadBlogImage,
  refreshBlogCache,
  handleN8nWebhook
};
