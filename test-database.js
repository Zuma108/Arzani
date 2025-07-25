/**
 * Quick Database Test for Blog Automation
 * Tests database connectivity and blog schema
 */

import pool from './db.js';
import dotenv from 'dotenv';

dotenv.config();

async function testDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testing database connectivity...');
    
    // Test basic connection
    await client.query('SELECT 1');
    console.log('✅ Database connection successful');
    
    // Check blog tables
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE 'blog_%' 
      AND table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n📊 Blog tables found:');
    tableCheck.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });
    
    // Check blog posts count
    const postCount = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'Published' THEN 1 END) as published,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as this_week
      FROM blog_posts
    `);
    
    const counts = postCount.rows[0];
    console.log('\n📈 Blog Statistics:');
    console.log(`   Total posts: ${counts.total}`);
    console.log(`   Published: ${counts.published}`);
    console.log(`   This week: ${counts.this_week}`);
    
    // Check required columns for automation
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'blog_posts' 
      AND column_name IN (
        'semantic_relationships', 'content_links', 'user_journey_position',
        'target_keyword', 'seo_keywords', 'is_pillar', 'content_category'
      )
      ORDER BY column_name
    `);
    
    console.log('\n🔧 Required automation columns:');
    const requiredCols = ['semantic_relationships', 'content_links', 'user_journey_position', 'target_keyword', 'seo_keywords', 'is_pillar', 'content_category'];
    const existingCols = columnCheck.rows.map(row => row.column_name);
    
    requiredCols.forEach(col => {
      if (existingCols.includes(col)) {
        console.log(`   ✅ ${col}`);
      } else {
        console.log(`   ❌ ${col} (missing)`);
      }
    });
    
    // Check categories distribution
    const categoryStats = await client.query(`
      SELECT 
        COALESCE(category, 'No Category') as category,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'Published' THEN 1 END) as published
      FROM blog_posts 
      GROUP BY category 
      ORDER BY count DESC
    `);
    
    console.log('\n📊 Category Distribution:');
    categoryStats.rows.forEach(row => {
      console.log(`   ${row.category}: ${row.published}/${row.count} published`);
    });
    
    // Test interlinking tables
    const linkCheck = await client.query(`
      SELECT COUNT(*) as relationships 
      FROM blog_post_relationships
    `);
    
    console.log(`\n🔗 Interlinking relationships: ${linkCheck.rows[0].relationships}`);
    
    console.log('\n✅ Database ready for automated blog generation!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    client.release();
  }
}

testDatabase().then(() => process.exit(0)).catch(console.error);
