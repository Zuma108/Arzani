/**
 * Add B2B Data Provider Information to Pinecone using MCP Tools
 * This script uses research data from Firecrawl and adds it to Pinecone for revenue agent
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

dotenv.config();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

console.log('🔄 Adding B2B Data Provider Information to Pinecone');
console.log('==================================================\n');

// Define namespaces and index name
const PINECONE_INDEX = 'marketplace-index';
const REVENUE_NAMESPACE = 'revenue_data_providers';

// Define business categories relevant to UK business owners
const UK_BUSINESS_CATEGORIES = [
  'UK small retail businesses',
  'UK manufacturing companies',
  'UK tech startups',
  'UK service businesses',
  'UK hospitality businesses',
  'UK financial services',
  'UK healthcare providers',
  'UK construction companies',
  'UK ecommerce businesses',
  'UK professional services firms'
];

// B2B Data Providers - simplified data from research
const providers = [
  {
    name: 'ZoomInfo',
    description: 'Leading B2B contact database and intelligence platform with extensive global coverage and UK-specific data.',
    url: 'https://www.zoominfo.com',
    tags: ['sales intelligence', 'contact data', 'intent data', 'company data', 'UK compliance']
  },
  {
    name: 'Apollo',
    description: 'Comprehensive B2B contact database and sales intelligence platform with powerful API access.',
    url: 'https://www.apollo.io',
    tags: ['sales engagement', 'contact data', 'company data', 'API access', 'multi-channel outreach']
  },
  {
    name: 'Cognism',
    description: 'UK-based B2B contact and company data provider with strong compliance focus and mobile-verified numbers.',
    url: 'https://www.cognism.com',
    tags: ['GDPR compliance', 'mobile data', 'UK focus', 'sales intelligence', 'data compliance']
  },
  {
    name: 'Clearbit',
    description: 'B2B data enrichment and intelligence platform that enhances marketing efforts with detailed company insights.',
    url: 'https://clearbit.com',
    tags: ['data enrichment', 'marketing intelligence', 'real-time data', 'lead scoring', 'API integration']
  },
  {
    name: 'People Data Labs',
    description: 'Extensive B2B people and company data API provider with broad global coverage and flexible integration options.',
    url: 'https://www.peopledatalabs.com',
    tags: ['API access', 'company data', 'people data', 'data enrichment', 'flexible pricing']
  }
];

// Step 1: Create data folder
const dataDir = path.join(process.cwd(), 'data', 'b2b-providers');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
  console.log(`📁 Created directory: ${dataDir}`);
}

/**
 * Generate embeddings for text using OpenAI
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
 * Format provider data for specific business category
 */
function formatProviderData(provider, category) {
  return `
# ${provider.name} - B2B Data Provider for ${category}

## Overview
${provider.description}
Official Website: ${provider.url}

## Value for ${category}
The ${provider.name} platform provides essential data and intelligence that can help ${category} 
find new customers, improve targeting, and increase revenue generation efficiency.

## Key Capabilities
- Access to verified business contact information
- Company intelligence and firmographic data
- Technology usage insights (technographics)
- Compliance with UK data protection regulations
- Integration with CRM and marketing platforms

## Business Applications for ${category}
1. Find new potential customers and decision-makers
2. Enhance existing customer data with additional insights
3. Segment markets for more targeted campaigns
4. Monitor competitors and industry trends
5. Identify sales opportunities based on company changes

## Tags
${provider.tags.join(', ')}

## Revenue Generation Value
For ${category}, ${provider.name} data can directly impact revenue by:
- Improving lead quality and conversion rates
- Reducing time spent on manual research
- Enabling more personalized outreach
- Identifying high-value prospects
- Supporting account-based marketing strategies
`;
}

/**
 * Add data to Pinecone using MCP
 */
async function addToPinecone(provider, category, embedding) {
  try {
    console.log(`   📊 Adding ${provider.name} data for ${category} to Pinecone...`);
    
    const id = `${provider.name.toLowerCase().replace(/\s+/g, '_')}_${category.toLowerCase().replace(/\s+/g, '_')}`;
    
    // Call Pinecone MCP to upsert the record
    return await mcp_pinecone_upsert_records({
      name: PINECONE_INDEX,
      namespace: REVENUE_NAMESPACE,
      records: [{
        id: id,
        values: embedding,
        provider_name: provider.name,
        provider_url: provider.url,
        business_category: category,
        description: provider.description,
        tags: provider.tags,
        document_type: 'b2b_provider_info',
        created_at: new Date().toISOString()
      }]
    });
  } catch (error) {
    console.error(`   ❌ Error adding data to Pinecone: ${error.message}`);
    return null;
  }
}

/**
 * Main function to run the process
 */
async function main() {
  try {
    console.log('1️⃣ Checking Pinecone index...');
    
    try {
      // Check if the index exists and get stats
      const indexStats = await mcp_pinecone_describe_index_stats({
        name: PINECONE_INDEX
      });
      
      console.log(`✅ Connected to Pinecone index: ${PINECONE_INDEX}`);
      console.log(`   📊 Total records: ${indexStats.totalRecordCount}`);
      console.log(`   📊 Namespaces: ${Object.keys(indexStats.namespaces || {}).join(', ')}`);
      
      // Check if our namespace exists, if not we'll create it with the first record
      const hasNamespace = indexStats.namespaces && REVENUE_NAMESPACE in indexStats.namespaces;
      console.log(`   ${hasNamespace ? '✅' : '⚠️'} Namespace '${REVENUE_NAMESPACE}': ${hasNamespace ? 'Exists' : 'Will be created'}`);
      
    } catch (error) {
      console.error(`❌ Error connecting to Pinecone: ${error.message}`);
      return;
    }
    
    console.log('\n2️⃣ Processing B2B data providers...');
    
    // Process each provider for each business category
    for (const provider of providers) {
      console.log(`\n🔄 Processing ${provider.name}...`);
      
      for (const category of UK_BUSINESS_CATEGORIES) {
        try {
          // Format the data for this provider and category
          const formattedText = formatProviderData(provider, category);
          
          // Save to file for reference
          const filename = `${provider.name.toLowerCase().replace(/\s+/g, '-')}_${category.toLowerCase().replace(/\s+/g, '-')}.md`;
          const filePath = path.join(dataDir, filename);
          writeFileSync(filePath, formattedText);
          
          // Generate embedding
          console.log(`   🧠 Generating embedding for ${provider.name} - ${category}...`);
          const embedding = await generateEmbedding(formattedText);
          
          // Add to Pinecone
          const result = await addToPinecone(provider, category, embedding);
          
          if (result) {
            console.log(`   ✅ Successfully added ${provider.name} data for ${category}`);
          }
        } catch (error) {
          console.error(`   ❌ Error processing ${provider.name} for ${category}: ${error.message}`);
        }
      }
    }
    
    console.log('\n3️⃣ Testing search functionality...');
    
    // Test queries for different business types
    const testQueries = [
      "How can I find new customers for my small retail shop in London?",
      "What data provider can help my tech startup identify potential clients?",
      "I need accurate business contact information for UK construction companies"
    ];
    
    for (const query of testQueries) {
      console.log(`\n🔍 Testing query: "${query}"`);
      
      try {
        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(query);
        
        // Search Pinecone using the embedding
        const searchResults = await mcp_pinecone_search_records({
          name: PINECONE_INDEX,
          namespace: REVENUE_NAMESPACE,
          query: {
            topK: 3,
            inputs: {
              text: query
            }
          }
        });
        
        if (searchResults && searchResults.matches && searchResults.matches.length > 0) {
          console.log(`   📋 Found ${searchResults.matches.length} matching results:`);
          
          searchResults.matches.forEach((match, index) => {
            console.log(`   ${index + 1}. ${match.metadata.provider_name} for ${match.metadata.business_category}`);
            console.log(`      🎯 Score: ${(match.score * 100).toFixed(1)}%`);
            console.log(`      🔗 URL: ${match.metadata.provider_url}`);
          });
        } else {
          console.log('   ⚠️ No search results found');
        }
      } catch (error) {
        console.error(`   ❌ Error testing search: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Process completed successfully!');
    console.log(`✅ Added ${providers.length * UK_BUSINESS_CATEGORIES.length} records to Pinecone`);
    console.log('✅ B2B data provider information is now available for the revenue agent');
    
  } catch (error) {
    console.error('❌ Process failed:', error);
  }
}

// Run the main function
main().catch(console.error);
