/**
 * Blog Automation System Startup & Test Script
 * Run this to test the automated blog generation system
 */

import AutomatedBlogGenerator from './services/automated-blog-generator.js';
import dotenv from 'dotenv';

dotenv.config();

async function testBlogAutomation() {
  console.log('🚀 Testing Automated Blog Generation System...\n');
  
  const generator = new AutomatedBlogGenerator();
  
  try {
    // Initialize the system
    console.log('1. Initializing system...');
    await generator.initialize();
    console.log('✅ System initialized successfully\n');
    
    // Get current status
    console.log('2. Checking system status...');
    const status = await generator.getStatus();
    console.log('📊 System Status:', JSON.stringify(status, null, 2));
    console.log('');
    
    // Parse checklist for next post
    console.log('3. Finding next blog post to generate...');
    const nextPost = await generator.parseChecklistForNextPost();
    if (nextPost) {
      console.log('📝 Next post to generate:');
      console.log(`   Title: ${nextPost.title}`);
      console.log(`   Category: ${nextPost.category}`);
      console.log(`   Type: ${nextPost.contentType}`);
      console.log(`   Priority: ${nextPost.priority}`);
    } else {
      console.log('🎉 All posts in checklist completed!');
    }
    console.log('');
    
    // Test content generation (optional - set to true to test)
    const testGeneration = process.argv.includes('--generate');
    
    if (testGeneration && nextPost) {
      console.log('4. Testing content generation...');
      console.log('⚠️  This will create and publish a real blog post!');
      console.log('   Press Ctrl+C within 10 seconds to cancel...');
      
      // Give user time to cancel
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      console.log('🚀 Generating blog post...');
      await generator.generateImmediately();
      console.log('✅ Blog post generation completed!');
    } else {
      console.log('4. Skipping content generation (use --generate flag to test)');
    }
    
    console.log('\n✅ Blog automation system test completed successfully!');
    console.log('\n📚 System Features:');
    console.log('   • Automatic content generation 6 times per day');
    console.log('   • SEO optimization and keyword targeting');
    console.log('   • Automatic interlinking and semantic relationships');
    console.log('   • Database integration with full blog schema');
    console.log('   • Production-ready publishing');
    console.log('   • Admin dashboard for monitoring and control');
    console.log('\n🔗 Access Points:');
    console.log('   • Admin Dashboard: http://localhost:3000/admin/blog-automation');
    console.log('   • API Status: http://localhost:3000/api/blog-automation/status');
    console.log('   • Generated Blogs: http://localhost:3000/blog');
    
  } catch (error) {
    console.error('❌ Error testing blog automation:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure PostgreSQL database is running');
    console.log('   2. Check .env file has all required variables');
    console.log('   3. Verify OpenAI API key is valid');
    console.log('   4. Ensure blog tables exist in database');
  } finally {
    // Clean shutdown
    generator.stop();
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down test script...');
  process.exit(0);
});

// Run the test
testBlogAutomation().catch(console.error);
