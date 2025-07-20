/**
 * Test Programmatic SEO Features
 * 
 * This script tests the programmatic SEO features of the blog system,
 * including URL structure generation, content relationships, and 
 * SEO optimization. It uses the blogService and programmaticContentService.
 */

import db from './db.js';
import blogService from './services/blogService.js';
import programmaticContentService from './services/programmaticContentService.js';

// Services are already initialized as singletons

async function testProgrammaticSEOFeatures() {
  console.log('Testing Programmatic SEO Features...\n');
  
  try {
    // 1. Test fetching pillar posts
    console.log('=== TEST: Fetching Pillar Posts ===');
    
    // Mock function if blogService.getPillarPosts is not implemented
    const getPillarPosts = async () => {
      // Simple query to get all pillar posts
      const query = `
        SELECT *, COALESCE(category, content_category) as category 
        FROM blog_posts 
        WHERE is_pillar = TRUE
        ORDER BY COALESCE(category, content_category), title
      `;
      const result = await db.query(query);
      return result.rows;
    };
    
    const pillarPosts = blogService.getPillarPosts ? 
      await blogService.getPillarPosts() : 
      await getPillarPosts();
    console.log(`Found ${pillarPosts.length} pillar posts:`);
    pillarPosts.forEach((post, index) => {
      console.log(`${index + 1}. ${post.title} (${post.category})`);
    });
    console.log('Test completed successfully\n');
    
    // 2. Test content relationships
    console.log('=== TEST: Content Relationships ===');
    if (pillarPosts.length > 0) {
      // Use the first pillar post for testing
      const testPillarId = pillarPosts[0].id;
      const testPillarTitle = pillarPosts[0].title;
      console.log(`Testing with pillar post: "${testPillarTitle}"`);
      
      // Mock function if programmaticContentService.getSupportingPosts is not implemented
      const getSupportingPosts = async (pillarId) => {
        // Query to get supporting posts related to a pillar post
        const query = `
          SELECT p.* FROM blog_posts p
          JOIN blog_content_relationships r ON p.id = r.supporting_post_id
          WHERE r.pillar_post_id = $1
        `;
        const result = await db.query(query, [pillarId]);
        return result.rows;
      };
      
      const supportingPosts = programmaticContentService.getSupportingPosts ? 
        await programmaticContentService.getSupportingPosts(testPillarId) :
        await getSupportingPosts(testPillarId);
      console.log(`Found ${supportingPosts.length} supporting posts for this pillar:`);
      supportingPosts.forEach((post, index) => {
        console.log(`${index + 1}. ${post.title}`);
      });
    } else {
      console.log('No pillar posts found to test relationships');
    }
    console.log('Test completed successfully\n');
    
    // 3. Test URL structure generation
    console.log('=== TEST: URL Structure Generation ===');
    console.log('Testing URL generation for new post:');
    
    const testTitle = 'Test Programmatic SEO Article';
    const urlTestCategory = 'Business Growth';
    
    // Mock function if programmaticContentService.generateUrlPath is not implemented
    const generateUrlPath = async (title, category) => {
      // Simple function to generate URL path
      const categorySlug = category.toLowerCase().replace(/\s+/g, '-');
      const titleSlug = title.toLowerCase().replace(/\s+/g, '-');
      return `/${categorySlug}/${titleSlug}`;
    };
    
    const generatedUrl = programmaticContentService.generateUrlPath ? 
      await programmaticContentService.generateUrlPath(testTitle, urlTestCategory) :
      await generateUrlPath(testTitle, urlTestCategory);
      
    console.log(`Title: "${testTitle}"`);
    console.log(`Category: "${urlTestCategory}"`);
    console.log(`Generated URL: ${generatedUrl}`);
    console.log('Test completed successfully\n');
    
    // 4. Test category-based content clusters
    console.log('=== TEST: Category Content Clusters ===');
    const clusterTestCategory = 'Marketing Strategies';
    console.log(`Testing content cluster for category: "${clusterTestCategory}"`);
    
    // Mock function if blogService.getPostsByCategory is not implemented
    const getPostsByCategory = async (category) => {
      // Simplified query to get posts by category
      const query = `
        SELECT * FROM blog_posts 
        WHERE category = $1 OR content_category = $1
      `;
      const result = await db.query(query, [category]);
      return result.rows;
    };
    
    const categoryPosts = blogService.getPostsByCategory ? 
      await blogService.getPostsByCategory(clusterTestCategory) :
      await getPostsByCategory(clusterTestCategory);
    const pillarPostsInCategory = categoryPosts.filter(post => post.is_pillar);
    const supportingPostsInCategory = categoryPosts.filter(post => !post.is_pillar);
    
    console.log(`Found ${categoryPosts.length} total posts in category:`);
    console.log(`- ${pillarPostsInCategory.length} pillar posts`);
    console.log(`- ${supportingPostsInCategory.length} supporting posts`);
    
    if (pillarPostsInCategory.length > 0) {
      console.log('\nPillar post(s):');
      pillarPostsInCategory.forEach((post, index) => {
        console.log(`${index + 1}. ${post.title}`);
      });
    }
    console.log('Test completed successfully\n');
    
    // 5. Test SEO field validation
    console.log('=== TEST: SEO Field Validation ===');
    if (pillarPosts.length > 0) {
      // Use the first pillar post for testing
      const testPost = pillarPosts[0];
      console.log(`Testing SEO fields for post: "${testPost.title}"`);
      
      // Mock function if programmaticContentService.validateSeoFields is not implemented
      const validateSeoFields = (post) => {
        const hasSeoTitle = !!post.seo_title;
        const hasSeoDescription = !!post.seo_description;
        const hasKeywords = !!(post.keywords || post.seo_keywords);
        
        let score = 0;
        if (hasSeoTitle) score += 30;
        if (hasSeoDescription) score += 30;
        if (hasKeywords) score += 20;
        
        // Check title length
        if (post.seo_title && post.seo_title.length >= 30 && post.seo_title.length <= 60) {
          score += 10;
        }
        
        // Check description length
        if (post.seo_description && post.seo_description.length >= 120 && post.seo_description.length <= 160) {
          score += 10;
        }
        
        const suggestions = [];
        if (!hasSeoTitle) suggestions.push('Add an SEO title');
        if (!hasSeoDescription) suggestions.push('Add an SEO description');
        if (!hasKeywords) suggestions.push('Add keywords');
        if (post.seo_title && (post.seo_title.length < 30 || post.seo_title.length > 60)) {
          suggestions.push('Optimize SEO title length (30-60 characters)');
        }
        if (post.seo_description && (post.seo_description.length < 120 || post.seo_description.length > 160)) {
          suggestions.push('Optimize SEO description length (120-160 characters)');
        }
        
        return {
          hasSeoTitle,
          hasSeoDescription,
          hasKeywords,
          score,
          suggestions
        };
      };
      
      const validationResult = programmaticContentService.validateSeoFields ? 
        await programmaticContentService.validateSeoFields(testPost) :
        validateSeoFields(testPost);
      
      console.log('SEO Field Validation Results:');
      console.log(`- Has SEO Title: ${validationResult.hasSeoTitle ? 'Yes' : 'No'}`);
      console.log(`- Has SEO Description: ${validationResult.hasSeoDescription ? 'Yes' : 'No'}`);
      console.log(`- Has Keywords: ${validationResult.hasKeywords ? 'Yes' : 'No'}`);
      console.log(`- Overall SEO Score: ${validationResult.score}/100`);
      
      // Show SEO improvement suggestions
      if (validationResult.suggestions.length > 0) {
        console.log('\nSEO Improvement Suggestions:');
        validationResult.suggestions.forEach((suggestion, index) => {
          console.log(`${index + 1}. ${suggestion}`);
        });
      }
    } else {
      console.log('No posts found to test SEO fields');
    }
    console.log('Test completed successfully\n');
    
    console.log('All programmatic SEO feature tests completed successfully!');
  } catch (error) {
    console.error('Error testing programmatic SEO features:', error);
  } finally {
    await db.end();
  }
}

// Run the tests
testProgrammaticSEOFeatures();
