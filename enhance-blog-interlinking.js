/**
 * Enhanced Blog Interlinking System
 * 
 * This script implements the advanced interlinking features for the Arzani blog system,
 * including contextual in-content linking, semantic relationship mapping, and link equity
 * distribution analysis.
 */

import pool from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory name (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Database Schema Updates for Enhanced Interlinking
 */
async function createDatabaseTables() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Create blog_post_relationships table for semantic connections
    const createRelationshipsTable = `
      CREATE TABLE IF NOT EXISTS blog_post_relationships (
        source_post_id INT REFERENCES blog_posts(id),
        target_post_id INT REFERENCES blog_posts(id),
        relationship_type VARCHAR(50), -- 'semantic', 'keyword', 'topic', 'continuation', etc.
        relationship_strength INT, -- 1-10 scale for prioritization
        shared_keywords TEXT[], -- Array of keywords shared between posts
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (source_post_id, target_post_id)
      );
    `;
    await client.query(createRelationshipsTable);
    
    // 2. Add metrics table for tracking link equity
    const createLinkMetricsTable = `
      CREATE TABLE IF NOT EXISTS blog_post_link_metrics (
        post_id INT REFERENCES blog_posts(id) PRIMARY KEY,
        inbound_link_count INT DEFAULT 0,
        outbound_link_count INT DEFAULT 0,
        link_equity_score FLOAT DEFAULT 0,
        orphan_status BOOLEAN DEFAULT FALSE,
        last_analysis TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await client.query(createLinkMetricsTable);
    
    // 3. Add columns to blog_posts table if they don't exist
    const addColumnsToPostsTable = `
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'blog_posts' AND column_name = 'content_links') THEN
          ALTER TABLE blog_posts ADD COLUMN content_links JSONB;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'blog_posts' AND column_name = 'semantic_relationships') THEN
          ALTER TABLE blog_posts ADD COLUMN semantic_relationships JSONB;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'blog_posts' AND column_name = 'user_journey_position') THEN
          ALTER TABLE blog_posts ADD COLUMN user_journey_position VARCHAR(50);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'blog_posts' AND column_name = 'next_in_journey') THEN
          ALTER TABLE blog_posts ADD COLUMN next_in_journey VARCHAR(255);
        END IF;
      END $$;
    `;
    await client.query(addColumnsToPostsTable);
    
    await client.query('COMMIT');
    console.log('Database schema updated successfully for enhanced interlinking');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating database schema:', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Process Content with Automatic Keyword Linking
 * 
 * @param {string} content - The HTML content of the blog post
 * @param {object} contentLinks - The structured link definitions
 * @returns {string} - The processed content with links injected
 */
function processContentWithLinks(content, contentLinks) {
  if (!content || !contentLinks) return content;
  
  let processedContent = content;
  
  // Process keyword links with frequency limits
  if (contentLinks.keywordLinks && Array.isArray(contentLinks.keywordLinks)) {
    contentLinks.keywordLinks.forEach(link => {
      if (!link.keyword || !link.url) return;
      
      // Escape special characters for regex
      const escapedKeyword = link.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Create regex that ignores text inside HTML tags or existing links
      const regex = new RegExp(`\\b(${escapedKeyword})\\b(?![^<]*>|[^<>]*<\\/a>)`, 'gi');
      
      let count = 0;
      const limit = link.limit || 1;
      
      processedContent = processedContent.replace(regex, (match) => {
        if (count < limit) {
          count++;
          return `<a href="${link.url}" class="keyword-link">${match}</a>`;
        }
        return match;
      });
    });
  }
  
  // Process section-specific links
  if (contentLinks.sectionLinks && Array.isArray(contentLinks.sectionLinks)) {
    contentLinks.sectionLinks.forEach(sectionLink => {
      if (!sectionLink.sectionHeading || !Array.isArray(sectionLink.links)) return;
      
      // Find the section heading in the content
      const headingRegex = new RegExp(`<h[1-6][^>]*>(.*?${sectionLink.sectionHeading}.*?)<\\/h[1-6]>`, 'i');
      const headingMatch = processedContent.match(headingRegex);
      
      if (headingMatch && headingMatch.index !== undefined) {
        // Find the end of the section (next heading or end of content)
        const sectionStart = headingMatch.index + headingMatch[0].length;
        const nextHeadingMatch = processedContent.slice(sectionStart).match(/<h[1-6][^>]*>/i);
        const sectionEnd = nextHeadingMatch 
          ? sectionStart + nextHeadingMatch.index 
          : processedContent.length;
        
        // Get the section content
        const sectionContent = processedContent.slice(sectionStart, sectionEnd);
        
        // Add links at the end of the section
        let linksHTML = '';
        sectionLink.links.forEach(link => {
          linksHTML += `<p class="section-link"><a href="${link.url}">${link.anchor}</a></p>`;
        });
        
        // Replace the section with the updated content
        processedContent = 
          processedContent.slice(0, sectionEnd) + 
          linksHTML + 
          processedContent.slice(sectionEnd);
      }
    });
  }
  
  // Process related content blocks
  if (contentLinks.relatedContentBlocks && Array.isArray(contentLinks.relatedContentBlocks)) {
    contentLinks.relatedContentBlocks.forEach(block => {
      if (!block.title || !block.position || !Array.isArray(block.links)) return;
      
      // Parse the position to find where to insert (e.g., "after:Primary H2 Section")
      const [position, targetSection] = block.position.split(':');
      
      if (position === 'after' && targetSection) {
        // Find the target section
        const headingRegex = new RegExp(`<h[1-6][^>]*>(.*?${targetSection}.*?)<\\/h[1-6]>`, 'i');
        const headingMatch = processedContent.match(headingRegex);
        
        if (headingMatch && headingMatch.index !== undefined) {
          // Find the end of the section
          const sectionStart = headingMatch.index + headingMatch[0].length;
          const nextHeadingMatch = processedContent.slice(sectionStart).match(/<h[1-6][^>]*>/i);
          const sectionEnd = nextHeadingMatch 
            ? sectionStart + nextHeadingMatch.index 
            : processedContent.length;
          
          // Create the related content block HTML
          let blockHTML = `
            <div class="related-content-block my-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
              <h4 class="text-lg font-semibold mb-4">${block.title}</h4>
              <div class="grid gap-3">
          `;
          
          block.links.forEach(link => {
            blockHTML += `
              <a href="${link.url}" class="block p-3 bg-white rounded hover:bg-gray-50 border border-gray-100 transition-colors">
                <span class="font-medium text-primary">${link.title}</span>
              </a>
            `;
          });
          
          blockHTML += `
              </div>
            </div>
          `;
          
          // Insert the block at the end of the section
          processedContent = 
            processedContent.slice(0, sectionEnd) + 
            blockHTML + 
            processedContent.slice(sectionEnd);
        }
      }
    });
  }
  
  return processedContent;
}

/**
 * Analyze Semantic Relationships Between Posts
 * This function analyzes all published posts to find semantic relationships
 */
async function analyzeSemanticRelationships() {
  const client = await pool.connect();
  
  try {
    // Get all published posts
    const postsResult = await client.query(`
      SELECT id, title, content, slug, content_category, 
             primary_keywords, semantic_keywords, longtail_keywords
      FROM blog_posts
      WHERE status = 'Published'
    `);
    
    const posts = postsResult.rows;
    console.log(`Analyzing semantic relationships for ${posts.length} posts...`);
    
    // Clear existing relationships to rebuild them
    await client.query('DELETE FROM blog_post_relationships');
    
    // Prepare batches of relationships to insert
    const relationships = [];
    
    // Compare each post with every other post
    for (let i = 0; i < posts.length; i++) {
      const sourcePost = posts[i];
      
      // Extract keywords from source post
      const sourceKeywords = [
        ...(sourcePost.primary_keywords || []),
        ...(sourcePost.semantic_keywords || []),
        ...(sourcePost.longtail_keywords || [])
      ];
      
      for (let j = 0; j < posts.length; j++) {
        // Skip comparing a post with itself
        if (i === j) continue;
        
        const targetPost = posts[j];
        
        // Extract keywords from target post
        const targetKeywords = [
          ...(targetPost.primary_keywords || []),
          ...(targetPost.semantic_keywords || []),
          ...(targetPost.longtail_keywords || [])
        ];
        
        // Find shared keywords
        const sharedKeywords = sourceKeywords.filter(keyword => 
          targetKeywords.includes(keyword)
        );
        
        // Only create relationship if there are shared keywords
        if (sharedKeywords.length > 0) {
          // Calculate relationship strength (1-10) based on number of shared keywords
          const strength = Math.min(10, Math.ceil(sharedKeywords.length / 2));
          
          // Determine relationship type based on categories
          let relationshipType = 'semantic';
          if (sourcePost.content_category === targetPost.content_category) {
            relationshipType = 'category';
          }
          
          relationships.push({
            source_id: sourcePost.id,
            target_id: targetPost.id,
            type: relationshipType,
            strength,
            shared_keywords: sharedKeywords
          });
        }
      }
    }
    
    // Insert all relationships in batches
    if (relationships.length > 0) {
      console.log(`Inserting ${relationships.length} semantic relationships...`);
      
      for (const rel of relationships) {
        await client.query(`
          INSERT INTO blog_post_relationships 
            (source_post_id, target_post_id, relationship_type, relationship_strength, shared_keywords)
          VALUES 
            ($1, $2, $3, $4, $5)
        `, [rel.source_id, rel.target_id, rel.type, rel.strength, rel.shared_keywords]);
      }
      
      console.log('Semantic relationships inserted successfully');
    }
    
  } catch (err) {
    console.error('Error analyzing semantic relationships:', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Analyze Link Equity Distribution
 * This function analyzes all blog posts to calculate link equity metrics
 */
async function analyzeLinkEquity() {
  const client = await pool.connect();
  
  try {
    // Get all published posts
    const postsResult = await client.query(`
      SELECT id, title, content, slug 
      FROM blog_posts 
      WHERE status = 'Published'
    `);
    
    const posts = postsResult.rows;
    console.log(`Analyzing link equity for ${posts.length} posts...`);
    
    // Clear existing metrics
    await client.query('DELETE FROM blog_post_link_metrics');
    
    // Calculate inbound and outbound link counts
    for (const post of posts) {
      // Count outbound links in content
      const outboundLinkCount = (post.content.match(/<a\s+(?:[^>]*?\s+)?href=['"](\/blog\/[^'"]*)['"]/g) || []).length;
      
      // Count inbound links from all other posts
      const inboundResult = await client.query(`
        SELECT COUNT(*) as inbound_count 
        FROM blog_posts 
        WHERE content LIKE '%/blog/${post.content_category}/${post.slug}%' 
          AND id != $1
      `, [post.id]);
      
      const inboundLinkCount = parseInt(inboundResult.rows[0].inbound_count);
      
      // Calculate link equity score (simplified PageRank-like)
      // 1 point for each inbound link, weighted by the source post's outbound links
      const linkEquityScore = inboundLinkCount > 0 ? inboundLinkCount * (1 + Math.log(inboundLinkCount)) : 0;
      
      // Determine orphan status (posts with no inbound links)
      const orphanStatus = inboundLinkCount === 0;
      
      // Insert metrics
      await client.query(`
        INSERT INTO blog_post_link_metrics 
          (post_id, inbound_link_count, outbound_link_count, link_equity_score, orphan_status)
        VALUES 
          ($1, $2, $3, $4, $5)
      `, [post.id, inboundLinkCount, outboundLinkCount, linkEquityScore, orphanStatus]);
    }
    
    console.log('Link equity analysis completed successfully');
    
    // Generate a summary report of orphaned content
    const orphanedResult = await client.query(`
      SELECT p.id, p.title, p.slug, p.content_category
      FROM blog_post_link_metrics m
      JOIN blog_posts p ON m.post_id = p.id
      WHERE m.orphan_status = true
      ORDER BY p.publish_date DESC
    `);
    
    if (orphanedResult.rows.length > 0) {
      console.log(`\nFound ${orphanedResult.rows.length} orphaned posts:`);
      orphanedResult.rows.forEach(post => {
        console.log(`- ${post.title} (ID: ${post.id}, Path: /blog/${post.content_category}/${post.slug})`);
      });
    }
    
  } catch (err) {
    console.error('Error analyzing link equity:', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Main function to run all interlinking enhancements
 */
async function enhanceInterlinking() {
  try {
    // 1. Set up database schema
    await createDatabaseTables();
    
    // 2. Analyze semantic relationships
    await analyzeSemanticRelationships();
    
    // 3. Analyze link equity
    await analyzeLinkEquity();
    
    console.log('Interlinking enhancement completed successfully');
  } catch (err) {
    console.error('Error enhancing interlinking:', err);
  }
}

// Run the enhancement process
enhanceInterlinking();

// Export functions for use in other modules
export {
  processContentWithLinks,
  analyzeSemanticRelationships,
  analyzeLinkEquity
};
