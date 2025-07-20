/**
 * Test script for programmatic blog content generation
 * This script tests the core functionality of the programmatic blog system
 * without modifying production data
 */

import blogService from './services/blogService.js';
import programmaticContentService from './services/programmaticContentService.js';
import db from './db.js';

async function testProgrammaticBlog() {
    console.log('========================================');
    console.log('PROGRAMMATIC BLOG SYSTEM TEST');
    console.log('========================================\n');

    try {
        // 1. Test database connection
        console.log('Testing database connection...');
        await db.query('SELECT NOW()');
        console.log('✓ Database connection successful\n');

        // 2. Verify blog tables and structure
        console.log('Verifying blog database structure...');
        const tableCheck = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'blog_posts'
            );
        `);
        
        if (!tableCheck.rows[0].exists) {
            throw new Error('blog_posts table does not exist');
        }
        
        // Check for required columns for programmatic SEO
        const columnCheck = await db.query(`
            SELECT 
                column_name 
            FROM 
                information_schema.columns 
            WHERE 
                table_schema = 'public' 
                AND table_name = 'blog_posts' 
                AND column_name IN (
                    'is_pillar', 
                    'seo_title', 
                    'seo_description', 
                    'canonical_url', 
                    'url_path', 
                    'content_cluster',
                    'supporting_posts',
                    'pillar_post_id'
                );
        `);

        console.log(`✓ Found ${columnCheck.rowCount} SEO-specific columns`);
        
        if (columnCheck.rowCount < 5) {
            console.warn('⚠ Some SEO columns may be missing - check migrations');
        } else {
            console.log('✓ Database structure verified for programmatic SEO\n');
        }

        // 3. Test services
        console.log('Testing programmaticContentService...');
        if (typeof programmaticContentService.generateSeoMetadata !== 'function') {
            throw new Error('programmaticContentService.generateSeoMetadata is not a function');
        }
        if (typeof programmaticContentService.buildContentCluster !== 'function') {
            throw new Error('programmaticContentService.buildContentCluster is not a function');
        }
        console.log('✓ programmaticContentService validated\n');

        console.log('Testing blogService...');
        if (typeof blogService.createBlogPost !== 'function') {
            throw new Error('blogService.createBlogPost is not a function');
        }
        if (typeof blogService.getBlogPostBySlug !== 'function') {
            throw new Error('blogService.getBlogPostBySlug is not a function');
        }
        console.log('✓ blogService validated\n');

        // 4. Test metadata generation (dry run)
        console.log('Testing SEO metadata generation...');
        const sampleTitle = "Complete Guide to Business Valuation";
        const sampleContent = "Learn how to accurately value your business using proven methodologies and AI-powered tools. Expert tips, case studies, and step-by-step valuation guides.";
        const metadata = await programmaticContentService.generateSeoMetadata(sampleTitle, sampleContent, 'business-valuation');
        
        console.log('Generated metadata sample:');
        console.log(metadata);
        console.log('✓ SEO metadata generation successful\n');

        // 5. Test URL structure
        console.log('Testing URL path generation...');
        const urlPath = await programmaticContentService.generateUrlPath('business-valuation', 'complete-guide-to-business-valuation');
        console.log(`Generated URL path: ${urlPath}`);
        if (urlPath.startsWith('/blog/') && urlPath.includes('business-valuation')) {
            console.log('✓ URL path generation verified\n');
        } else {
            console.warn('⚠ URL path may not match expected format\n');
        }

        console.log('========================================');
        console.log('✓ TEST COMPLETED SUCCESSFULLY');
        console.log('Your programmatic blog system is properly configured');
        console.log('========================================');
    } catch (error) {
        console.error('❌ TEST FAILED:');
        console.error(error);
        console.log('Please check your implementation and migrations');
    } finally {
        // Close database connection
        db.end();
    }
}

// Run the tests
testProgrammaticBlog();
