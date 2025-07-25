import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getBlogImageForNewPost } from './utils/blogImageRotation.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env with explicit path
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;

/**
 * Enhanced Blog Post Push Template with Image Rotation
 * This template automatically assigns hero images from the rotation system
 */

const isProduction = process.env.NODE_ENV === 'production';

// Create connection configuration
const connectionConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432
};

// SSL configuration
if (process.env.DB_SSL && process.env.DB_SSL.toLowerCase() === 'true') {
  console.log('Enabling SSL for database connection (from DB_SSL env var)');
  connectionConfig.ssl = { rejectUnauthorized: false };
} else if (process.env.DB_SSL && process.env.DB_SSL.toLowerCase() === 'false') {
  console.log('Explicitly disabling SSL for database connection (from DB_SSL env var)');
} else if (isProduction) {
  console.log('Enabling SSL for database connection (production environment)');
  connectionConfig.ssl = { rejectUnauthorized: false };
} else {
  console.log('SSL disabled for database connection (development environment)');
}

const pool = new Pool(connectionConfig);

async function insertBlogPostWithRotatedImage(blogPost) {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting enhanced blog post insertion with image rotation...');
    
    // Get current blog post count to determine next image
    const countResult = await client.query('SELECT COUNT(*) as count FROM blog_posts');
    const totalPosts = parseInt(countResult.rows[0].count);
    
    // Get the hero image using rotation system
    const heroImage = getBlogImageForNewPost(totalPosts);
    
    console.log(`📊 Total existing posts: ${totalPosts}`);
    console.log(`🖼️  Assigned hero image: ${heroImage}`);
    
    const insertQuery = `
      INSERT INTO blog_posts (
        title,
        slug,
        content,
        excerpt,
        meta_description,
        seo_description,
        seo_keywords,
        keywords,
        category,
        content_category,
        hero_image,
        author_id,
        status,
        is_featured,
        is_pillar,
        target_keyword,
        secondary_keywords,
        seo_title,
        schema_markup,
        reading_time,
        read_time,
        published_date,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
      ) RETURNING id, title, slug, hero_image;
    `;
    
    const result = await client.query(insertQuery, [
      blogPost.title,
      blogPost.slug,
      blogPost.content,
      blogPost.excerpt || blogPost.content.substring(0, 300) + '...',
      blogPost.metaDescription,
      blogPost.metaDescription,
      blogPost.primaryKeywords?.join(', ') || '',
      JSON.stringify(blogPost.primaryKeywords || []),
      blogPost.category || 'General',
      blogPost.contentCategory || blogPost.category || 'General',
      heroImage, // Automatically assigned hero image
      1, // Default author ID
      'published',
      blogPost.isFeatured || false,
      blogPost.isPillar || false,
      blogPost.primaryKeywords?.[0] || blogPost.title,
      JSON.stringify(blogPost.longtailKeywords || []),
      blogPost.seoTitle || blogPost.title,
      JSON.stringify(blogPost.schemaMarkup || {}),
      blogPost.readingTime || 5,
      blogPost.readingTime || 5,
      new Date(),
      new Date(),
      new Date()
    ]);
    
    const insertedPost = result.rows[0];
    
    console.log('✅ Blog post successfully inserted!');
    console.log(`📄 Post ID: ${insertedPost.id}`);
    console.log(`📝 Title: ${insertedPost.title}`);
    console.log(`🔗 Slug: ${insertedPost.slug}`);
    console.log(`🖼️  Hero Image: ${insertedPost.hero_image}`);
    
    return insertedPost;
    
  } catch (error) {
    console.error('❌ Error inserting blog post:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default insertBlogPostWithRotatedImage;

// Example usage:
/*
import insertBlogPostWithRotatedImage from './enhanced-blog-post-template.js';
import yourBlogPost from './blog-content/your-blog-post.js';

insertBlogPostWithRotatedImage(yourBlogPost)
  .then(result => {
    console.log('Post created:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed to create post:', error);
    process.exit(1);
  });
*/
