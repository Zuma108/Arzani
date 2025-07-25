import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getBlogImageForNewPost } from './utils/blogImageRotation.js';

// EXAMPLE BLOG POST - Replace with your actual blog post import
// import blogPost from './blog-content/your-blog-post-file.js';

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

async function insertBlogPost() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting blog post insertion with automatic image rotation...');
    
    // ========================================
    // REPLACE THIS SECTION WITH YOUR BLOG POST
    // ========================================
    
    // EXAMPLE BLOG POST DATA - Replace with your actual blog post data
    const blogPost = {
      title: "Example Blog Post Title",
      slug: "example-blog-post-title",
      content: `
        <h1>Example Blog Post</h1>
        <p>This is an example blog post content. Replace this with your actual blog post content.</p>
      `,
      metaDescription: "This is an example meta description",
      primaryKeywords: ["example", "blog", "post"],
      longtailKeywords: ["example blog post", "sample content"],
      category: "General",
      contentCategory: "general",
      readingTime: 5
    };
    
    // ========================================
    // END REPLACEMENT SECTION
    // ========================================
    
    // Get current blog post count to determine next image in rotation
    const countResult = await client.query('SELECT COUNT(*) as count FROM blog_posts');
    const totalPosts = parseInt(countResult.rows[0].count);
    
    // Get the hero image using rotation system
    const heroImage = getBlogImageForNewPost(totalPosts);
    
    console.log(`📊 Total existing posts: ${totalPosts}`);
    console.log(`🖼️  Assigned hero image: ${heroImage}`);
    console.log(`📝 Inserting: "${blogPost.title}"`);
    
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
      blogPost.content.substring(0, 300) + '...', // Auto-generate excerpt
      blogPost.metaDescription,
      blogPost.metaDescription,
      blogPost.primaryKeywords?.join(', ') || '',
      JSON.stringify(blogPost.primaryKeywords || []),
      blogPost.category || 'General',
      blogPost.contentCategory || blogPost.category || 'general',
      heroImage, // Automatically assigned hero image
      1, // Default author ID
      'published',
      false, // is_featured
      false, // is_pillar
      blogPost.primaryKeywords?.[0] || blogPost.title,
      JSON.stringify(blogPost.longtailKeywords || []),
      blogPost.title, // seo_title
      JSON.stringify({}), // schema_markup
      blogPost.readingTime || 5, // reading_time
      blogPost.readingTime || 5, // read_time
      new Date(), // published_date
      new Date(), // created_at
      new Date()  // updated_at
    ]);
    
    const insertedPost = result.rows[0];
    
    console.log('✅ Blog post successfully inserted!');
    console.log('================================');
    console.log(`📄 Post ID: ${insertedPost.id}`);
    console.log(`📝 Title: ${insertedPost.title}`);
    console.log(`🔗 Slug: ${insertedPost.slug}`);
    console.log(`🖼️  Hero Image: ${insertedPost.hero_image}`);
    console.log(`🌐 URL: /blog/${blogPost.contentCategory}/${insertedPost.slug}`);
    
    // Show current image distribution
    console.log('\n📊 Current Image Distribution:');
    console.log('================================');
    const distributionResult = await client.query(`
      SELECT hero_image, COUNT(*) as count
      FROM blog_posts 
      WHERE hero_image LIKE '%/figma design exports/images/blog%.webp'
      GROUP BY hero_image
      ORDER BY hero_image
    `);
    
    distributionResult.rows.forEach(row => {
      const imageName = row.hero_image.split('/').pop();
      console.log(`${imageName}: ${row.count} posts`);
    });
    
  } catch (error) {
    console.error('❌ Error inserting blog post:', error);
    throw error;
  } finally {
    client.release();
    pool.end();
  }
}

// Execute the function
insertBlogPost()
  .then(() => {
    console.log('\n🎉 Blog post insertion completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Blog post insertion failed:', error);
    process.exit(1);
  });
