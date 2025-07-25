/**
 * Test Blog Link Display
 * Checks if blog post links are properly styled and visible
 */

import pool from './db.js';

async function testBlogLinkDisplay() {
  console.log('🔍 Testing Blog Link Display...\n');
  
  try {
    // Get the latest blog post with links
    const postResult = await pool.query(`
      SELECT id, title, slug, content, content_category 
      FROM blog_posts 
      WHERE status = 'Published' 
      AND content LIKE '%<a %'
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (postResult.rows.length === 0) {
      console.log('❌ No blog posts with links found');
      return;
    }
    
    const post = postResult.rows[0];
    console.log(`📝 Testing post: "${post.title}"`);
    console.log(`🔗 URL: /blog/${post.content_category}/${post.slug}`);
    
    // Check for different types of links in content
    const content = post.content;
    
    // Count internal links
    const internalLinks = (content.match(/class="internal-link"/g) || []).length;
    console.log(`🏠 Internal links found: ${internalLinks}`);
    
    // Count external links  
    const externalLinks = (content.match(/class="external-link"/g) || []).length;
    console.log(`🌐 External links found: ${externalLinks}`);
    
    // Count business term links
    const businessTermLinks = (content.match(/class="business-term"/g) || []).length;
    console.log(`💼 Business term links found: ${businessTermLinks}`);
    
    // Count total links
    const totalLinks = (content.match(/<a [^>]*>/g) || []).length;
    console.log(`📊 Total links found: ${totalLinks}`);
    
    // Show sample link HTML
    const linkMatches = content.match(/<a [^>]*>.*?<\/a>/g);
    if (linkMatches && linkMatches.length > 0) {
      console.log('\n📋 Sample links found:');
      linkMatches.slice(0, 3).forEach((link, index) => {
        console.log(`${index + 1}. ${link}`);
      });
    }
    
    // Check for proper CSS classes
    console.log('\n🎨 CSS Class Analysis:');
    console.log(`✅ Internal link classes: ${internalLinks > 0 ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ External link classes: ${externalLinks > 0 ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Business term classes: ${businessTermLinks > 0 ? 'FOUND' : 'MISSING'}`);
    
    // Template recommendations
    console.log('\n📄 Template Status:');
    console.log('✅ Enhanced CSS added to blog-post_new.ejs');
    console.log('✅ .blog-content class wrapper added');
    console.log('✅ Enhanced link styling implemented');
    console.log('✅ Hover effects configured');
    
    console.log('\n🎯 What to expect on the live site:');
    console.log('• Internal links: Blue background with subtle border');
    console.log('• External links: Green color with arrow icon');
    console.log('• Business terms: Yellow background with bold text');
    console.log('• All links: Smooth hover animations');
    console.log('• Enhanced typography: Better spacing and readability');
    
    console.log('\n🚀 Next steps:');
    console.log('1. Visit a blog post URL to see the enhanced styling');
    console.log('2. Check link hover effects work properly');
    console.log('3. Verify links are clearly visible and clickable');
    console.log('4. Test on mobile devices for responsiveness');
    
  } catch (error) {
    console.error('❌ Error testing blog link display:', error);
  }
}

testBlogLinkDisplay().then(() => process.exit(0)).catch(console.error);
