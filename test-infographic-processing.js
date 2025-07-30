/**
 * Test the infographic processing function directly
 */

import AutomatedBlogGenerator from './services/automated-blog-generator.js';

async function testInfographicProcessing() {
  console.log('🧪 Testing Infographic Processing Function...\n');

  const generator = new AutomatedBlogGenerator();

  // Test content with placeholders (simulating what AI should generate)
  const testContent = `
<h2>Introduction</h2>
<p>This is a test blog post about business acquisition.</p>
[IMG_PLACEHOLDER:process:business acquisition]

<h2>Market Analysis</h2>
<p>Here we analyze the current market trends.</p>
[IMG_PLACEHOLDER:statistics:business acquisition]

<h2>Case Studies</h2>
<p>Examples of successful acquisitions.</p>
[IMG_PLACEHOLDER:timeline:business acquisition]

<h2>Comparison Analysis</h2>
<p>Comparing different approaches.</p>
[IMG_PLACEHOLDER:comparison:business acquisition]

<h2>Essential Steps</h2>
<p>Key considerations for acquisition.</p>
[IMG_PLACEHOLDER:checklist:business acquisition]

<h2>Conclusion</h2>
<p>Summary of key points.</p>
`;

  console.log('📝 Original content with placeholders:');
  console.log(testContent);
  console.log('\n' + '='.repeat(80) + '\n');

  // Process the content
  console.log('🔄 Processing placeholders...');
  const processedContent = generator.processImagePlaceholders(
    testContent, 
    'business acquisition', 
    'Test Business Acquisition Guide'
  );

  console.log('🖼️ Processed content with S3 infographics:');
  console.log(processedContent);
  console.log('\n' + '='.repeat(80) + '\n');

  // Verify results
  const remainingPlaceholders = processedContent.match(/\[IMG_PLACEHOLDER:[^\]]+\]/g);
  const infographicCount = (processedContent.match(/<div class="blog-infographic"/g) || []).length;
  const s3UrlCount = (processedContent.match(/arzani-images1\.s3\.eu-west-2\.amazonaws\.com/g) || []).length;

  console.log('📊 Results:');
  console.log(`  • Remaining placeholders: ${remainingPlaceholders?.length || 0}`);
  console.log(`  • Infographics inserted: ${infographicCount}`);
  console.log(`  • S3 URLs found: ${s3UrlCount}`);

  if (remainingPlaceholders && remainingPlaceholders.length > 0) {
    console.log('\n❌ Remaining placeholders found:');
    remainingPlaceholders.forEach(placeholder => {
      console.log(`  - ${placeholder}`);
    });
  }

  if (infographicCount === 5 && s3UrlCount === 5 && !remainingPlaceholders) {
    console.log('\n✅ SUCCESS: All placeholders processed correctly!');
  } else {
    console.log('\n❌ ISSUE: Some placeholders were not processed correctly.');
  }

  // Test infographic templates access
  console.log('\n🔍 Checking infographic templates:');
  Object.entries(generator.infographicTemplates).forEach(([key, template]) => {
    console.log(`  • ${key}: ${template.name} (${template.s3Url ? 'S3 configured' : 'No S3 URL'})`);
  });

  return {
    success: infographicCount === 5 && s3UrlCount === 5 && !remainingPlaceholders,
    infographicCount,
    s3UrlCount,
    remainingPlaceholders: remainingPlaceholders || []
  };
}

// Run the test
testInfographicProcessing()
  .then(result => {
    console.log('\n📋 Final Results:');
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
