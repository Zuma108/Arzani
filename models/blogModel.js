/**
 * Blog Model
 * Handles database interactions for programmatic blog content
 */

import db from '../db.js';
import slugify from 'slugify';

class BlogModel {
  /**
   * Get all published blog posts with pagination
   */
  async getAllPosts(page = 1, limit = 9, filters = {}) {
    try {
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT p.*, 
               COUNT(*) OVER() as total_count
        FROM blog_posts p
        WHERE p.status = 'Published'
      `;
      
      const queryParams = [];
      let paramCounter = 1;
      
      // Add category filter if provided
      if (filters.category) {
        query += `
          AND p.id IN (
            SELECT pc.post_id 
            FROM blog_post_categories pc
            JOIN blog_categories c ON pc.category_id = c.id
            WHERE c.slug = $${paramCounter}
          )
        `;
        queryParams.push(filters.category);
        paramCounter++;
      }
      
      // Add tag filter if provided
      if (filters.tag) {
        query += `
          AND p.id IN (
            SELECT pt.post_id 
            FROM blog_post_tags pt
            JOIN blog_tags t ON pt.tag_id = t.id
            WHERE t.slug = $${paramCounter}
          )
        `;
        queryParams.push(filters.tag);
        paramCounter++;
      }
      
      // Add author filter if provided
      if (filters.author) {
        query += `
          AND (p.author_name ILIKE $${paramCounter} OR p.author_name ILIKE $${paramCounter+1})
        `;
        queryParams.push(`%${filters.author}%`, filters.author);
        paramCounter += 2;
      }
      
      // Add search filter if provided
      if (filters.search) {
        query += `
          AND (
            p.title ILIKE $${paramCounter} OR
            p.content ILIKE $${paramCounter} OR
            p.excerpt ILIKE $${paramCounter}
          )
        `;
        queryParams.push(`%${filters.search}%`);
        paramCounter++;
      }
      
      // Add order and pagination
      query += `
        ORDER BY p.is_featured DESC, p.publish_date DESC
        LIMIT $${paramCounter} OFFSET $${paramCounter+1}
      `;
      queryParams.push(limit, offset);
      
      const result = await db.query(query, queryParams);
      
      // Calculate total pages
      const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
      const totalPages = Math.ceil(totalCount / limit);
      
      // Get categories for each post
      const posts = await Promise.all(result.rows.map(async post => {
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
        
        // Check if it's a pillar content
        const isPillarResult = await db.query(`
          SELECT * FROM blog_content_relationships
          WHERE supporting_post_id IS NULL AND pillar_post_id = $1
        `, [post.id]);
        
        const isPillar = isPillarResult.rows.length > 0;
        
        // Return formatted post
        return {
          ...post,
          categories: categoriesResult.rows || [],
          tags: tagsResult.rows || [],
          author,
          isPillar
        };
      }));
      
      return {
        posts,
        pagination: {
          totalCount,
          totalPages,
          currentPage: page,
          limit
        }
      };
    } catch (error) {
      console.error('Error getting all posts:', error);
      throw error;
    }
  }
  
  /**
   * Get a post by slug
   */
  async getPostBySlug(slug) {
    try {
      // Get post data
      const postResult = await db.query(`
        SELECT p.* 
        FROM blog_posts p
        WHERE p.slug = $1
      `, [slug]);
      
      if (postResult.rows.length === 0) {
        return null;
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
      
      // Check if this is a pillar post and get supporting posts
      const isPillarResult = await db.query(`
        SELECT * FROM blog_content_relationships
        WHERE pillar_post_id = $1
      `, [post.id]);
      
      const isPillar = isPillarResult.rows.length > 0;
      
      let relatedPosts = [];
      let parentPillar = null;
      
      if (isPillar) {
        // If this is a pillar post, get supporting content
        const supportingPostsResult = await db.query(`
          SELECT p.*
          FROM blog_posts p
          JOIN blog_content_relationships r ON p.id = r.supporting_post_id
          WHERE r.pillar_post_id = $1 AND p.status = 'Published'
          ORDER BY p.publish_date DESC
        `, [post.id]);
        
        relatedPosts = supportingPostsResult.rows;
      } else {
        // If this is a supporting post, get the pillar post and other supporting posts
        const pillarResult = await db.query(`
          SELECT p.*
          FROM blog_posts p
          JOIN blog_content_relationships r ON p.id = r.pillar_post_id
          WHERE r.supporting_post_id = $1 AND p.status = 'Published'
        `, [post.id]);
        
        if (pillarResult.rows.length > 0) {
          parentPillar = pillarResult.rows[0];
          
          // Get other supporting posts for the same pillar
          const siblingPostsResult = await db.query(`
            SELECT p.*
            FROM blog_posts p
            JOIN blog_content_relationships r ON p.id = r.supporting_post_id
            WHERE r.pillar_post_id = $1 
              AND p.id != $2 
              AND p.status = 'Published'
            ORDER BY p.publish_date DESC
            LIMIT 3
          `, [parentPillar.id, post.id]);
          
          relatedPosts = siblingPostsResult.rows;
        }
      }
      
      // Track view (increment view count)
      await db.query(`
        UPDATE blog_posts 
        SET view_count = view_count + 1 
        WHERE id = $1
      `, [post.id]);
      
      // Return formatted post with related content
      return {
        ...post,
        categories: categoriesResult.rows || [],
        tags: tagsResult.rows || [],
        author,
        isPillar,
        relatedPosts,
        parentPillar
      };
    } catch (error) {
      console.error('Error getting post by slug:', error);
      throw error;
    }
  }
  
  /**
   * Get all categories with post counts
   */
  async getAllCategories() {
    try {
      const result = await db.query(`
        SELECT c.*, COUNT(pc.post_id) as post_count 
        FROM blog_categories c
        LEFT JOIN blog_post_categories pc ON c.id = pc.category_id
        LEFT JOIN blog_posts p ON pc.post_id = p.id AND p.status = 'Published'
        GROUP BY c.id
        ORDER BY c.name
      `);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting all categories:', error);
      throw error;
    }
  }
  
  /**
   * Get posts by category slug
   */
  async getPostsByCategory(categorySlug, page = 1, limit = 9) {
    try {
      // Validate the category exists
      const categoryResult = await db.query(`
        SELECT * FROM blog_categories WHERE slug = $1
      `, [categorySlug]);
      
      if (categoryResult.rows.length === 0) {
        return null;
      }
      
      const category = categoryResult.rows[0];
      
      // Get posts with pagination
      return await this.getAllPosts(page, limit, { category: categorySlug });
    } catch (error) {
      console.error('Error getting posts by category:', error);
      throw error;
    }
  }
  
  /**
   * Get all pillar posts
   */
  async getPillarPosts() {
    try {
      const result = await db.query(`
        SELECT DISTINCT p.*
        FROM blog_posts p
        JOIN blog_content_relationships r ON p.id = r.pillar_post_id
        WHERE p.status = 'Published'
        ORDER BY p.publish_date DESC
      `);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting pillar posts:', error);
      throw error;
    }
  }
  
  /**
   * Create a new blog post
   */
  async createPost(postData) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Generate slug if not provided
      if (!postData.slug) {
        postData.slug = slugify(postData.title, { 
          lower: true, 
          strict: true,
          remove: /[*+~.()'"!:@]/g
        });
      }
      
      // Check for slug uniqueness
      const slugCheck = await client.query(`
        SELECT id FROM blog_posts WHERE slug = $1
      `, [postData.slug]);
      
      if (slugCheck.rows.length > 0) {
        // Slug exists, make it unique
        postData.slug = `${postData.slug}-${Date.now().toString().slice(-4)}`;
      }
      
      // Insert post
      const postResult = await client.query(`
        INSERT INTO blog_posts (
          title, slug, content, excerpt, meta_description, hero_image,
          author_name, author_image, author_bio, status, is_featured,
          reading_time, publish_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `, [
        postData.title,
        postData.slug,
        postData.content,
        postData.excerpt || postData.content.substring(0, 150) + '...',
        postData.meta_description || postData.title,
        postData.hero_image || null,
        postData.author_name || 'Arzani Team',
        postData.author_image || null,
        postData.author_bio || null,
        postData.status || 'Draft',
        postData.is_featured || false,
        postData.reading_time || 5,
        postData.publish_date || new Date()
      ]);
      
      const post = postResult.rows[0];
      
      // Add categories if provided
      if (postData.categories && postData.categories.length > 0) {
        for (const categoryId of postData.categories) {
          await client.query(`
            INSERT INTO blog_post_categories (post_id, category_id)
            VALUES ($1, $2)
          `, [post.id, categoryId]);
        }
      }
      
      // Add tags if provided
      if (postData.tags && postData.tags.length > 0) {
        for (const tagId of postData.tags) {
          await client.query(`
            INSERT INTO blog_post_tags (post_id, tag_id)
            VALUES ($1, $2)
          `, [post.id, tagId]);
        }
      }
      
      // Add relationship if this is a supporting post
      if (postData.pillar_post_id) {
        await client.query(`
          INSERT INTO blog_content_relationships (pillar_post_id, supporting_post_id)
          VALUES ($1, $2)
        `, [postData.pillar_post_id, post.id]);
      }
      
      await client.query('COMMIT');
      return post;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating post:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Update a blog post
   */
  async updatePost(postId, postData) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Build the update query dynamically
      const fields = [];
      const values = [];
      let paramCounter = 1;
      
      // Map allowed fields
      const allowedFields = [
        'title', 'content', 'excerpt', 'meta_description', 'hero_image',
        'author_name', 'author_image', 'author_bio', 'status', 'is_featured',
        'reading_time', 'publish_date'
      ];
      
      // Only include fields that are provided
      for (const field of allowedFields) {
        if (postData[field] !== undefined) {
          fields.push(`${field} = $${paramCounter}`);
          values.push(postData[field]);
          paramCounter++;
        }
      }
      
      // Always update the updated_at timestamp
      fields.push(`updated_at = $${paramCounter}`);
      values.push(new Date());
      paramCounter++;
      
      // Add the post ID as the last parameter
      values.push(postId);
      
      // Execute the update query
      const query = `
        UPDATE blog_posts
        SET ${fields.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Post not found');
      }
      
      const post = result.rows[0];
      
      // Update categories if provided
      if (postData.categories) {
        // Remove existing categories
        await client.query(`
          DELETE FROM blog_post_categories WHERE post_id = $1
        `, [postId]);
        
        // Add new categories
        for (const categoryId of postData.categories) {
          await client.query(`
            INSERT INTO blog_post_categories (post_id, category_id)
            VALUES ($1, $2)
          `, [postId, categoryId]);
        }
      }
      
      // Update tags if provided
      if (postData.tags) {
        // Remove existing tags
        await client.query(`
          DELETE FROM blog_post_tags WHERE post_id = $1
        `, [postId]);
        
        // Add new tags
        for (const tagId of postData.tags) {
          await client.query(`
            INSERT INTO blog_post_tags (post_id, tag_id)
            VALUES ($1, $2)
          `, [postId, tagId]);
        }
      }
      
      await client.query('COMMIT');
      return post;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating post:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Delete a blog post
   */
  async deletePost(postId) {
    try {
      // This will cascade to delete related records in junction tables
      const result = await db.query(`
        DELETE FROM blog_posts WHERE id = $1 RETURNING *
      `, [postId]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }
}

export default new BlogModel();
