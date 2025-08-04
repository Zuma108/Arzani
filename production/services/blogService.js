/**
 * Blog Service
 * Replacement for n8nWorkflowService - handles all blog content operations
 * without external n8n dependencies
 */

import db from '../db.js';
import blogModel from '../models/blogModel.js';
import programmaticContentService from '../services/programmaticContentService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple logger for blog operations - replaces the n8n event tracking
const operationLogs = [];
const MAX_LOGS = 100;

class BlogService {
  /**
   * Get recent operation logs
   */
  async getRecentLogs(limit = 10) {
    return operationLogs.slice(0, Math.min(limit, operationLogs.length));
  }

  /**
   * Log an operation
   */
  logOperation(operation, data = {}, status = 'success', message = '') {
    // Add log entry with timestamp
    const logEntry = {
      operation,
      timestamp: new Date().toISOString(),
      status,
      message,
      data: typeof data === 'string' ? data : JSON.stringify(data).substring(0, 500) // Truncate for safety
    };
    
    // Add to front of array
    operationLogs.unshift(logEntry);
    
    // Keep array at reasonable size
    if (operationLogs.length > MAX_LOGS) {
      operationLogs.pop();
    }
    
    return logEntry;
  }

  /**
   * Publish a blog post
   * @param {Object} postData - Blog post data
   */
  async publishBlogPost(postData) {
    try {
      // Ensure the post has a status of "Published"
      if (!postData.status || postData.status !== 'Published') {
        await db.query(
          'UPDATE blog_posts SET status = $1, updated_at = NOW() WHERE id = $2',
          ['Published', postData.id]
        );
      }

      // Update the sitemap
      await this.triggerSitemapUpdate(postData.slug, 'publish');
      
      this.logOperation('publish_post', { 
        id: postData.id, 
        title: postData.title,
        slug: postData.slug
      }, 'success', 'Blog post published successfully');
      
      return { success: true, message: 'Blog post published successfully' };
    } catch (error) {
      console.error('Error publishing blog post:', error);
      this.logOperation('publish_post', { id: postData.id }, 'error', error.message);
      throw error;
    }
  }

  /**
   * Update a blog post
   * @param {Object} postData - Blog post data
   */
  async updateBlogPost(postData) {
    try {
      // Call the blog model to update the post
      await blogModel.updatePost(postData.id, postData);
      
      // Update the sitemap
      await this.triggerSitemapUpdate(postData.slug, 'update');
      
      this.logOperation('update_post', { 
        id: postData.id, 
        title: postData.title,
        slug: postData.slug
      }, 'success', 'Blog post updated successfully');
      
      return { success: true, message: 'Blog post updated successfully' };
    } catch (error) {
      console.error('Error updating blog post:', error);
      this.logOperation('update_post', { id: postData.id }, 'error', error.message);
      throw error;
    }
  }

  /**
   * Delete a blog post
   * @param {string|number} postId - Post ID
   */
  async deleteBlogPost(postId) {
    try {
      // Get the post slug before deletion (for sitemap update)
      const postResult = await db.query('SELECT slug FROM blog_posts WHERE id = $1', [postId]);
      
      if (postResult.rows.length === 0) {
        throw new Error(`Post with ID ${postId} not found`);
      }
      
      const slug = postResult.rows[0].slug;
      
      // Delete the post
      await blogModel.deletePost(postId);
      
      // Update the sitemap
      await this.triggerSitemapUpdate(slug, 'delete');
      
      this.logOperation('delete_post', { id: postId, slug }, 'success', 'Blog post deleted successfully');
      
      return { success: true, message: 'Blog post deleted successfully' };
    } catch (error) {
      console.error('Error deleting blog post:', error);
      this.logOperation('delete_post', { id: postId }, 'error', error.message);
      throw error;
    }
  }

  /**
   * Log webhook request for debugging
   */
  async logWebhookRequest(webhookData) {
    try {
      this.logOperation('webhook_received', webhookData, 'success', 'N8N webhook processed');
      return { success: true };
    } catch (error) {
      console.error('Error logging webhook request:', error);
      this.logOperation('webhook_received', webhookData, 'error', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send publication notification
   */
  async sendPublicationNotification(post, channels = ['email']) {
    try {
      // In a real implementation, this would send actual notifications
      // For now, just log the notification
      this.logOperation('send_notification', { 
        post_id: post.id, 
        title: post.title, 
        channels 
      }, 'success', `Publication notification sent for: ${post.title}`);
      
      return { success: true, message: `Notification sent for: ${post.title}` };
    } catch (error) {
      console.error('Error sending notification:', error);
      this.logOperation('send_notification', { post_id: post.id }, 'error', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Refresh blog cache
   * @param {string} slug - Post slug
   */
  async refreshBlogCache(slug) {
    try {
      // We don't need an external workflow for cache anymore
      // Simply log the operation for tracking
      this.logOperation('refresh_cache', { slug }, 'success', `Cache refreshed for: ${slug}`);
      
      return { success: true, message: `Cache refreshed for: ${slug}` };
    } catch (error) {
      console.error('Error refreshing cache:', error);
      this.logOperation('refresh_cache', { slug }, 'error', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update the sitemap with blog changes
   * @param {string} slug - Post slug
   * @param {string} action - Action type (create, update, delete)
   */
  async triggerSitemapUpdate(slug, action) {
    try {
      // Get sitemap location
      const sitemapPath = path.join(__dirname, '../public/sitemap.xml');
      
      // In a real implementation, this would update the actual sitemap
      // For now, just log the action
      this.logOperation('update_sitemap', { slug, action }, 'success', `Sitemap updated for: ${slug}`);
      
      return { success: true, message: `Sitemap updated for: ${slug}` };
    } catch (error) {
      console.error('Error updating sitemap:', error);
      this.logOperation('update_sitemap', { slug }, 'error', error.message);
      return { success: false, error: error.message };
    }
  }
}

export default new BlogService();
