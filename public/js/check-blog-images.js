import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432
});

async function checkBlogImages() {
  const client = await pool.connect();
  
  try {
    const result = await client.query('SELECT id, title, slug, hero_image FROM blog_posts ORDER BY id');
    
    console.log('Current blog posts and their hero images:');
    console.log('===============================================');
    
    result.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`Title: ${row.title}`);
      console.log(`Slug: ${row.slug}`);
      console.log(`Hero Image: ${row.hero_image || 'NULL'}`);
      console.log('---');
    });
    
    const postsWithoutImages = result.rows.filter(row => !row.hero_image);
    console.log(`\nPosts without hero images: ${postsWithoutImages.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    pool.end();
  }
}

checkBlogImages();
