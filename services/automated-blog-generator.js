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
        headingStructure: ['h2', 'h3', 'h4'],
        fleschScore: 60,
        requiresFAQ: true,
        minExternalLinks: 7,
        requiresFramework: true
      },
      supporting: {
        minWords: 2000,
        maxWords: 3500,
        keywordDensity: 1.2,
        headingStructure: ['h2', 'h3'],
        fleschScore: 60,
        requiresFAQ: true,
        minExternalLinks: 5,
        requiresFramework: true
      },
      tactical: {
        minWords: 1800,
        maxWords: 2500,
        keywordDensity: 1.0,
        headingStructure: ['h2', 'h3'],
        fleschScore: 65,
        requiresFAQ: true,
        minExternalLinks: 4,
        requiresFramework: true
      }
    };

    // Generic infographic templates for automation (S3 hosted)
    this.infographicTemplates = {
      process: {
        name: 'Business Process Framework',
        filename: 'business-process-framework.webp',
        s3Url: 'https://arzani-images1.s3.eu-west-2.amazonaws.com/blogs/business-process-framework.webp',
        altTemplate: 'Step-by-step business {category} process framework infographic',
        placement: 'after-intro'
      },
      statistics: {
        name: 'UK Market Statistics',
        filename: 'uk-market-statistics.webp',
        s3Url: 'https://arzani-images1.s3.eu-west-2.amazonaws.com/blogs/uk-market-statistics.webp',
        altTemplate: 'UK {category} market statistics and data visualization',
        placement: 'mid-content'
      },
      checklist: {
        name: 'Business Checklist',
        filename: 'business-checklist-template.webp',
        s3Url: 'https://arzani-images1.s3.eu-west-2.amazonaws.com/blogs/business-checklist-template.webp',
        altTemplate: '{category} checklist and key considerations infographic',
        placement: 'before-conclusion'
      },
      timeline: {
        name: 'Business Timeline',
        filename: 'business-timeline-template.webp',
        s3Url: 'https://arzani-images1.s3.eu-west-2.amazonaws.com/blogs/business-timeline-template.webp',
        altTemplate: 'Typical {category} timeline and milestones infographic', 
        placement: 'mid-content'
      },
      comparison: {
        name: 'Comparison Chart',
        filename: 'business-comparison-chart.webp',
        s3Url: 'https://arzani-images1.s3.eu-west-2.amazonaws.com/blogs/business-comparison-chart.webp',
        altTemplate: '{category} comparison chart and analysis infographic',
        placement: 'after-analysis'
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
          },
          placeholder_validation: {
            type: "object",
            properties: {
              process_placeholder: { type: "boolean", description: "Confirms [IMG_PLACEHOLDER:process:category] is included" },
              statistics_placeholder: { type: "boolean", description: "Confirms [IMG_PLACEHOLDER:statistics:category] is included" },
              timeline_placeholder: { type: "boolean", description: "Confirms [IMG_PLACEHOLDER:timeline:category] is included" },
              checklist_placeholder: { type: "boolean", description: "Confirms [IMG_PLACEHOLDER:checklist:category] is included" },
              comparison_placeholder: { type: "boolean", description: "Confirms [IMG_PLACEHOLDER:comparison:category] is included" }
            },
            required: ["process_placeholder", "statistics_placeholder", "timeline_placeholder", "checklist_placeholder", "comparison_placeholder"],
            additionalProperties: false,
            description: "Validation that all 5 required image placeholders are included in content"
          }
        },
        required: ["content", "meta_description", "key_statistics", "authority_signals", "word_count", "placeholder_validation"],
        additionalProperties: false
      };
      
      // Generate content using OpenAI with Structured Outputs and enhanced prompting
      const response = await openai.chat.completions.create({
        model: "gpt-4o-2024-08-06", // Use latest model with structured outputs support
        messages: [
          {
            role: "developer", // Higher authority role for system instructions
            content: `# CRITICAL SYSTEM INSTRUCTIONS

You are an expert SEO content writer and UK business marketplace authority. You MUST follow these formatting requirements EXACTLY.

## MANDATORY PLACEHOLDER REQUIREMENT
YOU MUST INCLUDE EXACTLY THESE 5 PLACEHOLDERS IN YOUR CONTENT:
1. [IMG_PLACEHOLDER:process:{category}] - After introduction section
2. [IMG_PLACEHOLDER:statistics:{category}] - Mid-content for data visualization
3. [IMG_PLACEHOLDER:timeline:{category}] - After case studies section
4. [IMG_PLACEHOLDER:checklist:{category}] - Before conclusion section  
5. [IMG_PLACEHOLDER:comparison:{category}] - In comparison/analysis section

⚠️ VALIDATION: Content missing ANY placeholder will be rejected and regenerated.

## CONTENT STRUCTURE REQUIREMENTS
- Start directly with HTML content (no code blocks)
- Include Table of Contents with anchor links
- Create numbered framework (5-7 steps)
- Include FAQ section before conclusion
- Use proper HTML tags: <h2>, <h3>, <p>, <ul>, <ol>
- British English spelling and terminology

## E-E-A-T AUTHORITY SIGNALS
- Include specific UK market data with sources
- Reference regulations (Companies House, HMRC, FCA)
- Use professional examples with realistic numbers
- Cite authoritative external sources
- Demonstrate first-hand marketplace experience

## QUALITY REQUIREMENTS
- ${template.minWords}-${template.maxWords} words minimum
- Flesch Reading Score ≥ ${template.fleschScore}
- Avoid overused phrases: "unlock", "crucial", "delve"
- Never mention AI, artificial generation, or prompts

REMEMBER: All 5 image placeholders are MANDATORY and must appear exactly as specified above.`
          },
          {
            role: "system",
            name: "example_user", 
            content: "Create a blog post about business acquisition financing"
          },
          {
            role: "system", 
            name: "example_assistant",
            content: `<h2>Introduction</h2>
<p>Business acquisition financing in the UK requires careful planning and strategic approach.</p>
[IMG_PLACEHOLDER:process:business acquisition]

<h2>Market Analysis</h2>
<p>Current UK market shows significant opportunities for growth.</p>
[IMG_PLACEHOLDER:statistics:business acquisition]

<h2>Case Studies</h2>
<p>Recent transactions demonstrate successful acquisition strategies.</p>
[IMG_PLACEHOLDER:timeline:business acquisition]

<h2>Financing Options Comparison</h2>
<p>Different financing methods offer various advantages.</p>
[IMG_PLACEHOLDER:comparison:business acquisition]

<h2>Essential Considerations</h2>
<p>Key factors to evaluate before proceeding.</p>
[IMG_PLACEHOLDER:checklist:business acquisition]

<h2>Conclusion</h2>
<p>Strategic financing enables successful acquisitions.</p>`
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
**Readability Target:** Flesch Reading Score ≥ ${template.fleschScore}

**CRITICAL STRUCTURE REQUIREMENTS:**
1. **Table of Contents** (after introduction): Generate clickable TOC with anchor links
2. **Numbered Framework** (required): Create a specific step-by-step framework (e.g., "7-Step Negotiation Framework", "5-Phase Due Diligence Process")
3. **FAQ Section** (before conclusion): Include 5-7 relevant FAQs with detailed answers
4. **Image Placeholders**: Insert strategic image placeholders for infographics
5. **Enhanced Author Bio**: Include detailed credentials and expertise markers

**Content Requirements:**
1. Write for UK business buyers and sellers with demonstrated expertise
2. Include current 2025 market data and statistics with proper attribution
3. Provide actionable insights based on first-hand marketplace experience
4. Use ${template.headingStructure.join(', ')} heading structure with keyword modifiers
5. Include relevant case studies from real UK business transactions (anonymized)
6. Optimize for SEO with natural keyword placement and E-E-A-T signals
7. Target Flesch Reading Score of ${template.fleschScore}+ (shorter sentences, simpler words)
8. Include minimum ${template.minExternalLinks} external authoritative links
9. End with a strong call-to-action directing to Arzani marketplace
10. **IMPORTANT: Include strategic hyperlinks throughout the content**
11. **CRITICAL: ALWAYS use "arzani.co.uk" domain - NEVER use "arzani.com"**

**MANDATORY CONTENT STRUCTURE:**

**1. INTRODUCTION (150-200 words)**
- Hook with current market statistic
- Primary keyword in first 100 words
- Clear value proposition
- [IMG_PLACEHOLDER:process:{category}] <!-- Insert after introduction -->

**2. TABLE OF CONTENTS**
<div class="table-of-contents">
<h2>Table of Contents</h2>
<ul>
<li><a href="#section-1">Section 1 Title</a></li>
<li><a href="#section-2">Section 2 Title</a></li>
<!-- Add all sections with proper anchor links -->
</ul>
</div>

**3. MAIN CONTENT SECTIONS**
- Use specific numbered frameworks (e.g., "7-Step Business Valuation Framework")
- Include keyword modifiers in headings ("strategies", "examples", "steps", "guide")
- [IMG_PLACEHOLDER:statistics:{category}] <!-- Insert mid-content -->
- Add proprietary insights from Arzani marketplace data
- Include UK-specific legal/regulatory references

**4. DETAILED CASE STUDIES (Required)**
- Minimum 2 anonymized UK business transaction examples
- Specific numbers and outcomes where possible
- [IMG_PLACEHOLDER:timeline:{category}] <!-- Insert after case studies -->

**5. FAQ SECTION (Required)**
<h2 id="faq">Frequently Asked Questions</h2>
<div class="faq-section">
<h3>What is a typical multiple for UK SMEs?</h3>
<p>Detailed answer with current market data...</p>
<!-- Include 5-7 relevant FAQs with detailed answers -->
</div>
[IMG_PLACEHOLDER:checklist:{category}] <!-- Insert before conclusion -->

**6. CONCLUSION & CTA**
- Summarize key takeaways
- Educational CTA paired with commercial CTA
- Link to relevant resources

**E-E-A-T Requirements:**
• **Experience**: Include specific examples like "In our experience facilitating £50M+ in business transactions..." or "We've observed that businesses in the hospitality sector typically..."
• **Expertise**: Demonstrate deep knowledge with technical details, regulatory references, and industry-standard practices
• **Authoritativeness**: Cite authoritative sources (Companies House, ONS, industry reports, academic research) and use proper attribution
• **Trustworthiness**: Acknowledge limitations, recommend professional consultation where appropriate, include disclosure of commercial affiliation

**CRITICAL HTML FORMATTING REQUIREMENTS:**
- Use <h2 id="section-id"> tags for main section headings with anchor IDs
- Use <h3> tags for subsection headings with keyword modifiers
- Use <h4> tags for sub-subsection headings if needed
- Wrap ALL paragraphs in <p> tags (max 25 words per sentence for readability)
- Use <ul> and <li> tags for unordered lists
- Use <ol> and <li> tags for ordered/numbered lists
- Use <strong> tags for bold text emphasis
- Use <em> tags for italic emphasis
- Use <a href="URL"> tags for all links with proper URLs
- Add proper anchor links: <a href="#section-id">Jump to Section</a>
- Do NOT use markdown syntax (no **, ##, -, etc.)
- Do NOT use plain text formatting

**ENHANCED LINKING STRATEGY:**
- Link to ${template.minExternalLinks}+ external authoritative sources (gov.uk, ons.gov.uk, companieshouse.gov.uk, academic papers)
- Reference related business concepts for internal linking opportunities
- Use natural anchor text with keyword variations
- Include contextual links to Arzani marketplace features (ALWAYS use arzani.co.uk domain)
- Add "nofollow" for commercial links where appropriate
- **DOMAIN REQUIREMENT: All Arzani links must use "arzani.co.uk" NOT "arzani.com"**

**READABILITY OPTIMIZATION:**
- Target Flesch Reading Score ≥ ${template.fleschScore}
- Keep sentences under 25 words
- Use simple, clear language while maintaining expertise
- Break up long paragraphs
- Use bullet points and numbered lists for clarity
- Add transition sentences between sections

**Authority Demonstrations (Include at least 3-4 of these):**
• Market Data: "Based on our analysis of 1,200+ UK business transactions in 2024..."
• Regulatory References: "Under Companies House filing requirements..." or "Following FCA guidance..."
• Case Studies: "A recent £1.8M acquisition in the Leeds manufacturing sector demonstrated..."
• Professional Insights: "In our experience facilitating business sales across 15 UK regions..."
• Industry Statistics: "According to our quarterly marketplace report, tech businesses valued between £500K-£2M show..."
• Expert Analysis: "Our valuation team has observed that hospitality businesses typically..."
• Academic Citations: "Research from Cambridge Business School indicates..."

**First-Hand Experience Examples:**
• Transaction Examples: "We recently facilitated the sale of a Birmingham-based logistics company where..."
• Market Insights: "Through our marketplace, we've identified three key trends in 2025 UK business acquisitions..."
• Professional Observations: "Our due diligence process has revealed that businesses with strong digital presence..."
• Success Stories: "A manufacturing client increased their business value by 34% after implementing our recommendations..."

**🔥 CRITICAL: IMAGE PLACEHOLDER SYSTEM (MANDATORY) 🔥**

⚠️ FAILURE TO INCLUDE ALL 5 PLACEHOLDERS WILL RESULT IN CONTENT REJECTION ⚠️

COPY THESE EXACT PLACEHOLDERS INTO YOUR CONTENT:

✅ [IMG_PLACEHOLDER:process:${postInfo.category}] ← REQUIRED after introduction
✅ [IMG_PLACEHOLDER:statistics:${postInfo.category}] ← REQUIRED in main content  
✅ [IMG_PLACEHOLDER:timeline:${postInfo.category}] ← REQUIRED after case studies
✅ [IMG_PLACEHOLDER:checklist:${postInfo.category}] ← REQUIRED before conclusion
✅ [IMG_PLACEHOLDER:comparison:${postInfo.category}] ← REQUIRED in analysis section

🚨 VALIDATION CHECKPOINT: Your content must contain all 5 placeholders exactly as shown above 🚨

**MANDATORY CONTENT ELEMENTS (ALL REQUIRED):**
📋 Table of Contents with anchor links
🔢 Numbered framework (5-7 steps)  
❓ 5 FAQ questions before conclusion
🖼️ ALL 5 image placeholders included
📊 Case studies section
🎯 Conclusion with CTA

**SUCCESS CRITERIA:**
- Content includes ALL 5 placeholders verbatim
- Placeholders use the exact category: "${postInfo.category}"
- HTML formatting is clean and proper
- Word count meets ${template.minWords}-${template.maxWords} requirement

Generate ONLY the HTML content body. Do NOT include <html>, <head>, or <body> tags.
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
    
    // Optimize for readability (Flesch score target)
    content = this.optimizeReadability(content, template.fleschScore);
    
    // Auto-inject image placeholders if AI didn't include them (fallback system)
    content = this.injectMissingPlaceholders(content, keywords.primary);
    
    // Process image placeholders with generic infographics
    content = this.processImagePlaceholders(content, keywords.primary, structuredData.title || 'Business Guide');
    
    // Add strategic internal links with correct URLs
    content = await this.addInternalLinksFixed(content, keywords);
    
    // Calculate reading time
    const wordCount = structuredData.word_count || content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200); // 200 WPM average
    
    // Use structured meta description or generate fallback
    const metaDescription = structuredData.meta_description || 
                           await this.generateMetaDescription(content, keywords.primary);
    
    // Generate enhanced schema markup with FAQ data
    const faqSchema = this.generateFAQSchema(content);
    const schemaMarkup = this.generateEnhancedSchemaMarkup(
      keywords.primary, 
      metaDescription, 
      wordCount,
      structuredData.key_statistics || [],
      faqSchema
    );

    // Validate content meets minimum requirements
    const contentValidation = this.validateContentQuality(content, template);

    return {
      content,
      wordCount,
      readingTime,
      metaDescription,
      schemaMarkup,
      faqSchema,
      keywords,
      keyStatistics: structuredData.key_statistics || [],
      authoritySignals: structuredData.authority_signals || [],
      structured: true,
      eeatCompliant: (structuredData.authority_signals || []).length >= 3,
      contentValidation,
      fleschScore: this.estimateFleschScore(content),
      externalLinks: this.countExternalLinks(content),
      internalLinks: this.countInternalLinks(content),
      hasTableOfContents: content.includes('table-of-contents'),
      hasFAQSection: content.includes('faq-section'),
      hasNumberedFramework: this.hasNumberedFramework(content)
    };
  }

  /**
   * Process image placeholders and insert generic infographics
   */
  processImagePlaceholders(content, category, title) {
    console.log('🖼️ Processing image placeholders for automated infographics...');
    
    // Replace image placeholders with actual HTML
    let processedContent = content;
    
    Object.keys(this.infographicTemplates).forEach(templateKey => {
      const template = this.infographicTemplates[templateKey];
      
      // Create flexible regex to match different category formats
      // Match: [IMG_PLACEHOLDER:process:business acquisition] OR [IMG_PLACEHOLDER:process:Business Acquisition]
      const placeholderRegex = new RegExp(`\\[IMG_PLACEHOLDER:${templateKey}:[^\\]]+\\]`, 'gi');
      const matches = processedContent.match(placeholderRegex);
      
      if (matches && matches.length > 0) {
        // Use the first match to get the exact placeholder text
        const placeholder = matches[0];
        
        const altText = template.altTemplate
          .replace('{category}', category.toLowerCase())
          .replace('{title}', title.toLowerCase());
        
        const imageHtml = `
<div class="blog-infographic" style="text-align: center; margin: 2rem 0;">
  <img src="${template.s3Url}" 
       alt="${altText}"
       class="responsive-infographic"
       style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"
       loading="lazy"
       crossorigin="anonymous">
  <p class="image-caption" style="font-size: 0.9rem; color: #666; margin-top: 0.5rem; font-style: italic;">
    ${template.name} - ${altText}
  </p>
</div>`;
        
        // Replace all instances of this placeholder type
        processedContent = processedContent.replace(placeholderRegex, imageHtml);
        console.log(`✅ Inserted ${template.name} infographic (matched: ${placeholder})`);
      }
    });
    
    // Remove any remaining placeholders that weren't processed
    processedContent = processedContent.replace(/\[IMG_PLACEHOLDER:[^\]]+\]/g, '');
    
    return processedContent;
  }

  /**
   * Auto-inject image placeholders if AI didn't include them (fallback system)
   */
  injectMissingPlaceholders(content, category) {
    console.log('🔍 Checking for missing image placeholders...');
    
    // Check if content already has IMG_PLACEHOLDER tags
    const existingPlaceholders = content.match(/\[IMG_PLACEHOLDER:[^\]]+\]/g) || [];
    
    if (existingPlaceholders.length >= 3) {
      console.log(`✅ Found ${existingPlaceholders.length} existing placeholders - no injection needed`);
      return content;
    }
    
    console.log(`⚠️ Only found ${existingPlaceholders.length} placeholders - injecting missing ones...`);
    
    // Define strategic injection points
    const injectionPoints = [
      {
        placeholder: `[IMG_PLACEHOLDER:process:${category}]`,
        pattern: /<h2[^>]*>.*?<\/h2>\s*<p>/i,
        description: 'after first section header'
      },
      {
        placeholder: `[IMG_PLACEHOLDER:statistics:${category}]`,
        pattern: /<h2[^>]*>.*?(analysis|data|statistics|market).*?<\/h2>/i,
        description: 'in analysis/statistics section'
      },
      {
        placeholder: `[IMG_PLACEHOLDER:timeline:${category}]`,
        pattern: /<h2[^>]*>.*?(case studies?|examples?|timeline).*?<\/h2>/i,
        description: 'after case studies section'
      },
      {
        placeholder: `[IMG_PLACEHOLDER:checklist:${category}]`,
        pattern: /<h2[^>]*[^>]*faq[^>]*>.*?<\/div>/i,
        description: 'before conclusion'
      },
      {
        placeholder: `[IMG_PLACEHOLDER:comparison:${category}]`,
        pattern: /<h2[^>]*>.*?(comparison|framework|step).*?<\/h2>/i,
        description: 'in framework/comparison section'
      }
    ];
    
    let modifiedContent = content;
    let injectedCount = 0;
    
    // Inject placeholders at strategic points
    injectionPoints.forEach(injection => {
      // Skip if this type already exists
      if (existingPlaceholders.some(p => p.includes(injection.placeholder.split(':')[1]))) {
        return;
      }
      
      const match = modifiedContent.match(injection.pattern);
      if (match && injectedCount < 5) {
        const insertPoint = match.index + match[0].length;
        modifiedContent = 
          modifiedContent.slice(0, insertPoint) + 
          '\n' + injection.placeholder + '\n' + 
          modifiedContent.slice(insertPoint);
        
        console.log(`✅ Injected ${injection.placeholder.split(':')[1]} placeholder ${injection.description}`);
        injectedCount++;
      }
    });
    
    // Fallback: inject at least 2 placeholders in safe locations
    if (injectedCount === 0) {
      console.log('🔧 Using fallback injection strategy...');
      
      // Inject after first paragraph
      const firstParagraph = modifiedContent.match(/<\/p>/);
      if (firstParagraph) {
        const insertPoint = firstParagraph.index + firstParagraph[0].length;
        modifiedContent = 
          modifiedContent.slice(0, insertPoint) + 
          `\n[IMG_PLACEHOLDER:process:${category}]\n` + 
          modifiedContent.slice(insertPoint);
        injectedCount++;
      }
      
      // Inject before conclusion
      const conclusion = modifiedContent.match(/<h2[^>]*>.*?(conclusion|summary)/i);
      if (conclusion && injectedCount < 3) {
        modifiedContent = 
          modifiedContent.slice(0, conclusion.index) + 
          `[IMG_PLACEHOLDER:checklist:${category}]\n` + 
          modifiedContent.slice(conclusion.index);
        injectedCount++;
      }
    }
    
    console.log(`📊 Placeholder injection complete: ${injectedCount} added`);
    return modifiedContent;
  }

  /**
   * Generate enhanced FAQ section with structured data
   */
  generateFAQSchema(content) {
    console.log('📝 Generating FAQ structured data...');
    
    // Extract FAQ sections from content
    const faqRegex = /<h3>([^<]+\?[^<]*)<\/h3>\s*<p>([^<]+(?:<[^>]+>[^<]*<\/[^>]+>[^<]*)*)<\/p>/gi;
    const faqs = [];
    let match;
    
    while ((match = faqRegex.exec(content)) !== null) {
      faqs.push({
        question: match[1].trim(),
        answer: match[2].replace(/<[^>]+>/g, '').trim()
      });
    }
    
    if (faqs.length === 0) return null;
    
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };
  }

  /**
   * Optimize content for readability (Flesch score improvement)
   */
  optimizeReadability(content, targetScore = 60) {
    console.log(`📖 Optimizing content readability (target Flesch score: ${targetScore}+)...`);
    
    // Split into sentences and analyze
    let optimizedContent = content;
    
    // Break up long sentences (over 25 words)
    const sentenceRegex = /<p>([^<]+(?:<[^>]+>[^<]*<\/[^>]+>[^<]*)*)<\/p>/gi;
    
    optimizedContent = optimizedContent.replace(sentenceRegex, (match, sentence) => {
      // Count words in sentence (excluding HTML tags)
      const words = sentence.replace(/<[^>]+>/g, '').split(/\s+/).filter(word => word.length > 0);
      
      if (words.length > 25) {
        // Try to split long sentences at logical break points
        let splitSentence = sentence
          .replace(/,\s+and\s+/gi, '. Additionally, ')
          .replace(/,\s+but\s+/gi, '. However, ')
          .replace(/,\s+which\s+/gi, '. This ')
          .replace(/;\s+/gi, '. ')
          .replace(/\s+therefore\s+/gi, '. Therefore, ')
          .replace(/\s+however\s+/gi, '. However, ');
        
        return `<p>${splitSentence}</p>`;
      }
      
      return match;
    });
    
    return optimizedContent;
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
      .replace(/href="www\.arzani\.co\.uk\/marketplace"/g, 'href="www.arzani.co.uk/marketplace2"')
      .replace(/href="https?:\/\/(?:www\.)?arzani\.com/g, 'href="https://www.arzani.co.uk')
      .replace(/arzani\.com/g, 'arzani.co.uk');

    // Add proper CSS classes to existing links
    cleanContent = this.enhanceLinkStyling(cleanContent);

    return cleanContent;
  }

  /**
   * Validate content quality against template requirements
   */
  validateContentQuality(content, template) {
    const wordCount = content.split(/\s+/).length;
    const externalLinks = this.countExternalLinks(content);
    const fleschScore = this.estimateFleschScore(content);
    
    const validation = {
      wordCountMet: wordCount >= template.minWords,
      externalLinksMet: externalLinks >= template.minExternalLinks,
      readabilityMet: fleschScore >= template.fleschScore,
      hasFAQ: template.requiresFAQ ? content.includes('faq-section') : true,
      hasFramework: template.requiresFramework ? this.hasNumberedFramework(content) : true,
      hasTOC: content.includes('table-of-contents'),
      score: 0
    };
    
    // Calculate overall quality score
    validation.score = [
      validation.wordCountMet,
      validation.externalLinksMet,
      validation.readabilityMet,
      validation.hasFAQ,
      validation.hasFramework,
      validation.hasTOC
    ].filter(Boolean).length / 6 * 100;
    
    return validation;
  }

  /**
   * Count external links in content
   */
  countExternalLinks(content) {
    const externalLinkRegex = /<a[^>]+href=["']https?:\/\/(?!arzani\.co\.uk)[^"']+["'][^>]*>/gi;
    const matches = content.match(externalLinkRegex);
    return matches ? matches.length : 0;
  }

  /**
   * Count internal links in content  
   */
  countInternalLinks(content) {
    const internalLinkRegex = /<a[^>]+href=["'](?:\/|https?:\/\/arzani\.co\.uk)[^"']*["'][^>]*>/gi;
    const matches = content.match(internalLinkRegex);
    return matches ? matches.length : 0;
  }

  /**
   * Check if content has numbered framework
   */
  hasNumberedFramework(content) {
    const frameworkRegex = /\d+[-.]\s*(?:step|phase|stage|framework|process)/gi;
    return frameworkRegex.test(content);
  }

  /**
   * Estimate Flesch Reading Score (simplified calculation)
   */
  estimateFleschScore(content) {
    // Remove HTML tags for analysis
    const plainText = content.replace(/<[^>]+>/g, ' ');
    const sentences = plainText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = plainText.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((total, word) => {
      return total + this.countSyllables(word);
    }, 0);
    
    if (sentences.length === 0 || words.length === 0) return 0;
    
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;
    
    // Flesch Reading Ease formula
    const fleschScore = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    
    return Math.round(Math.max(0, Math.min(100, fleschScore)));
  }

  /**
   * Count syllables in a word (simplified)
   */
  countSyllables(word) {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  /**
   * Generate content improvement recommendations
   */
  generateContentRecommendations(validation, fleschScore) {
    const recommendations = [];
    
    if (!validation.wordCountMet) {
      recommendations.push({
        priority: 'high',
        type: 'word_count',
        message: 'Content is too short. Add more detailed analysis, case studies, or examples.',
        action: 'Expand content to meet minimum word count requirements'
      });
    }
    
    if (!validation.externalLinksMet) {
      recommendations.push({
        priority: 'medium',
        type: 'external_links',
        message: 'Add more external authoritative sources to improve E-E-A-T signals.',
        action: 'Include links to gov.uk, ONS, Companies House, or industry reports'
      });
    }
    
    if (!validation.readabilityMet) {
      recommendations.push({
        priority: 'high',
        type: 'readability',
        message: `Flesch score (${fleschScore}) is below target. Simplify language and shorten sentences.`,
        action: 'Break up long sentences and use simpler vocabulary'
      });
    }
    
    if (!validation.hasFAQ) {
      recommendations.push({
        priority: 'medium',
        type: 'faq_section',
        message: 'Add FAQ section to capture featured snippets and improve user experience.',
        action: 'Include 5-7 relevant FAQs with detailed answers'
      });
    }
    
    if (!validation.hasFramework) {
      recommendations.push({
        priority: 'medium',
        type: 'framework',
        message: 'Add numbered framework or step-by-step guide for better structure.',
        action: 'Include specific numbered process (e.g., "5-Step Framework")'
      });
    }
    
    if (!validation.hasTOC) {
      recommendations.push({
        priority: 'low',
        type: 'table_of_contents',
        message: 'Add table of contents for better navigation and user experience.',
        action: 'Include clickable TOC with anchor links to sections'
      });
    }
    
    return recommendations;
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
  generateEnhancedSchemaMarkup(title, description, wordCount, keyStatistics = [], faqSchema = null) {
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

    // Create combined schema array if FAQ data exists
    if (faqSchema) {
      return JSON.stringify([baseSchema, faqSchema]);
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
      
      // Generate slug from post title to create proper URL
      const slug = this.createSlug(postTitle);
      
      // Notify search engines about new blog post using modern APIs
      const newBlogUrl = `https://www.arzani.co.uk/blog/post/${slug}`;
      await this.notifySearchEngines(newBlogUrl);
    } catch (error) {
      console.error('⚠️ Error updating sitemap:', error);
      // Don't throw error - sitemap update failure shouldn't break blog generation
    }
  }

  /**
   * Notify search engines about sitemap updates using modern APIs
   */
  async notifySearchEngines(newBlogUrl = null) {
    try {
      // Import the modern notification system
      const { default: ModernSearchNotification } = await import('./modernSearchNotification.js');
      const notifier = new ModernSearchNotification();
      
      console.log('🔔 Using modern search engine notification system...');
      
      if (newBlogUrl) {
        // Notify about specific new blog post
        await notifier.notifyNewBlogPost(newBlogUrl);
      } else {
        // General sitemap notification
        await notifier.notifyComprehensive();
      }
      
      console.log('✅ Modern search engine notification completed');
      
    } catch (error) {
      console.error('⚠️ Error with modern search notification:', error);
      
      // Fallback: Log the deprecated method issue
      console.log('\n📋 Manual Action Required:');
      console.log('🔧 Automated ping URLs are deprecated (Google 404, Bing 410)');
      console.log('📍 Please manually submit sitemap: https://www.arzani.co.uk/sitemap.xml');
      console.log('🌐 Google: Search Console → Sitemaps');
      console.log('🌐 Bing: Webmaster Tools → Sitemaps');
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

      // Get quality metrics for recent posts
      const qualityQuery = `
        SELECT 
          AVG(CASE WHEN word_count >= 2000 THEN 1 ELSE 0 END) * 100 as quality_score,
          AVG(word_count) as avg_word_count,
          COUNT(CASE WHEN content LIKE '%faq-section%' THEN 1 END) as posts_with_faq,
          COUNT(CASE WHEN content LIKE '%table-of-contents%' THEN 1 END) as posts_with_toc,
          COUNT(*) as total_analyzed
        FROM blog_posts 
        WHERE status = 'Published' 
        AND created_at >= NOW() - INTERVAL '30 days'
      `;
      const qualityResult = await client.query(qualityQuery);
      const qualityMetrics = qualityResult.rows[0];
      
      // Get uncompleted posts from checklist
      const nextPost = await this.parseChecklistForNextPost();

      // Calculate content quality percentage
      const contentQualityScore = Math.round(
        ((qualityMetrics.posts_with_faq / qualityMetrics.total_analyzed) * 30) +
        ((qualityMetrics.posts_with_toc / qualityMetrics.total_analyzed) * 30) +
        (Math.min(qualityMetrics.avg_word_count / 2000, 1) * 40)
      );
      
      return {
        totalPosts,
        weeklyPosts,
        isGenerating: this.isGenerating,
        nextPost: nextPost ? nextPost.title : 'All posts completed',
        systemStatus: 'Active',
        lastGenerated: new Date().toISOString(),
        qualityMetrics: {
          averageWordCount: Math.round(qualityMetrics.avg_word_count || 0),
          postsWithFAQ: parseInt(qualityMetrics.posts_with_faq || 0),
          postsWithTOC: parseInt(qualityMetrics.posts_with_toc || 0),
          contentQualityScore: contentQualityScore,
          totalAnalyzed: parseInt(qualityMetrics.total_analyzed || 0)
        },
        templates: {
          pillar: `${this.seoTemplates.pillar.minWords}-${this.seoTemplates.pillar.maxWords} words`,
          supporting: `${this.seoTemplates.supporting.minWords}-${this.seoTemplates.supporting.maxWords} words`, 
          tactical: `${this.seoTemplates.tactical.minWords}-${this.seoTemplates.tactical.maxWords} words`
        },
        infographics: {
          available: Object.keys(this.infographicTemplates).length,
          types: Object.keys(this.infographicTemplates),
          s3Bucket: 'arzani-images1',
          s3Region: 'eu-west-2',
          baseUrl: 'https://arzani-images1.s3.eu-west-2.amazonaws.com/blogs/',
          status: 'Active - S3 Hosted'
        }
      };
      
    } catch (error) {
      console.error('❌ Error getting status:', error);
      return {
        totalPosts: 0,
        weeklyPosts: 0,
        isGenerating: false,
        nextPost: 'Error retrieving status',
        systemStatus: 'Error',
        lastGenerated: null,
        qualityMetrics: {
          averageWordCount: 0,
          postsWithFAQ: 0,
          postsWithTOC: 0,
          contentQualityScore: 0,
          totalAnalyzed: 0
        }
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
