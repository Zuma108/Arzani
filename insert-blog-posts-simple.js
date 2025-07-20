/**
 * Simple script to insert the 5 SEO-optimized blog posts into the database
 * Direct data insertion without complex file parsing
 */

import db from './db.js';

// Blog posts data extracted from the JS files
const blogPosts = [
  {
    title: "UK Business Acquisition Trends 2025: Record Deal Values Despite Market Challenges",
    slug: "uk-business-acquisition-trends-2025",
    metaDescription: "Discover the latest UK business acquisition trends for 2025. Record £1 billion average deal values, 160% growth in M&A activity, and key market insights for buyers and sellers.",
    category: "Business Acquisition",
    categoryId: 4501,
    primaryKeywords: [
      "UK business acquisition trends 2025",
      "business acquisition UK statistics", 
      "M&A activity UK 2025",
      "UK business sale volumes",
      "business acquisition market UK"
    ],
    longtailKeywords: [
      "average business sale price UK 2025",
      "UK M&A deal values 2025",
      "business acquisition challenges UK",
      "post-Brexit business acquisitions",
      "UK takeover market trends"
    ],
    contentPreview: "The UK business acquisition landscape in 2025 presents a fascinating paradox: while deal volumes have declined by approximately 9%, aggregate deal values have soared by an unprecedented 160% compared to 2023. This dramatic shift signals a fundamental change in the M&A market, with larger, more strategic transactions dominating the landscape...",
    estimatedReadTime: 22
  },
  {
    title: "AI Revolution in Business Valuation: How Technology is Transforming UK Company Valuations in 2025",
    slug: "ai-business-valuation-revolution-uk-2025",
    metaDescription: "Discover how AI is revolutionizing business valuation in the UK. Learn about automated valuation tools, accuracy improvements, cost savings, and the future of tech-driven company valuations.",
    category: "Business Valuation",
    categoryId: 25,
    primaryKeywords: [
      "AI business valuation",
      "automated business valuation UK",
      "business valuation methods 2025",
      "UK company valuation technology",
      "AI valuation tools"
    ],
    longtailKeywords: [
      "how AI improves business valuation accuracy",
      "automated valuation platforms UK",
      "cost savings from AI business valuation",
      "UK business valuation multiples 2025",
      "technology platforms for business valuation"
    ],
    contentPreview: "The business valuation landscape in the UK is undergoing a fundamental transformation as artificial intelligence and machine learning technologies revolutionize how companies are valued. In 2025, AI-powered valuation tools are delivering unprecedented accuracy, speed, and cost-effectiveness...",
    estimatedReadTime: 25
  },
  {
    title: "Complete Guide to UK Online Business Marketplaces 2025: Top Platforms, Fees, and Strategies",
    slug: "uk-online-business-marketplace-guide-2025",
    metaDescription: "Discover the top UK online business marketplaces in 2025. Compare platforms, fees, features, and strategies for buying and selling businesses online in the United Kingdom.",
    category: "AI in Business",
    categoryId: 4505,
    primaryKeywords: [
      "UK business marketplace",
      "online business broker platforms UK",
      "business for sale UK platforms",
      "UK business marketplace 2025",
      "online business marketplace guide"
    ],
    longtailKeywords: [
      "best UK business marketplace platforms 2025",
      "online business broker commission rates UK",
      "UK business marketplace fees comparison",
      "how to sell business online UK",
      "buy business online UK marketplace"
    ],
    contentPreview: "The UK online business marketplace sector has experienced unprecedented growth in 2025, with record-high business registrations of 846,000 new companies creating dynamic opportunities for both buyers and sellers. As digital transformation reshapes how businesses are bought and sold...",
    estimatedReadTime: 28
  },
  {
    title: "UK Business Financing Guide 2025: Complete Overview of Funding Options, Rates, and Strategies",
    slug: "uk-business-financing-guide-2025",
    metaDescription: "Comprehensive guide to UK business financing in 2025. Compare loan rates, alternative funding options, government schemes, and fintech solutions for small businesses and startups.",
    category: "Funding", 
    categoryId: 30,
    primaryKeywords: [
      "UK business financing 2025",
      "business loans UK rates",
      "small business funding options UK",
      "UK business loan rates 2025",
      "business financing guide UK"
    ],
    longtailKeywords: [
      "UK business loan interest rates 2025",
      "alternative business financing UK", 
      "government business grants UK 2025",
      "fintech business lending UK",
      "SME financing options United Kingdom"
    ],
    contentPreview: "The UK business financing landscape in 2025 presents both challenges and opportunities for entrepreneurs and established businesses. With base rates at 4.25% and evolving alternative financing options, understanding the full spectrum of funding solutions has become crucial for business success...",
    estimatedReadTime: 32
  },
  {
    title: "UK Small Business and Startup Trends 2025: Record Growth, Key Statistics, and Market Opportunities",
    slug: "uk-small-business-startup-trends-2025",
    metaDescription: "Explore UK startup trends 2025 with record 846,000 new business registrations. Discover survival rates, popular sectors, demographics, and technology adoption statistics.",
    category: "Growth Strategies",
    categoryId: 27,
    primaryKeywords: [
      "UK startup trends 2025",
      "small business statistics UK",
      "new business registration UK 2025",
      "UK startup survival rates",
      "business formation UK statistics"
    ],
    longtailKeywords: [
      "UK new business registrations 2025 statistics",
      "small business survival rates United Kingdom",
      "popular business sectors UK startups",
      "UK entrepreneur demographics 2025",
      "technology adoption small business UK"
    ],
    contentPreview: "The UK startup ecosystem has reached unprecedented heights in 2025, with a record-breaking 846,000 new companies registered—marking the highest level of business formation in British history. This entrepreneurial surge, coupled with evolving demographics and technology adoption patterns...",
    estimatedReadTime: 35
  }
];

// Function to generate full content for each post (placeholder content with proper structure)
function generateFullContent(post) {
  return `
# ${post.title}

${post.contentPreview}

## Key Market Statistics and Trends

Recent research reveals significant developments in the UK business landscape:

- Record levels of business activity and market engagement
- Technology-driven transformation across all sectors
- Enhanced regulatory compliance and market transparency
- Growing emphasis on sustainable business practices
- Increased focus on data-driven decision making

## Market Analysis and Insights

### Current Market Conditions

The 2025 business environment presents unique opportunities and challenges. Market participants are adapting to:

1. **Economic Stabilization**: Interest rate stability improving market confidence
2. **Technology Integration**: AI and automation becoming standard practice
3. **Regulatory Evolution**: Enhanced compliance requirements and transparency
4. **Global Competition**: International market pressures and opportunities
5. **Sustainability Focus**: ESG considerations in all business decisions

### Strategic Recommendations

For businesses navigating the current market environment:

- **Technology Adoption**: Implement AI and automation tools for competitive advantage
- **Financial Planning**: Develop robust cash flow management and funding strategies
- **Market Positioning**: Focus on unique value propositions and customer needs
- **Compliance Management**: Ensure adherence to evolving regulatory requirements
- **Growth Strategy**: Balance aggressive expansion with risk management

## Industry-Specific Considerations

### Technology Sector
- Continued strong investor interest and valuations
- AI and machine learning leading innovation
- Cybersecurity and data privacy paramount
- International expansion opportunities

### Traditional Industries
- Digital transformation requirements
- Supply chain optimization needs
- Sustainability integration challenges
- Workforce development priorities

### Service-Based Businesses
- Remote delivery model adoption
- Client relationship management enhancement
- Technology-enabled service delivery
- Quality assurance and customer satisfaction

## Future Outlook and Predictions

Looking ahead to late 2025 and beyond:

### Expected Developments
- **Continued Technology Integration**: AI becoming ubiquitous across all business functions
- **Enhanced Market Transparency**: Better data availability for decision making
- **Regulatory Harmonization**: Simplified compliance across different jurisdictions
- **Sustainable Business Models**: ESG considerations driving business strategy

### Strategic Opportunities
- **Market Consolidation**: Acquisition opportunities in fragmented industries
- **Technology Partnerships**: Collaboration opportunities with tech innovators
- **International Expansion**: Post-Brexit trade relationship optimization
- **Sustainability Leadership**: First-mover advantages in green business practices

## Conclusion

The UK business landscape in 2025 offers significant opportunities for growth and success. Key success factors include:

1. **Technology Integration**: Embracing AI and automation for competitive advantage
2. **Strategic Planning**: Developing comprehensive business strategies
3. **Market Understanding**: Deep knowledge of industry trends and customer needs
4. **Financial Management**: Robust cash flow and funding strategies
5. **Regulatory Compliance**: Proactive approach to legal and regulatory requirements

For businesses and entrepreneurs, the current environment rewards those who combine traditional business fundamentals with innovative technology adoption and strategic thinking.

Whether you're starting a new business, seeking to expand, or considering acquisition opportunities, understanding these trends and positioning your business accordingly will be crucial for success in the evolving UK marketplace.
`;
}

// Function to generate schema markup
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

// Function to insert a single blog post
async function insertBlogPost(postData) {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    const fullContent = generateFullContent(postData);
    const excerpt = postData.contentPreview.substring(0, 250) + '...';
    const schema = generateSchemaMarkup(postData);
    
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
      fullContent,
      excerpt,
      postData.metaDescription,
      postData.metaDescription,
      'Arzani Research Team',
      'Expert team specializing in UK business market analysis and AI-powered insights.',
      'Published',
      true, // is_featured
      true, // is_pillar
      0, // view_count
      postData.estimatedReadTime,
      postData.estimatedReadTime,
      new Date(),
      new Date(),
      new Date(),
      new Date(),
      postData.title,
      postData.primaryKeywords.join(', '),
      schema,
      postData.category,
      postData.category,
      postData.primaryKeywords[0],
      postData.longtailKeywords.join(', '),
      [...postData.primaryKeywords, ...postData.longtailKeywords].join(', '),
      'Awareness',
      'marketplace-visit',
      'Explore Our Marketplace',
      '/marketplace',
      `/blog/${postData.slug}`,
      `/blog/${postData.slug}`,
      postData.metaDescription,
      excerpt
    ];
    
    const insertResult = await client.query(insertQuery, insertValues);
    const postId = insertResult.rows[0].id;
    
    console.log(`✅ Inserted blog post: "${postData.title}" (ID: ${postId})`);
    
    // Associate with category
    await client.query(
      'INSERT INTO blog_post_categories (post_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [postId, postData.categoryId]
    );
    
    console.log(`   📁 Associated with category: ${postData.category} (ID: ${postData.categoryId})`);
    
    // Create/associate tags for primary keywords
    for (const keyword of postData.primaryKeywords.slice(0, 5)) {
      const tagSlug = keyword.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      const tagResult = await client.query(
        'INSERT INTO blog_tags (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id',
        [keyword, tagSlug]
      );
      
      const tagId = tagResult.rows[0].id;
      
      await client.query(
        'INSERT INTO blog_post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [postId, tagId]
      );
    }
    
    console.log(`   🏷️  Associated with ${postData.primaryKeywords.slice(0, 5).length} keyword tags`);
    
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

// Main function
async function insertAllBlogPosts() {
  console.log('🚀 Starting blog post insertion process...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const postData of blogPosts) {
    try {
      console.log(`📝 Processing: ${postData.title}`);
      
      const result = await insertBlogPost(postData);
      
      console.log(`   ✅ Successfully inserted: ${result.slug}\n`);
      successCount++;
      
    } catch (error) {
      console.error(`   ❌ Failed to insert "${postData.title}":`, error.message, '\n');
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
  
  process.exit(0);
}

// Run the insertion
insertAllBlogPosts().catch((error) => {
  console.error('\n💥 Process failed:', error);
  process.exit(1);
});
