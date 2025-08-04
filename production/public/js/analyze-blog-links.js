/**
 * Blog Link Analysis Tool
 * Analyzes blog post content for link visibility issues
 */

import pool from '../../db.js';

async function analyzeBlogLinks() {
  try {
    console.log('🔍 Analyzing blog post links...\n');
    
    // Get latest published blog post
    const result = await pool.query(`
      SELECT title, content, slug, url_path 
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
    console.log('📝 Analyzing Post:', post.title);
    console.log('🔗 Slug:', post.slug);
    console.log('📍 URL Path:', post.url_path);
    console.log('\n--- Content Preview (first 500 chars) ---');
    console.log(post.content.substring(0, 500));
    
    console.log('\n--- Link Analysis ---');
    
    // Find all links in content
    const links = post.content.match(/<a[^>]*>.*?<\/a>/gi);
    
    if (links) {
      console.log(`✅ Found ${links.length} links:`);
      links.forEach((link, i) => {
        console.log(`${i + 1}. ${link}`);
        
        // Check if link has proper styling classes
        if (!link.includes('class=')) {
          console.log('   ⚠️ Missing CSS classes');
        }
        
        // Check if link has href
        if (!link.includes('href=')) {
          console.log('   ❌ Missing href attribute');
        }
      });
    } else {
      console.log('❌ No links found in content');
    }
    
    // Check for potential internal links
    const internalLinkPatterns = [
      /business[\s-]for[\s-]sale/gi,
      /marketplace/gi,
      /arzani/gi,
      /category/gi,
      /blog/gi
    ];
    
    console.log('\n--- Internal Link Opportunities ---');
    internalLinkPatterns.forEach((pattern, i) => {
      const matches = post.content.match(pattern);
      if (matches) {
        console.log(`${i + 1}. "${pattern.source}" found ${matches.length} times - could be linked`);
      }
    });
    
    // Check for typical link text that should be clickable
    const linkableText = post.content.match(/\b(click here|read more|learn more|find out|discover|explore|visit|view|see our|check out)\b/gi);
    if (linkableText) {
      console.log('\n--- Potentially Unlinked Clickable Text ---');
      linkableText.forEach((text, i) => {
        console.log(`${i + 1}. "${text}" - should probably be a link`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error analyzing blog links:', error);
  } finally {
    process.exit(0);
  }
}

analyzeBlogLinks();
