#!/usr/bin/env node

/**
 * Fix Blog Domain Links Script
 * 
 * This script fixes incorrect arzani.com links in blog posts
 * to use the correct arzani.co.uk domain.
 */

import pool from './db.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function fixBlogDomainLinks() {
  console.log('🔧 Starting blog domain link fix...');
  
  try {
    // Find all blog posts with incorrect domain
    const findQuery = `
      SELECT id, title, content 
      FROM blog_posts 
      WHERE content LIKE '%arzani.com%'
      ORDER BY created_at DESC;
    `;
    
    const result = await pool.query(findQuery);
    console.log(`📊 Found ${result.rows.length} blog posts with incorrect domain links`);
    
    if (result.rows.length === 0) {
      console.log('✅ No blog posts need domain fixes');
      return;
    }
    
    let fixedCount = 0;
    
    for (const post of result.rows) {
      console.log(`🔄 Processing post #${post.id}: "${post.title}"`);
      
      // Fix the domain links in content
      let fixedContent = post.content
        .replace(/href="https?:\/\/(?:www\.)?arzani\.com/g, 'href="https://www.arzani.co.uk')
        .replace(/arzani\.com/g, 'arzani.co.uk');
      
      // Count changes made
      const originalComCount = (post.content.match(/arzani\.com/g) || []).length;
      const fixedComCount = (fixedContent.match(/arzani\.com/g) || []).length;
      const changesCount = originalComCount - fixedComCount;
      
      if (changesCount > 0) {
        // Update the blog post
        const updateQuery = `
          UPDATE blog_posts 
          SET content = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2;
        `;
        
        await pool.query(updateQuery, [fixedContent, post.id]);
        console.log(`✅ Fixed ${changesCount} domain links in post #${post.id}`);
        fixedCount++;
      } else {
        console.log(`ℹ️ No changes needed for post #${post.id}`);
      }
    }
    
    console.log(`\n🎉 Domain link fix completed successfully!`);
    console.log(`📊 Posts processed: ${result.rows.length}`);
    console.log(`✅ Posts fixed: ${fixedCount}`);
    
    // Verify the fix
    const verifyQuery = `
      SELECT COUNT(*) as remaining_count 
      FROM blog_posts 
      WHERE content LIKE '%arzani.com%';
    `;
    
    const verifyResult = await pool.query(verifyQuery);
    console.log(`🔍 Remaining posts with arzani.com: ${verifyResult.rows[0].remaining_count}`);
    
    if (verifyResult.rows[0].remaining_count === 0) {
      console.log('✅ All domain links have been successfully fixed!');
    } else {
      console.log('⚠️ Some posts may still have arzani.com links - manual review recommended');
    }
    
  } catch (error) {
    console.error('❌ Error fixing blog domain links:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the fix if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixBlogDomainLinks()
    .then(() => {
      console.log('🏁 Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export default fixBlogDomainLinks;
