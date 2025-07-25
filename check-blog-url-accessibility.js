/**
 * Blog URL Accessibility Checker
 * This script checks which blog posts are accessible by URL
 * and identifies any URL formatting issues.
 */

import db from './db.js';

async function checkBlogUrlAccessibility() {
  console.log('Checking blog post URL accessibility...');
  
  try {
    // Get all published blog posts
    const result = await db.query(`
      SELECT 
        id, 
        title, 
        slug, 
        content_category, 
        url_path,
        status
      FROM blog_posts
      WHERE status = 'Published'
      ORDER BY id
    `);
    
    const posts = result.rows;
    console.log(`Found ${posts.length} published blog posts\n`);
    
    let accessibilityIssues = 0;
    
    // Check each post for URL accessibility issues
    for (const post of posts) {
      const issues = [];
      
      // 1. Check if content_category is missing
      if (!post.content_category) {
        issues.push('Missing content_category');
      }
      
      // 2. Check if URL path is missing or malformed
      if (!post.url_path) {
        issues.push('Missing url_path');
      } else {
        // Check if URL path follows the correct pattern
        const expectedUrlPath = `/blog/${post.content_category ? 
          post.content_category.toLowerCase().replace(/\s+/g, '-') : 
          'uncategorized'}/${post.slug}`;
          
        if (post.url_path !== expectedUrlPath) {
          issues.push(`URL path mismatch (has: ${post.url_path}, expected: ${expectedUrlPath})`);
        }
      }
      
      // Report issues if any
      if (issues.length > 0) {
        console.log(`[ID: ${post.id}] "${post.title}"`);
        issues.forEach(issue => console.log(`  - ${issue}`));
        console.log('');
        accessibilityIssues++;
      }
    }
    
    // Summary
    if (accessibilityIssues === 0) {
      console.log('✅ All blog posts have proper URL accessibility');
    } else {
      console.log(`⚠️ Found ${accessibilityIssues} posts with URL accessibility issues`);
      console.log('Run the fix-blog-post-categories.js script to fix these issues');
    }
    
  } catch (error) {
    console.error('Error checking blog URL accessibility:', error);
  } finally {
    // Exit process
    console.log('\nCheck completed');
    process.exit(0);
  }
}

// Run the check
checkBlogUrlAccessibility();
