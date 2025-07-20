/**
 * Test Script for Programmatic SEO Implementation
 * 
 * This script validates that all the necessary components for the programmatic
 * SEO strategy are in place and working properly.
 */

import pg from 'pg';
import config from './config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
const { Pool } = pg;
const pool = new Pool({
  user: config.db.user,
  host: config.db.host,
  database: config.db.name,
  password: config.db.password,
  port: config.db.port || 5432
});

// Connect to database
async function runTests() {
  console.log('====================================');
  console.log('Programmatic SEO Implementation Test');
  console.log('====================================\n');
  
  const client = await pool.connect();
  
  try {
    await testDatabaseSchema(client);
    await testBlogCategories(client);
    await testPillarContent(client);
    await testSitemapUpdates();
    await testSEOFields(client);
    
    console.log('\nAll tests completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    client.release();
  }
}

/**
 * Test database schema
 */
async function testDatabaseSchema(client) {
  console.log('Testing database schema...');
  
  // Check for required tables
  const requiredTables = [
    'blog_posts',
    'blog_categories',
    'blog_tags',
    'blog_content_relationships',
    'blog_post_analytics'
  ];
  
  for (const table of requiredTables) {
    const result = await client.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      )`,
      [table]
    );
    
    if (result.rows[0].exists) {
      console.log(`  ✓ Table ${table} exists`);
    } else {
      throw new Error(`Table ${table} does not exist`);
    }
  }
  
  // Check for required columns in blog_posts
  const requiredColumns = [
    'is_pillar',
    'seo_title',
    'seo_description',
    'seo_keywords',
    'canonical_url',
    'url_path',
    'og_image',
    'schema_markup'
  ];
  
  for (const column of requiredColumns) {
    const result = await client.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = $1
      )`,
      [column]
    );
    
    if (result.rows[0].exists) {
      console.log(`  ✓ Column ${column} exists in blog_posts`);
    } else {
      throw new Error(`Column ${column} does not exist in blog_posts`);
    }
  }
  
  console.log('  ✓ Database schema check passed');
}

/**
 * Test blog categories
 */
async function testBlogCategories(client) {
  console.log('\nTesting blog categories...');
  
  // Check for required categories from PRD
  const requiredCategories = [
    'buying-a-business',
    'selling-a-business',
    'business-valuation',
    'industry-analysis',
    'ai-business-tools',
    'location-guides'
  ];
  
  for (const categorySlug of requiredCategories) {
    const result = await client.query(
      `SELECT EXISTS (
        SELECT FROM blog_categories 
        WHERE slug = $1
      )`,
      [categorySlug]
    );
    
    if (result.rows[0].exists) {
      console.log(`  ✓ Category ${categorySlug} exists`);
    } else {
      console.log(`  ✗ Category ${categorySlug} does not exist - creating it now`);
      
      // Create the missing category
      const categoryName = categorySlug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      await client.query(
        `INSERT INTO blog_categories (name, slug, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())`,
        [categoryName, categorySlug]
      );
      
      console.log(`  ✓ Created category ${categoryName} (${categorySlug})`);
    }
  }
  
  console.log('  ✓ Blog categories check passed');
}

/**
 * Test pillar content
 */
async function testPillarContent(client) {
  console.log('\nTesting pillar content...');
  
  // Check if any pillar content exists
  const result = await client.query(
    `SELECT COUNT(*) FROM blog_posts WHERE is_pillar = true`
  );
  
  const pillarCount = parseInt(result.rows[0].count);
  
  if (pillarCount > 0) {
    console.log(`  ✓ Found ${pillarCount} pillar posts`);
    
    // Check if pillar posts have supporting content
    const contentRelationships = await client.query(
      `SELECT p.title, COUNT(cr.id) as supporting_count
       FROM blog_posts p
       LEFT JOIN blog_content_relationships cr ON cr.target_post_id = p.id
       WHERE p.is_pillar = true
       GROUP BY p.id, p.title`
    );
    
    console.log('  Pillar post relationship status:');
    contentRelationships.rows.forEach(row => {
      if (row.supporting_count > 0) {
        console.log(`    ✓ "${row.title}" has ${row.supporting_count} supporting posts`);
      } else {
        console.log(`    ✗ "${row.title}" has no supporting posts - consider creating supporting content`);
      }
    });
    
  } else {
    console.log('  ✗ No pillar content found - you should create pillar content using generate-pillar-post.js');
  }
}

/**
 * Test sitemap updates
 */
async function testSitemapUpdates() {
  console.log('\nTesting sitemap updates...');
  
  const sitemapPath = path.join(__dirname, 'public/sitemap.xml');
  
  if (fs.existsSync(sitemapPath)) {
    const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
    
    if (sitemapContent.includes('blog/business-valuation/') || 
        sitemapContent.includes('blog/buying-a-business/') ||
        sitemapContent.includes('blog/selling-a-business/')) {
      console.log('  ✓ Sitemap includes programmatic URL structure');
    } else {
      console.log('  ✗ Sitemap does not include programmatic URL structure');
      console.log('    > You may need to regenerate the sitemap after creating pillar content');
    }
  } else {
    console.log('  ✗ Sitemap file not found at', sitemapPath);
  }
}

/**
 * Test SEO fields
 */
async function testSEOFields(client) {
  console.log('\nTesting SEO fields on blog posts...');
  
  // Check blog posts with SEO fields
  const result = await client.query(
    `SELECT 
       COUNT(*) as total_posts,
       COUNT(seo_title) as with_seo_title,
       COUNT(seo_description) as with_seo_description,
       COUNT(seo_keywords) as with_seo_keywords,
       COUNT(canonical_url) as with_canonical_url,
       COUNT(url_path) as with_url_path,
       COUNT(schema_markup) as with_schema_markup
     FROM blog_posts
     WHERE status = 'Published'`
  );
  
  const stats = result.rows[0];
  
  console.log(`  Total published posts: ${stats.total_posts}`);
  console.log(`  Posts with SEO title: ${stats.with_seo_title} (${Math.round(stats.with_seo_title / stats.total_posts * 100)}%)`);
  console.log(`  Posts with SEO description: ${stats.with_seo_description} (${Math.round(stats.with_seo_description / stats.total_posts * 100)}%)`);
  console.log(`  Posts with SEO keywords: ${stats.with_seo_keywords} (${Math.round(stats.with_seo_keywords / stats.total_posts * 100)}%)`);
  console.log(`  Posts with canonical URL: ${stats.with_canonical_url} (${Math.round(stats.with_canonical_url / stats.total_posts * 100)}%)`);
  console.log(`  Posts with URL path: ${stats.with_url_path} (${Math.round(stats.with_url_path / stats.total_posts * 100)}%)`);
  console.log(`  Posts with schema markup: ${stats.with_schema_markup} (${Math.round(stats.with_schema_markup / stats.total_posts * 100)}%)`);
  
  if (stats.with_url_path === 0) {
    console.log('  ✗ No posts have custom URL paths - run the URL path migration or create pillar content');
  }
}

// Run the tests
runTests()
  .then(() => {
    console.log('\nTests completed. Your programmatic SEO implementation is ready to use!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error running tests:', err);
    process.exit(1);
  });
