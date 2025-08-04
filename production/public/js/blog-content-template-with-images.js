/**
 * Enhanced Blog Content Creation Template with Image Rotation
 * Use this template to create new blog posts with automatic hero image assignment
 */

// SEO-Optimized Blog Content Template
// Category: [your-category]
// Type: [Pillar/Supporting/Tactical Content]
// Target Keywords: [primary, secondary, tertiary keywords]

const blogPost = {
  // Basic Post Information
  title: "Your SEO-Optimized Blog Post Title Here",
  slug: "your-seo-optimized-blog-post-title-here", // Will be auto-generated if not provided
  
  // Content (HTML format - NO MARKDOWN!)
  content: `
<h1>Your Main H1 Title with Primary Keyword</h1>

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

  // SEO and Metadata
  metaDescription: "Your compelling meta description (155 characters max) that includes primary keyword and entices clicks",
  seoTitle: "Your SEO Title | Arzani", // Optional - will use title if not provided
  seoDescription: "Same as meta description or more detailed version",
  
  // Keywords (Critical for SEO)
  primaryKeywords: [
    "primary keyword phrase",
    "secondary keyword phrase", 
    "tertiary keyword phrase"
  ],
  
  longtailKeywords: [
    "long tail keyword phrase one",
    "long tail keyword phrase two",
    "long tail keyword phrase three",
    "very specific long tail phrase",
    "question-based keyword phrase"
  ],
  
  // Content Classification
  category: "Business Acquisition", // Choose from: Business Acquisition, Business Selling, Business Valuation, Industry Analysis, AI in Business, Geographic Markets
  contentCategory: "business-acquisition", // URL-friendly version
  
  // Content Type and Structure
  isPillar: false, // Set to true for comprehensive pillar content (4000+ words)
  isFeatured: false, // Set to true to feature on homepage
  isSupporting: false, // Set to true if this supports a pillar post
  
  // Content Metrics
  readingTime: 8, // Estimated reading time in minutes
  wordCount: 2000, // Approximate word count
  
  // Publication Settings
  status: "published", // published, draft, or scheduled
  publishDate: new Date(), // Publication date
  
  // Author Information (optional - will default to Arzani Team)
  authorName: "Arzani Team",
  authorBio: "Expert business marketplace insights from the Arzani team.",
  authorImage: "/figma design exports/images/arzani-icon-nobackground.png",
  
  // Advanced SEO (optional)
  schemaMarkup: {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Your SEO-Optimized Blog Post Title Here",
    "description": "Your compelling meta description",
    "author": {
      "@type": "Organization",
      "name": "Arzani"
    },
    "publisher": {
      "@type": "Organization", 
      "name": "Arzani",
      "logo": {
        "@type": "ImageObject",
        "url": "https://arzani.co.uk/figma design exports/images/arzani-icon-nobackground.png"
      }
    }
  },
  
  // Content Relationships (for pillar/supporting structure)
  relatedTopics: [
    "Related Topic 1",
    "Related Topic 2", 
    "Related Topic 3"
  ],
  
  relatedCategories: ["category-1", "category-2"],
  
  // NOTE: hero_image is automatically assigned by the rotation system
  // The system will automatically assign one of these images in rotation:
  // - /figma design exports/images/blog1.webp
  // - /figma design exports/images/blog2.webp  
  // - /figma design exports/images/blog3.webp
  // - /figma design exports/images/blog4.webp
  // - /figma design exports/images/blog5.webp
  // - /figma design exports/images/blog6.webp
  
  // If you want to override the automatic image assignment, uncomment and set:
  // heroImage: "/figma design exports/images/blog3.webp"
};

export default blogPost;

/*
USAGE INSTRUCTIONS:
===================

1. Copy this template and rename the file to match your blog post topic
2. Replace all placeholder content with your actual blog content
3. Update the primary and longtail keywords arrays
4. Set the appropriate category and content classification
5. Ensure all content is in HTML format (no markdown!)
6. Import this file into your push script:

```javascript
import blogPost from './blog-content/your-blog-post-file.js';
import { insertBlogPostWithRotatedImage } from './enhanced-blog-post-template.js';

insertBlogPostWithRotatedImage(blogPost)
  .then(result => {
    console.log('Post created:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed to create post:', error);
    process.exit(1);
  });
```

CONTENT GUIDELINES:
==================

✅ DO:
- Use proper HTML tags (<h1>, <h2>, <h3>, <p>, <ul>, <li>, etc.)
- Include primary keywords naturally in content
- Write 1,500-2,500 words for supporting content, 4,000+ for pillar content
- Use compelling headings that include keywords
- Include actionable advice and practical examples
- Ensure proper paragraph structure and flow

❌ DON'T:
- Use markdown syntax (##, ###, -, *, etc.)
- Use long dashes (--) for separators
- Leave content in placeholder format
- Forget to update keywords and categories
- Use generic or duplicate content

The hero image will be automatically assigned from the 6 available blog images
in a rotating fashion based on the total number of existing blog posts.
*/
