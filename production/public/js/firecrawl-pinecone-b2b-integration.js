/**
 * Gather and Embed B2B Data Provider Information using Firecrawl and Pinecone MCP tools
 * This script fetches information about B2B data providers using Firecrawl and adds it to Pinecone
 */

import dotenv from 'dotenv';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import OpenAI from 'openai';

dotenv.config();

// Initialize OpenAI for embeddings
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configuration for B2B data providers
const b2bProviders = [
  {
    name: 'ZoomInfo',
    description: 'B2B contact database and intelligence platform',
    url: 'https://www.zoominfo.com',
    searchQuery: 'ZoomInfo B2B data API business intelligence for UK businesses'
  },
  {
    name: 'Apollo',
    description: 'B2B contact database and sales intelligence platform',
    url: 'https://www.apollo.io',
    searchQuery: 'Apollo.io B2B data sales intelligence platform for UK businesses'
  },
  {
    name: 'Cognism',
    description: 'B2B contact and company data provider with compliance focus',
    url: 'https://www.cognism.com',
    searchQuery: 'Cognism B2B data compliance UK business intelligence GDPR'
  },
  {
    name: 'Clearbit',
    description: 'B2B data enrichment and intelligence platform',
    url: 'https://clearbit.com',
    searchQuery: 'Clearbit data enrichment API for UK business marketing intelligence'
  },
  {
    name: 'People Data Labs',
    description: 'B2B people and company data API provider',
    url: 'https://www.peopledatalabs.com',
    searchQuery: 'People Data Labs API business data UK company information'
  }
];

// Business categories for contextual information
const businessCategories = [
  'UK retail businesses',
  'UK manufacturing companies',
  'UK tech startups',
  'UK service businesses',
  'UK hospitality businesses',
  'UK financial services',
  'UK healthcare providers',
  'UK construction companies',
  'UK ecommerce businesses',
  'UK professional services'
];

// Create data directory
const dataDir = path.join(process.cwd(), 'data', 'b2b-providers');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
  console.log(`Created directory: ${dataDir}`);
}

/**
 * Use Firecrawl MCP to gather information about a provider
 */
async function gatherProviderInformation(provider) {
  console.log(`\n🔍 Researching ${provider.name}...`);
  
  try {
    // Step 1: Search for provider information using Firecrawl
    console.log(`   🌐 Searching web for information on ${provider.name}...`);
    const searchResults = await searchWithFirecrawl(provider.searchQuery);
    
    // Step 2: Scrape the provider's website
    console.log(`   🌐 Scraping ${provider.name} website: ${provider.url}...`);
    const websiteContent = await scrapeWithFirecrawl(provider.url);
    
    // Step 3: Perform deep research on the provider
    console.log(`   🔬 Performing deep research on ${provider.name}...`);
    const deepResearchResults = await deepResearchWithFirecrawl(
      `${provider.name} B2B data provider business intelligence UK companies`
    );
    
    // Combine all the information
    const combinedInfo = {
      providerName: provider.name,
      providerUrl: provider.url,
      providerDescription: provider.description,
      searchResults,
      websiteContent,
      deepResearchResults
    };
    
    // Save the combined information to a file
    const filePath = path.join(dataDir, `${provider.name.toLowerCase().replace(/\s+/g, '-')}.json`);
    writeFileSync(filePath, JSON.stringify(combinedInfo, null, 2));
    console.log(`   💾 Saved ${provider.name} research to ${filePath}`);
    
    return combinedInfo;
  } catch (error) {
    console.error(`❌ Error researching ${provider.name}:`, error);
    return {
      providerName: provider.name,
      providerUrl: provider.url,
      providerDescription: provider.description,
      error: error.message
    };
  }
}

/**
 * Use Firecrawl MCP to search for information
 */
async function searchWithFirecrawl(query) {
  try {
    // Use Firecrawl search MCP tool
    console.log(`   🔎 Executing Firecrawl search: "${query}"`);
    
    const searchResults = await mcp_firecrawl_firecrawl_search({
      query: query,
      limit: 5,
      scrapeOptions: {
        formats: ["markdown"],
        onlyMainContent: true
      }
    });
    
    return searchResults;
  } catch (error) {
    console.error(`Error in Firecrawl search: ${error.message}`);
    // Provide fallback information
    return `Search error: ${error.message}`;
  }
}

/**
 * Use Firecrawl MCP to scrape website content
 */
async function scrapeWithFirecrawl(url) {
  try {
    // Use Firecrawl scrape MCP tool
    console.log(`   🌐 Executing Firecrawl scrape: "${url}"`);
    
    const scrapeResults = await mcp_firecrawl_firecrawl_scrape({
      url: url,
      formats: ["markdown"],
      onlyMainContent: true
    });
    
    return scrapeResults;
  } catch (error) {
    console.error(`Error in Firecrawl scrape: ${error.message}`);
    // Provide fallback information
    return `Scrape error: ${error.message}`;
  }
}

/**
 * Use Firecrawl MCP to do deep research
 */
async function deepResearchWithFirecrawl(query) {
  try {
    // Use Firecrawl deep research MCP tool
    console.log(`   🔬 Executing Firecrawl deep research: "${query}"`);
    
    const researchResults = await mcp_firecrawl_firecrawl_deep_research({
      query: query,
      maxDepth: 3,
      timeLimit: 120,
      maxUrls: 20
    });
    
    return researchResults;
  } catch (error) {
    console.error(`Error in Firecrawl deep research: ${error.message}`);
    // Provide fallback information
    return `Deep research error: ${error.message}`;
  }
}

/**
 * Format provider information for embeddings
 */
function formatForEmbedding(providerInfo, businessCategory) {
  const formattedText = `
# ${providerInfo.providerName} - B2B Data Provider for ${businessCategory}

## Overview
${providerInfo.providerDescription}
Website: ${providerInfo.providerUrl}

## Value for ${businessCategory}
The ${providerInfo.providerName} platform provides essential data and intelligence for ${businessCategory}. 
This data can be utilized to improve revenue generation, lead targeting, market analysis, and business growth.

## Data Capabilities
${providerInfo.providerName} offers data enrichment, contact information, company intelligence, and technology usage insights
that can help ${businessCategory} identify potential customers, partners, and market opportunities.

## Search Results
${typeof providerInfo.searchResults === 'string' ? providerInfo.searchResults : JSON.stringify(providerInfo.searchResults)}

## Website Information
${typeof providerInfo.websiteContent === 'string' ? providerInfo.websiteContent : JSON.stringify(providerInfo.websiteContent)}

## Deep Research
${typeof providerInfo.deepResearchResults === 'string' ? providerInfo.deepResearchResults : JSON.stringify(providerInfo.deepResearchResults)}

## Integration with Revenue Generation
For ${businessCategory}, ${providerInfo.providerName} can be integrated into sales and marketing workflows to:
1. Identify qualified prospects
2. Enrich existing customer data
3. Perform market segmentation
4. Track competitors
5. Analyze industry trends
6. Improve targeting and conversion rates

## Usage Context
When a business owner of a ${businessCategory} asks about increasing revenue or finding new customers,
${providerInfo.providerName} data can provide valuable insights for growth strategies.
`.trim();

  return formattedText;
}

/**
 * Generate embedding for text
 */
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Add provider information to Pinecone
 */
async function addToPinecone(providerInfo, businessCategory, embedding) {
  try {
    const namespace = 'revenue_data_providers';
    const id = `${providerInfo.providerName.toLowerCase().replace(/\s+/g, '_')}_${businessCategory.toLowerCase().replace(/\s+/g, '_')}`;
    
    console.log(`   💽 Upserting to Pinecone: "${id}" in namespace "${namespace}"`);
    
    // Use Pinecone MCP to upsert
    const upsertResult = await mcp_pinecone_upsert_records({
      name: 'marketplace-index',
      namespace: namespace,
      records: [{
        id: id,
        values: embedding,
        provider_name: providerInfo.providerName,
        provider_url: providerInfo.providerUrl,
        business_category: businessCategory,
        document_type: 'b2b_provider_info',
        search_text: formatForEmbedding(providerInfo, businessCategory),
        created_at: new Date().toISOString()
      }]
    });
    
    return upsertResult;
  } catch (error) {
    console.error(`Error upserting to Pinecone: ${error.message}`);
    throw error;
  }
}

/**
 * Main function to run the process
 */
async function gatherAndEmbedB2BProviderData() {
  console.log('🚀 Starting B2B provider data gathering and embedding process...\n');
  
  try {
    // Step 1: Check Pinecone index
    console.log('1️⃣ Checking Pinecone index...');
    
    try {
      const indexStats = await mcp_pinecone_describe_index_stats({
        name: 'marketplace-index'
      });
      
      console.log('✅ Pinecone index available');
      console.log(`   📊 Current namespaces: ${Object.keys(indexStats.namespaces || {}).join(', ')}`);
      console.log(`   📊 Total records: ${indexStats.totalRecordCount}`);
    } catch (error) {
      console.error('❌ Error checking Pinecone index:', error.message);
      return;
    }
    
    // Step 2: Gather information for each provider
    console.log('\n2️⃣ Gathering information for B2B data providers...');
    const providerInfos = [];
    
    for (const provider of b2bProviders) {
      const providerInfo = await gatherProviderInformation(provider);
      providerInfos.push(providerInfo);
    }
    
    // Step 3: Generate embeddings and add to Pinecone
    console.log('\n3️⃣ Generating embeddings and adding to Pinecone...');
    
    // Process each provider for each business category
    for (const providerInfo of providerInfos) {
      console.log(`\n🔄 Processing ${providerInfo.providerName}...`);
      
      for (const businessCategory of businessCategories) {
        console.log(`   🏢 Contextualizing for ${businessCategory}...`);
        
        // Format text for embedding
        const formattedText = formatForEmbedding(providerInfo, businessCategory);
        
        // Generate embedding
        console.log(`   🧠 Generating embedding...`);
        const embedding = await generateEmbedding(formattedText);
        
        // Add to Pinecone
        await addToPinecone(providerInfo, businessCategory, embedding);
        console.log(`   ✅ Added ${providerInfo.providerName} data for ${businessCategory}`);
      }
    }
    
    // Step 4: Test search
    console.log('\n4️⃣ Testing search functionality...');
    const testQuery = "How can I find new customers for my retail business?";
    console.log(`🔍 Test query: "${testQuery}"`);
    
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(testQuery);
    
    // Search using Pinecone MCP
    const searchResults = await mcp_pinecone_search_records({
      name: 'marketplace-index',
      namespace: 'revenue_data_providers',
      query: {
        topK: 3,
        inputs: {
          text: testQuery
        }
      },
      rerank: {
        model: 'cohere-rerank-3.5',
        rankFields: ['search_text'],
        topN: 3
      }
    });
    
    console.log('\n📊 Search Results:');
    if (searchResults && searchResults.matches && searchResults.matches.length > 0) {
      searchResults.matches.forEach((match, index) => {
        console.log(`\n${index + 1}. ${match.metadata.provider_name} for ${match.metadata.business_category}`);
        console.log(`   🎯 Relevance: ${(match.score * 100).toFixed(1)}%`);
      });
    } else {
      console.log('No results found - this might indicate an issue with the search');
    }
    
    console.log('\n🎉 B2B Provider Data Integration Complete!');
    console.log('\n📋 Summary:');
    console.log(`✅ Providers researched: ${providerInfos.length}`);
    console.log(`✅ Business categories: ${businessCategories.length}`);
    console.log(`✅ Total embeddings created: ${providerInfos.length * businessCategories.length}`);
    
  } catch (error) {
    console.error('❌ Process failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Simulated MCP function implementations for development
// In production, these would be replaced by the actual MCP functions

// Simulated Firecrawl search MCP function
async function mcp_firecrawl_firecrawl_search({ query, limit = 5, scrapeOptions = {} }) {
  console.log(`[SIMULATED] Firecrawl search for: "${query}" (limit: ${limit})`);
  return `# Search results for "${query}"\n\n` +
    `This would contain real search results from Firecrawl in production.\n\n` +
    `Key information about the query topic would be included here, with links to relevant resources.`;
}

// Simulated Firecrawl scrape MCP function
async function mcp_firecrawl_firecrawl_scrape({ url, formats = ["markdown"], onlyMainContent = true }) {
  console.log(`[SIMULATED] Firecrawl scrape for: "${url}"`);
  return `# Content from ${url}\n\n` +
    `This would contain real scraped content from the website in production.\n\n` +
    `The main content would include product descriptions, features, pricing, and other relevant information.`;
}

// Simulated Firecrawl deep research MCP function
async function mcp_firecrawl_firecrawl_deep_research({ query, maxDepth = 3, timeLimit = 120, maxUrls = 20 }) {
  console.log(`[SIMULATED] Firecrawl deep research for: "${query}" (depth: ${maxDepth}, time: ${timeLimit}s, urls: ${maxUrls})`);
  return `# Deep Research: ${query}\n\n` +
    `This would contain comprehensive research results from Firecrawl in production.\n\n` +
    `It would include analysis of multiple sources, structured information, and key insights about the topic.`;
}

// Simulated Pinecone describe index stats MCP function
async function mcp_pinecone_describe_index_stats({ name }) {
  console.log(`[SIMULATED] Pinecone describe index stats for: "${name}"`);
  return {
    "namespaces": {
      "revenue_data_providers": {
        "recordCount": 0
      },
      "companies_house": {
        "recordCount": 4
      },
      "industry_standards": {
        "recordCount": 2
      }
    },
    "dimension": 1536,
    "totalRecordCount": 6
  };
}

// Simulated Pinecone upsert records MCP function
async function mcp_pinecone_upsert_records({ name, namespace, records }) {
  console.log(`[SIMULATED] Pinecone upsert ${records.length} records to "${name}" (namespace: "${namespace}")`);
  return { upsertedCount: records.length };
}

// Simulated Pinecone search records MCP function
async function mcp_pinecone_search_records({ name, namespace, query, rerank }) {
  console.log(`[SIMULATED] Pinecone search in "${name}" (namespace: "${namespace}")`);
  return {
    matches: [
      {
        id: "zoominfo_uk_retail_businesses",
        score: 0.95,
        metadata: {
          provider_name: "ZoomInfo",
          business_category: "UK retail businesses"
        }
      },
      {
        id: "clearbit_uk_retail_businesses",
        score: 0.89,
        metadata: {
          provider_name: "Clearbit",
          business_category: "UK retail businesses"
        }
      },
      {
        id: "apollo_uk_ecommerce_businesses",
        score: 0.78,
        metadata: {
          provider_name: "Apollo",
          business_category: "UK ecommerce businesses"
        }
      }
    ]
  };
}

// Run the main function
gatherAndEmbedB2BProviderData().catch(console.error);
