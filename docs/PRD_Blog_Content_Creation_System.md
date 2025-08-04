# PRD: Blog Content Creation & Database Integration System
*Product Requirements Document - Arzani.co.uk*  
*Created: July 10, 2025*

---

## 🎯 **Overview**

This PRD provides comprehensive instructions for creating blog content files and pushing them to the database using our standardized system. It covers file format specifications, research methodologies, technical setup, and operational procedures.

---

## 📁 **File Structure Requirements**

### **Directory Structure**
```
my-marketplace-project/
├── blog-content/                    # All blog post JS files
│   ├── uk-business-acquisition-trends-2025.js
│   ├── ai-business-valuation-revolution-uk-2025.js
│   └── [other-blog-posts].js
├── push-blog-post-[X]-fixed.js     # Database push scripts
├── .env                             # Environment variables
└── package.json                     # ES module configuration
```

### **Environment Setup Requirements**
```bash
# .env file requirements
DB_USER=your_postgres_username
DB_HOST=your_postgres_host
DB_NAME=your_database_name
DB_PASSWORD=your_postgres_password
DB_PORT=5432
DB_SSL=false  # or true for production
NODE_ENV=development  # or production
```

### **Package.json Requirements**
```json
{
  "type": "module",
  "dependencies": {
    "pg": "^8.x.x",
    "dotenv": "^16.x.x"
  }
}
```

---

## 📝 **Blog Content File Format Specification**

### **File Naming Convention**
- Format: `[topic]-[year].js`
- Examples: `uk-business-acquisition-trends-2025.js`
- Use lowercase with hyphens for readability
- Include year for evergreen content updates

### **Required File Structure Template**
```javascript
// SEO-Optimized Blog Content: [Title]
// Category: [category-name]
// Type: Pillar Content
// Target Keywords: [primary, secondary, tertiary keywords]

const blogPost = {
  title: "SEO-optimized title with primary keyword",
  slug: "url-friendly-slug-with-keywords",
  metaDescription: "155-character meta description with primary keyword and compelling CTA",
  
  // Primary SEO Keywords (5-7 keywords)
  primaryKeywords: [
    "primary target keyword",
    "secondary target keyword",
    "related keyword 1",
    "related keyword 2",
    "related keyword 3"
  ],
  
  // Long-tail Keywords (8-12 keywords)
  longtailKeywords: [
    "specific long-tail phrase 1",
    "question-based long-tail 2",
    "location-specific long-tail 3",
    "problem-solving long-tail 4",
    "comparison long-tail 5",
    "how-to long-tail 6",
    "statistics-based long-tail 7",
    "year-specific long-tail 8"
  ],
  
  // Semantic Keywords (8-10 keywords)
  semanticKeywords: [
    "related concept 1",
    "industry terminology 1",
    "process-related term 1",
    "outcome-related term 1",
    "tool-related term 1",
    "method-related term 1",
    "benefit-related term 1",
    "challenge-related term 1"
  ],
  
  content: `
<h1>Main H1 Title with Primary Keyword</h1>

<p>Opening paragraph with primary keyword, compelling hook, and content preview. Should be 150-200 words with proper line breaks and formatting.</p>

<h2>Primary H2 Section with Secondary Keyword</h2>

<p>Content section with data, statistics, and insights. Each paragraph should be wrapped in proper HTML tags for optimal rendering.</p>

<p>Include the following elements in well-formatted HTML:</p>
<ul>
<li>Current market data with proper citations</li>
<li>Expert insights and quotes</li>
<li>Practical examples and case studies</li>
<li>Actionable advice for readers</li>
</ul>

<h3>H3 Subsection with Long-tail Keyword</h3>

<p>Detailed subsection content with supporting data and examples. Ensure each sentence flows naturally with proper paragraph breaks.</p>

<h2>Second Major H2 Section</h2>

<p>Continue content structure with properly formatted HTML elements:</p>
<ul>
<li>Industry trends and market analysis</li>
<li>Best practices and methodologies</li>
<li>Case studies with real-world applications</li>
<li>Future outlook and predictions</li>
</ul>

<h2>Conclusion</h2>

<p>Summary with key takeaways and call-to-action elements. Ensure the conclusion is compelling and drives reader engagement.</p>
`,

  // SEO Metadata
  seoData: {
    canonicalUrl: "/blog/[category]/[slug]",
    focusKeyword: "primary target keyword",
    keywordDensity: "1.2%",
    readabilityScore: "Good",
    contentLength: "4,000+ words",
    internalLinks: [
      "/blog/related-category/related-post-1",
      "/blog/related-category/related-post-2",
      "/categories/main-category"
    ],
    externalLinks: [
      "https://authoritative-source-1.com",
      "https://government-data-source.gov.uk"
    ]
  },

  // Content Cluster Information
  clusterData: {
    pillarTopic: "Main Topic Category",
    supportingTopics: [
      "Related Topic 1",
      "Related Topic 2",
      "Related Topic 3",
      "Related Topic 4",
      "Related Topic 5"
    ],
    relatedCategories: ["category-1", "category-2", "category-3"]
  }
};

export default blogPost;
```

### **HTML Content Formatting Requirements**

**CRITICAL: All blog content must be in HTML format, NOT markdown**

#### **Prohibited Elements**
- ❌ No markdown syntax (##, ###, -, *, etc.)
- ❌ No long dashes (--) for separators
- ❌ No markdown-style headers (# ## ###)
- ❌ No markdown-style lists (- * +)

#### **Required HTML Elements**
```html
<!-- Use proper HTML headings -->
<h1>Main Title</h1>
<h2>Section Headers</h2>
<h3>Subsection Headers</h3>

<!-- Use proper paragraph tags -->
<p>Each paragraph must be wrapped in p tags for proper spacing and formatting.</p>

<!-- Use proper list formatting -->
<ul>
<li>Unordered list items</li>
<li>Multiple items for better readability</li>
</ul>

<ol>
<li>Ordered list items when sequence matters</li>
<li>Numbered points for step-by-step guides</li>
</ol>

<!-- Use proper emphasis -->
<strong>Bold text for emphasis</strong>
<em>Italic text for emphasis</em>

<!-- Use proper links -->
<a href="/internal-link">Internal link text</a>
<a href="https://external-site.com" target="_blank">External link text</a>

<!-- Use blockquotes for citations -->
<blockquote>
<p>Expert quote or important statement that requires emphasis.</p>
</blockquote>
```

#### **Formatting Best Practices**
- Each sentence should have proper spacing
- Paragraphs should be concise (3-5 sentences max)
- Use `<br>` tags sparingly, only when necessary for formatting
- Ensure proper nesting of HTML elements
- Include proper punctuation and grammar
- Use semantic HTML for better accessibility

#### **Template Integration**
The HTML content will be rendered directly into the `blog-post_new.ejs` template using:
```ejs
<%- blog.content %>
```
This means the content must be valid HTML that integrates seamlessly with the existing template styling.

---

## 🔍 **Content Research Methodology**

### **Step 1: Keyword Research Process**

#### **Tools Required**
- DataForSEO API access
- Perplexity MCP for current data
- Google Trends for trend analysis
- Competitor analysis tools

#### **Research Workflow**
1. **Primary Keyword Identification**
   - Use DataForSEO for search volume data
   - Target keywords with 100+ monthly searches
   - Prioritize high-value, medium-competition terms

2. **Long-tail Keyword Expansion**
   - Generate question-based variations
   - Include location-specific terms (UK focus)
   - Add year-specific variations (2025)
   - Research competitor ranking keywords

3. **Semantic Keyword Mapping**
   - Identify industry terminology
   - Map related concepts and processes
   - Include outcome and benefit keywords

### **Step 2: Content Research Using Perplexity MCP**

#### **Research Query Templates**
```
"Latest [industry] trends and statistics for 2024-2025 in the UK market"
"Current [topic] market data and expert insights for [specific area]"
"Recent developments in [field] with specific focus on UK businesses"
"Comparative analysis of [topic] showing current vs previous year data"
```

#### **Data Collection Requirements**
- Current year statistics (2024-2025)
- UK-specific data when available
- Expert quotes and insights
- Industry trend analysis
- Competitive landscape information

### **Step 3: Content Structure Planning**

#### **Content Outline Template**
```html
1. Introduction (150-200 words)
   <h1>Compelling Title with Primary Keyword</h1>
   <p>Hook with current statistic and engaging opening</p>
   <p>Problem/opportunity identification</p>
   <p>Content preview and reader benefits</p>

2. Current Market Overview (800-1000 words)
   <h2>Market Analysis and Current Trends</h2>
   <p>Latest statistics and market data</p>
   <p>Market dynamics and key developments</p>
   <ul><li>Key players and industry leaders</li></ul>

3. Deep Dive Analysis (1200-1500 words)
   <h2>Detailed Analysis and Insights</h2>
   <p>Detailed methodology and analytical approach</p>
   <blockquote><p>Expert insights and industry quotes</p></blockquote>
   <p>Case studies and real-world examples</p>

4. Practical Application (800-1000 words)
   <h2>Implementation Guide and Best Practices</h2>
   <ol><li>Step-by-step guidance with actionable advice</li></ol>
   <p>Best practices and proven methodologies</p>
   <p>Common mistakes to avoid</p>

5. Future Outlook (400-600 words)
   <h2>Market Predictions and Strategic Outlook</h2>
   <p>Industry predictions and emerging trends</p>
   <p>Strategic recommendations for businesses</p>
   <p>Long-term considerations and planning</p>

6. Conclusion (200-300 words)
   <h2>Key Takeaways and Next Steps</h2>
   <p>Summary of main points and insights</p>
   <p>Actionable next steps for readers</p>
   <p>Call-to-action with compelling closing</p>
```

---

## 🛠 **Database Push Script Creation**

### **Push Script Template**
```javascript
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import blogPost from './blog-content/[blog-post-file].js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env with explicit path
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === 'production';

// Create connection configuration
const connectionConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432
};

// SSL configuration
if (process.env.DB_SSL && process.env.DB_SSL.toLowerCase() === 'true') {
  console.log('Enabling SSL for database connection (from DB_SSL env var)');
  connectionConfig.ssl = { rejectUnauthorized: false };
} else if (process.env.DB_SSL && process.env.DB_SSL.toLowerCase() === 'false') {
  console.log('Explicitly disabling SSL for database connection (from DB_SSL env var)');
} else if (isProduction) {
  console.log('Enabling SSL for database connection (production environment)');
  connectionConfig.ssl = { rejectUnauthorized: false };
} else {
  console.log('SSL disabled for database connection (development environment)');
}

const pool = new Pool(connectionConfig);

async function insertBlogPost() {
  const client = await pool.connect();
  
  try {
    console.log('Starting blog post insertion...');
    
    const insertQuery = `
      INSERT INTO blog_posts (
        title,
        slug,
        content,
        excerpt,
        meta_description,
        seo_description,
        seo_keywords,
        keywords,
        category,
        content_category,
        author_id,
        status,
        is_featured,
        is_pillar,
        target_keyword,
        secondary_keywords,
        seo_title,
        schema_markup,
        reading_time,
        read_time,
        published_date,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
      ) RETURNING id, title, slug;
    `;
    
    const result = await client.query(insertQuery, [
      blogPost.title,
      blogPost.slug,
      blogPost.content,
      blogPost.content.substring(0, 300) + '...',
      blogPost.metaDescription,
      blogPost.metaDescription,
      blogPost.primaryKeywords?.join(', ') || '',
      JSON.stringify(blogPost.primaryKeywords || []),
      '[CATEGORY_NAME]', // Update for each post
      '[CATEGORY_NAME]', // Update for each post
      1,
      'published',
      false,
      true,
      blogPost.primaryKeywords?.[0] || '[DEFAULT_KEYWORD]',
      JSON.stringify(blogPost.longtailKeywords || []),
      blogPost.title,
      JSON.stringify({}),
      [ESTIMATED_READING_TIME], // Update for each post
      [ESTIMATED_READING_TIME], // Update for each post
      new Date(),
      new Date(),
      new Date()
    ]);
    
    console.log('✅ Blog post inserted successfully!');
    console.log(`ID: ${result.rows[0].id}`);
    console.log(`Title: ${result.rows[0].title}`);
    console.log(`Slug: ${result.rows[0].slug}`);
    
  } catch (error) {
    console.error('❌ Error inserting blog post:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

insertBlogPost().catch(console.error);
```

### **Push Script Naming Convention**
- Format: `push-blog-post-[NUMBER]-fixed.js`
- Sequential numbering for easy tracking
- Always include "-fixed" suffix for database compatibility

---

## 📊 **Quality Assurance Checklist**

### **Pre-Publication Checklist**
- [ ] File follows naming convention
- [ ] All required properties included
- [ ] Primary keywords researched and validated
- [ ] Content exceeds 4,000 words
- [ ] Current data and statistics included
- [ ] Meta description under 155 characters
- [ ] Internal and external links added
- [ ] ES module export syntax used
- [ ] Push script created and tested

### **Content Quality Standards**
- [ ] Original research and insights
- [ ] UK market focus maintained
- [ ] Current year data (2024-2025)
- [ ] Expert opinions included
- [ ] Actionable advice provided
- [ ] SEO best practices followed
- [ ] Readability score: Good or better
- [ ] Keyword density: 1-2%
- [ ] **HTML formatting only (no markdown syntax)**
- [ ] **No ## or -- characters in content**
- [ ] **Proper paragraph breaks with `<p>` tags**
- [ ] **Valid HTML structure and nesting**

### **Technical Validation**
- [ ] Database connection successful
- [ ] Blog post insertion completed
- [ ] No SQL errors encountered
- [ ] Correct category assignment
- [ ] Proper metadata formatting
- [ ] Schema validation passed

---

## 🚀 **Production Workflow**

### **Content Creation Process**
1. **Research Phase** (2 hours)
   - Keyword research using DataForSEO
   - Market data collection via Perplexity MCP
   - Competitor analysis and gap identification

2. **Content Writing Phase** (4-6 hours)
   - Create detailed outline
   - Write comprehensive content (4,000+ words)
   - Include current statistics and expert insights
   - Optimize for target keywords

3. **Technical Setup Phase** (30 minutes)
   - Create blog post JS file
   - Generate corresponding push script
   - Test database connection and insertion

4. **Quality Review Phase** (1 hour)
   - Content review against checklist
   - SEO optimization verification
   - Technical validation testing

5. **Publication Phase** (15 minutes)
   - Execute push script
   - Verify database insertion
   - Document completion in tracking system

### **File Management Best Practices**
- Maintain consistent naming conventions
- Use version control for content files
- Keep push scripts sequentially numbered
- Document any customizations or modifications
- Regular backup of content files

---

## 📈 **Performance Monitoring**

### **Post-Publication Tracking**
- Monitor database insertion success
- Track content performance metrics
- Analyze SEO ranking improvements
- Review engagement statistics
- Document lessons learned

### **Optimization Opportunities**
- Update content with fresh statistics
- Enhance keyword targeting based on performance
- Improve internal linking structure
- Add multimedia elements as needed
- Refresh meta descriptions for better CTR

---

## 🔧 **Troubleshooting Common Issues**

### **Database Connection Issues**
- Verify environment variables in .env file
- Check SSL configuration settings
- Confirm database credentials and permissions
- Test connection using separate script

### **Content Format Issues**
- Ensure ES module export syntax
- Validate JSON structure for keywords
- Check for special characters in content
- Verify file encoding (UTF-8)

### **SEO Optimization Issues**
- Review keyword density (aim for 1-2%)
- Check meta description length (<155 chars)
- Validate internal/external link functionality
- Ensure proper heading structure (H1, H2, H3)

### **HTML Formatting Issues**
- **Content Rendering Problems**: Ensure no markdown syntax (##, ###, --, *) is present
- **Paragraph Spacing**: Verify all content uses proper `<p>` tags for paragraphs
- **List Formatting**: Use `<ul><li>` and `<ol><li>` instead of markdown lists
- **Header Structure**: Use `<h1>`, `<h2>`, `<h3>` tags instead of # symbols
- **Link Formatting**: Use proper `<a href="">` tags for all links
- **Content Flow**: Check that sentences and paragraphs have proper breaks
- **Template Integration**: Verify HTML renders correctly in `blog-post_new.ejs`

---

This PRD provides a complete framework for creating high-quality, SEO-optimized blog content and successfully integrating it into the database system. Following these specifications ensures consistency, quality, and technical reliability across all blog content production.
