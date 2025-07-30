#!/usr/bin/env node

/**
 * Debug Script: Test What injectMissingPlaceholders Actually Detects
 * 
 * This script tests what the injection function is detecting as "existing placeholders"
 */

import AutomatedBlogGenerator from './services/automated-blog-generator.js';

async function testPlaceholderDetection() {
  console.log('🔍 Testing Placeholder Detection Logic');
  console.log('='.repeat(50));

  const generator = new AutomatedBlogGenerator();
  
  // Simulate content that might come from OpenAI (similar to what was generated)
  const simulatedOpenAIContent = `<h2>Introduction</h2>
<p>The UK business acquisition landscape in 2025 presents a myriad of opportunities for both buyers and sellers. According to the Office for National Statistics (ONS), the number of business acquisitions in the UK increased by 12% last year, signalling a vibrant marketplace. Understanding the intricacies of regional business acquisition opportunities can significantly enhance your strategic approach to buying or selling a business in the UK. This guide will provide actionable insights and a comprehensive framework to navigate the UK business acquisition opportunities effectively.</p>

<div class="table-of-contents">
  <h2>Table of Contents</h2>
  <ul>
    <li><a class="content-link" href="#section-1">Understanding the UK Business Acquisition Market</a></li>
    <li><a class="content-link" href="#section-2">5-Step Business Acquisition Framework</a></li>
    <li><a class="content-link" href="#section-3">Case Studies of Successful Acquisitions</a></li>
    <li><a class="content-link" href="#section-4">Frequently Asked Questions</a></li>
    <li><a class="content-link" href="#section-5">Conclusion & Call to Action</a></li>
  </ul>
</div>

<h2 id="section-1">Understanding the UK Business Acquisition Market</h2>
<p>The UK business marketplace is diverse, with opportunities varying significantly across regions and sectors.</p>`;

  console.log('📝 Testing content similar to actual generation...');
  console.log('Original content length:', simulatedOpenAIContent.length);
  
  // Check what the injection function detects
  const placeholderRegex = /\[IMG_PLACEHOLDER:[^\]]+\]/g;
  const detectedPlaceholders = simulatedOpenAIContent.match(placeholderRegex) || [];
  
  console.log('\n🔍 Manual placeholder detection:');
  console.log('Detected placeholders:', detectedPlaceholders.length);
  detectedPlaceholders.forEach(p => console.log(`  - ${p}`));

  // Test the injection function
  console.log('\n🔄 Testing injectMissingPlaceholders function:');
  const injectedContent = generator.injectMissingPlaceholders(simulatedOpenAIContent, 'business acquisition');
  
  const afterInjectionPlaceholders = injectedContent.match(placeholderRegex) || [];
  console.log('\nAfter injection:');
  console.log('Placeholder count:', afterInjectionPlaceholders.length);
  afterInjectionPlaceholders.forEach(p => console.log(`  - ${p}`));

  // Test processing
  console.log('\n🖼️ Testing processImagePlaceholders:');
  const processedContent = generator.processImagePlaceholders(injectedContent, 'business acquisition', 'Test Title');
  
  const finalPlaceholders = processedContent.match(placeholderRegex) || [];
  const finalImages = processedContent.match(/<img[^>]*>/g) || [];
  const finalS3URLs = processedContent.match(/arzani-images1\.s3\.eu-west-2\.amazonaws\.com/g) || [];
  
  console.log('\nFinal results:');
  console.log('Remaining placeholders:', finalPlaceholders.length);
  console.log('Image tags:', finalImages.length);
  console.log('S3 URLs:', finalS3URLs.length);

  // Now test with the EXACT content from the database
  console.log('\n' + '='.repeat(60));
  console.log('🔍 TESTING WITH ACTUAL DATABASE CONTENT');
  console.log('='.repeat(60));

  const actualDatabaseContent = `<h2>Introduction</h2>
<p>The UK business acquisition landscape in 2025 presents a myriad of opportunities for both buyers and sellers. According to the Office for National Statistics (ONS), the number of business acquisitions in the UK increased by 12% last year, signalling a vibrant marketplace. Understanding the intricacies of regional business acquisition opportunities can significantly enhance your strategic approach to buying or selling a business in the UK. This guide will provide actionable insights and a comprehensive framework to navigate the UK business acquisition opportunities effectively.</p>


<div class="table-of-contents">
  <h2>Table of Contents</h2>
  <ul>
    <li><a class="content-link" href="#section-1">Understanding the UK Business Acquisition Market</a></li>
    <li><a class="content-link" href="#section-2">5-Step Business Acquisition Framework</a></li>
    <li><a class="content-link" href="#section-3">Case Studies of Successful Acquisitions</a></li>
    <li><a class="content-link" href="#section-4">Frequently Asked Questions</a></li>
    <li><a class="content-link" href="#section-5">Conclusion & Call to Action</a></li>
  </ul>
</div>

<h2 id="section-1">Understanding the UK Business Acquisition Market</h2>
<p>The UK business marketplace is diverse, with opportunities varying significantly across regions and sectors. The Financial Conduct Authority (FCA) provides guidelines that influence acquisition processes, ensuring fair play. In our experience at Arzani, we've observed distinct trends in sectors like technology and hospitality, where valuation multiples range from 3x to 5x EBITDA. Our marketplace data indicates a growing interest in businesses with robust digital footprints, especially in the post-pandemic era.</p>


<h2 id="section-2">5-Step Business Acquisition Framework</h2>
<ol>
  <li><strong>Identify Acquisition Targets:</strong> Use platforms like Companies House to research potential targets. Look for businesses with growth potential or synergies with your current operations.</li>
  <li><strong>Valuation and Financial Analysis:</strong> Conduct thorough <a href="/marketplace-landing" class="internal-link" title="Learn about due diligence services">due diligence</a>, examining financial statements, market position, and operational efficiencies. A typical multiple for UK SMEs is often between 4x and 6x EBITDA, depending on industry and region.</li>
  <li><strong>Negotiation and Offer Structuring:</strong> Craft offers that reflect both market value and strategic fit. Consider earn-out provisions to align interests.</li>
  <li><strong>Regulatory Compliance and Legal Considerations:</strong> Ensure compliance with FCA rules and secure necessary approvals. Engage with legal experts to navigate complex regulatory landscapes.</li>
  <li><strong>Integration Strategy:</strong> Develop a comprehensive plan to integrate the acquired business, focusing on cultural alignment and operational synergies.</li>
</ol>
<p>These steps, grounded in regulatory insights and marketplace data, provide a robust framework for navigating the UK business acquisition landscape.</p>

<h2 id="section-3">Case Studies of Successful Acquisitions</h2>
<p><strong>Case Study 1:</strong> A recent £1.8 million acquisition of a Leeds-based manufacturing firm highlights the importance of strategic fit and regional market understanding. The buyer leveraged local market knowledge and an existing supply chain to enhance value post-acquisition.</p>
<p><strong>Case Study 2:</strong> In the technology sector, a £2.5 million acquisition in Manchester demonstrated how businesses with strong digital infrastructures command premium valuations. The integration process focused on retaining key talent and optimizing digital assets.</p>


<h2 id="section-4">Frequently Asked Questions</h2>
<div class="faq-section">
  <h3>What is a typical multiple for UK SMEs?</h3>
  <p>Typically, UK SMEs are valued between 4x and 6x EBITDA, but this can vary based on industry, growth potential, and economic conditions.</p>
  <h3>How do regulatory requirements impact acquisitions?</h3>
  <p>Regulatory requirements, such as those from the FCA and Companies House, ensure transparency and fair practices. Compliance is crucial to prevent legal complications.</p>
  <h3>What are common challenges in business acquisitions?</h3>
  <p>Common challenges include cultural integration, alignment of business objectives, and maintaining customer relationships post-acquisition.</p>
  <h3>How can I finance a business acquisition?</h3>
  <p>Financing options include bank loans, private equity. Additionally, seller financing. Each option has its pros and cons, depending on the size and nature of the acquisition.</p>
  <h3>What role does due diligence play in acquisitions?</h3>
  <p>Due diligence is critical for uncovering potential risks, validating financial performance, and ensuring the strategic fit of the acquisition target.</p>
</div>


<h2 id="section-5">Conclusion & Call to Action</h2>
<p>Understanding regional business acquisition opportunities in the UK can significantly impact your success as a buyer or seller. By leveraging the outlined framework and case studies, you can navigate the complexities of the market with confidence. For more detailed insights and support with your acquisition strategy, visit the <a href="https://www.arzani.com" class="internal-link" class="external-link" target="_blank" rel="noopener noreferrer">Arzani marketplace</a> today and explore our comprehensive resources and expert guidance.</p>
<p>Start your journey towards successful business acquisition now and capitalise on the opportunities the UK market has to offer.</p>`;

  console.log('📝 Testing with actual database content...');
  console.log('Content length:', actualDatabaseContent.length);

  const actualPlaceholders = actualDatabaseContent.match(placeholderRegex) || [];
  console.log('Detected placeholders in actual content:', actualPlaceholders.length);

  const actualInjected = generator.injectMissingPlaceholders(actualDatabaseContent, 'business acquisition');
  const actualAfterInjection = actualInjected.match(placeholderRegex) || [];
  console.log('After injection on actual content:', actualAfterInjection.length);
  
  if (actualAfterInjection.length > 0) {
    console.log('✅ Placeholders that would be injected:');
    actualAfterInjection.forEach(p => console.log(`  - ${p}`));
    
    const actualProcessed = generator.processImagePlaceholders(actualInjected, 'business acquisition', 'Regional Business Acquisition Opportunities');
    const finalActualImages = actualProcessed.match(/<img[^>]*>/g) || [];
    console.log('Final images in actual processed content:', finalActualImages.length);
    
    if (finalActualImages.length > 0) {
      console.log('✅ SUCCESS: Images would be inserted correctly');
    } else {
      console.log('❌ ISSUE: No images in final processed content');
    }
  }

  return {
    simulated: {
      detected: detectedPlaceholders.length,
      injected: afterInjectionPlaceholders.length,
      finalImages: finalImages.length
    },
    actual: {
      detected: actualPlaceholders.length,
      injected: actualAfterInjection.length,
      finalImages: finalActualImages.length || 0
    }
  };
}

testPlaceholderDetection().catch(console.error);
