/**
 * Fix Blog Post Categories Script
 * This script updates blog posts with missing content_category values
 * and normalizes URL paths for consistent formatting.
 */

import db from './db.js';

async function fixBlogPostCategories() {
  console.log('Starting blog post category fix...');
  
  try {
    // Begin transaction
    await db.query('BEGIN');
    
    // 1. Update posts with NULL content_category
    console.log('Updating posts with missing categories...');
    
    // Update "Should I sell my business? -UK" with appropriate category
    const update1 = await db.query(`
      UPDATE blog_posts
      SET content_category = 'Selling A Business'
      WHERE id = 9 AND content_category IS NULL
      RETURNING id, title, content_category
    `);
    
    if (update1.rows.length > 0) {
      console.log(`Updated post ID ${update1.rows[0].id}: "${update1.rows[0].title}" with category "${update1.rows[0].content_category}"`);
    }
    
    // Update "How to Value Your UK Small Business in 2025" with appropriate category
    const update2 = await db.query(`
      UPDATE blog_posts
      SET content_category = 'Business Valuation'
      WHERE id = 3 AND content_category IS NULL
      RETURNING id, title, content_category
    `);
    
    if (update2.rows.length > 0) {
      console.log(`Updated post ID ${update2.rows[0].id}: "${update2.rows[0].title}" with category "${update2.rows[0].content_category}"`);
    }
    
    // 2. Normalize URL paths for all blog posts
    console.log('Normalizing URL paths for consistent format...');
    const updateUrls = await db.query(`
      UPDATE blog_posts
      SET url_path = CONCAT('/blog/', 
                         REPLACE(LOWER(content_category), ' ', '-'), 
                         '/', 
                         slug)
      WHERE content_category IS NOT NULL
      RETURNING id, title, url_path
    `);
    
    console.log(`Updated URL paths for ${updateUrls.rows.length} blog posts`);
    
    // 3. Set a default category for any remaining NULL content_category values
    const updateRemaining = await db.query(`
      UPDATE blog_posts
      SET content_category = 'Uncategorized'
      WHERE content_category IS NULL
      RETURNING id, title
    `);
    
    if (updateRemaining.rows.length > 0) {
      console.log(`Set default category for ${updateRemaining.rows.length} posts`);
      updateRemaining.rows.forEach(post => {
        console.log(`- Post ID ${post.id}: "${post.title}"`);
      });
    }
    
    // Commit transaction
    await db.query('COMMIT');
    console.log('Database updates committed successfully');
    
    // Print summary
    const summary = await db.query(`
      SELECT content_category, COUNT(*) as count
      FROM blog_posts
      GROUP BY content_category
      ORDER BY content_category
    `);
    
    console.log('\nBlog Post Category Summary:');
    summary.rows.forEach(row => {
      console.log(`${row.content_category}: ${row.count} posts`);
    });
    
  } catch (error) {
    // Rollback transaction on error
    await db.query('ROLLBACK');
    console.error('Error fixing blog post categories:', error);
  } finally {
    // Exit process
    console.log('Script completed');
    process.exit(0);
  }
}

// Run the fix script
fixBlogPostCategories();
