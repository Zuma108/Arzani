/**
 * Populate Sample Blog Content
 * 
 * This script populates the database with sample pillar posts and supporting posts
 * to test the programmatic SEO blog system. It creates pillar posts for each category
 * and multiple supporting posts linked to each pillar post.
 */

import db from './db.js';
import slugify from 'slugify';

// Sample categories from PRD
const CATEGORIES = [
  'Business Growth',
  'Marketing Strategies',
  'Sales Techniques',
  'Customer Insights',
  'Market Trends',
  'Industry Solutions'
];

// Sample authors
const AUTHORS = [
  { name: 'Jane Smith', bio: 'Marketing expert with 10+ years of experience', avatar: '/images/authors/jane-smith.jpg' },
  { name: 'John Doe', bio: 'Business growth strategist and consultant', avatar: '/images/authors/john-doe.jpg' },
  { name: 'Sarah Johnson', bio: 'Sales and customer experience specialist', avatar: '/images/authors/sarah-johnson.jpg' },
];

// Sample pillar post templates for each category
const PILLAR_POSTS = [
  {
    title: 'Complete Guide to Business Growth in 2023',
    category: 'Business Growth',
    summary: 'A comprehensive guide covering all aspects of business growth strategies for small and medium businesses.',
    seo_title: 'Ultimate Business Growth Guide: Strategies for 2023 | YourBrand',
    seo_description: 'Discover proven business growth strategies for 2023. Our comprehensive guide covers everything from market expansion to operational efficiency.',
    keywords: 'business growth, growth strategies, business expansion, scaling business, business development',
    readTime: 15,
  },
  {
    title: 'Digital Marketing Strategies That Drive Results',
    category: 'Marketing Strategies',
    summary: 'Learn about the most effective digital marketing strategies that generate measurable results for your business.',
    seo_title: 'Effective Digital Marketing Strategies That Drive Results | YourBrand',
    seo_description: 'Explore digital marketing strategies that deliver real results. From SEO to social media, learn how to optimize your marketing efforts.',
    keywords: 'digital marketing, marketing strategy, SEO, social media marketing, content marketing',
    readTime: 12,
  },
  {
    title: 'Advanced Sales Techniques for the Modern Market',
    category: 'Sales Techniques',
    summary: 'Advanced sales methodologies and techniques adapted for today\'s changing market landscape.',
    seo_title: 'Advanced Sales Techniques for the Modern Market | YourBrand',
    seo_description: 'Master advanced sales techniques designed for today\'s market. Learn strategies to close more deals and build lasting customer relationships.',
    keywords: 'sales techniques, modern selling, sales strategy, relationship selling, sales methodology',
    readTime: 10,
  },
  {
    title: 'Understanding Customer Behavior: A Data-Driven Approach',
    category: 'Customer Insights',
    summary: 'A data-driven exploration of customer behavior patterns and how to leverage them for business success.',
    seo_title: 'Understanding Customer Behavior: Data-Driven Insights | YourBrand',
    seo_description: 'Dive into customer behavior analysis with our data-driven approach. Learn how to use behavioral insights to improve products and services.',
    keywords: 'customer behavior, consumer insights, customer analytics, customer data, customer research',
    readTime: 14,
  },
  {
    title: 'Emerging Market Trends for 2023 and Beyond',
    category: 'Market Trends',
    summary: 'Analysis of emerging market trends and how they will shape business opportunities in 2023 and beyond.',
    seo_title: 'Emerging Market Trends for 2023 and Beyond | YourBrand',
    seo_description: 'Stay ahead with our analysis of emerging market trends for 2023 and beyond. Discover opportunities and prepare your business for the future.',
    keywords: 'market trends, industry trends, future trends, trend analysis, market forecast',
    readTime: 11,
  },
  {
    title: 'Industry-Specific Solutions for Common Business Challenges',
    category: 'Industry Solutions',
    summary: 'Tailored solutions for common challenges faced by businesses across different industry verticals.',
    seo_title: 'Industry-Specific Solutions for Business Challenges | YourBrand',
    seo_description: 'Find industry-specific solutions to common business challenges. Our guide provides actionable strategies tailored to your sector.',
    keywords: 'industry solutions, business challenges, sector-specific strategies, business problems, industry best practices',
    readTime: 13,
  }
];

// Supporting post templates for each pillar post (3 per pillar)
const generateSupportingPosts = (pillarTitle, pillarCategory) => {
  // Create different supporting posts based on the category
  switch(pillarCategory) {
    case 'Business Growth':
      return [
        {
          title: '5 Financial Strategies to Fuel Your Business Growth',
          summary: 'Financial strategies and funding options to support your business growth initiatives.',
          seo_title: '5 Financial Strategies for Business Growth | YourBrand',
          seo_description: 'Discover 5 proven financial strategies to fuel your business growth. Learn how to secure funding and optimize financial resources.',
          keywords: 'business finance, growth funding, financial strategy, business investment, capital for growth',
          readTime: 8,
        },
        {
          title: 'Scaling Your Team: Hiring Strategies for Growing Businesses',
          summary: 'Best practices for hiring and building teams that can support and accelerate your business growth.',
          seo_title: 'Scaling Your Team: Hiring Strategies for Growth | YourBrand',
          seo_description: 'Learn effective hiring strategies for scaling your team. Build a workforce that supports and accelerates your business growth.',
          keywords: 'hiring strategy, team scaling, growth hiring, talent acquisition, workforce expansion',
          readTime: 7,
        },
        {
          title: 'How to Expand Your Market Reach and Grow Your Customer Base',
          summary: 'Strategies for expanding your market reach and acquiring new customers to drive business growth.',
          seo_title: 'Expand Market Reach & Grow Customer Base | YourBrand',
          seo_description: 'Explore strategies for expanding your market reach and growing your customer base. Drive sustainable business growth with these approaches.',
          keywords: 'market expansion, customer acquisition, new markets, customer growth, market development',
          readTime: 9,
        }
      ];
    case 'Marketing Strategies':
      return [
        {
          title: 'Content Marketing: Creating a Strategy That Converts',
          summary: 'How to develop a content marketing strategy that drives conversions and business results.',
          seo_title: 'Content Marketing Strategy That Converts | YourBrand',
          seo_description: 'Develop a content marketing strategy that actually converts. Learn how to create content that drives engagement and business results.',
          keywords: 'content marketing, content strategy, conversion content, marketing content, content ROI',
          readTime: 9,
        },
        {
          title: 'SEO Fundamentals: Optimizing Your Online Presence',
          summary: 'Essential SEO practices to improve your online visibility and drive organic traffic.',
          seo_title: 'SEO Fundamentals: Optimize Your Online Presence | YourBrand',
          seo_description: 'Master SEO fundamentals to optimize your online presence. Learn essential techniques to improve visibility and drive organic traffic.',
          keywords: 'SEO basics, search engine optimization, organic traffic, SEO strategy, online visibility',
          readTime: 8,
        },
        {
          title: 'Social Media Marketing: Platform-Specific Strategies',
          summary: 'Tailored marketing strategies for different social media platforms to maximize engagement and results.',
          seo_title: 'Social Media Marketing: Platform-Specific Strategies | YourBrand',
          seo_description: 'Implement platform-specific social media marketing strategies. Maximize engagement and results across different social networks.',
          keywords: 'social media marketing, Facebook marketing, Instagram strategy, LinkedIn marketing, Twitter strategy',
          readTime: 10,
        }
      ];
    default:
      return [
        {
          title: `Supporting Article 1 for ${pillarTitle}`,
          summary: `A supporting article exploring specific aspects of ${pillarCategory}.`,
          seo_title: `Supporting Article 1 for ${pillarCategory} | YourBrand`,
          seo_description: `Explore specific aspects of ${pillarCategory} in this detailed supporting article. Learn practical strategies and insights.`,
          keywords: `${pillarCategory.toLowerCase()}, supporting content, article 1`,
          readTime: 7,
        },
        {
          title: `Supporting Article 2 for ${pillarTitle}`,
          summary: `A deeper dive into key elements of ${pillarCategory}.`,
          seo_title: `Supporting Article 2 for ${pillarCategory} | YourBrand`,
          seo_description: `Take a deeper dive into key elements of ${pillarCategory}. This article provides detailed analysis and actionable advice.`,
          keywords: `${pillarCategory.toLowerCase()}, supporting content, article 2`,
          readTime: 8,
        },
        {
          title: `Supporting Article 3 for ${pillarTitle}`,
          summary: `Practical implementation guide for ${pillarCategory}.`,
          seo_title: `Practical Implementation Guide for ${pillarCategory} | YourBrand`,
          seo_description: `Get a practical implementation guide for ${pillarCategory}. Learn step-by-step approaches to apply these concepts in your business.`,
          keywords: `${pillarCategory.toLowerCase()}, implementation guide, practical steps`,
          readTime: 9,
        }
      ];
  }
};

// Sample content generation for brevity (in production, this would be more extensive)
const generateSampleContent = (title, category) => {
  return `
# ${title}

## Introduction
This is a sample introduction for the article about ${category}. In a real implementation, this would be much more extensive and valuable content.

## Main Points
- Key point 1 about ${category}
- Key point 2 about ${category}
- Key point 3 about ${category}

## Conclusion
This is a sample conclusion for the article about ${category}.
`;
};

// Helper function to generate a URL path
const generateUrlPath = (title, category) => {
  const categorySlug = slugify(category, { lower: true });
  const titleSlug = slugify(title, { lower: true });
  return `/${categorySlug}/${titleSlug}`;
};

// Helper function to get a random author
const getRandomAuthor = () => {
  return AUTHORS[Math.floor(Math.random() * AUTHORS.length)];
};

// Function to insert a pillar post
async function insertPillarPost(post) {
  const author = getRandomAuthor();
  const urlPath = generateUrlPath(post.title, post.category);
  const content = generateSampleContent(post.title, post.category);
  const slug = slugify(post.title, { lower: true });
  
  try {
    // Insert using the actual database schema (id is auto-increment integer)
    const query = `
      INSERT INTO blog_posts (
        title, slug, content, excerpt, meta_description, status, 
        author_name, author_bio, author_image, is_pillar, 
        seo_title, seo_keywords, reading_time,
        content_category, url_path, seo_description,
        summary, category, keywords, read_time, author_avatar
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 
        $7, $8, $9, $10, 
        $11, $12, $13,
        $14, $15, $16,
        $17, $18, $19, $20, $21
      ) RETURNING id;
    `;
    
    const values = [
      post.title,                    // $1
      slug,                          // $2
      content,                       // $3
      post.summary,                  // $4 (excerpt)
      post.seo_description,          // $5 (meta_description)
      'Published',                   // $6 (status)
      author.name,                   // $7 (author_name)
      author.bio,                    // $8 (author_bio)
      author.avatar,                 // $9 (author_image)
      true,                          // $10 (is_pillar)
      post.seo_title,                // $11 (seo_title)
      post.keywords.substring(0, 255), // $12 (seo_keywords - truncated to varchar limit)
      post.readTime,                 // $13 (reading_time)
      post.category,                 // $14 (content_category)
      urlPath,                       // $15 (url_path)
      post.seo_description,          // $16 (seo_description)
      post.summary,                  // $17 (summary)
      post.category,                 // $18 (category)
      post.keywords,                 // $19 (keywords - full text)
      post.readTime,                 // $20 (read_time)
      author.avatar                  // $21 (author_avatar)
    ];
    
    const result = await db.query(query, values);
    console.log(`Inserted pillar post: ${post.title} with ID: ${result.rows[0].id}`);
    return result.rows[0].id;
  } catch (error) {
    console.error(`Error inserting pillar post: ${post.title}`, error);
    throw error;
  }
}

// Function to insert a supporting post
async function insertSupportingPost(post, pillarPostId) {
  const author = getRandomAuthor();
  const urlPath = generateUrlPath(post.title, post.category);
  const content = generateSampleContent(post.title, post.category);
  const slug = slugify(post.title, { lower: true });
  
  try {
    // Insert using the actual database schema (id is auto-increment integer)
    const query = `
      INSERT INTO blog_posts (
        title, slug, content, excerpt, meta_description, status, 
        author_name, author_bio, author_image, is_pillar, 
        seo_title, seo_keywords, reading_time,
        content_category, url_path, seo_description,
        summary, category, keywords, read_time, author_avatar
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 
        $7, $8, $9, $10, 
        $11, $12, $13,
        $14, $15, $16,
        $17, $18, $19, $20, $21
      ) RETURNING id;
    `;
    
    const values = [
      post.title,                    // $1
      slug,                          // $2
      content,                       // $3
      post.summary,                  // $4 (excerpt)
      post.seo_description,          // $5 (meta_description)
      'Published',                   // $6 (status)
      author.name,                   // $7 (author_name)
      author.bio,                    // $8 (author_bio)
      author.avatar,                 // $9 (author_image)
      false,                         // $10 (is_pillar - false for supporting posts)
      post.seo_title,                // $11 (seo_title)
      post.keywords.substring(0, 255), // $12 (seo_keywords - truncated to varchar limit)
      post.readTime,                 // $13 (reading_time)
      post.category,                 // $14 (content_category)
      urlPath,                       // $15 (url_path)
      post.seo_description,          // $16 (seo_description)
      post.summary,                  // $17 (summary)
      post.category,                 // $18 (category)
      post.keywords,                 // $19 (keywords - full text)
      post.readTime,                 // $20 (read_time)
      author.avatar                  // $21 (author_avatar)
    ];
    
    const result = await db.query(query, values);
    const supportingPostId = result.rows[0].id;
    console.log(`Inserted supporting post: ${post.title} with ID: ${supportingPostId}`);
    
    // Create relationship with pillar post
    await createContentRelationship(pillarPostId, supportingPostId);
    
    return supportingPostId;
  } catch (error) {
    console.error(`Error inserting supporting post: ${post.title}`, error);
    throw error;
  }
}

// Function to create content relationship
async function createContentRelationship(pillarPostId, supportingPostId) {
  try {
    // Use the actual schema - pillar_post_id and supporting_post_id are integers
    const query = `
      INSERT INTO blog_content_relationships (
        pillar_post_id, supporting_post_id, relationship_type
      ) VALUES (
        $1, $2, $3
      );
    `;
    
    const values = [pillarPostId, supportingPostId, 'supporting'];
    
    await db.query(query, values);
    console.log(`Created relationship: Pillar ${pillarPostId} -> Supporting ${supportingPostId}`);
  } catch (error) {
    console.error(`Error creating content relationship`, error);
    if (error.message.includes('duplicate key value')) {
      console.log('Relationship already exists, skipping...');
    } else {
      throw error;
    }
  }
}

// Main function to populate the database
async function populateSampleBlogContent() {
  try {
    console.log('Starting to populate sample blog content...');
    
    // For each pillar post template
    for (const pillarPost of PILLAR_POSTS) {
      // Insert the pillar post
      const pillarPostId = await insertPillarPost(pillarPost);
      
      // Generate and insert supporting posts for this pillar
      const supportingPosts = generateSupportingPosts(pillarPost.title, pillarPost.category);
      for (const supportingPost of supportingPosts) {
        supportingPost.category = pillarPost.category; // Ensure same category
        await insertSupportingPost(supportingPost, pillarPostId);
      }
      
      console.log(`Completed pillar post '${pillarPost.title}' with ${supportingPosts.length} supporting posts`);
    }
    
    console.log('Sample blog content population completed successfully!');
  } catch (error) {
    console.error('Error populating sample blog content:', error);
  } finally {
    // Close the database connection
    await db.end();
  }
}

// Run the population script
populateSampleBlogContent();
