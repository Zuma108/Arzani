/**
 * Automated Blog Generation System
 * Programmatic SEO Content Factory for Arzani Marketplace
 * 
 * This system automatically:
 * - Reads the PRD checklist to identify uncompleted posts
 * - Generates SEO-optimized content using multiple AI sources
 * - Creates proper database relationships and interlinking
 * - Publishes content automatically to production
 * - Eliminates manual JSON creation and push scripts
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import blogImageRotation from '../utils/blogImageRotation.js';
import pool from '../db.js';
import cron from 'node-cron';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { generateXmlSitemap } from '../routes/sitemap.js';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize AI services
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class AutomatedBlogGenerator {
  constructor() {
    this.isGenerating = false;
    this.generationQueue = [];
    this.contentCategories = {
      'Business Acquisition': 'business-acquisition',
      'Business Selling': 'business-selling', 
      'Business Valuation': 'business-valuation',
      'Industry Analysis': 'industry-analysis',
      'AI in Business': 'ai-in-business',
      'Geographic Markets': 'geographic-markets'
    };
    
    this.seoTemplates = {
      pillar: {
        minWords: 4000,
        maxWords: 6000,
        keywordDensity: 1.5,
        headingStructure: ['h2', 'h3', 'h4']
      },
      supporting: {
        minWords: 1500,
        maxWords: 2500,
        keywordDensity: 1.2,
        headingStructure: ['h2', 'h3']
      },
      tactical: {
        minWords: 800,
        maxWords: 1200,
        keywordDensity: 1.0,
        headingStructure: ['h2', 'h3']
      }
    };
  }

  /**
   * Initialize the automated system
   */
  async initialize() {
    console.log('🚀 Initializing Automated Blog Generation System...');
    
    // Schedule content generation - 6 posts per day at optimal times
    this.scheduleContentGeneration();
    
    // Schedule SEO optimization and interlinking updates
    this.scheduleMaintenanceTasks();
    
    console.log('✅ Automated Blog Generator initialized successfully');
    console.log('📅 Scheduled for 6 posts per day at: 9:00, 11:00, 13:00, 15:00, 17:00, 19:00 UTC');
  }

  /**
   * Schedule automatic content generation
   */
  scheduleContentGeneration() {
    // Generate content 6 times per day at optimal posting times
    const schedules = [
      '0 9 * * *',   // 9:00 AM UTC
      '0 11 * * *',  // 11:00 AM UTC  
      '0 13 * * *',  // 1:00 PM UTC
      '0 15 * * *',  // 3:00 PM UTC
      '0 17 * * *',  // 5:00 PM UTC
      '0 19 * * *'   // 7:00 PM UTC
    ];

    schedules.forEach((schedule, index) => {
      cron.schedule(schedule, async () => {
        console.log(`⏰ Running scheduled content generation #${index + 1}`);
        await this.generateNextBlogPost();
      });
    });

    // Optional: Generate immediately for testing
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Development mode: Generating test content in 30 seconds...');
      setTimeout(() => this.generateNextBlogPost(), 30000);
    }
  }

  /**
   * Schedule maintenance tasks
   */
  scheduleMaintenanceTasks() {
    // Update interlinking daily at midnight
    cron.schedule('0 0 * * *', async () => {
      console.log('🔗 Running daily interlinking optimization...');
      await this.updateSemanticRelationships();
    });

    // Weekly SEO audit
    cron.schedule('0 2 * * 0', async () => {
      console.log('📊 Running weekly SEO audit...');
      await this.runSEOAudit();
    });
  }

  /**
   * Parse PRD checklist to find next uncompleted blog post
   */
  async parseChecklistForNextPost() {
    try {
      const checklistPath = path.join(__dirname, '..', 'PRD_200_Blog_Post_Strategy_Checklist.md');
      const checklistContent = await fs.readFile(checklistPath, 'utf-8');
      
      // Parse unchecked items using regex
      const uncheckedPattern = /- \[ \] \*\*([0-9]+\.[0-9]+)\*\* (.+)/g;
      const uncheckedPosts = [];
      
      let match;
      while ((match = uncheckedPattern.exec(checklistContent)) !== null) {
        const [, id, title] = match;
        
        // Clean title to remove (DEPLOYED) tags and extra formatting
        const cleanTitle = title.replace(/\*/g, '').replace(/\s*\(DEPLOYED\)\s*/gi, '').trim();
        
        // Check if this post already exists in database
        const existingPost = await this.checkForExistingPost(cleanTitle, id);
        if (existingPost) {
          console.log(`⏭️ Skipping "${cleanTitle}" - already exists (ID: ${existingPost.id})`);
          continue;
        }
        
        // Extract category from the section
        const sectionMatch = checklistContent.substring(0, match.index).match(/### \*\*Cluster ([0-9]+): (.+) \(([0-9]+) posts\)\*\*/g);
        const lastSection = sectionMatch ? sectionMatch[sectionMatch.length - 1] : null;
        const category = lastSection ? lastSection.match(/Cluster [0-9]+: (.+) \(/)[1] : 'General';
        
        // Determine content type
        const typeMatch = checklistContent.substring(0, match.index).match(/(Pillar Content|Supporting Content|Tactical Content)/g);
        const contentType = typeMatch ? typeMatch[typeMatch.length - 1].toLowerCase().replace(' content', '') : 'supporting';
        
        uncheckedPosts.push({
          id,
          title: cleanTitle,
          category: category.trim(),
          contentType,
          priority: this.calculatePriority(category, contentType)
        });
      }
      
      // Sort by priority (pillar > supporting > tactical)
      uncheckedPosts.sort((a, b) => b.priority - a.priority);
      
      console.log(`📋 Found ${uncheckedPosts.length} uncompleted blog posts`);
      return uncheckedPosts[0]; // Return highest priority post
      
    } catch (error) {
      console.error('❌ Error parsing checklist:', error);
      return null;
    }
  }

  /**
   * Check if a blog post already exists to prevent duplicates
   */
  async checkForExistingPost(title, checklistId) {
    try {
      const client = await pool.connect();
      
      // Create a slug from the title to check against
      const expectedSlug = this.createSlug(title);
      
      // Check for posts with similar title or slug
      const result = await client.query(`
        SELECT id, title, slug, created_at 
        FROM blog_posts 
        WHERE LOWER(title) = LOWER($1) 
           OR slug = $2
           OR (content_links->>'checklist_id') = $3
        LIMIT 1
      `, [title, expectedSlug, checklistId]);
      
      client.release();
      
      if (result.rows.length > 0) {
        return result.rows[0];
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ Error checking for existing post:', error);
      return null;
    }
  }

  /**
   * Calculate content priority for scheduling
   */
  calculatePriority(category, contentType) {
    const categoryWeights = {
      'Business Acquisition': 100,
      'Business Selling': 90,
      'Business Valuation': 85,
      'Industry Analysis': 80,
      'AI in Business': 75,
      'Geographic Markets': 70
    };
    
    const typeWeights = {
      'pillar': 50,
      'supporting': 30,
      'tactical': 10
    };
    
    return (categoryWeights[category] || 60) + (typeWeights[contentType] || 20);
  }

  /**
   * Generate comprehensive blog content using AI with Structured Outputs
   */
  async generateBlogContent(postInfo) {
    console.log(`🤖 Generating content for: "${postInfo.title}"`);
    
    try {
      const template = this.seoTemplates[postInfo.contentType] || this.seoTemplates.supporting;
      
      // Generate primary keyword and variants
      const keywords = await this.generateKeywords(postInfo.title, postInfo.category);
      
      // Create comprehensive content prompt
      const contentPrompt = this.buildContentPrompt(postInfo, keywords, template);
      
      // Define JSON Schema for structured blog content output
      const blogContentSchema = {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "The complete blog post content in proper HTML format with headings, paragraphs, lists, and links"
          },
          meta_description: {
            type: "string",
            description: "SEO-optimized meta description (150-160 characters)"
          },
          key_statistics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                statistic: { type: "string" },
                source: { type: "string" }
              },
              required: ["statistic", "source"],
              additionalProperties: false
            },
            description: "Array of key statistics with proper attribution"
          },
          authority_signals: {
            type: "array",
            items: { type: "string" },
            description: "List of E-E-A-T authority signals demonstrated in the content"
          },
          word_count: {
            type: "number",
            description: "Approximate word count of the content"
          }
        },
        required: ["content", "meta_description", "key_statistics", "authority_signals", "word_count"],
        additionalProperties: false
      };
      
      // Generate content using OpenAI with Structured Outputs and enhanced prompting
      const response = await openai.chat.completions.create({
        model: "gpt-4o-2024-08-06", // Use latest model with structured outputs support
        messages: [
          {
            role: "developer", // Higher authority role for system instructions
            content: `# Identity

You are an expert SEO content writer and UK business marketplace authority specializing in professional business valuation, market trends, and optimization strategies. You have 15+ years of experience in business acquisitions and have facilitated over £500M in UK business transactions.

# E-E-A-T Framework Implementation

## Experience
- Draw from real marketplace scenarios and specific business cases
- Reference actual market data from UK business transactions
- Use first-hand insights from marketplace experience
- Include realistic case studies (anonymized but credible)

## Expertise  
- Demonstrate deep knowledge of business valuation methods
- Reference UK regulations (Companies House, HMRC, FCA guidelines)
- Use industry-standard terminology correctly
- Provide step-by-step processes showing understanding

## Authoritativeness
- Cite authoritative sources (government sites, industry reports, academic studies)
- Reference specific UK market statistics with proper attribution
- Mention relevant regulations and compliance requirements
- Use professional credentialing language

## Trustworthiness
- Provide accurate, verifiable information
- Acknowledge limitations and complexity
- Avoid overpromising results
- Recommend professional consultation where appropriate

# Content Generation Rules

## Structure Requirements
- Start directly with content (no HTML document tags)
- Use proper HTML: <h2>, <h3> for headings, <p> for paragraphs, <ul>/<li> for lists
- Include 3-5 main sections with strategic subheadings
- Add realistic examples and case studies in each section
- Include 1-2 call-to-actions linking to Arzani services
- End with actionable conclusion

## Authority & Credibility Signals
- Include specific market data: "In 2024, UK business acquisitions under £5M averaged..."
- Reference regulations: "Under Companies House requirements..."
- Use professional examples: "A recent £2.3M acquisition in the Manchester tech sector..."
- Mention common industry mistakes and solutions
- Provide concrete numbers and percentages

## Quality Standards
- British English spelling and terminology
- Written at professional but accessible level
- Avoid overused phrases: "unlock", "crucial", "delve", "pave the way"
- Use varied, natural vocabulary demonstrating expertise
- Never mention AI, artificial generation, or prompts

## Linking Strategy
- Use /marketplace2 for business listings
- Use /business-valuation for valuation services  
- Use /marketplace-landing for general marketplace info
- Include relevant external links to authoritative sources

# Output Requirements

Generate a comprehensive blog post with:
1. Complete HTML content (no code blocks or markers)
2. SEO-optimized meta description
3. Key statistics with proper source attribution
4. List of E-E-A-T authority signals demonstrated
5. Accurate word count`
          },
          {
            role: "user",
            content: contentPrompt
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "blog_content",
            strict: true,
            schema: blogContentSchema
          }
        },
        max_tokens: 4000,
        temperature: 0.7
      });
      
      // Parse structured response and validate
      let structuredContent;
      try {
        structuredContent = JSON.parse(response.choices[0].message.content);
      } catch (parseError) {
        console.warn('⚠️ Failed to parse structured response, using fallback:', parseError);
        // Fallback to text content processing
        const generatedContent = response.choices[0].message.content;
        return await this.processAndOptimizeContent(generatedContent, keywords, template);
      }
      
      // Process the structured content
      const processedContent = await this.processStructuredContent(structuredContent, keywords, template);
      
      console.log(`✅ Generated ${processedContent.wordCount} words with ${processedContent.authoritySignals?.length || 0} authority signals for "${postInfo.title}"`);
      return processedContent;
      
    } catch (error) {
      console.error('❌ Error generating content:', error);
      throw error;
    }
  }

  /**
   * Build comprehensive content generation prompt
   */
  buildContentPrompt(postInfo, keywords, template) {
    return `
Create a comprehensive ${postInfo.contentType} blog post for the UK business marketplace:

**Title:** ${postInfo.title}
**Category:** ${postInfo.category}
**Target Length:** ${template.minWords}-${template.maxWords} words
**Primary Keyword:** ${keywords.primary}
**Secondary Keywords:** ${keywords.secondary.join(', ')}

**Content Requirements:**
1. Write for UK business buyers and sellers with demonstrated expertise
2. Include current 2025 market data and statistics with proper attribution
3. Provide actionable insights based on first-hand marketplace experience
4. Use ${template.headingStructure.join(', ')} heading structure
5. Include relevant case studies from real UK business transactions (anonymized)
6. Optimize for SEO with natural keyword placement and E-E-A-T signals
7. End with a strong call-to-action directing to Arzani marketplace
8. **IMPORTANT: Include strategic hyperlinks throughout the content**

**E-E-A-T Requirements:**
• Experience: Include specific examples like "In our experience facilitating £50M+ in business transactions..." or "We've observed that businesses in the hospitality sector typically..."
• Expertise: Demonstrate deep knowledge with technical details, regulatory references, and industry-standard practices
• Authoritativeness: Cite authoritative sources (Companies House, ONS, industry reports) and use proper attribution
• Trustworthiness: Acknowledge limitations, recommend professional consultation where appropriate, avoid overpromising

**CRITICAL HTML FORMATTING REQUIREMENTS:**
- Use <h2> tags for main section headings
- Use <h3> tags for subsection headings
- Use <h4> tags for sub-subsection headings if needed
- Wrap ALL paragraphs in <p> tags
- Use <ul> and <li> tags for unordered lists
- Use <ol> and <li> tags for ordered/numbered lists
- Use <strong> tags for bold text emphasis
- Use <em> tags for italic emphasis
- Use <a href="URL"> tags for all links with proper URLs
- Do NOT use markdown syntax (no **, ##, -, etc.)
- Do NOT use plain text formatting

**HTML Structure Example:**
<h2>Main Section Heading</h2>
<p>Opening paragraph with <strong>important points</strong> and <a href="https://example.com">relevant links</a>.</p>
<h3>Subsection Heading</h3>
<p>Content paragraph explaining key concepts.</p>
<ul>
<li>First bullet point with details</li>
<li>Second bullet point with <em>emphasis</em></li>
<li>Third bullet point</li>
</ul>
<p>Concluding paragraph for this section.</p>

**SEO Structure:**
- Introduction with primary keyword in first 100 words
- Clear heading hierarchy (${template.headingStructure.join(' > ')})
- Keyword density target: ${template.keywordDensity}%
- Include FAQ section if supporting/tactical content
- Add relevant internal linking opportunities

**Linking Strategy:**
- Link to external authoritative sources (government sites, industry reports)
- Reference related business concepts that could link to other pages
- Use natural anchor text like "business for sale", "marketplace", "due diligence"
- Include at least 3-5 relevant links throughout the content
- Link to the Arzani marketplace where contextually appropriate

**Content Style:**
- Professional but accessible tone demonstrating marketplace expertise
- UK spelling and terminology
- Current market references (2025)
- Evidence-based claims with proper source attribution
- Action-oriented advice based on real experience
- **Use proper HTML tags with href attributes for all links**

**Authority Demonstrations (Include at least 2-3 of these):**
• Market Data: "Based on our analysis of 1,200+ UK business transactions in 2024..."
• Regulatory References: "Under Companies House filing requirements..." or "Following FCA guidance..."
• Case Studies: "A recent £1.8M acquisition in the Leeds manufacturing sector demonstrated..."
• Professional Insights: "In our experience facilitating business sales across 15 UK regions..."
• Industry Statistics: "According to our quarterly marketplace report, tech businesses valued between £500K-£2M show..."
• Expert Analysis: "Our valuation team has observed that hospitality businesses typically..."

**First-Hand Experience Examples:**
• Transaction Examples: "We recently facilitated the sale of a Birmingham-based logistics company where..."
• Market Insights: "Through our marketplace, we've identified three key trends in 2025 UK business acquisitions..."
• Professional Observations: "Our due diligence process has revealed that businesses with strong digital presence..."
• Success Stories: "A manufacturing client increased their business value by 34% after implementing our recommendations..."

**IMPORTANT:** Generate ONLY the HTML content body. Do NOT include <html>, <head>, or <body> tags. Start directly with the content using proper HTML tags as shown in the example above.
`;
  }

  /**
   * Generate relevant keywords for the post using structured outputs
   */
  async generateKeywords(title, category) {
    try {
      const keywordSchema = {
        type: "object",
        properties: {
          primary: {
            type: "string",
            description: "Main focus keyword for the blog post"
          },
          secondary: {
            type: "array",
            items: { type: "string" },
            description: "5 secondary keywords related to the topic",
            maxItems: 5
          },
          longtail: {
            type: "array",
            items: { type: "string" },
            description: "10 long-tail keywords for comprehensive SEO coverage",
            maxItems: 10
          },
          semantic: {
            type: "array",
            items: { type: "string" },
            description: "5 semantic keywords that relate to the topic conceptually",
            maxItems: 5
          }
        },
        required: ["primary", "secondary", "longtail", "semantic"],
        additionalProperties: false
      };

      const response = await openai.chat.completions.create({
        model: "gpt-4o-2024-08-06",
        messages: [
          {
            role: "developer",
            content: "You are an expert SEO keyword researcher specializing in UK business marketplace content. Generate comprehensive keyword sets that align with user search intent and business marketplace terminology."
          },
          {
            role: "user",
            content: `Generate SEO keywords for this UK business marketplace blog post:

**Title:** "${title}"
**Category:** "${category}"

**Requirements:**
- Focus on UK business terminology and marketplace context
- Include buyer and seller perspectives
- Consider commercial intent keywords
- Use specific business sector terms where relevant
- Include location-based keywords (UK, British, etc.)

Provide keywords that match actual search patterns for business buyers, sellers, and marketplace users.`
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "keyword_analysis",
            strict: true,
            schema: keywordSchema
          }
        },
        max_tokens: 500,
        temperature: 0.3
      });

      const keywordData = JSON.parse(response.choices[0].message.content);
      
      console.log(`🔍 Generated ${keywordData.secondary.length} secondary and ${keywordData.longtail.length} long-tail keywords`);
      
      return keywordData;
      
    } catch (error) {
      console.error('⚠️ Error generating keywords, using fallbacks:', error);
      
      // Fallback keyword generation
      return {
        primary: title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim(),
        secondary: [category.toLowerCase(), 'uk business', 'business marketplace', 'business for sale', 'buy business'],
        longtail: [
          `${title.toLowerCase()} uk`, 
          `${category.toLowerCase()} guide`, 
          'business for sale uk',
          'buy business marketplace uk',
          'uk business acquisition guide'
        ],
        semantic: ['business acquisition', 'marketplace platform', 'uk market', 'business valuation', 'due diligence']
      };
    }
  }

  /**
   * Process structured content from OpenAI Structured Outputs
   */
  async processStructuredContent(structuredData, keywords, template) {
    console.log('🔄 Processing structured content with enhanced validation...');
    
    // Extract and clean the main content
    let content = structuredData.content || '';
    
    // Apply content cleaning and optimization
    content = this.cleanAndValidateContent(content);
    
    // Add strategic internal links with correct URLs
    content = await this.addInternalLinksFixed(content, keywords);
    
    // Calculate reading time
    const wordCount = structuredData.word_count || content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200); // 200 WPM average
    
    // Use structured meta description or generate fallback
    const metaDescription = structuredData.meta_description || 
                           await this.generateMetaDescription(content, keywords.primary);
    
    // Generate schema markup with enhanced data
    const schemaMarkup = this.generateEnhancedSchemaMarkup(
      keywords.primary, 
      metaDescription, 
      wordCount,
      structuredData.key_statistics || []
    );

    return {
      content,
      wordCount,
      readingTime,
      metaDescription,
      schemaMarkup,
      keywords,
      keyStatistics: structuredData.key_statistics || [],
      authoritySignals: structuredData.authority_signals || [],
      structured: true, // Flag indicating this came from structured output
      eeatCompliant: (structuredData.authority_signals || []).length >= 2 // E-E-A-T compliance indicator
    };
  }

  /**
   * Clean and validate content from AI generation
   */
  cleanAndValidateContent(content) {
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid content provided for cleaning');
    }

    // Remove excessive line breaks
    let cleanContent = content.replace(/\n{3,}/g, '\n\n').trim();

    // CRITICAL: Remove HTML code markers that AI might include
    cleanContent = cleanContent
      .replace(/^```html\s*/gi, '')  // Remove opening HTML markers
      .replace(/\s*```\s*$/gi, '')   // Remove closing markers
      .replace(/^<!DOCTYPE html>.*?<body[^>]*>/gsi, '')  // Remove full HTML document structure
      .replace(/<\/body>\s*<\/html>\s*$/gsi, '')  // Remove closing HTML document tags
      .replace(/<\/?article[^>]*>/gi, '');  // Remove article wrapper tags

    // Remove AI disclaimers and notes about fictional content
    cleanContent = cleanContent
      .replace(/Note:.*?(fictional|illustrative purposes).*?(\.|$)/gsi, '')
      .replace(/Disclaimer:.*?(generated|AI|artificial intelligence).*?(\.|$)/gsi, '')
      .replace(/(This content was|Content generated|Generated by).*?(AI|artificial intelligence|ChatGPT|GPT).*?(\.|$)/gsi, '');

    // Fix internal links to use correct URLs
    cleanContent = cleanContent
      .replace(/href="\/marketplace"/g, 'href="/marketplace2"')
      .replace(/href="www\.arzani\.co\.uk\/marketplace"/g, 'href="www.arzani.co.uk/marketplace2"');

    // Add proper CSS classes to existing links
    cleanContent = this.enhanceLinkStyling(cleanContent);

    return cleanContent;
  }

  /**
   * Process and optimize generated content (legacy fallback method)
   */
  async processAndOptimizeContent(content, keywords, template) {
    // Clean and structure the content
    let processedContent = content
      .replace(/\n{3,}/g, '\n\n')  // Remove excessive line breaks
      .trim();

    // CRITICAL: Remove HTML code markers that AI might include
    processedContent = processedContent
      .replace(/^```html\s*/gi, '')  // Remove opening HTML markers
      .replace(/\s*```\s*$/gi, '')   // Remove closing markers
      .replace(/^<!DOCTYPE html>.*?<body[^>]*>/gsi, '')  // Remove full HTML document structure
      .replace(/<\/body>\s*<\/html>\s*$/gsi, '')  // Remove closing HTML document tags
      .replace(/<\/?article[^>]*>/gi, '');  // Remove article wrapper tags

    // Remove AI disclaimers and notes about fictional content
    processedContent = processedContent
      .replace(/Note:.*?(fictional|illustrative purposes).*?(\.|$)/gsi, '')
      .replace(/Disclaimer:.*?(generated|AI|artificial intelligence).*?(\.|$)/gsi, '')
      .replace(/(This content was|Content generated|Generated by).*?(AI|artificial intelligence|ChatGPT|GPT).*?(\.|$)/gsi, '');

    // Fix internal links to use correct URLs
    processedContent = processedContent
      .replace(/href="\/marketplace"/g, 'href="/marketplace2"')
      .replace(/href="www\.arzani\.co\.uk\/marketplace"/g, 'href="www.arzani.co.uk/marketplace2"');

    // Add proper CSS classes to existing links
    processedContent = this.enhanceLinkStyling(processedContent);
    
    // Add strategic internal links with correct URLs
    processedContent = await this.addInternalLinksFixed(processedContent, keywords);

    // Calculate reading time
    const wordCount = processedContent.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200); // 200 WPM average

    // Generate SEO meta description
    const metaDescription = await this.generateMetaDescription(processedContent, keywords.primary);
    
    // Generate schema markup
    const schemaMarkup = this.generateSchemaMarkup(keywords.primary, metaDescription, wordCount);

    return {
      content: processedContent,
      wordCount,
      readingTime,
      metaDescription,
      schemaMarkup,
      keywords
    };
  }

  /**
   * Enhance link styling by adding proper CSS classes
   */
  enhanceLinkStyling(content) {
    // Add classes to external links
    content = content.replace(
      /<a\s+href="(https?:\/\/[^"]+)"([^>]*)>/gi,
      '<a href="$1" class="external-link" target="_blank" rel="noopener noreferrer"$2>'
    );
    
    // Add classes to internal Arzani links
    content = content.replace(
      /<a\s+href="([^"]*arzani[^"]*)"([^>]*)>/gi,
      '<a href="$1" class="internal-link"$2>'
    );
    
    // Ensure all links have proper styling
    content = content.replace(
      /<a\s+(?!.*class=)([^>]+)>/gi,
      '<a class="content-link" $1>'
    );
    
    return content;
  }

  /**
   * Add strategic internal links to content with correct URLs
   */
  async addInternalLinksFixed(content, keywords) {
    try {
      console.log('🔗 Adding strategic internal links...');
      
      // Define internal linking opportunities with correct URLs
      const linkingOpportunities = [
        {
          patterns: [/\b(business for sale|businesses for sale)\b/gi],
          link: '/marketplace2',
          linkText: 'business for sale',
          title: 'Browse businesses for sale on Arzani marketplace'
        },
        {
          patterns: [/\b(business valuation|company valuation|business worth)\b/gi],
          link: '/business-valuation',
          linkText: 'business valuation',
          title: 'Get a professional business valuation'
        },
        {
          patterns: [/\b(learn more|find out more|discover more)\b/gi],
          link: '/marketplace-landing',
          linkText: 'learn more',
          title: 'Learn more about Arzani marketplace'
        },
        {
          patterns: [/\b(arzani marketplace|marketplace platform)\b/gi],
          link: '/marketplace2',
          linkText: 'Arzani marketplace',
          title: 'Visit Arzani business marketplace'
        },
        {
          patterns: [/\b(due diligence|due-diligence)\b/gi],
          link: '/marketplace-landing',
          linkText: 'due diligence',
          title: 'Learn about due diligence services'
        }
      ];
      
      let processedContent = content;
      
      // Apply internal linking strategically (max 2-3 links per opportunity)
      linkingOpportunities.forEach(opportunity => {
        let linkCount = 0;
        const maxLinks = 2; // Limit links per pattern to avoid over-linking
        
        opportunity.patterns.forEach(pattern => {
          if (linkCount >= maxLinks) return;
          
          // Find matches that aren't already linked
          const matches = processedContent.match(pattern);
          if (matches && matches.length > 0) {
            // Replace first occurrence that's not already in a link
            processedContent = processedContent.replace(
              new RegExp(`(?<!<a[^>]*>.*?)\\b(${pattern.source.replace(/\\b/g, '')})\\b(?![^<]*<\/a>)`, 'i'),
              `<a href="${opportunity.link}" class="internal-link" title="${opportunity.title}">$1</a>`
            );
            linkCount++;
          }
        });
      });
      
      return processedContent;
      
    } catch (error) {
      console.error('⚠️ Error adding internal links:', error);
      return content; // Return original content if linking fails
    }
  }

  /**
   * Add strategic internal links to content
   */
  async addInternalLinks(content, keywords) {
    try {
      console.log('🔗 Adding strategic internal links...');
      
      // Define internal linking opportunities
      const linkingOpportunities = [
        {
          patterns: [/\b(business for sale|businesses for sale)\b/gi],
          link: '/marketplace',
          linkText: 'business for sale',
          title: 'Browse businesses for sale on Arzani marketplace'
        },
        {
          patterns: [/\b(business valuation|company valuation|business worth)\b/gi],
          link: '/tools/valuation',
          linkText: 'business valuation',
          title: 'Get a free business valuation'
        },
        {
          patterns: [/\b(business marketplace|marketplace platform)\b/gi],
          link: '/marketplace',
          linkText: 'business marketplace',
          title: 'Explore the Arzani business marketplace'
        },
        {
          patterns: [/\b(due diligence|business due diligence)\b/gi],
          link: '/blog/business-acquisition/due-diligence-guide',
          linkText: 'due diligence',
          title: 'Complete guide to business due diligence'
        },
        {
          patterns: [/\b(business broker|business brokers)\b/gi],
          link: '/professionals/brokers',
          linkText: 'business broker',
          title: 'Find qualified business brokers'
        }
      ];
      
      let linksAdded = 0;
      
      // Apply internal linking (max 3 links per opportunity)
      linkingOpportunities.forEach(opportunity => {
        let matchCount = 0;
        
        opportunity.patterns.forEach(pattern => {
          if (matchCount < 2) { // Limit to 2 instances per pattern
            content = content.replace(pattern, (match) => {
              if (matchCount < 2 && !content.includes(`href="${opportunity.link}"`)) {
                matchCount++;
                linksAdded++;
                return `<a href="${opportunity.link}" class="internal-link" title="${opportunity.title}">${match}</a>`;
              }
              return match;
            });
          }
        });
      });
      
      console.log(`✅ Added ${linksAdded} strategic internal links`);
      return content;
      
    } catch (error) {
      console.error('⚠️ Error adding internal links:', error);
      return content;
    }
  }

  /**
   * Generate optimized meta description
   */
  async generateMetaDescription(content, primaryKeyword) {
    try {
      const firstParagraph = content.split('\n')[0].replace(/<[^>]*>/g, '').substring(0, 300);
      
      const prompt = `
Create an SEO-optimized meta description (150-160 characters) for this blog post:
Primary keyword: "${primaryKeyword}"
Content preview: "${firstParagraph}"

Requirements:
- Include primary keyword naturally
- Compelling and clickable
- 150-160 characters
- Include call-to-action
`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100,
        temperature: 0.5
      });

      return response.choices[0].message.content.trim().replace(/"/g, '');
      
    } catch (error) {
      console.error('⚠️ Error generating meta description:', error);
      return `${primaryKeyword} guide for UK businesses. Expert insights and practical advice for business buyers and sellers on Arzani marketplace.`;
    }
  }

  /**
   * Generate schema markup for SEO
   */
  generateSchemaMarkup(title, description, wordCount) {
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": title,
      "description": description,
      "author": {
        "@type": "Organization",
        "name": "Arzani",
        "url": "https://arzani.co.uk"
      },
      "publisher": {
        "@type": "Organization", 
        "name": "Arzani",
        "logo": {
          "@type": "ImageObject",
          "url": "https://arzani.co.uk/images/logo.png"
        }
      },
      "wordCount": wordCount,
      "datePublished": new Date().toISOString(),
      "dateModified": new Date().toISOString(),
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://arzani.co.uk/blog/"
      }
    });
  }

  /**
   * Generate enhanced schema markup with E-E-A-T signals for structured content
   */
  generateEnhancedSchemaMarkup(title, description, wordCount, keyStatistics = []) {
    const baseSchema = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": title,
      "description": description,
      "author": {
        "@type": "Organization",
        "name": "Arzani",
        "url": "https://arzani.co.uk",
        "sameAs": [
          "https://www.linkedin.com/company/arzani",
          "https://twitter.com/arzani_uk"
        ]
      },
      "publisher": {
        "@type": "Organization", 
        "name": "Arzani",
        "logo": {
          "@type": "ImageObject",
          "url": "https://arzani.co.uk/images/logo.png",
          "width": 200,
          "height": 60
        },
        "foundingDate": "2020",
        "description": "UK's leading business marketplace for buying and selling businesses"
      },
      "wordCount": wordCount,
      "datePublished": new Date().toISOString(),
      "dateModified": new Date().toISOString(),
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://arzani.co.uk/blog/"
      },
      "about": {
        "@type": "Thing",
        "name": "UK Business Marketplace",
        "description": "Business buying, selling, and valuation services in the United Kingdom"
      },
      "audience": {
        "@type": "Audience",
        "audienceType": "Business Professionals",
        "geographicArea": {
          "@type": "Country",
          "name": "United Kingdom"
        }
      }
    };

    // Add structured statistics if available
    if (keyStatistics && keyStatistics.length > 0) {
      baseSchema.mentions = keyStatistics.map(stat => ({
        "@type": "Statistic",
        "value": stat.statistic,
        "source": stat.source
      }));
    }

    return JSON.stringify(baseSchema);
  }

  /**
   * Select appropriate author based on content expertise requirements
   */
  selectAuthorByExpertise(category, contentType, authorProfiles) {
    const expertiseMapping = {
      'Business Acquisition': ['Business Acquisitions', 'M&A Advisory', 'Market Analysis'],
      'Business Selling': ['Business Valuation', 'M&A Advisory', 'Business Law'],
      'Business Valuation': ['Business Valuation', 'Financial Analysis'],
      'Industry Analysis': ['Market Research', 'Economic Analysis', 'Industry Trends'],
      'AI in Business': ['Technology Sector', 'Market Analysis'],
      'Geographic Markets': ['Market Research', 'Economic Analysis']
    };
    
    const requiredExpertise = expertiseMapping[category] || ['Market Analysis'];
    
    // Find author with matching expertise
    const matchingAuthor = authorProfiles.find(author => 
      author.expertise.some(exp => requiredExpertise.includes(exp))
    );
    
    // Fallback to first author if no match
    return matchingAuthor || authorProfiles[0];
  }

  /**
   * Truncate string to fit database column limits
   */
  truncateString(str, maxLength) {
    if (!str || typeof str !== 'string') return str;
    return str.length > maxLength ? str.substring(0, maxLength - 3) + '...' : str;
  }

  /**
   * Create URL-friendly slug from title
   */
  createSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }

  /**
   * Insert blog post directly into database
   */
  async insertBlogPost(postInfo, processedContent) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log('💾 Inserting blog post into database...');
      
      const slug = this.createSlug(postInfo.title);
      const categorySlug = this.contentCategories[postInfo.category] || 'general';
      
      // Check if post with this slug already exists
      const existingPost = await client.query(
        'SELECT id FROM blog_posts WHERE slug = $1',
        [slug]
      );
      
      if (existingPost.rows.length > 0) {
        console.log(`⚠️ Post with slug "${slug}" already exists, skipping...`);
        await client.query('ROLLBACK');
        return false;
      }
      
      // Create tracking data using existing JSONB column
      const trackingData = {
        checklist_id: postInfo.id,
        checklist_completed: true,
        automated_generation: true,
        content_cleaned: true,
        last_updated: new Date().toISOString()
      };
      
      // Insert the blog post
      const insertQuery = `
        INSERT INTO blog_posts (
          title, slug, content, excerpt, meta_description, 
          author_name, author_bio, author_image, author_avatar,
          status, is_featured, is_pillar, content_category, category,
          target_keyword, primary_keywords, secondary_keywords, seo_keywords,
          seo_title, seo_description, schema_markup,
          reading_time, read_time, publish_date, published_date,
          hero_image, og_image, og_description,
          buying_stage, cta_type, cta_text, cta_link,
          url_path, canonical_url,
          user_journey_position, next_in_journey,
          content_links, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, 
          $6, $7, $8, $9,
          $10, $11, $12, $13, $14,
          $15, $16, $17, $18,
          $19, $20, $21,
          $22, $23, $24, $25,
          $26, $27, $28,
          $29, $30, $31, $32,
          $33, $34,
          $35, $36,
          $37,
          NOW(), NOW()
        ) RETURNING id;
      `;
      
      const excerpt = processedContent.content
        .replace(/<[^>]*>/g, '')
        .substring(0, 200) + '...';
      
      // Get total posts count to determine which blog image to use
      const countResult = await client.query('SELECT COUNT(*) as count FROM blog_posts');
      const totalPosts = parseInt(countResult.rows[0].count);
      
      // Use blog image rotation system to get the next image
      // Enhanced author profiles for E-E-A-T authority
      const authorProfiles = [
        {
          name: 'Sarah Mitchell, Business Valuation Expert',
          bio: 'Chartered Business Valuator with 15+ years experience in UK SME valuations. Previously Senior Analyst at Deloitte Corporate Finance, now leads business assessment initiatives at Arzani. Holds RICS qualification and has valued over £500M in UK business transactions. Connect on LinkedIn: /in/sarah-mitchell-cbv',
          image: '/figma design exports/images.webp/arzani-icon-nobackground.png',
          expertise: ['Business Valuation', 'Financial Analysis', 'M&A Advisory']
        },
        {
          name: 'James Richardson, Marketplace Director',
          bio: 'Former Investment Banking VP at Barclays with 12 years in UK business acquisitions. Led the development of Arzani\'s marketplace technology and due diligence frameworks. MBA from London Business School, specializes in tech and manufacturing sector transactions. Featured in Financial Times and Business Weekly.',
          image: '/figma design exports/images.webp/arzani-icon-nobackground.png',
          expertise: ['Business Acquisitions', 'Technology Sector', 'Market Analysis']
        },
        {
          name: 'Dr. Emma Thompson, Industry Research Lead',
          bio: 'PhD in Economics from Cambridge, former researcher at Bank of England. Specializes in UK business market trends and regulatory impact analysis. Published 25+ papers on SME market dynamics. Leads Arzani\'s quarterly market intelligence reports covering £2B+ in annual transaction data.',
          image: '/figma design exports/images.webp/arzani-icon-nobackground.png',
          expertise: ['Market Research', 'Economic Analysis', 'Industry Trends']
        },
        {
          name: 'Michael Foster, Legal & Compliance Director',
          bio: 'Qualified Solicitor with 18 years experience in business law and M&A transactions. Former partner at Clifford Chance, specialized in mid-market acquisitions. Ensures all Arzani marketplace transactions comply with UK corporate law and FCA regulations. Member of Law Society Business Law Committee.',
          image: '/figma design exports/images.webp/arzani-icon-nobackground.png',
          expertise: ['Business Law', 'M&A Legal Framework', 'Regulatory Compliance']
        }
      ];
      
      // Select appropriate author based on content category and type
      const selectedAuthor = this.selectAuthorByExpertise(postInfo.category, postInfo.contentType, authorProfiles);
      
      const authorName = selectedAuthor.name;
      const authorBio = selectedAuthor.bio;
      const authorImage = selectedAuthor.image;
      
      // Use blog image rotation system to get the next image
      const heroImage = blogImageRotation.getBlogImageForNewPost(totalPosts);
      console.log(`🖼️ Using blog image: ${heroImage} (post #${totalPosts + 1})`);
      console.log(`👤 Selected author: ${authorName} for ${postInfo.category} content`);
      
      const values = [
        this.truncateString(postInfo.title, 255),                                    // title
        this.truncateString(slug, 255),                                              // slug  
        processedContent.content,                          // content
        excerpt,                                          // excerpt
        this.truncateString(processedContent.metaDescription, 255),                 // meta_description
        this.truncateString(authorName, 255),                                       // author_name
        authorBio,                                        // author_bio
        this.truncateString(authorImage, 255),                                      // author_image
        this.truncateString(authorImage, 255),                                      // author_avatar
        'Published',                                      // status
        postInfo.contentType === 'pillar',               // is_featured
        postInfo.contentType === 'pillar',               // is_pillar
        this.truncateString(categorySlug, 100),                                     // content_category
        this.truncateString(postInfo.category, 255),                                // category
        this.truncateString(processedContent.keywords.primary, 255),               // target_keyword
        processedContent.keywords.primary,               // primary_keywords
        processedContent.keywords.secondary.join(', '),  // secondary_keywords
        this.truncateString([...processedContent.keywords.secondary, 
         ...processedContent.keywords.semantic].join(', '), 255), // seo_keywords
        this.truncateString(`${postInfo.title} | Arzani`, 255),                     // seo_title
        processedContent.metaDescription,                 // seo_description
        processedContent.schemaMarkup,                    // schema_markup
        processedContent.readingTime,                     // reading_time
        processedContent.readingTime,                     // read_time
        new Date(),                                       // publish_date
        new Date(),                                       // published_date
        this.truncateString(heroImage, 255),                                        // hero_image
        this.truncateString(heroImage, 255),                                        // og_image
        this.truncateString(processedContent.metaDescription, 500),                 // og_description (500 char limit)
        this.getBuyingStage(postInfo.category),           // buying_stage
        'marketplace_signup',                             // cta_type
        this.truncateString('Explore Businesses for Sale', 255),                    // cta_text
        this.truncateString('/marketplace2', 255),                                  // cta_link (fixed URL)
        this.truncateString(`/blog/${categorySlug}/${slug}`, 255),                  // url_path
        this.truncateString(`https://arzani.co.uk/blog/${categorySlug}/${slug}`, 255), // canonical_url
        this.getUserJourneyPosition(postInfo.contentType), // user_journey_position
        this.truncateString('marketplace_browse', 255),                             // next_in_journey
        JSON.stringify(trackingData)                          // content_links
      ];
      
      const result = await client.query(insertQuery, values);
      const postId = result.rows[0].id;
      
      // Update the checklist to mark this post as completed
      await this.markPostCompleted(postInfo.id);
      
      // Schedule interlinking analysis for this post
      await this.scheduleInterlinkingAnalysis(postId);
      
      // Update sitemap with new blog post for search engine discovery
      await this.updateSitemap(postInfo.title);
      
      await client.query('COMMIT');
      
      console.log(`✅ Successfully inserted blog post "${postInfo.title}" with ID: ${postId}`);
      return postId;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error inserting blog post:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Determine buying stage based on category
   */
  getBuyingStage(category) {
    const stageMapping = {
      'Business Acquisition': 'consideration',
      'Business Selling': 'decision', 
      'Business Valuation': 'awareness',
      'Industry Analysis': 'awareness',
      'AI in Business': 'consideration',
      'Geographic Markets': 'awareness'
    };
    
    return stageMapping[category] || 'awareness';
  }

  /**
   * Determine user journey position
   */
  getUserJourneyPosition(contentType) {
    const positionMapping = {
      'pillar': 'entry_point',
      'supporting': 'consideration', 
      'tactical': 'decision'
    };
    
    return positionMapping[contentType] || 'consideration';
  }

  /**
   * Update sitemap after new blog post is published
   */
  async updateSitemap(postTitle) {
    try {
      console.log('🗺️ Updating sitemap with new blog post...');
      await generateXmlSitemap();
      console.log(`✅ Sitemap updated successfully for post: "${postTitle}"`);
      
      // Ping search engines about sitemap update
      await this.notifySearchEngines();
    } catch (error) {
      console.error('⚠️ Error updating sitemap:', error);
      // Don't throw error - sitemap update failure shouldn't break blog generation
    }
  }

  /**
   * Notify search engines about sitemap updates
   */
  async notifySearchEngines() {
    try {
      const sitemapUrl = 'https://www.arzani.co.uk/sitemap.xml';
      
      // List of search engine ping URLs
      const pingUrls = [
        `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
        `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`
      ];
      
      console.log('🔔 Notifying search engines about sitemap update...');
      
      for (const pingUrl of pingUrls) {
        try {
          const response = await fetch(pingUrl);
          const searchEngine = pingUrl.includes('google') ? 'Google' : 'Bing';
          
          if (response.ok) {
            console.log(`✅ Successfully notified ${searchEngine} about sitemap update`);
          } else {
            console.log(`⚠️ ${searchEngine} ping returned status: ${response.status}`);
          }
        } catch (pingError) {
          console.error(`❌ Error pinging search engine ${pingUrl}:`, pingError.message);
        }
      }
    } catch (error) {
      console.error('⚠️ Error notifying search engines:', error);
    }
  }

  /**
   * Mark post as completed in checklist
   */
  async markPostCompleted(postId) {
    try {
      const checklistPath = path.join(__dirname, '..', 'PRD_200_Blog_Post_Strategy_Checklist.md');
      let checklistContent = await fs.readFile(checklistPath, 'utf-8');
      
      // Replace unchecked box with checked box for this post ID
      const pattern = new RegExp(`- \\[ \\] \\*\\*${postId.replace('.', '\\.')}\\*\\*`, 'g');
      checklistContent = checklistContent.replace(pattern, `- [x] **${postId}**`);
      
      await fs.writeFile(checklistPath, checklistContent, 'utf-8');
      console.log(`📝 Marked post ${postId} as completed in checklist`);
      
    } catch (error) {
      console.error('⚠️ Error updating checklist:', error);
    }
  }

  /**
   * Main function to generate next blog post
   */
  async generateNextBlogPost() {
    if (this.isGenerating) {
      console.log('⏳ Content generation already in progress, skipping...');
      return;
    }
    
    try {
      this.isGenerating = true;
      
      console.log('🎯 Starting automated blog post generation...');
      
      // 1. Find next post to create
      const nextPost = await this.parseChecklistForNextPost();
      if (!nextPost) {
        console.log('🎉 All blog posts in checklist completed!');
        return;
      }
      
      console.log(`📝 Next post: "${nextPost.title}" (${nextPost.category})`);
      
      // 2. Generate content
      const processedContent = await this.generateBlogContent(nextPost);
      
      // 3. Insert into database
      const postId = await this.insertBlogPost(nextPost, processedContent);
      
      if (postId) {
        console.log(`🚀 Successfully published blog post #${postId}: "${nextPost.title}"`);
        
        // 4. Optional: Trigger additional SEO tasks
        await this.performPostPublishTasks(postId);
      }
      
    } catch (error) {
      console.error('❌ Error in automated blog generation:', error);
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Perform post-publish SEO optimization tasks
   */
  async performPostPublishTasks(postId) {
    try {
      console.log(`🔧 Running post-publish tasks for post ${postId}...`);
      
      // Schedule interlinking analysis
      setTimeout(() => this.analyzeAndUpdateInterlinking(postId), 5000);
      
      // Schedule social media posting (if configured)
      if (process.env.SOCIAL_MEDIA_ENABLED === 'true') {
        setTimeout(() => this.scheduleContentPromotion(postId), 10000);
      }
      
    } catch (error) {
      console.error('⚠️ Error in post-publish tasks:', error);
    }
  }

  /**
   * Analyze and update semantic relationships for interlinking
   */
  async analyzeAndUpdateInterlinking(postId) {
    const client = await pool.connect();
    
    try {
      console.log(`🔗 Analyzing interlinking for post ${postId}...`);
      
      // Get the current post details
      const postQuery = 'SELECT * FROM blog_posts WHERE id = $1';
      const postResult = await client.query(postQuery, [postId]);
      const currentPost = postResult.rows[0];
      
      if (!currentPost) return;
      
      // Find related posts based on keywords and category
      const relatedQuery = `
        SELECT id, title, target_keyword, content_category, primary_keywords
        FROM blog_posts 
        WHERE id != $1 
        AND (
          content_category = $2 
          OR primary_keywords ILIKE $3
          OR seo_keywords ILIKE $3
        )
        AND status = 'Published'
        ORDER BY 
          CASE WHEN content_category = $2 THEN 1 ELSE 2 END,
          created_at DESC
        LIMIT 10
      `;
      
      const keywordPattern = `%${currentPost.target_keyword}%`;
      const relatedResult = await client.query(relatedQuery, [
        postId, 
        currentPost.content_category, 
        keywordPattern
      ]);
      
      // Create relationships
      for (const relatedPost of relatedResult.rows) {
        await this.createSemanticRelationship(client, postId, relatedPost.id, 'related');
      }
      
      console.log(`✅ Created ${relatedResult.rows.length} semantic relationships for post ${postId}`);
      
    } catch (error) {
      console.error('❌ Error in interlinking analysis:', error);
    } finally {
      client.release();
    }
  }

  /**
   * Create semantic relationship between posts
   */
  async createSemanticRelationship(client, sourceId, targetId, relationshipType) {
    try {
      const insertQuery = `
        INSERT INTO blog_post_relationships (source_post_id, target_post_id, relationship_type, relationship_strength)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (source_post_id, target_post_id) DO NOTHING
      `;
      
      await client.query(insertQuery, [sourceId, targetId, relationshipType, 75]);
      
    } catch (error) {
      console.error('⚠️ Error creating semantic relationship:', error);
    }
  }

  /**
   * Schedule interlinking analysis for a post
   */
  async scheduleInterlinkingAnalysis(postId) {
    // Run interlinking analysis in 30 seconds to allow database commit
    setTimeout(() => {
      this.analyzeAndUpdateInterlinking(postId);
    }, 30000);
  }

  /**
   * Update semantic relationships across all posts
   */
  async updateSemanticRelationships() {
    console.log('🔄 Updating semantic relationships for all posts...');
    
    const client = await pool.connect();
    
    try {
      const postsQuery = 'SELECT id FROM blog_posts WHERE status = \'Published\' ORDER BY created_at DESC';
      const postsResult = await client.query(postsQuery);
      
      for (const post of postsResult.rows) {
        await this.analyzeAndUpdateInterlinking(post.id);
        
        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log('✅ Semantic relationships update completed');
      
    } catch (error) {
      console.error('❌ Error updating semantic relationships:', error);
    } finally {
      client.release();
    }
  }

  /**
   * Run comprehensive SEO audit
   */
  async runSEOAudit() {
    console.log('📊 Running comprehensive SEO audit...');
    
    const client = await pool.connect();
    
    try {
      // Audit checklist:
      // 1. Check for orphaned posts (no inbound links)
      const orphanQuery = `
        SELECT bp.id, bp.title, bp.slug
        FROM blog_posts bp
        LEFT JOIN blog_post_relationships bpr ON bp.id = bpr.target_post_id
        WHERE bpr.target_post_id IS NULL 
        AND bp.status = 'Published'
        AND bp.created_at < NOW() - INTERVAL '7 days'
      `;
      
      const orphanResult = await client.query(orphanQuery);
      
      if (orphanResult.rows.length > 0) {
        console.log(`⚠️ Found ${orphanResult.rows.length} orphaned posts requiring interlinking`);
        
        // Schedule interlinking for orphaned posts
        for (const orphan of orphanResult.rows) {
          await this.analyzeAndUpdateInterlinking(orphan.id);
        }
      }
      
      // 2. Check keyword density and optimization
      const keywordDensityQuery = `
        SELECT id, title, target_keyword, 
               LENGTH(content) - LENGTH(REPLACE(LOWER(content), LOWER(target_keyword), '')) as keyword_occurrences,
               LENGTH(REPLACE(content, ' ', '')) as content_length
        FROM blog_posts 
        WHERE status = 'Published' 
        AND target_keyword IS NOT NULL
      `;
      
      const densityResult = await client.query(keywordDensityQuery);
      
      // 3. Update link metrics
      await this.updateLinkMetrics(client);
      
      console.log('✅ SEO audit completed successfully');
      
    } catch (error) {
      console.error('❌ Error running SEO audit:', error);
    } finally {
      client.release();
    }
  }

  /**
   * Update link metrics for all posts
   */
  async updateLinkMetrics(client) {
    try {
      const updateQuery = `
        INSERT INTO blog_post_link_metrics (post_id, inbound_link_count, outbound_link_count, link_equity_score, orphan_status)
        SELECT 
          bp.id,
          COALESCE(inbound.count, 0) as inbound_count,
          COALESCE(outbound.count, 0) as outbound_count,
          COALESCE(inbound.count * 10 + outbound.count * 2, 0) as equity_score,
          CASE WHEN COALESCE(inbound.count, 0) = 0 THEN true ELSE false END as orphan_status
        FROM blog_posts bp
        LEFT JOIN (
          SELECT target_post_id, COUNT(*) as count 
          FROM blog_post_relationships 
          GROUP BY target_post_id
        ) inbound ON bp.id = inbound.target_post_id
        LEFT JOIN (
          SELECT source_post_id, COUNT(*) as count 
          FROM blog_post_relationships 
          GROUP BY source_post_id  
        ) outbound ON bp.id = outbound.source_post_id
        WHERE bp.status = 'Published'
        ON CONFLICT (post_id) DO UPDATE SET
          inbound_link_count = EXCLUDED.inbound_link_count,
          outbound_link_count = EXCLUDED.outbound_link_count,
          link_equity_score = EXCLUDED.link_equity_score,
          orphan_status = EXCLUDED.orphan_status,
          last_analysis = CURRENT_TIMESTAMP
      `;
      
      await client.query(updateQuery);
      console.log('📈 Link metrics updated successfully');
      
    } catch (error) {
      console.error('⚠️ Error updating link metrics:', error);
    }
  }

  /**
   * Get generation status and statistics
   */
  async getStatus() {
    const client = await pool.connect();
    
    try {
      // Get total posts
      const totalQuery = 'SELECT COUNT(*) as total FROM blog_posts WHERE status = \'Published\'';
      const totalResult = await client.query(totalQuery);
      const totalPosts = parseInt(totalResult.rows[0].total);
      
      // Get posts this week
      const weekQuery = `
        SELECT COUNT(*) as weekly 
        FROM blog_posts 
        WHERE status = 'Published' 
        AND created_at >= NOW() - INTERVAL '7 days'
      `;
      const weekResult = await client.query(weekQuery);
      const weeklyPosts = parseInt(weekResult.rows[0].weekly);
      
      // Get uncompleted posts from checklist
      const nextPost = await this.parseChecklistForNextPost();
      
      return {
        totalPosts,
        weeklyPosts,
        isGenerating: this.isGenerating,
        nextPost: nextPost ? nextPost.title : 'All posts completed',
        systemStatus: 'Active',
        lastGenerated: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Error getting status:', error);
      return {
        totalPosts: 0,
        weeklyPosts: 0,
        isGenerating: false,
        nextPost: 'Error retrieving status',
        systemStatus: 'Error',
        lastGenerated: null
      };
    } finally {
      client.release();
    }
  }

  /**
   * Manual trigger for immediate content generation (for testing)
   */
  async generateImmediately() {
    console.log('🚀 Manual trigger: Generating blog post immediately...');
    await this.generateNextBlogPost();
  }

  /**
   * Stop the automated system
   */
  stop() {
    console.log('🛑 Stopping Automated Blog Generation System...');
    cron.getTasks().forEach(task => task.stop());
    console.log('✅ System stopped successfully');
  }
}

// Export the class for use in other modules
export default AutomatedBlogGenerator;

// If running directly, initialize the system
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new AutomatedBlogGenerator();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    generator.stop();
    process.exit(0);
  });
  
  // Initialize the system
  generator.initialize().catch(console.error);
  
  console.log('🎯 Automated Blog Generation System is running...');
  console.log('   - 6 posts per day scheduled automatically');
  console.log('   - Reading from PRD checklist');
  console.log('   - Publishing directly to production database');
  console.log('   - Press Ctrl+C to stop');
}
