/**
 * Generate Single Blog Post
 * Creates one blog post immediately for testing
 */

import AutomatedBlogGenerator from './services/automated-blog-generator.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('📝 Generating Single Blog Post...');

async function generateSinglePost() {
  try {
    const generator = new AutomatedBlogGenerator();
    
    console.log('🔍 Finding next blog post to generate...');
    const nextPost = await generator.parseChecklistForNextPost();
    
    if (!nextPost) {
      console.log('🎉 No more blog posts to generate - checklist complete!');
      return;
    }
    
    console.log(`📖 Generating: "${nextPost.title}"`);
    console.log(`📂 Category: ${nextPost.category}`);
    console.log(`🎯 Type: ${nextPost.contentType}`);
    
    // Generate the blog post
    await generator.generateNextBlogPost();
    
    console.log('✅ Single blog post generation completed!');
    
  } catch (error) {
    console.error('❌ Error generating blog post:', error);
  } finally {
    process.exit(0);
  }
}

// Run the single post generation
generateSinglePost();
