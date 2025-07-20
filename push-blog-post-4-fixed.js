import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import blogPost from './blog-content/uk-business-financing-guide-2025.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env with explicit path
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === 'production';

// Create connection configuration
const connectionConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432
};

// Check explicit SSL setting before using production check
if (process.env.DB_SSL && process.env.DB_SSL.toLowerCase() === 'true') {
  console.log('Enabling SSL for database connection (from DB_SSL env var)');
  connectionConfig.ssl = { rejectUnauthorized: false };
} else if (process.env.DB_SSL && process.env.DB_SSL.toLowerCase() === 'false') {
  console.log('Explicitly disabling SSL for database connection (from DB_SSL env var)');
  // SSL explicitly disabled, don't add the ssl property
} else if (isProduction) {
  // Default behavior for production if DB_SSL not specified
  console.log('Enabling SSL for database connection (production environment)');
  connectionConfig.ssl = { rejectUnauthorized: false };
} else {
  console.log('SSL disabled for database connection (development environment)');
}

// Create the pool with the appropriate config
const pool = new Pool(connectionConfig);

async function insertBlogPost() {
  const client = await pool.connect();
  
  try {
    console.log('Starting blog post insertion...');
    
    // Insert the blog post with correct column names
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
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
      ) RETURNING id, title, slug;
    `;
    
    const result = await client.query(insertQuery, [
      blogPost.title,
      blogPost.slug,
      blogPost.content,
      blogPost.content.substring(0, 300) + '...', // excerpt
      blogPost.metaDescription,
      blogPost.metaDescription, // seo_description
      blogPost.primaryKeywords?.join(', ') || '', // seo_keywords
      JSON.stringify(blogPost.primaryKeywords || []), // keywords
      'Business Financing', // category
      'Business Financing', // content_category
      1, // Default author_id
      'published', // status
      false, // is_featured
      true, // is_pillar
      blogPost.primaryKeywords?.[0] || 'UK business financing 2025', // target_keyword
      JSON.stringify(blogPost.longtailKeywords || []), // secondary_keywords
      blogPost.title, // seo_title
      JSON.stringify({}), // schema_markup
      20, // reading_time
      20, // read_time
      new Date(), // published_date
      new Date(), // created_at
      new Date()  // updated_at
    ]);
    
    console.log('✅ Blog post inserted successfully!');
    console.log(`ID: ${result.rows[0].id}`);
    console.log(`Title: ${result.rows[0].title}`);
    console.log(`Slug: ${result.rows[0].slug}`);
    console.log(`Category: Business Financing`);
    
  } catch (error) {
    console.error('❌ Error inserting blog post:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the insertion
insertBlogPost().catch(console.error);
