import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
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

// Available blog images for rotation
const BLOG_IMAGES = [
  '/figma design exports/images/blog1.webp',
  '/figma design exports/images/blog2.webp',
  '/figma design exports/images/blog3.webp',
  '/figma design exports/images/blog4.webp',
  '/figma design exports/images/blog5.webp',
  '/figma design exports/images/blog6.webp'
];

/**
 * Get blog image by rotation based on post ID
 * @param {number} postId - The blog post ID
 * @returns {string} - The hero image path
 */
function getBlogImageByRotation(postId) {
  const imageIndex = (postId - 1) % BLOG_IMAGES.length;
  return BLOG_IMAGES[imageIndex];
}

/**
 * Main function to fix blog hero images
 */
async function fixBlogHeroImages() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Starting blog hero image repair process...\n');
    
    // First, let's get a summary of current image status
    console.log('📊 Current hero image status:');
    console.log('================================');
    
    const statusQuery = `
      SELECT 
        CASE 
          WHEN hero_image IS NULL THEN 'NULL'
          WHEN hero_image = '' THEN 'EMPTY'
          WHEN hero_image LIKE '/blog/%' THEN 'INVALID_BLOG_PATH'
          WHEN hero_image LIKE '/uploads/blog/%' THEN 'INVALID_UPLOAD_PATH'
          WHEN hero_image LIKE '/figma design exports/images/blog%.webp' THEN 'VALID_NEW_FORMAT'
          WHEN hero_image LIKE 'https://arzani-images1.s3%' THEN 'AWS_S3_FORMAT'
          ELSE 'OTHER'
        END as image_status,
        COUNT(*) as count
      FROM blog_posts 
      GROUP BY 
        CASE 
          WHEN hero_image IS NULL THEN 'NULL'
          WHEN hero_image = '' THEN 'EMPTY'
          WHEN hero_image LIKE '/blog/%' THEN 'INVALID_BLOG_PATH'
          WHEN hero_image LIKE '/uploads/blog/%' THEN 'INVALID_UPLOAD_PATH'
          WHEN hero_image LIKE '/figma design exports/images/blog%.webp' THEN 'VALID_NEW_FORMAT'
          WHEN hero_image LIKE 'https://arzani-images1.s3%' THEN 'AWS_S3_FORMAT'
          ELSE 'OTHER'
        END
      ORDER BY count DESC;
    `;
    
    const statusResult = await client.query(statusQuery);
    statusResult.rows.forEach(row => {
      console.log(`${row.image_status}: ${row.count} posts`);
    });
    
    console.log('\n🔍 Finding posts that need hero image updates...');
    
    // Get all posts with problematic hero images
    const problematicPostsQuery = `
      SELECT id, title, hero_image 
      FROM blog_posts 
      WHERE hero_image LIKE '/uploads/blog/%' 
         OR hero_image LIKE '/blog/%'
         OR hero_image IS NULL
         OR hero_image = ''
      ORDER BY id;
    `;
    
    const problematicResult = await client.query(problematicPostsQuery);
    const postsToUpdate = problematicResult.rows;
    
    console.log(`Found ${postsToUpdate.length} posts that need image updates:\n`);
    
    if (postsToUpdate.length === 0) {
      console.log('✅ No posts found that need hero image updates!');
      return;
    }
    
    // Show what will be updated
    console.log('📝 Posts to be updated:');
    console.log('========================');
    postsToUpdate.forEach(post => {
      const newImage = getBlogImageByRotation(post.id);
      console.log(`ID ${post.id}: "${post.title}"`);
      console.log(`  Current: ${post.hero_image || 'NULL'}`);
      console.log(`  New:     ${newImage}\n`);
    });
    
    // Confirm before proceeding
    console.log('🚀 Starting updates...\n');
    
    let updatedCount = 0;
    const updateResults = [];
    
    // Update each post
    for (const post of postsToUpdate) {
      const newHeroImage = getBlogImageByRotation(post.id);
      
      try {
        const updateQuery = `
          UPDATE blog_posts 
          SET hero_image = $1, updated_at = NOW()
          WHERE id = $2
          RETURNING id, title, hero_image;
        `;
        
        const updateResult = await client.query(updateQuery, [newHeroImage, post.id]);
        const updatedPost = updateResult.rows[0];
        
        console.log(`✅ Updated Post ID ${updatedPost.id}: "${updatedPost.title}"`);
        console.log(`   New image: ${updatedPost.hero_image}`);
        
        updateResults.push({
          id: updatedPost.id,
          title: updatedPost.title,
          oldImage: post.hero_image,
          newImage: updatedPost.hero_image
        });
        
        updatedCount++;
      } catch (error) {
        console.error(`❌ Failed to update post ID ${post.id}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Successfully updated ${updatedCount} blog posts with hero images!`);
    
    // Show final image distribution
    console.log('\n📊 Final Image Distribution:');
    console.log('=============================');
    const finalDistribution = await client.query(`
      SELECT hero_image, COUNT(*) as count
      FROM blog_posts 
      WHERE hero_image LIKE '/figma design exports/images/blog%.webp'
      GROUP BY hero_image
      ORDER BY hero_image;
    `);
    
    finalDistribution.rows.forEach(row => {
      const imageName = row.hero_image.split('/').pop();
      console.log(`${imageName}: ${row.count} posts`);
    });
    
    // Verify no problematic images remain
    console.log('\n🔍 Verification - Checking for remaining problematic images:');
    const verificationResult = await client.query(problematicPostsQuery);
    
    if (verificationResult.rows.length === 0) {
      console.log('✅ Success! No problematic hero images found.');
    } else {
      console.log(`⚠️  Warning: ${verificationResult.rows.length} problematic images still exist:`);
      verificationResult.rows.forEach(post => {
        console.log(`  ID ${post.id}: ${post.hero_image || 'NULL'}`);
      });
    }
    
    console.log('\n📄 Update Summary:');
    console.log('==================');
    console.log(`Total posts processed: ${postsToUpdate.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Failed updates: ${postsToUpdate.length - updatedCount}`);
    
  } catch (error) {
    console.error('❌ Error during blog hero image repair:', error);
    throw error;
  } finally {
    client.release();
    pool.end();
  }
}

// Export the function for potential reuse
export { fixBlogHeroImages, getBlogImageByRotation, BLOG_IMAGES };

// Run the repair if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fixBlogHeroImages()
    .then(() => {
      console.log('\n🏁 Blog hero image repair completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Blog hero image repair failed:', error);
      process.exit(1);
    });
}
