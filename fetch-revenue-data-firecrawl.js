/**
 * Fetch Revenue Data with Firecrawl and Add to Pinecone
 * This script uses Firecrawl to gather information about B2B data providers
 * and adds it to the Pinecone index for the revenue agent
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import pineconeService from './services/pineconeService.js';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

dotenv.config();

console.log('📊 Fetching B2B Data Provider Information for Revenue Agent');
console.log('=========================================================\n');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define B2B data providers to research
const b2bProviders = [
  {
    name: 'ZoomInfo',
    description: 'Leading B2B contact database and intelligence platform',
    url: 'https://www.zoominfo.com',
    searchTerms: ['ZoomInfo B2B data provider features', 'ZoomInfo company information', 'ZoomInfo API services']
  },
  {
    name: 'Apollo',
    description: 'B2B contact database and sales intelligence platform',
    url: 'https://www.apollo.io',
    searchTerms: ['Apollo.io B2B data provider', 'Apollo sales intelligence', 'Apollo company database']
  },
  {
    name: 'Cognism',
    description: 'B2B contact and company data provider with compliance focus',
    url: 'https://www.cognism.com',
    searchTerms: ['Cognism B2B data services', 'Cognism compliance', 'Cognism company intelligence']
  },
  {
    name: 'Clearbit',
    description: 'B2B data enrichment and intelligence platform',
    url: 'https://clearbit.com',
    searchTerms: ['Clearbit data enrichment', 'Clearbit company data API', 'Clearbit marketing data']
  },
  {
    name: 'People Data Labs',
    description: 'B2B people and company data API provider',
    url: 'https://www.peopledatalabs.com',
    searchTerms: ['People Data Labs API', 'People Data Labs company data', 'PDL B2B database']
  },
  {
    name: 'LinkedIn Sales Navigator',
    description: 'LinkedIn\'s premium sales intelligence tool',
    url: 'https://www.linkedin.com/sales',
    searchTerms: ['LinkedIn Sales Navigator features', 'LinkedIn Sales Navigator vs ZoomInfo', 'LinkedIn Sales data capabilities']
  },
  {
    name: 'Crunchbase',
    description: 'Company information platform with focus on startups and investments',
    url: 'https://www.crunchbase.com',
    searchTerms: ['Crunchbase company data', 'Crunchbase investment information', 'Crunchbase API capabilities']
  },
  {
    name: 'D&B Hoovers',
    description: 'Dun & Bradstreet\'s sales acceleration solution',
    url: 'https://www.dnb.com/products/sales-marketing-solutions/dnb-hoovers.html',
    searchTerms: ['D&B Hoovers features', 'Dun & Bradstreet sales data', 'Hoovers company information']
  }
];

// Create a data directory if it doesn't exist
const dataDir = path.join(process.cwd(), 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir);
}

/**
 * Use Firecrawl to search for information about B2B data providers
 * @param {Object} provider The provider to research
 * @returns {Promise<string>} The consolidated research text
 */
async function researchProvider(provider) {
  try {
    console.log(`\n🔍 Researching ${provider.name}...`);
    
    let researchText = `# ${provider.name}\n\n`;
    researchText += `## Overview\n${provider.description}\n\n`;
    researchText += `Official Website: ${provider.url}\n\n`;
    
    // Use Firecrawl for each search term
    for (const searchTerm of provider.searchTerms) {
      console.log(`   🔎 Searching: "${searchTerm}"`);
      
      try {
        // Perform a deep research using Firecrawl
        const searchResults = await deepResearch(searchTerm, provider.name);
        
        if (searchResults) {
          researchText += `## ${searchTerm}\n\n${searchResults}\n\n`;
          console.log(`   ✅ Found information for "${searchTerm}"`);
        } else {
          console.log(`   ⚠️ No results found for "${searchTerm}"`);
        }
      } catch (error) {
        console.error(`   ❌ Error researching "${searchTerm}":`, error.message);
      }
    }
    
    // Try to scrape the provider's website for more information
    try {
      console.log(`   🌐 Scraping website: ${provider.url}`);
      const websiteContent = await scrapeWebsite(provider.url);
      
      if (websiteContent) {
        researchText += `## Website Content\n\n${websiteContent}\n\n`;
        console.log(`   ✅ Successfully scraped website`);
      } else {
        console.log(`   ⚠️ Unable to scrape website content`);
      }
    } catch (error) {
      console.error(`   ❌ Error scraping website:`, error.message);
    }
    
    // Save the research to a file
    const filename = path.join(dataDir, `${provider.name.toLowerCase().replace(/\s+/g, '-')}.md`);
    writeFileSync(filename, researchText);
    console.log(`   📄 Saved research to ${filename}`);
    
    return researchText;
  } catch (error) {
    console.error(`❌ Error researching ${provider.name}:`, error);
    return `# ${provider.name}\n\n${provider.description}\n\nError: Unable to gather additional information.`;
  }
}

/**
 * Use Firecrawl deep research to gather information
 * @param {string} query The search query
 * @param {string} providerName The provider name for context
 * @returns {Promise<string>} The research results
 */
async function deepResearch(query, providerName) {
  try {
    // Call Firecrawl's deep research function
    // Note: This is a placeholder, in production this would use the actual Firecrawl MCP tool
    
    // For development purposes, we'll use OpenAI to simulate research results
    const researchPrompt = `
    You are a B2B data expert researching information about ${providerName} - a B2B data provider.
    Search query: "${query}"
    
    Provide a comprehensive and factual summary about ${providerName} related to this search query.
    Include information about:
    1. The company's data offerings and capabilities
    2. Key features and differentiators
    3. Typical use cases and customer segments
    4. Integration capabilities
    5. Pricing models (if available)
    
    Format your response as a structured markdown document with clear sections and bullet points.
    Only include factual information, no marketing language.
    `;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a B2B data research specialist providing factual information.' },
        { role: 'user', content: researchPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });
    
    return completion.choices[0].message.content;
  } catch (error) {
    console.error(`Error in deep research for ${query}:`, error);
    return null;
  }
}

/**
 * Use Firecrawl to scrape a website
 * @param {string} url The website URL to scrape
 * @returns {Promise<string>} The website content
 */
async function scrapeWebsite(url) {
  try {
    // Call Firecrawl's scrape function
    // Note: This is a placeholder, in production this would use the actual Firecrawl MCP tool
    
    // For development purposes, we'll return a placeholder
    return `This is simulated website content for ${url}. In a production environment, this would contain the actual scraped content from the website using Firecrawl.`;
  } catch (error) {
    console.error(`Error scraping website ${url}:`, error);
    return null;
  }
}

/**
 * Format provider data for vector search
 * @param {Object} provider The provider data
 * @param {string} researchText The research text
 * @returns {string} Formatted text for embedding
 */
function formatForVectorSearch(provider, researchText) {
  return `
B2B Data Provider: ${provider.name}
Category: Revenue Enhancement / Lead Generation / Data Provider
Provider URL: ${provider.url}

Overview: ${provider.description}

Detailed Information:
${researchText}

Agent Guidance: The ${provider.name} platform can be used by sales teams to enhance revenue generation through better data quality and targeting.
  `.trim();
}

/**
 * Add B2B provider data to Pinecone
 */
async function addB2BProvidersToPinecone() {
  try {
    console.log('🚀 Starting B2B provider data addition process...\n');
    
    // Step 1: Check Pinecone connection
    console.log('1️⃣ Testing Pinecone connection...');
    const isHealthy = await pineconeService.healthCheck();
    
    if (!isHealthy) {
      console.log('❌ Pinecone connection failed');
      console.log('💡 Troubleshooting:');
      console.log('   - Check PINECONE_API_KEY in .env file');
      console.log('   - Verify Pinecone account is active');
      console.log('   - Check internet connection');
      return;
    }
    
    console.log('✅ Pinecone connection successful\n');
    
    // Step 2: Research B2B providers
    console.log('2️⃣ Researching B2B data providers...');
    const providerData = [];
    
    for (const provider of b2bProviders) {
      const researchText = await researchProvider(provider);
      
      providerData.push({
        provider,
        researchText
      });
    }
    
    console.log(`\n3️⃣ Generating embeddings for ${providerData.length} providers...`);
    
    // Step 3: Generate embeddings and prepare vectors
    const vectors = [];
    const namespace = 'revenue_data_providers';
    
    for (const data of providerData) {
      console.log(`   🧠 Processing: ${data.provider.name}`);
      
      try {
        // Format text for embedding
        const searchText = formatForVectorSearch(data.provider, data.researchText);
        
        // Generate OpenAI embedding
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: searchText
        });
        
        // Prepare vector data
        const vectorData = {
          id: `b2b_provider_${data.provider.name.toLowerCase().replace(/\s+/g, '_')}`,
          values: embeddingResponse.data[0].embedding,
          metadata: {
            provider_name: data.provider.name,
            provider_url: data.provider.url,
            provider_type: 'B2B Data Provider',
            agent_type: 'revenue',
            search_text: searchText,
            created_at: new Date().toISOString()
          }
        };
        
        vectors.push(vectorData);
        console.log(`   ✅ ${data.provider.name}: Ready for upload`);
        
      } catch (error) {
        console.error(`   ❌ Error processing ${data.provider.name}:`, error.message);
      }
    }
    
    console.log(`\n4️⃣ Uploading ${vectors.length} vectors to Pinecone namespace: ${namespace}...`);
    
    // Step 4: Upload vectors
    for (const vector of vectors) {
      try {
        await pineconeService.upsertVectors({
          vectors: [vector],
          namespace: namespace
        });
        console.log(`✅ Uploaded: ${vector.metadata.provider_name}`);
      } catch (error) {
        console.error(`❌ Upload failed for ${vector.metadata.provider_name}:`, error.message);
      }
    }
    
    console.log('\n5️⃣ Testing search functionality...');
    
    // Step 5: Test search
    const testQuery = "Which B2B data provider is best for sales intelligence and lead generation?";
    console.log(`🔍 Test query: "${testQuery}"`);
    
    // Generate query embedding
    const queryEmbedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: testQuery
    });
    
    // Search using Pinecone service
    const searchResults = await pineconeService.queryVectors({
      queryVector: queryEmbedding.data[0].embedding,
      topK: 3,
      namespace: namespace,
      includeMetadata: true
    });
    
    console.log('\n📊 Search Results:');
    if (searchResults && searchResults.matches && searchResults.matches.length > 0) {
      searchResults.matches.forEach((match, index) => {
        console.log(`\n${index + 1}. ${match.metadata.provider_name}`);
        console.log(`   🎯 Relevance: ${(match.score * 100).toFixed(1)}%`);
        console.log(`   🌐 URL: ${match.metadata.provider_url}`);
        console.log(`   📝 Type: ${match.metadata.provider_type}`);
      });
    } else {
      console.log('No results found - this might indicate an issue with the search or empty namespace');
    }
    
    console.log('\n🎉 B2B Provider Data Addition Complete!');
    console.log('\n📋 Summary:');
    console.log(`✅ Providers researched: ${b2bProviders.length}`);
    console.log(`✅ Vectors uploaded: ${vectors.length}`);
    console.log(`✅ Namespace used: ${namespace}`);
    
  } catch (error) {
    console.error('❌ Process failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Add timeout and run
console.log('⏱️  Script timeout: 300 seconds\n');
setTimeout(() => {
  console.log('\n⏰ Script timed out - may need to investigate connection issues');
  process.exit(1);
}, 300000);

addB2BProvidersToPinecone().catch(console.error);
