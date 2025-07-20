/**
 * Verify Programmatic Blog Content Relationships
 * 
 * This script verifies that the programmatic blog content relationships
 * have been correctly set up in the database. It checks for pillar posts,
 * supporting posts, and their relationships.
 */

import db from './db.js';

async function verifyBlogContentStructure() {
  console.log('Verifying programmatic blog content structure...');
  
  try {
    // 1. Verify pillar posts
    const pillarPostsQuery = `
      SELECT id, title, COALESCE(category, content_category) as category, 
        url_path, is_pillar, seo_title, seo_description
      FROM blog_posts
      WHERE is_pillar = TRUE
      ORDER BY COALESCE(category, content_category), title;
    `;
    
    const pillarPosts = await db.query(pillarPostsQuery);
    
    console.log(`\n=== PILLAR POSTS (${pillarPosts.rows.length}) ===`);
    if (pillarPosts.rows.length === 0) {
      console.log('No pillar posts found. Please run populate-sample-blog-content.js first.');
    } else {
      pillarPosts.rows.forEach(post => {
        console.log(`- ${post.title} (${post.category})`);
        console.log(`  URL: ${post.url_path}`);
        console.log(`  SEO Title: ${post.seo_title}`);
        console.log(`  SEO Desc: ${post.seo_description.substring(0, 50)}...`);
      });
    }
    
    // 2. Check content relationships
    const relationshipsQuery = `
      SELECT 
        r.pillar_post_id, 
        p1.title AS pillar_title,
        COALESCE(p1.category, p1.content_category) as category,
        r.supporting_post_id, 
        p2.title AS supporting_title,
        r.relationship_type
      FROM blog_content_relationships r
      JOIN blog_posts p1 ON r.pillar_post_id = p1.id
      JOIN blog_posts p2 ON r.supporting_post_id = p2.id
      ORDER BY COALESCE(p1.category, p1.content_category), p1.title, p2.title;
    `;
    
    const relationships = await db.query(relationshipsQuery);
    
    console.log(`\n=== CONTENT RELATIONSHIPS (${relationships.rows.length}) ===`);
    if (relationships.rows.length === 0) {
      console.log('No content relationships found.');
    } else {
      // Group by pillar post
      const pillarMap = {};
      
      relationships.rows.forEach(rel => {
        if (!pillarMap[rel.pillar_post_id]) {
          pillarMap[rel.pillar_post_id] = {
            title: rel.pillar_title,
            category: rel.category,
            supportingPosts: []
          };
        }
        
        pillarMap[rel.pillar_post_id].supportingPosts.push({
          title: rel.supporting_title,
          relationship: rel.relationship_type
        });
      });
      
      // Display pillar posts and their supporting content
      Object.values(pillarMap).forEach(pillar => {
        console.log(`\nPillar: ${pillar.title} (${pillar.category})`);
        console.log('Supporting posts:');
        pillar.supportingPosts.forEach((post, index) => {
          console.log(`  ${index + 1}. ${post.title} (${post.relationship})`);
        });
      });
    }
    
    // 3. Verify URL structure
    console.log('\n=== URL STRUCTURE VERIFICATION ===');
    const urlStructureQuery = `
      SELECT 
        id, title, COALESCE(category, content_category) as category, url_path, 
        is_pillar
      FROM blog_posts
      ORDER BY COALESCE(category, content_category), is_pillar DESC, title
      LIMIT 10;
    `;
    
    const urlStructure = await db.query(urlStructureQuery);
    
    console.log('Sample URL paths (first 10):');
    urlStructure.rows.forEach(post => {
      console.log(`- [${post.is_pillar ? 'PILLAR' : 'SUPPORT'}] ${post.url_path} (${post.title})`);
    });
    
    // 4. Verify SEO fields
    console.log('\n=== SEO FIELDS VERIFICATION ===');
    const seoFieldsQuery = `
      SELECT 
        COUNT(*) as total_posts,
        COUNT(seo_title) as has_seo_title,
        COUNT(seo_description) as has_seo_description,
        COUNT(COALESCE(keywords, seo_keywords)) as has_keywords
      FROM blog_posts;
    `;
    
    const seoFields = await db.query(seoFieldsQuery);
    const seoStats = seoFields.rows[0];
    
    console.log(`Total posts: ${seoStats.total_posts}`);
    console.log(`Posts with SEO title: ${seoStats.has_seo_title} (${Math.round(seoStats.has_seo_title/seoStats.total_posts*100)}%)`);
    console.log(`Posts with SEO description: ${seoStats.has_seo_description} (${Math.round(seoStats.has_seo_description/seoStats.total_posts*100)}%)`);
    console.log(`Posts with keywords: ${seoStats.has_keywords} (${Math.round(seoStats.has_keywords/seoStats.total_posts*100)}%)`);
    
    console.log('\nVerification completed successfully!');
    
  } catch (error) {
    console.error('Error verifying blog content structure:', error);
  } finally {
    await db.end();
  }
}

// Run the verification
verifyBlogContentStructure();
