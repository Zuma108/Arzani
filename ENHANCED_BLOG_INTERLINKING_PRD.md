# Enhanced Blog Interlinking System PRD

This document outlines the enhancements to the blog interlinking system for the Arzani Marketplace. These changes will improve SEO performance, user engagement, and content discoverability.

## Schema Updates for Interlinking Enhancement

The current blog post schema will be expanded with the following new properties:

```javascript
// Current blog post schema
const blogPost = {
  // Existing properties remain unchanged
  title: "Main Title of the Blog Post",
  
  // ... other existing properties ...
  
  seoData: {
    // ... existing SEO properties ...
  },
  
  // Content Cluster Information (existing)
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
  },
  
  // NEW: Enhanced Content Links System - Manages all link types in content
  contentLinks: {
    // Auto-inserted keyword links with frequency control
    keywordLinks: [
      {
        keyword: "online marketplace",
        url: "/blog/business-topics/what-is-an-online-marketplace",
        limit: 2 // Maximum number of times to link this keyword
      },
      {
        keyword: "seller dashboard",
        url: "/blog/seller-resources/navigating-seller-dashboard",
        limit: 1
      }
    ],
    
    // Section-specific links to appear after specific headings
    sectionLinks: [
      {
        sectionHeading: "Benefits of Online Marketplaces",
        links: [
          {
            anchor: "Learn more about marketplace fees",
            url: "/blog/seller-resources/understanding-marketplace-fees"
          },
          {
            anchor: "See our marketplace fee calculator",
            url: "/tools/fee-calculator"
          }
        ]
      }
    ],
    
    // Structured content blocks with related articles
    relatedContentBlocks: [
      {
        title: "Recommended Resources for Sellers",
        position: "after:Getting Started", // Appears after heading that contains "Getting Started"
        links: [
          {
            title: "Complete Guide to Marketplace SEO",
            url: "/blog/seller-resources/marketplace-seo-guide"
          },
          {
            title: "Top 10 Seller Mistakes to Avoid",
            url: "/blog/seller-resources/common-seller-mistakes"
          },
          {
            title: "Pricing Strategies for New Sellers",
            url: "/blog/seller-resources/pricing-strategies"
          }
        ]
      }
    ]
  },
  
  // NEW: Semantic Relationships - Computed relationships to other blog posts
  semanticRelationships: [
    {
      postId: 123,
      relationshipType: "semantic", // "semantic", "category", "keyword"
      strength: 8, // 1-10 scale of relationship strength
      sharedKeywords: ["online marketplace", "digital selling", "e-commerce"]
    }
  ],
  
  // NEW: User Journey Positioning - For creating guided learning paths
  userJourneyPosition: "beginner", // beginner, intermediate, advanced
  nextInJourney: "/blog/seller-resources/intermediate-selling-strategies",
  
  // NEW: Link Metrics - For tracking and analyzing link distribution
  linkMetrics: {
    inboundLinkCount: 12,
    outboundLinkCount: 8,
    linkEquityScore: 26.5,
    orphanStatus: false
  }
};
```

## Implementation Requirements

### 1. Database Schema Updates

The following database tables will be created to support the enhanced interlinking system:

```sql
-- Blog post relationships table
CREATE TABLE IF NOT EXISTS blog_post_relationships (
  source_post_id INT REFERENCES blog_posts(id),
  target_post_id INT REFERENCES blog_posts(id),
  relationship_type VARCHAR(50),
  relationship_strength INT,
  shared_keywords TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (source_post_id, target_post_id)
);

-- Link metrics table
CREATE TABLE IF NOT EXISTS blog_post_link_metrics (
  post_id INT REFERENCES blog_posts(id) PRIMARY KEY,
  inbound_link_count INT DEFAULT 0,
  outbound_link_count INT DEFAULT 0,
  link_equity_score FLOAT DEFAULT 0,
  orphan_status BOOLEAN DEFAULT FALSE,
  last_analysis TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Content Processing Functions

The enhanced system will include functions to:

1. Process content with auto-inserted links based on the `contentLinks` configuration
2. Analyze semantic relationships between posts using shared keywords
3. Calculate and track link equity distribution
4. Generate user journey paths based on content relationships

### 3. Template Updates

The blog post template will be enhanced with:

1. Related content section that displays semantic relationships
2. User journey navigation for guided learning paths
3. Topic explorer for related keywords
4. Admin-only metrics display for link equity analysis

### 4. SEO Benefits

The enhanced interlinking system will provide the following SEO benefits:

1. Improved topical authority through strategic internal linking
2. Reduced orphaned content through automated link suggestions
3. Enhanced user engagement through relevant content recommendations
4. Improved crawlability through strategic link distribution
5. Better semantic relationships between content pieces

## Implementation Timeline

1. Database schema updates: Immediate
2. Content processing functions: 1-2 days
3. Template updates: 1 day
4. Initial relationship analysis: 1 day
5. Full implementation and testing: 1 week

## Integration with Existing System

This enhancement will integrate with the current blog system without disrupting existing functionality. The system will:

1. Preserve all existing blog post features
2. Enhance content with new linking capabilities
3. Provide backward compatibility for existing content
4. Enable gradual adoption of enhanced features

## Monitoring and Optimization

After implementation, the system will include:

1. Link equity analysis dashboard
2. Orphaned content reports
3. Relationship strength monitoring
4. User journey effectiveness tracking

These features will enable continuous optimization of the blog's internal linking structure.
