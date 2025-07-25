import pg from 'pg';
import dotenv from 'dotenv';
import { getBlogImageById } from './utils/blogImageRotation.js';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432
});

async function updateBlogPostImages() {
  const client = await pool.connect();
  
  try {
    console.log('🖼️  Starting blog post image assignment...\n');
    
    // Get all blog posts without hero images
    const result = await client.query(`
      SELECT id, title, slug 
      FROM blog_posts 
      WHERE hero_image IS NULL OR hero_image = '' 
      ORDER BY id
    `);
    
    console.log(`Found ${result.rows.length} blog posts without hero images\n`);
    
    if (result.rows.length === 0) {
      console.log('✅ All blog posts already have hero images!');
      return;
    }
    
    // Update each post with a rotated image
    let updatedCount = 0;
    
    for (const post of result.rows) {
      const heroImage = getBlogImageById(post.id);
      
      await client.query(`
        UPDATE blog_posts 
        SET hero_image = $1, updated_at = NOW()
        WHERE id = $2
      `, [heroImage, post.id]);
      
      console.log(`✅ Updated Post ID ${post.id}: "${post.title}"`);
      console.log(`   Image: ${heroImage}\n`);
      
      updatedCount++;
    }
    
    console.log(`🎉 Successfully updated ${updatedCount} blog posts with hero images!`);
    console.log('\n📊 Image Distribution Summary:');
    console.log('================================');
    
    // Show distribution of images
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
    console.error('❌ Error updating blog post images:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Run the update
updateBlogPostImages().catch(console.error);
