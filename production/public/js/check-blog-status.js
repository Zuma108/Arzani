import pool from '../../db.js';

async function checkBlogPosts() {
  try {
    const result = await pool.query(`
      SELECT id, title, slug, hero_image, created_at
      FROM blog_posts 
      WHERE hero_image IS NOT NULL
      ORDER BY id DESC
      LIMIT 10
    `);
    
    console.log('Recent blog posts with hero images:');
    console.log('=====================================');
    
    result.rows.forEach(post => {
      console.log(`ID: ${post.id}`);
      console.log(`Title: ${post.title}`);
      console.log(`Slug: ${post.slug}`);
      console.log(`Hero Image: ${post.hero_image}`);
      console.log(`Created: ${new Date(post.created_at).toLocaleDateString()}`);
      console.log(`URL: http://localhost:3000/blog/${post.slug}`);
      console.log('---');
    });
    
    // Check if server is running
    console.log('\nTo view these blog posts:');
    console.log('1. Make sure your server is running: npm start');
    console.log('2. Visit any of the URLs above');
    console.log('3. You should see the hero images now displayed!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkBlogPosts();
