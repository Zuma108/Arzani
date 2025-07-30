#!/usr/bin/env node

/**
 * Debug Script: Test Exact Placeholder Processing
 * 
 * This script tests the exact placeholder processing to identify format mismatches.
 */

import AutomatedBlogGenerator from './services/automated-blog-generator.js';

async function testPlaceholderProcessing() {
  console.log('🔍 Testing Exact Placeholder Processing');
  console.log('='.repeat(50));

  const generator = new AutomatedBlogGenerator();
  
  // Test content with various placeholder formats
  const testContent = `
<h2>Introduction</h2>
<p>Test content with placeholders.</p>
[IMG_PLACEHOLDER:process:business acquisition]
[IMG_PLACEHOLDER:statistics:business acquisition]
[IMG_PLACEHOLDER:timeline:business acquisition]
[IMG_PLACEHOLDER:checklist:business acquisition]
[IMG_PLACEHOLDER:comparison:business acquisition]
<p>More content here.</p>
`;

  console.log('📝 Original content:');
  const placeholders = testContent.match(/\[IMG_PLACEHOLDER:[^\]]+\]/g) || [];
  console.log(`Found ${placeholders.length} placeholders:`);
  placeholders.forEach(p => console.log(`  - ${p}`));

  console.log('\n🔍 Available templates:');
  Object.keys(generator.infographicTemplates).forEach(key => {
    console.log(`  - ${key}: ${generator.infographicTemplates[key].name}`);
  });

  console.log('\n🖼️ Processing placeholders...');
  const processedContent = generator.processImagePlaceholders(testContent, 'business acquisition', 'Test Title');

  console.log('\n📊 Results:');
  console.log('Processed content length:', processedContent.length);
  console.log('Remaining placeholders:', (processedContent.match(/\[IMG_PLACEHOLDER:[^\]]+\]/g) || []).length);
  console.log('Image tags found:', (processedContent.match(/<img[^>]*>/g) || []).length);
  console.log('S3 URLs found:', (processedContent.match(/arzani-images1\.s3\.eu-west-2\.amazonaws\.com/g) || []).length);

  // Show which placeholders were replaced
  placeholders.forEach(placeholder => {
    const templateKey = placeholder.match(/\[IMG_PLACEHOLDER:([^:]+):/)?.[1];
    const isReplaced = !processedContent.includes(placeholder);
    const hasTemplate = generator.infographicTemplates[templateKey];
    
    console.log(`\n🔍 ${placeholder}`);
    console.log(`   Template key: ${templateKey}`);
    console.log(`   Has template: ${!!hasTemplate}`);
    console.log(`   Was replaced: ${isReplaced}`);
    
    if (hasTemplate) {
      console.log(`   Template URL: ${hasTemplate.s3Url}`);
    }
  });

  // Check if the issue is in the replacement logic
  console.log('\n🔧 Testing manual replacement logic:');
  let manualTest = testContent;
  Object.keys(generator.infographicTemplates).forEach(templateKey => {
    const template = generator.infographicTemplates[templateKey];
    const placeholder = `[IMG_PLACEHOLDER:${templateKey}:business acquisition]`;
    console.log(`Looking for: "${placeholder}"`);
    console.log(`Content includes: ${manualTest.includes(placeholder)}`);
    
    if (manualTest.includes(placeholder)) {
      console.log(`✅ Would replace ${templateKey} placeholder`);
    }
  });

  return processedContent;
}

testPlaceholderProcessing().catch(console.error);
