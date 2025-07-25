/**
 * Update Existing Blog Posts with Enhanced Link Styling
 * Fixes link visibility issues in existing blog content
 */

import pool from './db.js';
import fs from 'fs/promises';

class BlogLinkEnhancer {
  
  /**
   * Enhance link styling by adding proper CSS classes
   */
  enhanceLinkStyling(content) {
    console.log('🔗 Enhancing link styling...');
    
    // Add classes to external links
    content = content.replace(
      /<a\s+href="(https?:\/\/[^"]+)"([^>]*)>/gi,
      '<a href="$1" class="external-link" target="_blank" rel="noopener noreferrer"$2>'
    );
    
    // Add classes to internal Arzani links
    content = content.replace(
      /<a\s+href="([^"]*arzani[^"]*)"([^>]*)>/gi,
      '<a href="$1" class="internal-link"$2>'
    );
    
    // Add classes to relative internal links
    content = content.replace(
      /<a\s+href="(\/[^"]*)"([^>]*)>/gi,
      '<a href="$1" class="internal-link"$2>'
    );
    
    // Ensure all remaining links have proper styling
    content = content.replace(
      /<a\s+(?!.*class=)([^>]+)>/gi,
      '<a class="content-link" $1>'
    );
    
    return content;
  }

  /**
   * Add strategic internal links to content
   */
  addInternalLinks(content, title) {
    console.log('🔗 Adding strategic internal links...');
    
    // Define internal linking opportunities
    const linkingOpportunities = [
      {
        patterns: [/\b(business for sale|businesses for sale)\b/gi],
        link: '/marketplace',
        linkText: 'business for sale',
        title: 'Browse businesses for sale on Arzani marketplace'
      },
      {
        patterns: [/\b(business valuation|company valuation|business worth)\b/gi],
        link: '/tools/valuation',
        linkText: 'business valuation',
        title: 'Get a free business valuation'
      },
      {
        patterns: [/\b(business marketplace|marketplace platform)\b/gi],
        link: '/marketplace',
        linkText: 'business marketplace',
        title: 'Explore the Arzani business marketplace'
      },
      {
        patterns: [/\b(due diligence|business due diligence)\b/gi],
        link: '/blog/business-acquisition/due-diligence-guide',
        linkText: 'due diligence',
        title: 'Complete guide to business due diligence'
      },
      {
        patterns: [/\b(business broker|business brokers)\b/gi],
        link: '/professionals/brokers',
        linkText: 'business broker',
        title: 'Find qualified business brokers'
      }
    ];
    
    let linksAdded = 0;
    
    // Apply internal linking (max 2 links per opportunity)
    linkingOpportunities.forEach(opportunity => {
      let matchCount = 0;
      
      opportunity.patterns.forEach(pattern => {
        if (matchCount < 1) { // Limit to 1 instance per pattern
          content = content.replace(pattern, (match) => {
            // Don't link if already within a link tag or if we already linked this URL
            if (matchCount < 1 && 
                !match.includes('<a ') && 
                !content.includes(`href="${opportunity.link}"`)) {
              matchCount++;
              linksAdded++;
              return `<a href="${opportunity.link}" class="internal-link" title="${opportunity.title}">${match}</a>`;
            }
            return match;
          });
        }
      });
    });
    
    console.log(`✅ Added ${linksAdded} strategic internal links`);
    return content;
  }

  /**
   * Update a specific blog post with enhanced links
   */
  async updateBlogPost(postId) {
    const client = await pool.connect();
    
    try {
      console.log(`🔄 Updating blog post ${postId}...`);
      
      // Get the current post
      const result = await client.query('SELECT * FROM blog_posts WHERE id = $1', [postId]);
      
      if (result.rows.length === 0) {
        console.log(`❌ Blog post ${postId} not found`);
        return false;
      }
      
      const post = result.rows[0];
      let enhancedContent = post.content;
      
      // Enhance existing links
      enhancedContent = this.enhanceLinkStyling(enhancedContent);
      
      // Add strategic internal links
      enhancedContent = this.addInternalLinks(enhancedContent, post.title);
      
      // Update the post
      await client.query(
        'UPDATE blog_posts SET content = $1, updated_at = NOW() WHERE id = $2',
        [enhancedContent, postId]
      );
      
      console.log(`✅ Successfully updated blog post "${post.title}"`);
      return true;
      
    } catch (error) {
      console.error('❌ Error updating blog post:', error);
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * Update all published blog posts with enhanced links
   */
  async updateAllBlogPosts() {
    try {
      console.log('🚀 Starting bulk blog post link enhancement...\n');
      
      // Get all published posts
      const result = await pool.query(`
        SELECT id, title 
        FROM blog_posts 
        WHERE status = 'Published' 
        ORDER BY created_at DESC
      `);
      
      console.log(`📊 Found ${result.rows.length} published blog posts to update\n`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const post of result.rows) {
        const success = await this.updateBlogPost(post.id);
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }
        
        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`\n🎉 Link enhancement completed!`);
      console.log(`✅ Successfully updated: ${successCount} posts`);
      console.log(`❌ Errors: ${errorCount} posts`);
      
    } catch (error) {
      console.error('❌ Error in bulk update:', error);
    }
  }

  /**
   * Update just the latest blog post for testing
   */
  async updateLatestPost() {
    try {
      console.log('🔍 Updating latest blog post for testing...\n');
      
      const result = await pool.query(`
        SELECT id, title 
        FROM blog_posts 
        WHERE status = 'Published' 
        ORDER BY created_at DESC 
        LIMIT 1
      `);
      
      if (result.rows.length === 0) {
        console.log('❌ No published blog posts found');
        return;
      }
      
      const post = result.rows[0];
      const success = await this.updateBlogPost(post.id);
      
      if (success) {
        console.log(`\n✅ Test update completed successfully!`);
        console.log(`🔗 Blog post "${post.title}" now has enhanced link styling`);
        console.log(`📍 View at: https://arzani.co.uk/blog/.../${post.id}`);
      }
      
    } catch (error) {
      console.error('❌ Error in test update:', error);
    }
  }
}

// Run the enhancer
const enhancer = new BlogLinkEnhancer();

// Get command line argument
const args = process.argv.slice(2);
const command = args[0] || 'latest';

if (command === 'all') {
  enhancer.updateAllBlogPosts().then(() => process.exit(0));
} else if (command === 'latest') {
  enhancer.updateLatestPost().then(() => process.exit(0));
} else if (!isNaN(command)) {
  enhancer.updateBlogPost(parseInt(command)).then(() => process.exit(0));
} else {
  console.log('Usage: node enhance-blog-links.js [all|latest|<post_id>]');
  process.exit(1);
}
