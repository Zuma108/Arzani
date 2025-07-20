const { Pool } = require('pg');
const blogPost = require('./blog-content/uk-business-financing-guide-2025');

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'marketplace_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function insertBlogPost() {
  const client = await pool.connect();
  
  try {
    console.log('Starting blog post insertion...');
    
    // Get the Funding category ID (most appropriate for financing guide)
    const categoryResult = await client.query(
      'SELECT id FROM blog_categories WHERE slug = $1',
      ['funding']
    );
    
    if (categoryResult.rows.length === 0) {
      throw new Error('Funding category not found');
    }
    
    const categoryId = categoryResult.rows[0].id;
    console.log(`Using category ID: ${categoryId} (Funding)`);
    
    // Insert the blog post
    const insertQuery = `
      INSERT INTO blog_posts (
        title,
        slug,
        content,
        excerpt,
        meta_description,
        keywords,
        category_id,
        author_id,
        published,
        featured,
        content_type,
        pillar_content,
        parent_pillar_id,
        target_keywords,
        seo_title,
        schema_markup,
        content_cluster,
        reading_time,
        word_count,
        internal_links,
        external_links,
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
      blogPost.excerpt,
      blogPost.metaDescription,
      JSON.stringify(blogPost.keywords),
      categoryId,
      1, // Default author_id
      true, // published
      blogPost.featured || false,
      blogPost.contentType,
      blogPost.pillarContent,
      blogPost.parentPillarId,
      JSON.stringify(blogPost.targetKeywords),
      blogPost.seoTitle,
      JSON.stringify(blogPost.schemaMarkup),
      blogPost.contentCluster,
      blogPost.readingTime,
      blogPost.wordCount,
      JSON.stringify(blogPost.internalLinks),
      JSON.stringify(blogPost.externalLinks),
      new Date(),
      new Date()
    ]);
    
    console.log('✅ Blog post inserted successfully!');
    console.log(`ID: ${result.rows[0].id}`);
    console.log(`Title: ${result.rows[0].title}`);
    console.log(`Slug: ${result.rows[0].slug}`);
    console.log(`Category: Funding (ID: ${categoryId})`);
    
  } catch (error) {
    console.error('❌ Error inserting blog post:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the insertion
insertBlogPost().catch(console.error);
