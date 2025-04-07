/**
 * Blog Controller
 * Handles all blog-related operations and integrates with n8n workflow
 */

import n8nWorkflowService from '../utils/n8nWorkflowService.js';
import contentProcessor from '../utils/contentProcessor.js';
import db from '../db.js';
import config from '../config/n8nConfig.js';
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
    let featuredPosts = [];
    let recentPosts = [];
    let categories = [];
    
    try {
      // Get featured and recent posts - modified to use direct author fields from blog_posts
      const featuredResult = await db.query(
        'SELECT p.* FROM blog_posts p ' +
        'WHERE p.status = $1 AND is_featured = $2 ORDER BY publish_date DESC LIMIT 3',
        ['Published', true]
      );
      
      const recentResult = await db.query(
        'SELECT p.* FROM blog_posts p ' +
        'WHERE p.status = $1 ORDER BY publish_date DESC LIMIT 6',
        ['Published']
      );
      
      // Get categories for sidebar
      const categoriesResult = await db.query(
        'SELECT c.*, COUNT(pc.post_id) as post_count FROM blog_categories c ' +
        'LEFT JOIN blog_post_categories pc ON c.id = pc.category_id ' +
        'LEFT JOIN blog_posts p ON pc.post_id = p.id AND p.status = $1 ' +
        'GROUP BY c.id ORDER BY c.name',
        ['Published']
      );
      
      // Format the posts to include author and categories
      featuredPosts = await Promise.all(featuredResult.rows.map(async post => {
        // Get categories for the post
        const postCategoriesResult = await db.query(
          'SELECT c.* FROM blog_categories c ' +
          'JOIN blog_post_categories pc ON c.id = pc.category_id ' +
          'WHERE pc.post_id = $1',
          [post.id]
        );
        
        return {
          ...post,
          hero_image: ensureProperImageUrl(post.hero_image),
          author: {
            name: post.author_name || 'Arzani Team',
            avatar: post.author_image || '/figma design exports/images/default-avatar.png',
            bio: post.author_bio || ''
          },
          categories: postCategoriesResult.rows || [],
          publishDate: post.publish_date || post.created_at,
          readingTime: post.reading_time || 5
        };
      }));
      
      recentPosts = await Promise.all(recentResult.rows.map(async post => {
        // Get categories for the post
        const postCategoriesResult = await db.query(
          'SELECT c.* FROM blog_categories c ' +
          'JOIN blog_post_categories pc ON c.id = pc.category_id ' +
          'WHERE pc.post_id = $1',
          [post.id]
        );
        
        return {
          ...post,
          hero_image: ensureProperImageUrl(post.hero_image),
          author: {
            name: post.author_name || 'Arzani Team',
            avatar: post.author_image || '/figma design exports/images/default-avatar.png',
            bio: post.author_bio || ''
          },
          categories: postCategoriesResult.rows || [],
          publishDate: post.publish_date || post.created_at,
          readingTime: post.reading_time || 5
        };
      }));
      
      categories = categoriesResult.rows;
    } catch (dbError) {
      console.error('Database error in blog homepage:', dbError);
      // Continue with empty arrays instead of failing
    }
    
    // Render the blog home page even if there's no data
    return res.render('blog/index', {
      featuredPost: featuredPosts[0] || null,
      blogPosts: recentPosts,
      categories: categories,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalPosts: recentPosts.length
      },
      currentCategory: null,
      title: 'Blog - Arzani Marketplace',
      description: 'Insights and resources for business owners, sellers, and buyers in the UK small business marketplace.'
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
 * Get a blog post by its slug
 */
async function getBlogPostBySlug(req, res) {
  try {
    const { slug } = req.params;
    
    // Get the blog post (updated to use direct author fields)
    const result = await db.query(
      'SELECT p.* FROM blog_posts p ' +
      'WHERE p.slug = $1 AND p.status = $2',
      [slug, 'Published']
    );
    
    if (result.rows.length === 0) {
      return res.status(404).render('error', {
        message: 'Blog post not found.'
      });
    }
    
    const post = result.rows[0];
    post.hero_image = ensureProperImageUrl(post.hero_image);
    
    // Get the post categories
    const categoriesResult = await db.query(
      'SELECT c.* FROM blog_categories c ' +
      'JOIN blog_post_categories pc ON c.id = pc.category_id ' +
      'WHERE pc.post_id = $1',
      [post.id]
    );
    
    // Get the post tags
    const tagsResult = await db.query(
      'SELECT t.* FROM blog_tags t ' +
      'JOIN blog_post_tags pt ON t.id = pt.tag_id ' +
      'WHERE pt.post_id = $1',
      [post.id]
    );
    
    // Get related posts (posts in the same category)
    const relatedPostsResult = await db.query(
      'SELECT DISTINCT p.* FROM blog_posts p ' +
      'JOIN blog_post_categories pc1 ON p.id = pc1.post_id ' +
      'JOIN blog_post_categories pc2 ON pc1.category_id = pc2.category_id ' +
      'WHERE pc2.post_id = $1 AND p.id != $1 AND p.status = $2 ' +
      'ORDER BY p.publish_date DESC LIMIT 3',
      [post.id, 'Published']
    );
    
    // Process each related post to ensure proper image URL
    const relatedPosts = relatedPostsResult.rows.map(post => ({
      ...post,
      hero_image: ensureProperImageUrl(post.hero_image)
    }));
    
    // Increment view count
    await db.query(
      'UPDATE blog_posts SET view_count = view_count + 1 WHERE id = $1',
      [post.id]
    );
    
    // Render the blog post page
    return res.render('blog/post', {
      post,
      categories: categoriesResult.rows,
      tags: tagsResult.rows,
      relatedPosts,
      title: `${post.title} - Arzani Blog`,
      description: post.meta_description || contentProcessor.generateExcerpt(post.content, 160)
    });
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return res.status(500).render('error', {
      message: 'Error loading blog post. Please try again later.'
    });
  }
}

/**
 * Search blog posts
 */
async function searchBlogPosts(req, res) {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.redirect('/blog');
    }
    
    // Search posts by title, content, or meta description
    const result = await db.query(
      'SELECT p.*, u.name as author_name ' +
      'FROM blog_posts p ' +
      'LEFT JOIN users u ON p.author_id = u.id ' +
      'WHERE (p.title ILIKE $1 OR p.content ILIKE $1 OR p.meta_description ILIKE $1) ' +
      'AND p.status = $2 ' +
      'ORDER BY p.publish_date DESC',
      [`%${query}%`, 'Published']
    );
    
    // Render the search results page
    return res.render('blog/search-results', {
      posts: result.rows,
      query,
      count: result.rows.length,
      title: `Search Results for "${query}" - Arzani Blog`,
      description: `Search results for "${query}" in the Arzani blog.`
    });
  } catch (error) {
    console.error('Error searching blog posts:', error);
    return res.status(500).render('error', {
      message: 'Error searching blog posts. Please try again later.'
    });
  }
}

/**
 * Get blog posts by category
 */
async function getBlogPostsByCategory(req, res) {
  try {
    const { categorySlug } = req.params;
    
    // Get the category
    const categoryResult = await db.query(
      'SELECT * FROM blog_categories WHERE slug = $1',
      [categorySlug]
    );
    
    if (categoryResult.rows.length === 0) {
      return res.status(404).render('error', {
        message: 'Category not found.'
      });
    }
    
    const category = categoryResult.rows[0];
    
    // Get posts in this category
    const postsResult = await db.query(
      'SELECT p.*, u.name as author_name ' +
      'FROM blog_posts p ' +
      'JOIN blog_post_categories pc ON p.id = pc.post_id ' +
      'LEFT JOIN users u ON p.author_id = u.id ' +
      'WHERE pc.category_id = $1 AND p.status = $2 ' +
      'ORDER BY p.publish_date DESC',
      [category.id, 'Published']
    );
    
    // Render the category page
    return res.render('blog/category', {
      category,
      posts: postsResult.rows,
      title: `${category.name} - Arzani Blog`,
      description: category.description || `Articles in the ${category.name} category.`
    });
  } catch (error) {
    console.error('Error fetching posts by category:', error);
    return res.status(500).render('error', {
      message: 'Error loading category page. Please try again later.'
    });
  }
}

/**
 * Get blog posts by tag
 */
async function getBlogPostsByTag(req, res) {
  try {
    const { tagSlug } = req.params;
    
    // Get the tag
    const tagResult = await db.query(
      'SELECT * FROM blog_tags WHERE slug = $1',
      [tagSlug]
    );
    
    if (tagResult.rows.length === 0) {
      return res.status(404).render('error', {
        message: 'Tag not found.'
      });
    }
    
    const tag = tagResult.rows[0];
    
    // Get posts with this tag
    const postsResult = await db.query(
      'SELECT p.*, u.name as author_name ' +
      'FROM blog_posts p ' +
      'JOIN blog_post_tags pt ON p.id = pt.post_id ' +
      'LEFT JOIN users u ON p.author_id = u.id ' +
      'WHERE pt.tag_id = $1 AND p.status = $2 ' +
      'ORDER BY p.publish_date DESC',
      [tag.id, 'Published']
    );
    
    // Render the tag page
    return res.render('blog/tag', {
      tag,
      posts: postsResult.rows,
      title: `Posts tagged with ${tag.name} - Arzani Blog`,
      description: `Articles tagged with ${tag.name} on the Arzani blog.`
    });
  } catch (error) {
    console.error('Error fetching posts by tag:', error);
    return res.status(500).render('error', {
      message: 'Error loading tag page. Please try again later.'
    });
  }
}

/**
 * Get blog posts by author
 */
async function getBlogPostsByAuthor(req, res) {
  try {
    const { authorSlug } = req.params;
    
    // Get the author
    const authorResult = await db.query(
      'SELECT * FROM users WHERE slug = $1',
      [authorSlug]
    );
    
    if (authorResult.rows.length === 0) {
      return res.status(404).render('error', {
        message: 'Author not found.'
      });
    }
    
    const author = authorResult.rows[0];
    
    // Get posts by this author
    const postsResult = await db.query(
      'SELECT p.* FROM blog_posts p ' +
      'WHERE p.author_id = $1 AND p.status = $2 ' +
      'ORDER BY p.publish_date DESC',
      [author.id, 'Published']
    );
    
    // Render the author page
    return res.render('blog/author', {
      author,
      posts: postsResult.rows,
      title: `Posts by ${author.name} - Arzani Blog`,
      description: author.bio || `Articles written by ${author.name} on the Arzani blog.`
    });
  } catch (error) {
    console.error('Error fetching posts by author:', error);
    return res.status(500).render('error', {
      message: 'Error loading author page. Please try again later.'
    });
  }
}

/**
 * Get all blog posts (API)
 */
async function getAllBlogPosts(req, res) {
  try {
    const { page = 1, limit = 10, status = 'Published' } = req.query;
    const offset = (page - 1) * limit;
    
    // Get total count
    const countResult = await db.query(
      'SELECT COUNT(*) FROM blog_posts WHERE status = $1',
      [status]
    );
    
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);
    
    // Updated query to use direct author fields
    const postsResult = await db.query(
      'SELECT p.* FROM blog_posts p ' +
      'WHERE p.status = $1 ' +
      'ORDER BY p.publish_date DESC ' +
      'LIMIT $2 OFFSET $3',
      [status, limit, offset]
    );
    
    // Return the posts as JSON
    return res.json({
      posts: postsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems: totalCount,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching all blog posts:', error);
    return res.status(500).json({
      error: 'Error fetching blog posts. Please try again later.'
    });
  }
}

/**
 * Get featured blog posts (API)
 */
async function getFeaturedBlogPosts(req, res) {
  try {
    const { limit = 3 } = req.query;
    
    // Get featured posts - updated to use direct author fields
    const postsResult = await db.query(
      'SELECT p.* FROM blog_posts p ' +
      'WHERE p.status = $1 AND p.is_featured = $2 ' +
      'ORDER BY p.publish_date DESC ' +
      'LIMIT $3',
      ['Published', true, limit]
    );
    
    // Return the featured posts as JSON
    return res.json({
      posts: postsResult.rows
    });
  } catch (error) {
    console.error('Error fetching featured blog posts:', error);
    return res.status(500).json({
      error: 'Error fetching featured blog posts. Please try again later.'
    });
  }
}

/**
 * Get recent blog posts (API)
 */
async function getRecentBlogPosts(req, res) {
  try {
    const { limit = 5 } = req.query;
    
    // Get recent posts - updated to use direct author fields
    const postsResult = await db.query(
      'SELECT p.* FROM blog_posts p ' +
      'WHERE p.status = $1 ' +
      'ORDER BY p.publish_date DESC ' +
      'LIMIT $2',
      ['Published', limit]
    );
    
    // Return the recent posts as JSON
    return res.json({
      posts: postsResult.rows
    });
  } catch (error) {
    console.error('Error fetching recent blog posts:', error);
    return res.status(500).json({
      error: 'Error fetching recent blog posts. Please try again later.'
    });
  }
}

/**
 * Get related blog posts (API)
 */
async function getRelatedBlogPosts(req, res) {
  try {
    const { slug } = req.params;
    const { limit = 3 } = req.query;
    
    // Get the post ID
    const postResult = await db.query(
      'SELECT id FROM blog_posts WHERE slug = $1',
      [slug]
    );
    
    if (postResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Blog post not found.'
      });
    }
    
    const postId = postResult.rows[0].id;
    
    // Get related posts - updated to use direct author fields
    const relatedPostsResult = await db.query(
      'SELECT DISTINCT p.* FROM blog_posts p ' +
      'JOIN blog_post_categories pc1 ON p.id = pc1.post_id ' +
      'JOIN blog_post_categories pc2 ON pc1.category_id = pc2.category_id ' +
      'WHERE pc2.post_id = $1 AND p.id != $1 AND p.status = $2 ' +
      'ORDER BY p.publish_date DESC ' +
      'LIMIT $3',
      [postId, 'Published', limit]
    );
    
    // Return the related posts as JSON
    return res.json({
      posts: relatedPostsResult.rows
    });
  } catch (error) {
    console.error('Error fetching related blog posts:', error);
    return res.status(500).json({
      error: 'Error fetching related blog posts. Please try again later.'
    });
  }
}

/**
 * Get blog post by slug (API)
 */
async function getBlogPostBySlugJson(req, res) {
  try {
    const { slug } = req.params;
    
    // Get the blog post - updated to use direct author fields
    const result = await db.query(
      'SELECT p.* FROM blog_posts p ' +
      'WHERE p.slug = $1 AND p.status = $2',
      [slug, 'Published']
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Blog post not found.'
      });
    }
    
    const post = result.rows[0];
    
    // Get the post categories
    const categoriesResult = await db.query(
      'SELECT c.* FROM blog_categories c ' +
      'JOIN blog_post_categories pc ON c.id = pc.category_id ' +
      'WHERE pc.post_id = $1',
      [post.id]
    );
    
    // Get the post tags
    const tagsResult = await db.query(
      'SELECT t.* FROM blog_tags t ' +
      'JOIN blog_post_tags pt ON t.id = pt.tag_id ' +
      'WHERE pt.post_id = $1',
      [post.id]
    );
    
    // Add categories and tags to the post
    post.categories = categoriesResult.rows;
    post.tags = tagsResult.rows;
    
    // Increment view count
    await db.query(
      'UPDATE blog_posts SET view_count = view_count + 1 WHERE id = $1',
      [post.id]
    );
    
    // Return the post as JSON
    return res.json({ post });
  } catch (error) {
    console.error('Error fetching blog post by slug:', error);
    return res.status(500).json({
      error: 'Error fetching blog post. Please try again later.'
    });
  }
}

/**
 * Get all categories (API)
 */
async function getAllCategories(req, res) {
  try {
    // Get categories with post count
    const categoriesResult = await db.query(
      'SELECT c.*, COUNT(pc.post_id) as post_count ' +
      'FROM blog_categories c ' +
      'LEFT JOIN blog_post_categories pc ON c.id = pc.category_id ' +
      'LEFT JOIN blog_posts p ON pc.post_id = p.id AND p.status = $1 ' +
      'GROUP BY c.id ' +
      'ORDER BY c.name',
      ['Published']
    );
    
    // Return categories as JSON
    return res.json({
      categories: categoriesResult.rows
    });
  } catch (error) {
    console.error('Error fetching blog categories:', error);
    return res.status(500).json({
      error: 'Error fetching blog categories. Please try again later.'
    });
  }
}

/**
 * Get all tags (API)
 */
async function getAllTags(req, res) {
  try {
    // Get tags with post count
    const tagsResult = await db.query(
      'SELECT t.*, COUNT(pt.post_id) as post_count ' +
      'FROM blog_tags t ' +
      'LEFT JOIN blog_post_tags pt ON t.id = pt.tag_id ' +
      'LEFT JOIN blog_posts p ON pt.post_id = p.id AND p.status = $1 ' +
      'GROUP BY t.id ' +
      'ORDER BY t.name',
      ['Published']
    );
    
    // Return tags as JSON
    return res.json({
      tags: tagsResult.rows
    });
  } catch (error) {
    console.error('Error fetching blog tags:', error);
    return res.status(500).json({
      error: 'Error fetching blog tags. Please try again later.'
    });
  }
}

/**
 * Create a new blog post
 */
async function createBlogPost(req, res) {
  try {
    const { 
      title, 
      content, 
      excerpt, 
      meta_description, 
      categories, 
      tags, 
      author_id, 
      author_name, 
      author_image, 
      author_bio, 
      status 
    } = req.body;
    
    // Generate slug from title
    const slug = contentProcessor.generateSlug(title);
    
    // Check if slug already exists
    const slugCheckResult = await db.query(
      'SELECT id FROM blog_posts WHERE slug = $1',
      [slug]
    );
    
    if (slugCheckResult.rows.length > 0) {
      return res.status(400).json({
        error: 'A blog post with this title already exists. Please choose a different title.'
      });
    }
    
    // Start a database transaction
    await db.query('BEGIN');
    
    // Insert the blog post with author fields
    const postResult = await db.query(
      'INSERT INTO blog_posts (title, slug, content, excerpt, meta_description, author_id, author_name, author_image, author_bio, status) ' +
      'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [
        title, 
        slug, 
        content, 
        excerpt, 
        meta_description, 
        author_id, 
        author_name || 'Arzani Team', 
        author_image || '/figma design exports/images/default-avatar.png', 
        author_bio || 'Arzani contributor',
        status
      ]
    );
    
    const post = postResult.rows[0];
    
    // Add categories
    if (categories && categories.length > 0) {
      for (const categoryId of categories) {
        await db.query(
          'INSERT INTO blog_post_categories (post_id, category_id) VALUES ($1, $2)',
          [post.id, categoryId]
        );
      }
    }
    
    // Add tags
    if (tags && tags.length > 0) {
      for (const tagId of tags) {
        await db.query(
          'INSERT INTO blog_post_tags (post_id, tag_id) VALUES ($1, $2)',
          [post.id, tagId]
        );
      }
    }
    
    // Commit the transaction
    await db.query('COMMIT');
    
    // If the status is "Approved", trigger the publishing workflow
    if (status === 'Approved') {
      try {
        // Get the blog post with author details
        const fullPostResult = await db.query(
          'SELECT p.*, u.name as author_name, u.email as author_email ' +
          'FROM blog_posts p ' +
          'LEFT JOIN users u ON p.author_id = u.id ' +
          'WHERE p.id = $1',
          [post.id]
        );
        
        const fullPost = fullPostResult.rows[0];
        
        // Get categories
        const categoriesResult = await db.query(
          'SELECT c.* FROM blog_categories c ' +
          'JOIN blog_post_categories pc ON c.id = pc.category_id ' +
          'WHERE pc.post_id = $1',
          [post.id]
        );
        
        // Get tags
        const tagsResult = await db.query(
          'SELECT t.* FROM blog_tags t ' +
          'JOIN blog_post_tags pt ON t.id = pt.tag_id ' +
          'WHERE pt.post_id = $1',
          [post.id]
        );
        
        // Add categories and tags to the post
        fullPost.categories = categoriesResult.rows;
        fullPost.tags = tagsResult.rows;
        
        // Trigger the n8n workflow to publish the post
        await n8nWorkflowService.publishBlogPost(fullPost);
        
        // Send notification
        await n8nWorkflowService.sendPublicationNotification(fullPost, ['email', 'slack']);
      } catch (error) {
        console.error('Error triggering n8n workflow:', error);
        // Note: We don't want to fail the API response if the workflow fails
      }
    }
    
    // Return the created post
    return res.status(201).json({
      message: 'Blog post created successfully.',
      post
    });
  } catch (error) {
    // Rollback the transaction in case of error
    await db.query('ROLLBACK');
    
    console.error('Error creating blog post:', error);
    return res.status(500).json({
      error: 'Error creating blog post. Please try again later.'
    });
  }
}

/**
 * Update an existing blog post
 */
async function updateBlogPost(req, res) {
  try {
    const { id } = req.params;
    const { title, content, excerpt, meta_description, categories, tags, status, is_featured } = req.body;
    
    // Check if the post exists
    const postCheckResult = await db.query(
      'SELECT * FROM blog_posts WHERE id = $1',
      [id]
    );
    
    if (postCheckResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Blog post not found.'
      });
    }
    
    const existingPost = postCheckResult.rows[0];
    
    // If title has changed, generate a new slug
    let slug = existingPost.slug;
    if (title && title !== existingPost.title) {
      slug = contentProcessor.generateSlug(title);
      
      // Check if new slug already exists (for a different post)
      const slugCheckResult = await db.query(
        'SELECT id FROM blog_posts WHERE slug = $1 AND id != $2',
        [slug, id]
      );
      
      if (slugCheckResult.rows.length > 0) {
        return res.status(400).json({
          error: 'A blog post with this title already exists. Please choose a different title.'
        });
      }
    }
    
    // Start a database transaction
    await db.query('BEGIN');
    
    // Update the blog post
    const updateFields = [];
    const updateValues = [];
    let valueIndex = 1;
    
    if (title) {
      updateFields.push(`title = $${valueIndex}`);
      updateValues.push(title);
      valueIndex++;
    }
    
    if (slug !== existingPost.slug) {
      updateFields.push(`slug = $${valueIndex}`);
      updateValues.push(slug);
      valueIndex++;
    }
    
    if (content) {
      updateFields.push(`content = $${valueIndex}`);
      updateValues.push(content);
      valueIndex++;
    }
    
    if (excerpt !== undefined) {
      updateFields.push(`excerpt = $${valueIndex}`);
      updateValues.push(excerpt);
      valueIndex++;
    }
    
    if (meta_description !== undefined) {
      updateFields.push(`meta_description = $${valueIndex}`);
      updateValues.push(meta_description);
      valueIndex++;
    }
    
    if (status) {
      updateFields.push(`status = $${valueIndex}`);
      updateValues.push(status);
      valueIndex++;
    }
    
    if (is_featured !== undefined) {
      updateFields.push(`is_featured = $${valueIndex}`);
      updateValues.push(is_featured);
      valueIndex++;
    }
    
    updateFields.push(`updated_at = $${valueIndex}`);
    updateValues.push(new Date());
    valueIndex++;
    
    updateValues.push(id);
    
    const postResult = await db.query(
      `UPDATE blog_posts SET ${updateFields.join(', ')} WHERE id = $${valueIndex} RETURNING *`,
      updateValues
    );
    
    const updatedPost = postResult.rows[0];
    
    // Update categories if provided
    if (categories && Array.isArray(categories)) {
      // Remove existing categories
      await db.query(
        'DELETE FROM blog_post_categories WHERE post_id = $1',
        [id]
      );
      
      // Add new categories
      for (const categoryId of categories) {
        await db.query(
          'INSERT INTO blog_post_categories (post_id, category_id) VALUES ($1, $2)',
          [id, categoryId]
        );
      }
    }
    
    // Update tags if provided
    if (tags && Array.isArray(tags)) {
      // Remove existing tags
      await db.query(
        'DELETE FROM blog_post_tags WHERE post_id = $1',
        [id]
      );
      
      // Add new tags
      for (const tagId of tags) {
        await db.query(
          'INSERT INTO blog_post_tags (post_id, tag_id) VALUES ($1, $2)',
          [id, tagId]
        );
      }
    }
    
    // Commit the transaction
    await db.query('COMMIT');
    
    // If the status has changed to "Approved", trigger the publishing workflow
    if (status === 'Approved' && existingPost.status !== 'Approved') {
      try {
        // Get the updated blog post with author details
        const fullPostResult = await db.query(
          'SELECT p.*, u.name as author_name, u.email as author_email ' +
          'FROM blog_posts p ' +
          'LEFT JOIN users u ON p.author_id = u.id ' +
          'WHERE p.id = $1',
          [id]
        );
        
        const fullPost = fullPostResult.rows[0];
        
        // Get categories
        const categoriesResult = await db.query(
          'SELECT c.* FROM blog_categories c ' +
          'JOIN blog_post_categories pc ON c.id = pc.category_id ' +
          'WHERE pc.post_id = $1',
          [id]
        );
        
        // Get tags
        const tagsResult = await db.query(
          'SELECT t.* FROM blog_tags t ' +
          'JOIN blog_post_tags pt ON t.id = pt.tag_id ' +
          'WHERE pt.post_id = $1',
          [id]
        );
        
        // Add categories and tags to the post
        fullPost.categories = categoriesResult.rows;
        fullPost.tags = tagsResult.rows;
        
        // Trigger the n8n workflow to publish the post
        await n8nWorkflowService.publishBlogPost(fullPost);
        
        // Send notification
        await n8nWorkflowService.sendPublicationNotification(fullPost, ['email', 'slack']);
      } catch (error) {
        console.error('Error triggering n8n workflow:', error);
        // Note: We don't want to fail the API response if the workflow fails
      }
    } else if (status === 'Published' && existingPost.status === 'Published') {
      // If the post is already published and being updated, trigger the update workflow
      try {
        // Get the updated blog post with author details
        const fullPostResult = await db.query(
          'SELECT p.*, u.name as author_name, u.email as author_email ' +
          'FROM blog_posts p ' +
          'LEFT JOIN users u ON p.author_id = u.id ' +
          'WHERE p.id = $1',
          [id]
        );
        
        const fullPost = fullPostResult.rows[0];
        
        // Get categories
        const categoriesResult = await db.query(
          'SELECT c.* FROM blog_categories c ' +
          'JOIN blog_post_categories pc ON c.id = pc.category_id ' +
          'WHERE pc.post_id = $1',
          [id]
        );
        
        // Get tags
        const tagsResult = await db.query(
          'SELECT t.* FROM blog_tags t ' +
          'JOIN blog_post_tags pt ON t.id = pt.tag_id ' +
          'WHERE pt.post_id = $1',
          [id]
        );
        
        // Add categories and tags to the post
        fullPost.categories = categoriesResult.rows;
        fullPost.tags = tagsResult.rows;
        
        // Trigger the n8n workflow to update the post
        await n8nWorkflowService.updateBlogPost(fullPost);
        
        // Refresh cache
        await n8nWorkflowService.refreshBlogCache(fullPost.slug);
      } catch (error) {
        console.error('Error triggering n8n update workflow:', error);
        // Note: We don't want to fail the API response if the workflow fails
      }
    }
    
    // Return the updated post
    return res.json({
      message: 'Blog post updated successfully.',
      post: updatedPost
    });
  } catch (error) {
    // Rollback the transaction in case of error
    await db.query('ROLLBACK');
    
    console.error('Error updating blog post:', error);
    return res.status(500).json({
      error: 'Error updating blog post. Please try again later.'
    });
  }
}

/**
 * Delete a blog post
 */
async function deleteBlogPost(req, res) {
  try {
    const { id } = req.params;
    
    // Check if the post exists
    const postCheckResult = await db.query(
      'SELECT * FROM blog_posts WHERE id = $1',
      [id]
    );
    
    if (postCheckResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Blog post not found.'
      });
    }
    
    // Start a database transaction
    await db.query('BEGIN');
    
    // Delete the blog post's categories and tags
    await db.query('DELETE FROM blog_post_categories WHERE post_id = $1', [id]);
    await db.query('DELETE FROM blog_post_tags WHERE post_id = $1', [id]);
    
    // Delete the blog post
    await db.query('DELETE FROM blog_posts WHERE id = $1', [id]);
    
    // Commit the transaction
    await db.query('COMMIT');
    
    return res.json({
      message: 'Blog post deleted successfully.'
    });
  } catch (error) {
    // Rollback the transaction in case of error
    await db.query('ROLLBACK');
    
    console.error('Error deleting blog post:', error);
    return res.status(500).json({
      error: 'Error deleting blog post. Please try again later.'
    });
  }
}

/**
 * Approve a blog post for publishing
 */
async function approveBlogPost(req, res) {
  try {
    const { id } = req.params;
    
    // Check if the post exists
    const postCheckResult = await db.query(
      'SELECT * FROM blog_posts WHERE id = $1',
      [id]
    );
    
    if (postCheckResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Blog post not found.'
      });
    }
    
    const existingPost = postCheckResult.rows[0];
    
    if (existingPost.status === 'Approved' || existingPost.status === 'Published') {
      return res.status(400).json({
        error: 'This blog post is already approved or published.'
      });
    }
    
    // Update the blog post status
    const postResult = await db.query(
      'UPDATE blog_posts SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *',
      ['Approved', new Date(), id]
    );
    
    const updatedPost = postResult.rows[0];
    
    // Trigger the n8n workflow for publishing
    try {
      // Get the blog post with author details
      const fullPostResult = await db.query(
        'SELECT p.*, u.name as author_name, u.email as author_email ' +
        'FROM blog_posts p ' +
        'LEFT JOIN users u ON p.author_id = u.id ' +
        'WHERE p.id = $1',
        [id]
      );
      
      const fullPost = fullPostResult.rows[0];
      
      // Get categories
      const categoriesResult = await db.query(
        'SELECT c.* FROM blog_categories c ' +
        'JOIN blog_post_categories pc ON c.id = pc.category_id ' +
        'WHERE pc.post_id = $1',
        [id]
      );
      
      // Get tags
      const tagsResult = await db.query(
        'SELECT t.* FROM blog_tags t ' +
        'JOIN blog_post_tags pt ON t.id = pt.tag_id ' +
        'WHERE pt.post_id = $1',
        [id]
      );
      
      // Add categories and tags to the post
      fullPost.categories = categoriesResult.rows;
      fullPost.tags = tagsResult.rows;
      
      // Trigger the n8n workflow to publish the post
      await n8nWorkflowService.publishBlogPost(fullPost);
      
      // Send notification
      await n8nWorkflowService.sendPublicationNotification(fullPost, ['email', 'slack']);
    } catch (error) {
      console.error('Error triggering n8n workflow:', error);
      // Note: We don't want to fail the API response if the workflow fails
    }
    
    return res.json({
      message: 'Blog post approved for publishing.',
      post: updatedPost
    });
  } catch (error) {
    console.error('Error approving blog post:', error);
    return res.status(500).json({
      error: 'Error approving blog post. Please try again later.'
    });
  }
}

/**
 * Handle n8n webhook callbacks
 */
async function handleN8nWebhook(req, res) {
  console.log('log API router hit:', req.method, req.originalUrl);
  try {
    // Log the received webhook
    const payloadSummary = req.body ? 
      `${Object.keys(req.body).length} keys: [${Object.keys(req.body).join(', ')}]` : 
      'No payload';
      
    console.log(`n8n webhook received: ${req.method} ${req.path} - ${payloadSummary}`);
    
    // Delegate webhook processing to the n8n workflow service
    return await n8nWorkflowService.handleWebhook(req, res);
  } catch (error) {
    console.error('Error handling n8n webhook:', error);
    return res.status(500).json({
      success: false,
      error: 'Error processing webhook request',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
}

/**
 * Upload blog image
 */
function uploadBlogImage(req, res) {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        error: `Upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(500).json({
        error: `Error uploading image: ${err.message}`
      });
    }
    
    // File uploaded successfully
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        error: 'No image file provided.'
      });
    }
    
    // Generate URL for the uploaded image
    const imageUrl = `/uploads/blog/${file.filename}`;
    
    return res.json({
      message: 'Image uploaded successfully.',
      imageUrl,
      fileName: file.filename,
      originalName: file.originalname
    });
  });
}

/**
 * Refresh blog cache
 */
async function refreshBlogCache(req, res) {
  try {
    const { slug } = req.params;
    
    // Check if the post exists
    const postCheckResult = await db.query(
      'SELECT * FROM blog_posts WHERE slug = $1',
      [slug]
    );
    
    if (postCheckResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Blog post not found.'
      });
    }
    
    // Trigger the n8n workflow to refresh the cache
    await n8nWorkflowService.refreshBlogCache(slug);
    
    return res.json({
      message: 'Blog cache refresh triggered successfully.'
    });
  } catch (error) {
    console.error('Error refreshing blog cache:', error);
    return res.status(500).json({
      error: 'Error refreshing blog cache. Please try again later.'
    });
  }
}

/**
 * Preview a blog post
 */
async function previewBlogPost(req, res) {
  try {
    const { slug } = req.params;
    
    // Get the blog post (including drafts) - updated to use direct author fields
    const result = await db.query(
      'SELECT p.* FROM blog_posts p ' +
      'WHERE p.slug = $1',
      [slug]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).render('error', {
        message: 'Blog post not found.'
      });
    }
    
    const post = result.rows[0];
    
    // Get the post categories
    const categoriesResult = await db.query(
      'SELECT c.* FROM blog_categories c ' +
      'JOIN blog_post_categories pc ON c.id = pc.category_id ' +
      'WHERE pc.post_id = $1',
      [post.id]
    );
    
    // Get the post tags
    const tagsResult = await db.query(
      'SELECT t.* FROM blog_tags t ' +
      'JOIN blog_post_tags pt ON t.id = pt.tag_id ' +
      'WHERE pt.post_id = $1',
      [post.id]
    );
    
    // Render the blog post preview page
    return res.render('blog/preview', {
      post,
      categories: categoriesResult.rows,
      tags: tagsResult.rows,
      isPreview: true,
      title: `Preview: ${post.title} - Arzani Blog`,
      description: 'This is a preview of a blog post.'
    });
  } catch (error) {
    console.error('Error fetching blog post preview:', error);
    return res.status(500).render('error', {
      message: 'Error loading blog post preview. Please try again later.'
    });
  }
}

// Export as default object for ES modules
export default {
  getBlogHomePage,
  searchBlogPosts,
  getBlogPostBySlug,
  getBlogPostsByCategory,
  getBlogPostsByTag,
  getBlogPostsByAuthor,
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
  handleN8nWebhook,
  uploadBlogImage,
  refreshBlogCache,
  previewBlogPost,
  ensureProperImageUrl // Export the helper function
};