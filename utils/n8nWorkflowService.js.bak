/**
 * n8n Workflow Service
 * Handles interaction with n8n workflows and processes webhooks
 */

import db from '../db.js';
import config from '../config/n8nConfig.js';
import axios from 'axios';

/**
 * Process incoming webhooks from n8n
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response data
 */
async function handleWebhook(req, res) {
  console.log('Received webhook from n8n:', {
    method: req.method,
    path: req.path,
    headers: Object.keys(req.headers),
    contentType: req.headers['content-type'],
    bodyKeys: req.body ? Object.keys(req.body) : 'no body'
  });

  try {
    // Extract the action from the request body
    const payload = req.body || {};
    const action = payload.action;
    
    console.log(`Processing webhook with action: ${action || 'undefined'}`);
    
    // If it's a blog post creation payload without an explicit action field
    if (payload.title && payload.slug && !action) {
      return await handleBlogPostCreation(payload, res);
    }
    
    // Handle specific actions
    switch (action) {
      case 'create_post':
        return await handleBlogPostCreation(payload.postData || payload, res);
      
      case 'update_post':
        return await handleBlogPostUpdate(payload.postData || payload, res);
      
      case 'delete_post':
        return await handleBlogPostDeletion(payload.postId, res);
      
      case 'refresh_cache':
        return await handleCacheRefresh(payload.slug, res);
      
      case 'test':
        // Special case for test webhooks
        return res.json({
          success: true,
          message: 'Test webhook received successfully',
          timestamp: new Date().toISOString()
        });
      
      default:
        console.log('Unhandled webhook action:', action);
        
        // If we have title and content but no action, assume it's a blog post
        if (payload.title && payload.content) {
          console.log('No action specified but post data detected - treating as blog post creation');
          return await handleBlogPostCreation(payload, res);
        }
        
        // Log the full payload for debugging (limiting size for safety)
        const safePayload = JSON.stringify(payload).substring(0, 1000);
        console.log('Webhook payload:', safePayload);
        
        // Return a general response for unhandled actions
        return res.json({
          success: true,
          message: 'Webhook received but no specific handler found for this payload',
          receivedAt: new Date().toISOString(),
          payloadKeys: Object.keys(payload)
        });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({
      success: false,
      error: 'Error processing webhook',
      message: error.message
    });
  }
}

/**
 * Handle blog post creation webhook
 */
async function handleBlogPostCreation(postData, res) {
  console.log('Handling blog post creation webhook');
  
  try {
    if (!postData.title || !postData.content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        requiredFields: ['title', 'content']
      });
    }
    
    // Generate slug if not provided
    const slug = postData.slug || createSlugFromTitle(postData.title);
    
    // Set default values
    const blogPost = {
      title: postData.title,
      slug: slug,
      content: postData.content,
      excerpt: postData.excerpt || postData.metaDescription || '',
      meta_description: postData.metaDescription || postData.excerpt || '',
      hero_image: postData.heroImage || postData.hero_image || postData.imageUrl || '',
      author_id: null, // Will be resolved based on username if provided
      author_name: postData.author_name || postData.authorName || 'Arzani Team',
      author_image: postData.author_image || postData.authorImage || '/figma design exports/images/default-avatar.png',
      author_bio: postData.author_bio || postData.authorBio || 'Arzani contributor',
      status: postData.status || 'Published',
      is_featured: postData.isFeatured || postData.is_featured || false,
      reading_time: postData.readingTime || postData.reading_time || 5,
      publish_date: postData.publishDate || postData.publish_date || new Date()
    };
    
    // Check for existing post with this slug
    const existingPost = await db.query(
      'SELECT id FROM blog_posts WHERE slug = $1',
      [slug]
    );
    
    if (existingPost.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'A post with this slug already exists',
        slug
      });
    }
    
    // Resolve author ID if author username is provided
    if (postData.author) {
      const authorResult = await db.query(
        'SELECT id FROM users WHERE username = $1',
        [postData.author]
      );
      
      if (authorResult.rows.length > 0) {
        blogPost.author_id = authorResult.rows[0].id;
      }
    }
    
    // Start transaction
    await db.query('BEGIN');
    
    // Insert the blog post
    const result = await db.query(
      `INSERT INTO blog_posts (
        title, slug, content, excerpt, meta_description, hero_image,
        author_id, author_name, author_image, author_bio, status, is_featured, reading_time, publish_date,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      RETURNING *`,
      [
        blogPost.title,
        blogPost.slug,
        blogPost.content,
        blogPost.excerpt,
        blogPost.meta_description,
        blogPost.hero_image,
        blogPost.author_id,
        blogPost.author_name,
        blogPost.author_image,
        blogPost.author_bio,
        blogPost.status,
        blogPost.is_featured,
        blogPost.reading_time,
        blogPost.publish_date
      ]
    );
    
    const createdPost = result.rows[0];
    
    // Handle categories and tags if provided
    if (postData.categories && Array.isArray(postData.categories)) {
      for (const categoryId of postData.categories) {
        await db.query(
          'INSERT INTO blog_post_categories (post_id, category_id) VALUES ($1, $2)',
          [createdPost.id, categoryId]
        );
      }
    }
    
    if (postData.tags && Array.isArray(postData.tags)) {
      for (const tagId of postData.tags) {
        await db.query(
          'INSERT INTO blog_post_tags (post_id, tag_id) VALUES ($1, $2)',
          [createdPost.id, tagId]
        );
      }
    }
      // Commit transaction
    await db.query('COMMIT');

    // Trigger sitemap update after successful blog post creation
    try {
      await triggerSitemapUpdate(createdPost.slug, 'n8n_create');
    } catch (sitemapError) {
      console.error('Error triggering sitemap update after blog creation:', sitemapError);
      // Don't fail the response if sitemap update fails
    }

    // Log the success
    await logWebhookActivity('create_post', {
      postId: createdPost.id,
      slug: createdPost.slug,
      title: createdPost.title
    }, true);

    return res.status(201).json({
      success: true,
      message: 'Blog post created successfully',
      post: {
        id: createdPost.id,
        title: createdPost.title,
        slug: createdPost.slug,
        url: `/blog/${createdPost.slug}`
      }
    });
  } catch (error) {
    // Rollback transaction if there was an error
    try {
      await db.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Error rolling back transaction:', rollbackError);
    }
    
    console.error('Error handling blog post creation webhook:', error);
    
    // Log the error
    await logWebhookActivity('create_post', {
      error: error.message,
      stack: error.stack
    }, false);
    
    return res.status(500).json({
      success: false,
      error: 'Error creating blog post',
      message: error.message
    });
  }
}

/**
 * Handle blog post update webhook
 */
async function handleBlogPostUpdate(postData, res) {
  console.log('Handling blog post update webhook');
  
  try {
    // For image updates we only need the slug
    if (!postData.slug) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: slug',
        requiredFields: ['slug']
      });
    }
    
    // Check if this post exists
    const existingPostResult = await db.query(
      'SELECT id FROM blog_posts WHERE slug = $1',
      [postData.slug]
    );
    
    if (existingPostResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found',
        slug: postData.slug
      });
    }
    
    const postId = existingPostResult.rows[0].id;
    
    // Prepare update fields
    const updateFields = [];
    const updateValues = [];
    let valueIndex = 1;
    
    // Hero image - this is the main update from our image generation workflow
    if (postData.hero_image) {
      updateFields.push(`hero_image = $${valueIndex}`);
      updateValues.push(postData.hero_image);
      valueIndex++;
    }
    
    // Title
    if (postData.title) {
      updateFields.push(`title = $${valueIndex}`);
      updateValues.push(postData.title);
      valueIndex++;
    }
    
    // Content
    if (postData.content) {
      updateFields.push(`content = $${valueIndex}`);
      updateValues.push(postData.content);
      valueIndex++;
    }
    
    // Excerpt
    if (postData.excerpt || postData.metaDescription) {
      updateFields.push(`excerpt = $${valueIndex}`);
      updateValues.push(postData.excerpt || postData.metaDescription);
      valueIndex++;
    }
    
    // Meta description
    if (postData.metaDescription || postData.excerpt) {
      updateFields.push(`meta_description = $${valueIndex}`);
      updateValues.push(postData.metaDescription || postData.excerpt);
      valueIndex++;
    }
    
    // Status
    if (postData.status) {
      updateFields.push(`status = $${valueIndex}`);
      updateValues.push(postData.status);
      valueIndex++;
    }
    
    // Featured flag
    if (postData.is_featured !== undefined || postData.isFeatured !== undefined) {
      updateFields.push(`is_featured = $${valueIndex}`);
      updateValues.push(postData.is_featured || postData.isFeatured || false);
      valueIndex++;
    }
    
    // Updated timestamp
    updateFields.push(`updated_at = $${valueIndex}`);
    updateValues.push(new Date());
    valueIndex++;
    
    // Add post ID as the last parameter
    updateValues.push(postId);
    
    // If there's nothing to update, return early
    if (updateFields.length === 0) {
      return res.json({
        success: true,
        message: 'No fields to update',
        postId,
        slug: postData.slug
      });
    }
    
    // Run the update query
    const result = await db.query(
      `UPDATE blog_posts SET ${updateFields.join(', ')} 
       WHERE id = $${valueIndex} RETURNING *`,
      updateValues
    );
      const updatedPost = result.rows[0];

    // Trigger sitemap update after successful blog post update
    try {
      await triggerSitemapUpdate(updatedPost.slug, 'n8n_update');
    } catch (sitemapError) {
      console.error('Error triggering sitemap update after blog update:', sitemapError);
      // Don't fail the response if sitemap update fails
    }

    // Log the success
    await logWebhookActivity('update_post', {
      postId: updatedPost.id,
      slug: updatedPost.slug,
      updatedFields: Object.keys(postData)
    }, true);
    
    return res.json({
      success: true,
      message: 'Blog post updated successfully',
      post: {
        id: updatedPost.id,
        title: updatedPost.title,
        slug: updatedPost.slug,
        hero_image: updatedPost.hero_image,
        url: `/blog/${updatedPost.slug}`
      }
    });
  } catch (error) {
    console.error('Error handling blog post update webhook:', error);
    
    // Log the error
    await logWebhookActivity('update_post', {
      error: error.message,
      stack: error.stack,
      postData: {
        slug: postData.slug,
        fields: Object.keys(postData)
      }
    }, false);
    
    return res.status(500).json({
      success: false,
      error: 'Error updating blog post',
      message: error.message
    });
  }
}

/**
 * Handle blog post deletion webhook
 */
async function handleBlogPostDeletion(postId, res) {
  // Implementation for deleting posts
  console.log('Blog post deletion not yet implemented');
  return res.json({
    success: true,
    message: 'Delete post webhook received, but not yet implemented'
  });
}

/**
 * Handle cache refresh webhook
 */
async function handleCacheRefresh(slug, res) {
  // Implementation for refreshing cache
  console.log('Cache refresh not yet implemented');
  return res.json({
    success: true,
    message: 'Cache refresh webhook received, but not yet implemented'
  });
}

/**
 * Log webhook activity to the database
 */
async function logWebhookActivity(action, data, success = true) {
  try {
    // Create webhook_logs table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(100) NOT NULL,
        data JSONB,
        success BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Insert log entry
    await db.query(
      'INSERT INTO webhook_logs (action, data, success) VALUES ($1, $2, $3)',
      [action, data, success]
    );
    
    console.log(`Webhook activity logged: ${action} (${success ? 'success' : 'failure'})`);
  } catch (error) {
    console.error('Error logging webhook activity:', error);
  }
}

/**
 * Helper function to create a slug from a title
 */
function createSlugFromTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Replace multiple hyphens with a single one
    .trim();
}

/**
 * Get recent webhook logs
 */
async function getRecentLogs(limit = 50) {
  try {
    const result = await db.query(
      'SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error fetching webhook logs:', error);
    return [];
  }
}

/**
 * Trigger an n8n workflow to publish a blog post
 */
async function publishBlogPost(post) {
  try {
    console.log('Triggering n8n workflow to publish blog post:', post.slug);
      // Trigger n8n workflow if configured
    if (config.baseUrl && config.apiKey) {
      const response = await axios.post(`${config.baseUrl}/webhook/${config.workflows.publishBlog}`, {
        action: 'publish_post',
        post: {
          id: post.id,
          title: post.title,
          slug: post.slug,
          content: post.content,
          excerpt: post.excerpt,
          author: post.author_name,
          hero_image: post.hero_image,
          categories: post.categories || [],
          tags: post.tags || [],
          status: post.status,
          publish_date: post.publish_date,
          url: `/blog/${post.slug}`
        }      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        timeout: 10000
      });
      
      console.log('n8n publish workflow triggered successfully:', response.status);
    }

    // Trigger sitemap update
    await triggerSitemapUpdate(post.slug, 'blog_publish');
    
    return { success: true };
  } catch (error) {
    console.error('Error triggering n8n publish workflow:', error);
    // Don't throw error to avoid breaking the blog creation process
    return { success: false, error: error.message };
  }
}

/**
 * Trigger an n8n workflow to update a blog post
 */
async function updateBlogPost(post) {
  try {
    console.log('Triggering n8n workflow to update blog post:', post.slug);
      // Trigger n8n workflow if configured
    if (config.baseUrl && config.apiKey) {
      const response = await axios.post(`${config.baseUrl}/webhook/${config.workflows.updateBlog}`, {
        action: 'update_post',
        post: {
          id: post.id,
          title: post.title,
          slug: post.slug,
          content: post.content,
          excerpt: post.excerpt,
          author: post.author_name,
          hero_image: post.hero_image,
          categories: post.categories || [],
          tags: post.tags || [],
          status: post.status,
          updated_at: post.updated_at,
          url: `/blog/${post.slug}`
        }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        timeout: 10000
      });
      
      console.log('n8n update workflow triggered successfully:', response.status);
    }

    // Trigger sitemap update
    await triggerSitemapUpdate(post.slug, 'blog_update');
    
    return { success: true };
  } catch (error) {
    console.error('Error triggering n8n update workflow:', error);
    // Don't throw error to avoid breaking the blog update process
    return { success: false, error: error.message };
  }
}

/**
 * Send notification about blog post publication
 */
async function sendPublicationNotification(post, channels = ['email']) {
  try {
    console.log('Sending blog post publication notification for:', post.slug);
      // Trigger n8n notification workflow if configured
    if (config.baseUrl && config.apiKey) {
      const response = await axios.post(`${config.baseUrl}/webhook/notify`, {
        action: 'send_notification',
        post: {
          title: post.title,
          slug: post.slug,
          author: post.author_name,
          url: `/blog/${post.slug}`,
          published_at: post.publish_date
        },
        channels: channels
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        timeout: 10000
      });
      
      console.log('n8n notification workflow triggered successfully:', response.status);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error sending publication notification:', error);
    // Don't throw error to avoid breaking the blog process
    return { success: false, error: error.message };
  }
}

/**
 * Trigger an n8n workflow to refresh the blog cache
 */
async function refreshBlogCache(slug) {
  try {
    console.log('Triggering n8n workflow to refresh blog cache for:', slug);
      // Trigger n8n cache refresh workflow if configured
    if (config.baseUrl && config.apiKey) {
      const response = await axios.post(`${config.baseUrl}/webhook/${config.workflows.refreshCache}`, {
        action: 'refresh_cache',
        slug: slug
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        timeout: 10000
      });
      
      console.log('n8n cache refresh workflow triggered successfully:', response.status);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error refreshing blog cache:', error);
    // Don't throw error to avoid breaking the main process
    return { success: false, error: error.message };
  }
}

/**
 * Trigger sitemap update when blog posts are created or updated
 */
async function triggerSitemapUpdate(postSlug, source = 'blog') {
  try {
    console.log(`Triggering sitemap update for ${postSlug} from ${source}`);
    
    // Use the existing sitemap webhook endpoint
    const sitemapUrl = process.env.SITE_URL || 'https://www.arzani.co.uk';
    const apiSecret = process.env.SITEMAP_API_SECRET;
    
    if (!apiSecret) {
      console.warn('SITEMAP_API_SECRET not configured, skipping sitemap update');
      return { success: false, error: 'API secret not configured' };
    }
    
    const response = await axios.post(`${sitemapUrl}/webhooks/n8n/update-sitemap`, {
      postSlug: postSlug,
      source: source,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiSecret}`
      },
      timeout: 15000
    });
    
    console.log('Sitemap update triggered successfully:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error triggering sitemap update:', error.message);
    // Log but don't throw - sitemap update failure shouldn't break blog operations
    return { success: false, error: error.message };
  }
}

export default {
  handleWebhook,
  publishBlogPost,
  updateBlogPost,
  sendPublicationNotification,
  refreshBlogCache,
  triggerSitemapUpdate,
  getRecentLogs
};