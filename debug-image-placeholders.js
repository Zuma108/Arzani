#!/usr/bin/env node

/**
 * Debug Script: Test Image Placeholder System
 * 
 * This script tests the image placeholder injection and processing system
 * to identify why infographics aren't appearing in generated blog posts.
 */

import AutomatedBlogGenerator from './services/automated-blog-generator.js';

class ImagePlaceholderDebugger {
  constructor() {
    this.generator = new AutomatedBlogGenerator();
  }

  // Test content without any placeholders
  getTestContent() {
    return `
<h2>Introduction</h2>
<p>This is a sample blog post about business acquisition opportunities. It contains multiple sections that should have image placeholders injected.</p>

<h2>Understanding the Market Analysis</h2>
<p>Market analysis is crucial for business acquisition. This section discusses key statistics and data points that drive successful acquisitions.</p>

<h2>5-Step Business Framework</h2>
<p>Here is our comprehensive framework for business acquisition:</p>
<ol>
  <li>Identify targets</li>
  <li>Conduct analysis</li>
  <li>Negotiate terms</li>
  <li>Close deal</li>
  <li>Integrate business</li>
</ol>

<h2>Case Studies and Examples</h2>
<p>These case studies demonstrate successful acquisition strategies.</p>

<h2>Frequently Asked Questions</h2>
<div class="faq-section">
  <h3>What is the typical multiple for UK SMEs?</h3>
  <p>Typically between 4x and 6x EBITDA.</p>
</div>

<h2>Conclusion</h2>
<p>In conclusion, business acquisition requires careful planning and execution.</p>
`;
  }

  // Test content with existing placeholders
  getTestContentWithPlaceholders() {
    return `
<h2>Introduction</h2>
<p>This is a sample blog post about business acquisition opportunities.</p>
[IMG_PLACEHOLDER:process:business acquisition]

<h2>Market Analysis</h2>
<p>Market analysis data and statistics.</p>
[IMG_PLACEHOLDER:statistics:business acquisition]

<h2>Timeline Framework</h2>
<p>Timeline for acquisition process.</p>
[IMG_PLACEHOLDER:timeline:business acquisition]

<h2>Conclusion</h2>
<p>Final thoughts on acquisition.</p>
`;
  }

  async testInjectMissingPlaceholders() {
    console.log('\n🔍 ==> Testing injectMissingPlaceholders function');
    console.log('='.repeat(50));

    const testContent = this.getTestContent();
    const category = 'business acquisition';

    console.log('📝 Original content length:', testContent.length);
    console.log('📊 Original placeholder count:', (testContent.match(/\[IMG_PLACEHOLDER:[^\]]+\]/g) || []).length);

    const injectedContent = this.generator.injectMissingPlaceholders(testContent, category);

    console.log('📝 Injected content length:', injectedContent.length);
    const placeholders = injectedContent.match(/\[IMG_PLACEHOLDER:[^\]]+\]/g) || [];
    console.log('📊 Placeholder count after injection:', placeholders.length);
    
    if (placeholders.length > 0) {
      console.log('✅ Found placeholders:');
      placeholders.forEach(placeholder => {
        console.log(`   - ${placeholder}`);
      });
    } else {
      console.log('❌ No placeholders found after injection!');
    }

    return injectedContent;
  }

  async testProcessImagePlaceholders() {
    console.log('\n🖼️ ==> Testing processImagePlaceholders function');
    console.log('='.repeat(50));

    const testContent = this.getTestContentWithPlaceholders();
    const category = 'business acquisition';
    const title = 'Business Acquisition Guide';

    console.log('📝 Content with placeholders:');
    const placeholders = testContent.match(/\[IMG_PLACEHOLDER:[^\]]+\]/g) || [];
    placeholders.forEach(placeholder => {
      console.log(`   - ${placeholder}`);
    });

    const processedContent = this.generator.processImagePlaceholders(testContent, category, title);

    console.log('📝 Processed content length:', processedContent.length);
    console.log('📊 Remaining placeholders:', (processedContent.match(/\[IMG_PLACEHOLDER:[^\]]+\]/g) || []).length);
    console.log('📊 Image tags found:', (processedContent.match(/<img[^>]*>/g) || []).length);

    // Check for S3 URLs
    const s3Images = processedContent.match(/arzani-images1\.s3\.eu-west-2\.amazonaws\.com/g) || [];
    console.log('📊 S3 image URLs found:', s3Images.length);

    if (s3Images.length > 0) {
      console.log('✅ S3 Images successfully inserted');
    } else {
      console.log('❌ No S3 images found in processed content!');
    }

    return processedContent;
  }

  async testS3InfographicTemplates() {
    console.log('\n☁️ ==> Testing S3 Infographic Templates Configuration');
    console.log('='.repeat(60));

    const templates = this.generator.infographicTemplates;
    
    console.log('📊 Available templates:', Object.keys(templates).length);
    
    Object.keys(templates).forEach(key => {
      const template = templates[key];
      console.log(`\n📋 Template: ${key}`);
      console.log(`   Name: ${template.name}`);
      console.log(`   S3 URL: ${template.s3Url}`);
      console.log(`   Alt Template: ${template.altTemplate}`);
    });

    // Test URL accessibility (basic check)
    console.log('\n🌐 Testing S3 URL accessibility...');
    const sampleTemplate = templates[Object.keys(templates)[0]];
    if (sampleTemplate) {
      console.log(`Testing: ${sampleTemplate.s3Url}`);
      try {
        const response = await fetch(sampleTemplate.s3Url, { method: 'HEAD' });
        console.log(`✅ URL accessible - Status: ${response.status}`);
      } catch (error) {
        console.log(`❌ URL not accessible - Error: ${error.message}`);
      }
    }
  }

  async testFullWorkflow() {
    console.log('\n🔄 ==> Testing Full Placeholder Workflow');
    console.log('='.repeat(50));

    const originalContent = this.getTestContent();
    const category = 'business acquisition';
    const title = 'Business Acquisition Opportunities';

    console.log('Step 1: Original content');
    console.log('Placeholders:', (originalContent.match(/\[IMG_PLACEHOLDER:[^\]]+\]/g) || []).length);

    console.log('\nStep 2: Inject missing placeholders');
    const injectedContent = this.generator.injectMissingPlaceholders(originalContent, category);
    console.log('Placeholders after injection:', (injectedContent.match(/\[IMG_PLACEHOLDER:[^\]]+\]/g) || []).length);

    console.log('\nStep 3: Process placeholders into HTML');
    const processedContent = this.generator.processImagePlaceholders(injectedContent, category, title);
    console.log('Remaining placeholders:', (processedContent.match(/\[IMG_PLACEHOLDER:[^\]]+\]/g) || []).length);
    console.log('Image tags:', (processedContent.match(/<img[^>]*>/g) || []).length);
    console.log('S3 URLs:', (processedContent.match(/arzani-images1\.s3\.eu-west-2\.amazonaws\.com/g) || []).length);

    // Show sample of processed content
    console.log('\n📄 Sample processed content (first 500 chars):');
    console.log(processedContent.substring(0, 500) + '...');

    return {
      original: originalContent,
      injected: injectedContent,
      processed: processedContent
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Image Placeholder System Debug Tests');
    console.log('='.repeat(70));

    try {
      // Test S3 configuration
      await this.testS3InfographicTemplates();

      // Test placeholder injection
      await this.testInjectMissingPlaceholders();

      // Test placeholder processing
      await this.testProcessImagePlaceholders();

      // Test full workflow
      const results = await this.testFullWorkflow();

      console.log('\n✅ Debug tests completed successfully');
      return results;

    } catch (error) {
      console.error('\n❌ Debug test failed:', error);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }
}

// Run the debug tests
async function main() {
  const tester = new ImagePlaceholderDebugger();
  await tester.runAllTests();
}

main().catch(console.error);
