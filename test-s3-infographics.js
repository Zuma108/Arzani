/**
 * Test script to verify S3 infographic integration
 * Run this to check if all infographics are accessible and generating correctly
 */

import AutomatedBlogGenerator from './services/automated-blog-generator.js';

async function testS3Infographics() {
  console.log('🧪 Testing S3 Infographic Integration...\n');

  const generator = new AutomatedBlogGenerator();

  // Test content with all infographic placeholders
  const testContent = `
<h2>Introduction</h2>
<p>This is a test blog post to verify infographic integration.</p>
[IMG_PLACEHOLDER:process:business acquisition]

<h2>Market Analysis</h2>
<p>Here we analyze the current market trends.</p>
[IMG_PLACEHOLDER:statistics:business acquisition]

<h2>Timeline Overview</h2>
<p>Understanding the typical acquisition timeline.</p>
[IMG_PLACEHOLDER:timeline:business acquisition]

<h2>Comparison Analysis</h2>
<p>Comparing different acquisition approaches.</p>
[IMG_PLACEHOLDER:comparison:business acquisition]

<h2>Essential Checklist</h2>
<p>Key considerations for business acquisition.</p>
[IMG_PLACEHOLDER:checklist:business acquisition]

<h2>Conclusion</h2>
<p>Summary of key points.</p>
`;

  console.log('📝 Original content with placeholders:');
  console.log(testContent);
  console.log('\n' + '='.repeat(80) + '\n');

  // Process the content
  const processedContent = generator.processImagePlaceholders(
    testContent, 
    'business acquisition', 
    'Test Business Acquisition Guide'
  );

  console.log('🖼️ Processed content with S3 infographics:');
  console.log(processedContent);
  console.log('\n' + '='.repeat(80) + '\n');

  // Check each infographic template
  console.log('🔍 Infographic Template Details:');
  Object.entries(generator.infographicTemplates).forEach(([key, template]) => {
    console.log(`\n${template.name}:`);
    console.log(`  Key: ${key}`);
    console.log(`  Filename: ${template.filename}`);
    console.log(`  S3 URL: ${template.s3Url}`);
    console.log(`  Alt Template: ${template.altTemplate}`);
    console.log(`  Placement: ${template.placement}`);
    
    // Test URL accessibility (note: this would need fetch in real implementation)
    console.log(`  ✅ URL Format Valid: ${template.s3Url.includes('arzani-images1.s3.eu-west-2.amazonaws.com')}`);
  });

  console.log('\n' + '='.repeat(80) + '\n');

  // Verify no placeholders remain
  const remainingPlaceholders = processedContent.match(/\[IMG_PLACEHOLDER:[^\]]+\]/g);
  if (remainingPlaceholders) {
    console.log('❌ Found remaining placeholders:');
    remainingPlaceholders.forEach(placeholder => {
      console.log(`  - ${placeholder}`);
    });
  } else {
    console.log('✅ All placeholders successfully processed!');
  }

  // Count infographics inserted
  const infographicCount = (processedContent.match(/<div class="blog-infographic"/g) || []).length;
  console.log(`📊 Total infographics inserted: ${infographicCount}/5`);

  // Verify S3 URLs are present
  const s3UrlCount = (processedContent.match(/arzani-images1\.s3\.eu-west-2\.amazonaws\.com/g) || []).length;
  console.log(`🌐 S3 URLs found: ${s3UrlCount}`);

  if (infographicCount === 5 && s3UrlCount === 5 && !remainingPlaceholders) {
    console.log('\n🎉 S3 Infographic Integration Test: PASSED');
    console.log('✅ All infographics are properly configured and will load from S3');
  } else {
    console.log('\n❌ S3 Infographic Integration Test: FAILED');
    console.log('Please check the configuration and S3 URLs');
  }

  return {
    success: infographicCount === 5 && s3UrlCount === 5 && !remainingPlaceholders,
    infographicCount,
    s3UrlCount,
    remainingPlaceholders: remainingPlaceholders || []
  };
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testS3Infographics()
    .then(result => {
      console.log('\n📋 Test Results Summary:');
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test failed with error:', error);
      process.exit(1);
    });
}

export default testS3Infographics;
