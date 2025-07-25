#!/usr/bin/env node

/**
 * Test script to verify HTML blog generation works properly
 * This will generate a test blog post and verify the HTML formatting
 */

import AutomatedBlogGenerator from './services/automated-blog-generator.js';
import pool from './db.js';

async function testHtmlBlogGeneration() {
  console.log('🧪 Testing HTML Blog Generation...\n');
  
  const generator = new AutomatedBlogGenerator();
  
  // Test post info
  const testPostInfo = {
    title: 'Test HTML Formatting in Business Blogs',
    category: 'Technology',
    contentType: 'cornerstone',
    slug: 'test-html-formatting-business-blogs'
  };
  
  try {
    // Generate content
    console.log('🤖 Generating test content...');
    const result = await generator.generateBlogContent(testPostInfo);
    
    console.log('\n📊 Generation Results:');
    console.log(`- Word Count: ${result.wordCount}`);
    console.log(`- Reading Time: ${result.readingTime} minutes`);
    console.log(`- Meta Description: ${result.metaDescription.substring(0, 100)}...`);
    
    console.log('\n🔍 HTML Content Analysis:');
    
    // Check for proper HTML tags
    const htmlChecks = {
      'H2 headings': (result.content.match(/<h2>/g) || []).length,
      'H3 headings': (result.content.match(/<h3>/g) || []).length,
      'Paragraphs': (result.content.match(/<p>/g) || []).length,
      'Lists': (result.content.match(/<ul>|<ol>/g) || []).length,
      'List items': (result.content.match(/<li>/g) || []).length,
      'Links': (result.content.match(/<a href=/g) || []).length,
      'Strong tags': (result.content.match(/<strong>/g) || []).length
    };
    
    Object.entries(htmlChecks).forEach(([tag, count]) => {
      console.log(`- ${tag}: ${count}`);
    });
    
    // Check for markdown remnants (should be 0)
    const markdownChecks = {
      'Markdown headers (##)': (result.content.match(/^##/gm) || []).length,
      'Markdown bold (**)': (result.content.match(/\*\*/g) || []).length,
      'Markdown lists (-)': (result.content.match(/^-\s/gm) || []).length
    };
    
    console.log('\n⚠️ Markdown Remnants (should all be 0):');
    Object.entries(markdownChecks).forEach(([type, count]) => {
      console.log(`- ${type}: ${count}`);
    });
    
    // Show first 500 characters of content
    console.log('\n📝 Content Preview:');
    console.log(result.content.substring(0, 500) + '...\n');
    
    // Optional: Save to database for testing
    const saveToDb = process.argv.includes('--save');
    if (saveToDb) {
      console.log('💾 Saving test post to database...');
      
      const insertQuery = `
        INSERT INTO blog_posts (
          title, slug, content, excerpt, category, 
          status, meta_description, reading_time, 
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING id
      `;
      
      const excerpt = result.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...';
      
      const dbResult = await pool.query(insertQuery, [
        testPostInfo.title,
        testPostInfo.slug,
        result.content,
        excerpt,
        testPostInfo.category,
        'published',
        result.metaDescription,
        result.readingTime
      ]);
      
      console.log(`✅ Test post saved with ID: ${dbResult.rows[0].id}`);
      console.log(`🔗 View at: http://localhost:3000/blog/${testPostInfo.slug}`);
    } else {
      console.log('💡 Add --save flag to save test post to database');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testHtmlBlogGeneration();
