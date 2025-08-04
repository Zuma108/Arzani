/**
 * Script to insert the 5 SEO-optimized blog posts into the database
 * Parses the JavaScript blog content files and inserts them with proper categories
 */

import db from '../../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to calculate reading time based on content length
function calculateReadingTime(content) {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

// Function to generate excerpt from content
function generateExcerpt(content, maxLength = 200) {
  // Remove markdown headers and get clean text
  const cleanText = content
    .replace(/^#+ .*/gm, '') // Remove headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
    .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
    .replace(/`(.*?)`/g, '$1') // Remove code formatting
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim();
  
  if (cleanText.length <= maxLength) return cleanText;
  
  const truncated = cleanText.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return truncated.substring(0, lastSpace) + '...';
}

// Function to generate schema markup for blog posts
function generateSchemaMarkup(post) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.metaDescription,
    "author": {
      "@type": "Person",
      "name": "Arzani Research Team"
    },
    "datePublished": new Date().toISOString(),
    "dateModified": new Date().toISOString(),
    "publisher": {
      "@type": "Organization",
      "name": "Arzani",
      "logo": {
        "@type": "ImageObject",
        "url": "https://arzani.co.uk/logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://arzani.co.uk/blog/${post.slug}`
    }
  }, null, 2);
}

// Function to load and parse blog content from JS files
async function loadBlogContent(filename) {
  try {
    const filePath = path.join(__dirname, 'blog-content', filename);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Extract the module.exports content (simple parsing)
    const moduleExportsMatch = fileContent.match(/const blogPost = ({[\s\S]*?});[\s\S]*module\.exports = blogPost;/);
    if (!moduleExportsMatch) {
      throw new Error(`Could not parse blog content from ${filename}`);
    }
    
    // SECURITY FIX: Use safe parsing instead of eval()
    let blogPostData;
    try {
      // First attempt to parse as JSON
      blogPostData = JSON.parse(moduleExportsMatch[1]);
    } catch (jsonError) {
      // If JSON parsing fails, use Function constructor for safer evaluation
      // This is still not ideal but much safer than eval()
      try {
        const safeEval = new Function('return ' + moduleExportsMatch[1]);
        blogPostData = safeEval();
      } catch (funcError) {
        throw new Error(`Could not safely parse blog content from ${filename}: ${funcError.message}`);
      }
    }
    return blogPostData;
  } catch (error) {
    console.error(`Error loading blog content from ${filename}:`, error.message);
    throw error;
  }
}

// Function to get category ID by mapping
function getCategoryIdByType(contentType) {
  const categoryMapping = {
    'business-acquisition': 4501, // Business Acquisition
    'business-valuation': 25,    // Business Valuation
    'business-marketplace': 4505, // AI in Business (closest match for marketplace)
    'business-financing': 30,    // Funding
    'business-planning': 27      // Growth Strategies
  };
  
  return categoryMapping[contentType] || 25; // Default to Business Valuation
}

// Function to insert blog post into database
async function insertBlogPost(postData) {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // Prepare blog post data
    const readingTime = calculateReadingTime(postData.content);
    const excerpt = generateExcerpt(postData.content);
    const schema = generateSchemaMarkup(postData);
    
    // Get category ID from cluster data
    const categoryId = getCategoryIdByType(postData.clusterData?.pillarTopic?.toLowerCase().replace(/\s+/g, '-'));
    
    // Insert blog post
    const insertQuery = `
      INSERT INTO blog_posts (
        title,
        slug,
        content,
        excerpt,
        meta_description,
        seo_description,
        author_name,
        author_bio,
        author_image,
        author_avatar,
        status,
        is_featured,
        is_pillar,
        view_count,
        reading_time,
        read_time,
        publish_date,
        published_date,
        created_at,
        updated_at,
        seo_title,
        seo_keywords,
        schema_markup,
        content_category,
        category,
        target_keyword,
        secondary_keywords,
        keywords,
        buying_stage,
        cta_type,
        cta_text,
        cta_link,
        url_path,
        canonical_url,
        og_description,
        summary
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36
      ) RETURNING id, slug;
    `;
    
    const insertValues = [
      postData.title,
      postData.slug,
      postData.content,
      excerpt,
      postData.metaDescription,
      postData.metaDescription, // seo_description
      'Arzani Research Team',
      'Expert team specializing in UK business market analysis and AI-powered insights.',
      '/images/authors/arzani-team.jpg',
      '/images/authors/arzani-team-avatar.jpg',
      'Published',
      true, // is_featured
      true, // is_pillar
      0, // view_count
      readingTime, // reading_time
      readingTime, // read_time
      new Date(), // publish_date
      new Date(), // published_date
      new Date(), // created_at
      new Date(), // updated_at
      postData.title, // seo_title
      postData.primaryKeywords.join(', '),
      schema,
      postData.clusterData?.pillarTopic || 'Business Analysis',
      postData.clusterData?.pillarTopic || 'Business Analysis', // category
      postData.seoData?.focusKeyword || postData.primaryKeywords[0],
      postData.longtailKeywords.join(', '),
      [...postData.primaryKeywords, ...postData.longtailKeywords].join(', '), // keywords
      'Awareness', // buying_stage
      'marketplace-visit', // cta_type
      'Explore Our Marketplace', // cta_text
      '/marketplace', // cta_link
      `/blog/${postData.slug}`, // url_path
      postData.seoData?.canonicalUrl || `/blog/${postData.slug}`,
      postData.metaDescription, // og_description
      excerpt // summary
    ];
    
    const insertResult = await client.query(insertQuery, insertValues);
    const postId = insertResult.rows[0].id;
    
    console.log(`✅ Inserted blog post: "${postData.title}" (ID: ${postId})`);
    
    // Associate with category
    await client.query(
      'INSERT INTO blog_post_categories (post_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [postId, categoryId]
    );
    
    console.log(`   📁 Associated with category ID: ${categoryId}`);
    
    // Create/associate tags for primary keywords
    for (const keyword of postData.primaryKeywords.slice(0, 5)) { // Limit to 5 tags
      const tagSlug = keyword.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      // Insert or get tag
      const tagResult = await client.query(
        'INSERT INTO blog_tags (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id',
        [keyword, tagSlug]
      );
      
      const tagId = tagResult.rows[0].id;
      
      // Associate tag with post
      await client.query(
        'INSERT INTO blog_post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [postId, tagId]
      );
    }
    
    console.log(`   🏷️  Associated with ${postData.primaryKeywords.slice(0, 5).length} tags`);
    
    await client.query('COMMIT');
    return insertResult.rows[0];
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Error inserting blog post "${postData.title}":`, error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Main function to insert all blog posts
async function insertAllBlogPosts() {
  console.log('🚀 Starting blog post insertion process...\n');
  
  const blogFiles = [
    'uk-business-acquisition-trends-2025.js',
    'ai-business-valuation-revolution-uk-2025.js',
    'uk-online-business-marketplace-guide-2025.js',
    'uk-business-financing-guide-2025.js',
    'uk-small-business-startup-trends-2025.js'
  ];
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const filename of blogFiles) {
    try {
      console.log(`📝 Processing: ${filename}`);
      
      const postData = await loadBlogContent(filename);
      const result = await insertBlogPost(postData);
      
      console.log(`   ✅ Successfully inserted: ${result.slug}\n`);
      successCount++;
      
    } catch (error) {
      console.error(`   ❌ Failed to insert ${filename}:`, error.message, '\n');
      errorCount++;
    }
  }
  
  console.log('📊 Summary:');
  console.log(`   ✅ Successfully inserted: ${successCount} posts`);
  console.log(`   ❌ Failed: ${errorCount} posts`);
  
  if (successCount > 0) {
    console.log('\n🎉 Blog posts have been successfully added to your database!');
    console.log('   You can now view them in your blog section.');
  }
}

// Handle command line execution
if (import.meta.url === `file://${process.argv[1]}`) {
  insertAllBlogPosts()
    .then(() => {
      console.log('\n✨ Process completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Process failed:', error);
      process.exit(1);
    });
}

export default insertAllBlogPosts;
