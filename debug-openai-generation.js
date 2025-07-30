#!/usr/bin/env node

/**
 * Debug Script: Test OpenAI Content Generation
 * 
 * This script tests what content OpenAI is actually generating
 * to see if the issue is with the AI not following placeholder instructions.
 */

import AutomatedBlogGenerator from './services/automated-blog-generator.js';

class OpenAIContentDebugger {
  constructor() {
    this.generator = new AutomatedBlogGenerator();
  }

  async testOpenAIGeneration() {
    console.log('🤖 Testing OpenAI Content Generation with Placeholder Instructions');
    console.log('='.repeat(80));

    // Create a test post info
    const testPost = {
      title: "Regional Business Acquisition Opportunities",
      category: "Business Acquisition",
      contentType: "supporting"
    };

    try {
      console.log('📝 Generating content for:', testPost.title);
      console.log('📂 Category:', testPost.category);
      console.log('🎯 Type:', testPost.contentType);

      // Generate keywords first
      const keywords = await this.generator.generateKeywords(testPost.title, testPost.category);
      console.log('🔑 Generated keywords:', {
        primary: keywords.primary,
        secondary: keywords.secondary.slice(0, 3),
        semantic: keywords.semantic.slice(0, 3)
      });

      // Get the appropriate template
      const template = this.generator.seoTemplates[testPost.contentType];
      console.log('📋 Using template:', {
        minWords: template.minWords,
        maxWords: template.maxWords,
        requiresFAQ: template.requiresFAQ,
        requiresTOC: template.requiresTOC
      });

      // Call the OpenAI generation method directly
      console.log('\n🚀 Calling OpenAI with enhanced prompting system...');
      
      // This should use the enhanced system we implemented
      const structuredData = await this.generator.generateStructuredContent(
        testPost.title,
        testPost.category,
        testPost.contentType,
        keywords,
        template
      );

      console.log('\n📊 OpenAI Response Analysis:');
      console.log('Content length:', structuredData.content?.length || 0);
      console.log('Word count:', structuredData.word_count || 'Not specified');
      console.log('Meta description:', structuredData.meta_description?.substring(0, 100) + '...' || 'Not generated');

      // Check for placeholders in raw OpenAI response
      const rawContent = structuredData.content || '';
      const placeholders = rawContent.match(/\[IMG_PLACEHOLDER:[^\]]+\]/g) || [];
      
      console.log('\n🔍 Placeholder Analysis in Raw OpenAI Response:');
      console.log('Placeholder count:', placeholders.length);
      
      if (placeholders.length > 0) {
        console.log('✅ Found placeholders in OpenAI response:');
        placeholders.forEach(placeholder => {
          console.log(`   - ${placeholder}`);
        });
      } else {
        console.log('❌ No placeholders found in OpenAI response!');
        console.log('📝 This explains why fallback injection is always needed.');
      }

      // Check validation fields if they exist
      if (structuredData.placeholder_validation) {
        console.log('\n📋 Placeholder Validation Field:');
        console.log(JSON.stringify(structuredData.placeholder_validation, null, 2));
      } else {
        console.log('\n❌ No placeholder validation field in response');
      }

      // Show sample of raw content
      console.log('\n📄 Sample of raw OpenAI content (first 800 chars):');
      console.log(rawContent.substring(0, 800));
      console.log('...');

      // Test the processing pipeline
      console.log('\n🔄 Testing Processing Pipeline:');
      const processedContent = await this.generator.processStructuredContent(structuredData, keywords, template);
      
      console.log('After processing:');
      console.log('Content length:', processedContent.content.length);
      console.log('Image tags:', (processedContent.content.match(/<img[^>]*>/g) || []).length);
      console.log('S3 URLs:', (processedContent.content.match(/arzani-images1\.s3\.eu-west-2\.amazonaws\.com/g) || []).length);

      return {
        structured: structuredData,
        processed: processedContent,
        placeholderAnalysis: {
          rawCount: placeholders.length,
          finalImageCount: (processedContent.content.match(/<img[^>]*>/g) || []).length
        }
      };

    } catch (error) {
      console.error('❌ Error in OpenAI generation test:', error);
      throw error;
    }
  }

  async runDebugTest() {
    try {
      const results = await this.testOpenAIGeneration();
      
      console.log('\n✅ OpenAI Content Generation Debug Complete');
      console.log('\n📊 Summary:');
      console.log(`Raw placeholders from OpenAI: ${results.placeholderAnalysis.rawCount}`);
      console.log(`Final images in processed content: ${results.placeholderAnalysis.finalImageCount}`);
      
      if (results.placeholderAnalysis.rawCount === 0 && results.placeholderAnalysis.finalImageCount > 0) {
        console.log('✅ Fallback injection system is working correctly');
      } else if (results.placeholderAnalysis.rawCount > 0) {
        console.log('✅ OpenAI is following placeholder instructions');
      }

      return results;

    } catch (error) {
      console.error('❌ Debug test failed:', error);
      throw error;
    }
  }
}

// Run the debug test
async function main() {
  const tester = new OpenAIContentDebugger();
  await tester.runDebugTest();
}

main().catch(console.error);
