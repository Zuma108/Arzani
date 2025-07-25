/**
 * Blog Formatting Fix Script
 * Fixes markdown formatting issues and missing hero images in blog posts
 */

import pool from './db.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Convert markdown formatting to HTML
 */
function convertMarkdownToHtml(content) {
    if (!content) return content;
    
    let htmlContent = content;
    
    // Convert headings
    htmlContent = htmlContent.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    htmlContent = htmlContent.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    htmlContent = htmlContent.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    htmlContent = htmlContent.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    
    // Convert bold text
    htmlContent = htmlContent.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Convert italic text
    htmlContent = htmlContent.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Convert bullet points to HTML lists
    htmlContent = htmlContent.replace(/^- (.+)$/gm, '<li>$1</li>');
    
    // Wrap consecutive <li> elements in <ul> tags
    htmlContent = htmlContent.replace(/(<li>.*<\/li>\s*)+/gs, (match) => {
        return '<ul>\n' + match + '</ul>\n';
    });
    
    // Convert numbered lists
    htmlContent = htmlContent.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    
    // Wrap paragraphs that aren't already in HTML tags
    const lines = htmlContent.split('\n');
    const processedLines = lines.map(line => {
        const trimmedLine = line.trim();
        if (trimmedLine === '') return '';
        if (trimmedLine.startsWith('<')) return line; // Already HTML
        if (trimmedLine.includes('<h') || trimmedLine.includes('<ul') || trimmedLine.includes('<li')) return line;
        return `<p>${trimmedLine}</p>`;
    });
    
    htmlContent = processedLines.join('\n');
    
    // Clean up extra whitespace
    htmlContent = htmlContent.replace(/\n\s*\n/g, '\n');
    htmlContent = htmlContent.replace(/\n+/g, '\n');
    
    return htmlContent.trim();
}

/**
 * Get default hero image based on category
 */
function getDefaultHeroImage(category) {
    const defaultImages = {
        'business-acquisition': 'https://arzani-images1.s3.eu-west-2.amazonaws.com/blogs/business-acquisition-default.jpg',
        'business-selling': 'https://arzani-images1.s3.eu-west-2.amazonaws.com/blogs/business-selling-default.jpg',
        'business-valuation': 'https://arzani-images1.s3.eu-west-2.amazonaws.com/blogs/business-valuation-default.jpg',
        'business-financing': 'https://arzani-images1.s3.eu-west-2.amazonaws.com/blogs/business-financing-default.jpg',
        'market-trends': 'https://arzani-images1.s3.eu-west-2.amazonaws.com/blogs/market-trends-default.jpg',
        'business-marketplace': 'https://arzani-images1.s3.eu-west-2.amazonaws.com/blogs/marketplace-default.jpg',
        'default': 'https://arzani-images1.s3.eu-west-2.amazonaws.com/blogs/default-blog-hero.jpg'
    };
    
    const categoryKey = category ? category.toLowerCase().replace(/\s+/g, '-') : 'default';
    return defaultImages[categoryKey] || defaultImages['default'];
}

/**
 * Identify posts that need formatting fixes
 */
async function identifyProblematicPosts() {
    try {
        const result = await pool.query(`
            SELECT id, title, slug, content, hero_image, content_category,
                   CASE 
                       WHEN hero_image IS NULL OR hero_image = '' THEN 'Missing Hero Image'
                       ELSE 'Has Hero Image'
                   END as image_status,
                   CASE
                       WHEN content LIKE '%**%' AND content NOT LIKE '%<strong>%' THEN 'Markdown Format Issues'
                       WHEN content LIKE '%##%' AND content NOT LIKE '%<h%' THEN 'Heading Format Issues'  
                       WHEN LENGTH(content) < 500 THEN 'Content Too Short'
                       WHEN content LIKE '%outline and provide examples%' THEN 'Meta Content'
                       WHEN content LIKE '%I''m unable to fulfill%' THEN 'Failed Content'
                       ELSE 'Format OK'
                   END as content_status,
                   LENGTH(content) as content_length
            FROM blog_posts 
            WHERE (
                (content LIKE '%**%' AND content NOT LIKE '%<strong>%') OR
                (content LIKE '%##%' AND content NOT LIKE '%<h%') OR
                (hero_image IS NULL OR hero_image = '') OR
                LENGTH(content) < 500 OR
                content LIKE '%outline and provide examples%' OR
                content LIKE '%I''m unable to fulfill%'
            )
            ORDER BY created_at DESC
        `);
        
        return result.rows;
    } catch (error) {
        console.error('Error identifying problematic posts:', error);
        throw error;
    }
}

/**
 * Fix formatting issues for a specific post
 */
async function fixPostFormatting(postId, content, heroImage, contentCategory) {
    try {
        const fixedContent = convertMarkdownToHtml(content);
        const defaultHeroImage = getDefaultHeroImage(contentCategory);
        const finalHeroImage = heroImage || defaultHeroImage;
        
        const result = await pool.query(`
            UPDATE blog_posts 
            SET 
                content = $1,
                hero_image = $2,
                updated_at = NOW()
            WHERE id = $3
            RETURNING id, title, slug
        `, [fixedContent, finalHeroImage, postId]);
        
        return result.rows[0];
    } catch (error) {
        console.error(`Error fixing post ${postId}:`, error);
        throw error;
    }
}

/**
 * Fix posts with insufficient content by updating them with placeholder content
 */
async function fixInsufficientPosts() {
    try {
        // First, identify posts with insufficient content
        const insufficientPosts = await pool.query(`
            SELECT id, title, slug, content_category 
            FROM blog_posts 
            WHERE 
                LENGTH(content) < 100 OR
                content LIKE '%I''m unable to fulfill%' OR
                content LIKE '%outline and provide examples%'
        `);
        
        const fixedPosts = [];
        
        for (const post of insufficientPosts.rows) {
            // Generate appropriate content based on title and category
            const placeholderContent = generatePlaceholderContent(post.title, post.content_category);
            const defaultHeroImage = getDefaultHeroImage(post.content_category);
            
            const result = await pool.query(`
                UPDATE blog_posts 
                SET 
                    content = $1,
                    hero_image = COALESCE(hero_image, $2),
                    excerpt = $3,
                    updated_at = NOW()
                WHERE id = $4
                RETURNING id, title, slug
            `, [
                placeholderContent, 
                defaultHeroImage,
                `Comprehensive guide covering ${post.title.toLowerCase()}.`,
                post.id
            ]);
            
            fixedPosts.push(result.rows[0]);
        }
        
        return fixedPosts;
    } catch (error) {
        console.error('Error fixing insufficient posts:', error);
        throw error;
    }
}

/**
 * Generate appropriate placeholder content based on title and category
 */
function generatePlaceholderContent(title, category) {
    const categoryContent = {
        'business-acquisition': 'business acquisition strategies, due diligence processes, and market opportunities',
        'business-selling': 'business exit strategies, valuation methods, and sale preparation',
        'business-valuation': 'valuation methodologies, market analysis, and financial assessment',
        'business-financing': 'funding options, loan requirements, and financial planning',
        'market-trends': 'industry trends, market analysis, and future opportunities',
        'business-marketplace': 'marketplace dynamics, platform strategies, and digital commerce'
    };
    
    const categoryKey = category ? category.toLowerCase().replace(/\s+/g, '-') : 'business-marketplace';
    const contentFocus = categoryContent[categoryKey] || 'business strategies and market insights';
    
    return `
<h2>Understanding ${title}</h2>
<p>In today's dynamic UK business landscape, understanding ${title.toLowerCase()} is crucial for successful business operations. This comprehensive guide explores the key aspects of ${contentFocus} that every business owner should know.</p>

<h2>Key Considerations</h2>
<p>When evaluating ${title.toLowerCase()}, several critical factors must be taken into account:</p>
<ul>
<li><strong>Market Analysis</strong>: Understanding current market conditions and trends</li>
<li><strong>Financial Planning</strong>: Developing robust financial strategies and projections</li>
<li><strong>Strategic Implementation</strong>: Creating actionable plans for business success</li>
<li><strong>Risk Assessment</strong>: Identifying and mitigating potential challenges</li>
</ul>

<h2>Best Practices and Strategies</h2>
<p>Successful ${title.toLowerCase()} requires a systematic approach that combines industry expertise with practical implementation. Key strategies include:</p>

<h3>Planning and Preparation</h3>
<p>Thorough preparation is essential for achieving optimal outcomes. This involves comprehensive research, financial analysis, and strategic planning.</p>

<h3>Expert Guidance</h3>
<p>Working with experienced professionals can significantly improve your chances of success and help you navigate complex decisions.</p>

<h2>Next Steps</h2>
<p>For businesses looking to excel in ${title.toLowerCase()}, we recommend starting with a thorough assessment of your current situation and developing a clear action plan. Our team at Arzani can provide expert guidance and support throughout this process.</p>

<p><strong>Ready to take the next step?</strong> Contact our team today to discuss how we can help you achieve your business objectives.</p>
    `.trim();
}

/**
 * Main execution function
 */
async function main() {
    console.log('🔍 Starting blog formatting fix process...\n');
    
    try {
        // 1. Identify problematic posts
        console.log('1. Identifying problematic posts...');
        const problematicPosts = await identifyProblematicPosts();
        console.log(`Found ${problematicPosts.length} posts with issues:\n`);
        
        problematicPosts.forEach(post => {
            console.log(`- ID ${post.id}: ${post.title}`);
            console.log(`  Content Status: ${post.content_status}`);
            console.log(`  Image Status: ${post.image_status}`);
            console.log(`  Content Length: ${post.content_length} characters\n`);
        });
        
        // 2. Fix posts with insufficient content
        console.log('2. Fixing posts with insufficient content...');
        const fixedInsufficientPosts = await fixInsufficientPosts();
        
        if (fixedInsufficientPosts.length > 0) {
            console.log(`Fixed ${fixedInsufficientPosts.length} posts with insufficient content:`);
            fixedInsufficientPosts.forEach(post => {
                console.log(`- ID ${post.id}: ${post.title}`);
            });
        } else {
            console.log('No posts needed content regeneration.');
        }
        console.log('');
        
        // 3. Fix formatting for remaining posts
        console.log('3. Fixing formatting for remaining posts...');
        const remainingProblematic = problematicPosts.filter(post => 
            post.content_status !== 'Content Too Short' && 
            post.content_status !== 'Meta Content' && 
            post.content_status !== 'Failed Content'
        );
        
        let fixedCount = 0;
        for (const post of remainingProblematic) {
            try {
                const fixedPost = await fixPostFormatting(
                    post.id, 
                    post.content, 
                    post.hero_image, 
                    post.content_category
                );
                
                console.log(`✅ Fixed post ID ${fixedPost.id}: ${fixedPost.title}`);
                fixedCount++;
            } catch (error) {
                console.error(`❌ Failed to fix post ID ${post.id}: ${error.message}`);
            }
        }
        
        console.log(`\n4. Summary:`);
        console.log(`- Total problematic posts found: ${problematicPosts.length}`);
        console.log(`- Posts with content regenerated: ${fixedInsufficientPosts.length}`);
        console.log(`- Posts with formatting fixed: ${fixedCount}`);
        console.log(`\n✅ Blog formatting fix process completed!`);
        
    } catch (error) {
        console.error('❌ Error in main process:', error);
        throw error;
    }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('fix-blog-formatting.js')) {
    main()
        .then(() => {
            console.log('\n🎉 All blog formatting fixes completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Blog formatting fix failed:', error);
            process.exit(1);
        });
}

export { main as fixBlogFormatting, identifyProblematicPosts, fixPostFormatting, fixInsufficientPosts };
