/**
 * Run Schema Validation and Data Population
 * 
 * This script validates the blog schema and populates the database with sample blog content
 */

import db from './db.js';
import { v4 as uuidv4 } from 'uuid';
import slugify from 'slugify';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample categories
const CATEGORIES = [
  'Business Growth',
  'Marketing Strategies',
  'Sales Techniques',
  'Customer Insights',
  'Market Trends',
  'Industry Solutions'
];

// Sample authors
const AUTHORS = [
  { name: 'Jane Smith', bio: 'Marketing expert with 10+ years of experience', avatar: '/images/authors/jane-smith.jpg' },
  { name: 'John Doe', bio: 'Business growth strategist and consultant', avatar: '/images/authors/john-doe.jpg' },
  { name: 'Sarah Johnson', bio: 'Sales and customer experience specialist', avatar: '/images/authors/sarah-johnson.jpg' },
];

// Helper function to get a random author
const getRandomAuthor = () => {
  return AUTHORS[Math.floor(Math.random() * AUTHORS.length)];
};

// Sample content generation (simple version)
const generateSampleContent = (title, category) => {
  return `
# ${title}

## Introduction
This is a sample introduction for the article about ${category}. In a real implementation, this would be much more extensive and valuable content.

## Main Points
- Key point 1 about ${category}
- Key point 2 about ${category}
- Key point 3 about ${category}

## Conclusion
This is a sample conclusion for the article about ${category}.
`;
};

// Helper function to generate a URL path
const generateUrlPath = (title, category) => {
  const categorySlug = slugify(category, { lower: true });
  const titleSlug = slugify(title, { lower: true });
  return `/${categorySlug}/${titleSlug}`;
};

async function validateAndPopulateDatabase() {
  try {
    console.log('Starting database validation and sample content population...');
    
    // First run the migration to ensure tables exist
    await runMigrations();
    
    // Then insert sample content
    await insertSampleContent();
    
    console.log('Database validation and population completed successfully!');
  } catch (error) {
    console.error('Error in database validation and population:', error);
  } finally {
    await db.end();
  }
}

async function runMigrations() {
  console.log('Running necessary database migrations...');
  
  // Create blog_posts table if it doesn't exist
  await db.query(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id VARCHAR(255) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      excerpt TEXT,
      summary TEXT,
      content_category VARCHAR(255),
      category VARCHAR(255),
      url_path VARCHAR(255),
      publish_date TIMESTAMP WITH TIME ZONE,
      published_date TIMESTAMP WITH TIME ZONE,
      author_name VARCHAR(255),
      author_bio TEXT,
      author_image VARCHAR(255),
      author_avatar VARCHAR(255),
      is_pillar BOOLEAN DEFAULT FALSE,
      seo_title VARCHAR(255),
      seo_description TEXT,
      seo_keywords TEXT,
      keywords TEXT,
      reading_time INTEGER,
      read_time INTEGER,
      status VARCHAR(50) DEFAULT 'published',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
  
  // Create blog_content_relationships table if it doesn't exist
  await db.query(`
    CREATE TABLE IF NOT EXISTS blog_content_relationships (
      id SERIAL PRIMARY KEY,
      pillar_post_id VARCHAR(255) NOT NULL,
      supporting_post_id VARCHAR(255) NOT NULL,
      relationship_type VARCHAR(50) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(pillar_post_id, supporting_post_id)
    );
  `);
  
  console.log('Database migrations completed successfully.');
}

async function insertSampleContent() {
  console.log('Inserting sample blog content...');
  
  // Sample pillar posts (one for each category)
  for (const category of CATEGORIES) {
    // Create a pillar post for this category
    const pillarPost = {
      title: `Complete Guide to ${category}`,
      category: category,
      excerpt: `A comprehensive guide covering all aspects of ${category.toLowerCase()} for businesses of all sizes.`,
      seo_title: `Ultimate ${category} Guide: Strategies and Best Practices | YourBrand`,
      seo_description: `Discover proven ${category.toLowerCase()} strategies. Our comprehensive guide covers everything from fundamentals to advanced tactics.`,
      seo_keywords: `${category.toLowerCase()}, ${category.toLowerCase()} strategies, ${category.toLowerCase()} best practices`,
      readTime: 15,
    };
    
    // Insert the pillar post
    const pillarPostId = await insertPost(pillarPost, true);
    
    // Create 3 supporting posts for this pillar post
    for (let i = 1; i <= 3; i++) {
      const supportingPost = {
        title: `${i}. Key Strategy for ${category}`,
        category: category,
        excerpt: `An in-depth look at a specific aspect of ${category.toLowerCase()}.`,
        seo_title: `Key ${category} Strategy #${i} | YourBrand`,
        seo_description: `Learn about this essential strategy for ${category.toLowerCase()} success. Implement proven tactics to improve your business outcomes.`,
        seo_keywords: `${category.toLowerCase()} strategy, ${category.toLowerCase()} tactic ${i}`,
        readTime: 8 + i,
      };
      
      // Insert the supporting post
      const supportingPostId = await insertPost(supportingPost, false);
      
      // Create relationship between pillar and supporting post
      await createRelationship(pillarPostId, supportingPostId);
    }
    
    console.log(`Created pillar post for ${category} with 3 supporting posts`);
  }
  
  console.log('Sample content insertion completed successfully.');
}

async function insertPost(post, isPillar) {
  const author = getRandomAuthor();
  const urlPath = generateUrlPath(post.title, post.category);
  const postId = uuidv4();
  const content = generateSampleContent(post.title, post.category);
  const now = new Date();
  
  const query = `
    INSERT INTO blog_posts (
      id, title, content, excerpt, summary, content_category, category, 
      url_path, publish_date, published_date, author_name, author_bio, 
      author_image, author_avatar, is_pillar, seo_title, seo_description, 
      seo_keywords, keywords, reading_time, read_time, status, 
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $4, $5, $5, $6, $7, $7, $8, $9, $10, $10, 
      $11, $12, $13, $14, $14, $15, $15, $16, $17, $17)
    RETURNING id;
  `;
  
  const values = [
    postId,                    // $1
    post.title,                // $2
    content,                   // $3
    post.excerpt,              // $4 (also used for summary)
    post.category,             // $5 (also used for content_category)
    urlPath,                   // $6
    now,                       // $7 (also used for published_date)
    author.name,               // $8
    author.bio,                // $9
    author.avatar,             // $10 (also used for author_image)
    isPillar,                  // $11
    post.seo_title,            // $12
    post.seo_description,      // $13
    post.seo_keywords,         // $14 (also used for keywords)
    post.readTime,             // $15 (also used for read_time)
    'published',               // $16
    now                        // $17 (also used for updated_at)
  ];
  
  try {
    const result = await db.query(query, values);
    console.log(`Inserted ${isPillar ? 'pillar' : 'supporting'} post: ${post.title}`);
    return result.rows[0].id;
  } catch (error) {
    console.error(`Error inserting post: ${post.title}`, error);
    throw error;
  }
}

async function createRelationship(pillarPostId, supportingPostId) {
  const query = `
    INSERT INTO blog_content_relationships (
      pillar_post_id, supporting_post_id, relationship_type
    ) VALUES ($1, $2, 'supporting')
    ON CONFLICT (pillar_post_id, supporting_post_id) DO NOTHING;
  `;
  
  try {
    await db.query(query, [pillarPostId, supportingPostId]);
    console.log(`Created relationship: Pillar -> Supporting`);
  } catch (error) {
    console.error('Error creating relationship:', error);
    throw error;
  }
}

// Run the script
validateAndPopulateDatabase();
