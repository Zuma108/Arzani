/**
 * Programmatic SEO Content Verification Tool
 * 
 * This script verifies your pillar posts, supporting content, and content
 * relationships to ensure your programmatic SEO strategy is properly implemented.
 */

import pg from 'pg';
import config from './config.js';
import blogService from './services/blogService.js';
import programmaticContentService from './services/programmaticContentService.js';

const { Pool } = pg;

// Database connection
const pool = new Pool(config.database);

/**
 * Verify pillar posts and their supporting content
 */
async function verifyContentRelationships() {
  try {
    console.log('Checking pillar posts and content relationships...\n');
    
    // Get all pillar posts
    const pillarPosts = await programmaticContentService.getPillarPosts();
    
    if (pillarPosts.length === 0) {
      console.log('No pillar posts found. You should create pillar posts first.');
      return;
    }
    
    console.log(`Found ${pillarPosts.length} pillar posts:\n`);
    
    // Verify each pillar post and its supporting content
    for (const pillar of pillarPosts) {
      console.log(`Pillar Post: ${pillar.title}`);
      console.log(`URL: ${pillar.url_path}`);
      console.log(`Status: ${pillar.status}`);
      
      // Get supporting content for this pillar
      const supportingContent = await programmaticContentService.getSupportingContent(pillar.id);
      
      console.log(`Supporting Content: ${supportingContent.length} posts`);
      
      if (supportingContent.length === 0) {
        console.log('  WARNING: No supporting content found for this pillar post.');
        console.log('  Consider creating supporting content to complete the content cluster.');
      } else {
        console.log('  Supporting content:');
        supportingContent.forEach((post, index) => {
          console.log(`    ${index + 1}. ${post.title} (${post.url_path})`);
        });
      }
      
      // Verify internal linking
      const internalLinkIssues = await verifyInternalLinking(pillar.id, supportingContent);
      if (internalLinkIssues.length > 0) {
        console.log('  WARNING: Internal linking issues detected:');
        internalLinkIssues.forEach(issue => {
          console.log(`    - ${issue}`);
        });
      } else {
        console.log('  Internal linking: Verified ✓');
      }
      
      // Verify SEO fields
      const seoIssues = await verifySEOFields(pillar.id);
      if (seoIssues.length > 0) {
        console.log('  WARNING: SEO issues detected:');
        seoIssues.forEach(issue => {
          console.log(`    - ${issue}`);
        });
      } else {
        console.log('  SEO optimization: Verified ✓');
      }
      
      // Verify analytics tracking
      const analyticsSetup = await verifyAnalyticsSetup(pillar.id);
      if (!analyticsSetup.isValid) {
        console.log('  WARNING: Analytics tracking issues:');
        analyticsSetup.issues.forEach(issue => {
          console.log(`    - ${issue}`);
        });
      } else {
        console.log('  Analytics tracking: Verified ✓');
      }
      
      console.log('\n---\n');
    }
    
    // Overall status
    console.log('Content Relationship Verification Summary:');
    console.log(`Total Pillar Posts: ${pillarPosts.length}`);
    
    // Get total supporting content across all pillars
    const totalSupportingContent = await programmaticContentService.getTotalSupportingContentCount();
    console.log(`Total Supporting Content: ${totalSupportingContent}`);
    
    // Get orphaned content (posts not connected to any pillar)
    const orphanedContent = await programmaticContentService.getOrphanedContent();
    if (orphanedContent.length > 0) {
      console.log(`WARNING: Found ${orphanedContent.length} orphaned content posts not connected to any pillar.`);
      console.log('Consider connecting these posts to appropriate pillar content:');
      orphanedContent.forEach((post, index) => {
        console.log(`  ${index + 1}. ${post.title} (ID: ${post.id})`);
      });
    } else {
      console.log('No orphaned content found. All posts are properly connected. ✓');
    }
    
  } catch (error) {
    console.error('Error verifying content relationships:', error);
    throw error;
  }
}

/**
 * Verify internal linking between pillar and supporting content
 */
async function verifyInternalLinking(pillarId, supportingContent) {
  const issues = [];
  
  try {
    // Get pillar post details
    const pillar = await programmaticContentService.getPostById(pillarId);
    
    // Check if pillar links to supporting content
    for (const post of supportingContent) {
      // Check if pillar content contains links to supporting content
      if (!pillar.content.includes(post.url_path) && !pillar.content.includes(post.slug)) {
        issues.push(`Pillar post does not link to supporting content: ${post.title}`);
      }
      
      // Check if supporting content links back to pillar
      if (!post.content.includes(pillar.url_path) && !post.content.includes(pillar.slug)) {
        issues.push(`Supporting post "${post.title}" does not link back to pillar post`);
      }
    }
    
    return issues;
  } catch (error) {
    console.error('Error verifying internal linking:', error);
    issues.push('Error verifying internal linking: ' + error.message);
    return issues;
  }
}

/**
 * Verify SEO fields for a post
 */
async function verifySEOFields(postId) {
  const issues = [];
  
  try {
    const post = await programmaticContentService.getPostById(postId);
    
    // Check required SEO fields
    if (!post.seo_title || post.seo_title.length < 10) {
      issues.push('Missing or too short SEO title');
    }
    
    if (!post.seo_description || post.seo_description.length < 50) {
      issues.push('Missing or too short SEO description');
    }
    
    if (!post.seo_keywords || post.seo_keywords.length === 0) {
      issues.push('Missing SEO keywords');
    }
    
    if (!post.canonical_url) {
      issues.push('Missing canonical URL');
    }
    
    if (!post.schema_markup) {
      issues.push('Missing schema markup');
    }
    
    if (!post.og_image) {
      issues.push('Missing Open Graph image');
    }
    
    return issues;
  } catch (error) {
    console.error('Error verifying SEO fields:', error);
    issues.push('Error verifying SEO fields: ' + error.message);
    return issues;
  }
}

/**
 * Verify analytics setup for a post
 */
async function verifyAnalyticsSetup(postId) {
  try {
    const analyticsData = await blogService.getPostAnalytics(postId);
    
    if (!analyticsData) {
      return {
        isValid: false,
        issues: ['No analytics configuration found for this post']
      };
    }
    
    const issues = [];
    
    // Check required analytics fields
    if (analyticsData.target_bounce_rate === null || analyticsData.target_bounce_rate === undefined) {
      issues.push('Missing target bounce rate');
    }
    
    if (analyticsData.target_avg_time_on_page === null || analyticsData.target_avg_time_on_page === undefined) {
      issues.push('Missing target average time on page');
    }
    
    if (issues.length > 0) {
      return {
        isValid: false,
        issues
      };
    }
    
    return {
      isValid: true,
      issues: []
    };
  } catch (error) {
    console.error('Error verifying analytics setup:', error);
    return {
      isValid: false,
      issues: ['Error verifying analytics setup: ' + error.message]
    };
  }
}

/**
 * Verify URL structure and canonical URLs
 */
async function verifyURLStructure() {
  try {
    console.log('\nVerifying URL structure and canonical URLs...');
    
    // Get all published blog posts
    const allPosts = await programmaticContentService.getAllPublishedPosts();
    
    const issues = [];
    
    // Check URL structure for each post
    for (const post of allPosts) {
      // URL should follow pattern: /blog/category/slug
      const expectedUrlPattern = new RegExp('^/blog/[a-z0-9-]+/[a-z0-9-]+$');
      if (!expectedUrlPattern.test(post.url_path)) {
        issues.push(`Invalid URL structure for post "${post.title}": ${post.url_path}`);
      }
      
      // Canonical URL should be the full URL including domain
      const expectedCanonicalPattern = new RegExp('^https://[a-zA-Z0-9.-]+/blog/[a-z0-9-]+/[a-z0-9-]+$');
      if (!expectedCanonicalPattern.test(post.canonical_url)) {
        issues.push(`Invalid canonical URL for post "${post.title}": ${post.canonical_url}`);
      }
    }
    
    if (issues.length > 0) {
      console.log('URL structure issues found:');
      issues.forEach(issue => {
        console.log(`  - ${issue}`);
      });
    } else {
      console.log('URL structure verification: All URLs follow the correct pattern ✓');
    }
    
  } catch (error) {
    console.error('Error verifying URL structure:', error);
    throw error;
  }
}

/**
 * Verify category consistency
 */
async function verifyCategoryConsistency() {
  try {
    console.log('\nVerifying category consistency...');
    
    // Get all categories
    const categories = await blogService.getAllCategories();
    
    console.log(`Found ${categories.length} categories:`);
    categories.forEach(cat => {
      console.log(`  - ${cat.name} (${cat.slug})`);
    });
    
    // Check for content distribution across categories
    const categoryStats = await blogService.getContentDistributionByCategory();
    
    console.log('\nContent distribution across categories:');
    categoryStats.forEach(stat => {
      console.log(`  - ${stat.name}: ${stat.post_count} posts (${stat.pillar_count} pillars, ${stat.supporting_count} supporting)`);
      
      // Flag categories with no pillar content
      if (stat.pillar_count === 0 && stat.post_count > 0) {
        console.log(`    WARNING: Category has posts but no pillar content`);
      }
      
      // Flag categories with unbalanced distribution
      if (stat.pillar_count > 0 && stat.supporting_count === 0) {
        console.log(`    WARNING: Category has pillar content but no supporting content`);
      }
    });
    
  } catch (error) {
    console.error('Error verifying category consistency:', error);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('Programmatic SEO Content Verification Tool');
    console.log('=======================================\n');
    
    // Verify content relationships
    await verifyContentRelationships();
    
    // Verify URL structure
    await verifyURLStructure();
    
    // Verify category consistency
    await verifyCategoryConsistency();
    
    console.log('\nVerification complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error in verification process:', error);
    process.exit(1);
  }
}

// Run the script
main();
