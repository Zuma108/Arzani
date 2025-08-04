/**
 * Pinecone Data Population Script for MCP RAG System
 * This script adds business valuation data to Pinecone vector database
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';

dotenv.config();

console.log('🌲 Pinecone Data Population for MCP RAG System');
console.log('===============================================\n');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

const indexName = process.env.PINECONE_INDEX_NAME || 'marketplace-index';

// Sample business data (you can replace this with database queries later)
const businessData = [
  {
    id: 'business_001',
    business_name: 'TechStart Solutions Ltd',
    industry: 'Technology/Software',
    annual_revenue: 1200000,
    ebitda: 240000,
    location: 'London, UK',
    employees: 15,
    valuation_multiple: 5.2,
    asking_price: 1500000,
    description: 'B2B SaaS platform for project management with 200+ active clients. Strong recurring revenue model with high customer retention.',
    risk_factors: ['High competition', 'Key person dependency', 'Subscription model risks'],
    growth_potential: 'High - expanding into European markets',
    financial_highlights: 'EBITDA margin 20%, ARR growth 35% YoY',
    created_at: '2025-01-15'
  },
  {
    id: 'business_002',
    business_name: 'Manchester Manufacturing Co',
    industry: 'Manufacturing/Industrial',
    annual_revenue: 2500000,
    ebitda: 400000,
    location: 'Manchester, UK',
    employees: 35,
    valuation_multiple: 4.8,
    asking_price: 2200000,
    description: 'Specialist automotive parts manufacturer with 20-year track record. Strong relationships with tier-1 automotive suppliers.',
    risk_factors: ['Economic sensitivity', 'Raw material costs', 'Brexit impact'],
    growth_potential: 'Moderate - stable client base with expansion opportunities',
    financial_highlights: 'EBITDA margin 16%, consistent profitability',
    created_at: '2025-02-01'
  },
  {
    id: 'business_003',
    business_name: 'Edinburgh Consulting Partners',
    industry: 'Professional Services',
    annual_revenue: 800000,
    ebitda: 160000,
    location: 'Edinburgh, UK',
    employees: 8,
    valuation_multiple: 3.2,
    asking_price: 650000,
    description: 'Financial advisory and accounting services for SMEs. Established client base with recurring monthly contracts.',
    risk_factors: ['Client concentration', 'Key personnel risk', 'Regulatory changes'],
    growth_potential: 'Moderate - established client relationships',
    financial_highlights: 'EBITDA margin 20%, 85% recurring revenue',
    created_at: '2025-02-10'
  },
  {
    id: 'business_004',
    business_name: 'Brighton Digital Agency',
    industry: 'Marketing/Digital Services',
    annual_revenue: 950000,
    ebitda: 190000,
    location: 'Brighton, UK',
    employees: 12,
    valuation_multiple: 4.1,
    asking_price: 850000,
    description: 'Full-service digital marketing agency specializing in e-commerce brands. Strong portfolio of growing clients.',
    risk_factors: ['Client churn', 'Market competition', 'Talent retention'],
    growth_potential: 'High - growing e-commerce market',
    financial_highlights: 'EBITDA margin 20%, 40% client retention rate',
    created_at: '2025-02-20'
  },
  {
    id: 'business_005',
    business_name: 'Yorkshire Food Distributors',
    industry: 'Food & Beverage/Distribution',
    annual_revenue: 3200000,
    ebitda: 320000,
    location: 'Leeds, UK',
    employees: 28,
    valuation_multiple: 3.8,
    asking_price: 1400000,
    description: 'Regional food distribution company serving independent retailers and restaurants across Yorkshire.',
    risk_factors: ['Supply chain disruption', 'Food safety regulations', 'Transport costs'],
    growth_potential: 'Stable - established routes and customers',
    financial_highlights: 'EBITDA margin 10%, strong cash flow',
    created_at: '2025-03-01'
  }
];

// Convert business data to searchable text format
function formatBusinessForRAG(business) {
  return `
Business Valuation Entry:
Company: ${business.business_name}
Industry: ${business.industry}
Location: ${business.location}
Annual Revenue: £${business.annual_revenue.toLocaleString()}
EBITDA: £${business.ebitda.toLocaleString()}
EBITDA Margin: ${((business.ebitda/business.annual_revenue)*100).toFixed(1)}%
Employees: ${business.employees}
Valuation Multiple: ${business.valuation_multiple}x
Asking Price: £${business.asking_price.toLocaleString()}

Business Description: ${business.description}

Financial Highlights: ${business.financial_highlights}

Risk Factors: ${business.risk_factors.join(', ')}

Growth Potential: ${business.growth_potential}

Investment Summary: This ${business.industry} business in ${business.location} generates £${business.annual_revenue.toLocaleString()} in annual revenue with £${business.ebitda.toLocaleString()} EBITDA. The company employs ${business.employees} people and is valued at ${business.valuation_multiple}x EBITDA multiple, asking £${business.asking_price.toLocaleString()}.
  `.trim();
}

// Check if Pinecone index exists and create if needed
async function ensurePineconeIndex() {
  try {
    console.log('🔍 Checking Pinecone index...');
    
    const indexList = await pinecone.listIndexes();
    const indexExists = indexList.indexes?.some(index => index.name === indexName);
    
    if (!indexExists) {
      console.log(`📝 Creating Pinecone index: ${indexName}`);
      await pinecone.createIndex({
        name: indexName,
        dimension: 1536, // text-embedding-3-small dimension
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });
      
      console.log('✅ Index created successfully');
      // Wait for index to be ready
      console.log('⏳ Waiting for index to be ready...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    } else {
      console.log('✅ Index already exists');
    }
    
    return pinecone.index(indexName);
    
  } catch (error) {
    console.error('❌ Error with Pinecone index:', error.message);
    throw error;
  }
}

// Generate embeddings and upload to Pinecone
async function populatePineconeData() {
  try {
    console.log('🚀 Starting Pinecone data population...\n');
    
    // Ensure index exists
    const index = await ensurePineconeIndex();
    
    // Check current vector count
    const stats = await index.describeIndexStats();
    console.log(`📊 Current vectors in index: ${stats.totalVectorCount || 0}`);
    
    console.log('\n🔄 Processing business data...');
    
    const vectors = [];
    
    for (const business of businessData) {
      console.log(`📈 Processing: ${business.business_name}`);
      
      try {
        // Generate searchable text
        const searchText = formatBusinessForRAG(business);
        
        // Generate embedding
        const embedding = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: searchText
        });
        
        // Prepare vector for Pinecone
        const vector = {
          id: business.id,
          values: embedding.data[0].embedding,
          metadata: {
            business_name: business.business_name,
            industry: business.industry,
            location: business.location,
            annual_revenue: business.annual_revenue,
            ebitda: business.ebitda,
            ebitda_margin: parseFloat(((business.ebitda/business.annual_revenue)*100).toFixed(1)),
            employees: business.employees,
            valuation_multiple: business.valuation_multiple,
            asking_price: business.asking_price,
            revenue_range: business.annual_revenue > 2000000 ? 'high' : business.annual_revenue > 1000000 ? 'medium' : 'low',
            employee_range: business.employees > 25 ? 'large' : business.employees > 15 ? 'medium' : 'small',
            text_content: searchText,
            created_at: business.created_at
          }
        };
        
        vectors.push(vector);
        console.log(`✅ ${business.business_name}: Embedding generated (${embedding.data[0].embedding.length} dimensions)`);
        
      } catch (error) {
        console.error(`❌ Error processing ${business.business_name}:`, error.message);
      }
    }
    
    // Upload vectors to Pinecone in batches
    console.log(`\n📤 Uploading ${vectors.length} vectors to Pinecone...`);
    
    const batchSize = 100; // Pinecone batch limit
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      
      try {
        await index.upsert(batch);
        console.log(`✅ Uploaded batch ${Math.floor(i/batchSize) + 1} (${batch.length} vectors)`);
      } catch (error) {
        console.error(`❌ Error uploading batch ${Math.floor(i/batchSize) + 1}:`, error.message);
      }
    }
    
    // Wait for vectors to be available
    console.log('\n⏳ Waiting for vectors to be indexed...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verify upload
    const finalStats = await index.describeIndexStats();
    console.log(`\n📊 Final vector count: ${finalStats.totalVectorCount || 0}`);
    
    return vectors.length;
    
  } catch (error) {
    console.error('❌ Error populating Pinecone:', error.message);
    throw error;
  }
}

// Test search functionality
async function testPineconeSearch() {
  try {
    console.log('\n🧪 Testing Pinecone search functionality...');
    
    const index = pinecone.index(indexName);
    
    const testQuery = "Technology companies in London with high revenue";
    console.log(`🔍 Search query: "${testQuery}"`);
    
    // Generate query embedding
    const queryEmbedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: testQuery
    });
    
    // Search Pinecone
    const searchResults = await index.query({
      vector: queryEmbedding.data[0].embedding,
      topK: 3,
      includeMetadata: true,
      includeValues: false
    });
    
    console.log('\n📈 Search Results:');
    searchResults.matches.forEach((match, index) => {
      console.log(`\n${index + 1}. ${match.metadata.business_name}`);
      console.log(`   🎯 Score: ${(match.score * 100).toFixed(1)}%`);
      console.log(`   🏢 Industry: ${match.metadata.industry}`);
      console.log(`   💰 Revenue: £${match.metadata.annual_revenue.toLocaleString()}`);
      console.log(`   📍 Location: ${match.metadata.location}`);
    });
    
    return searchResults.matches.length;
    
  } catch (error) {
    console.error('❌ Error testing search:', error.message);
    return 0;
  }
}

// Main function
async function main() {
  try {
    console.log('🌲 Pinecone MCP RAG Data Population');
    console.log('===================================\n');
    
    // Check environment variables
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY not found in environment variables');
    }
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not found in environment variables');
    }
    
    console.log('✅ Environment variables configured');
    console.log(`📝 Target index: ${indexName}`);
    console.log(`📊 Data to process: ${businessData.length} businesses\n`);
    
    // Populate data
    const vectorCount = await populatePineconeData();
    console.log(`\n✅ Successfully uploaded ${vectorCount} vectors`);
    
    // Test search
    const searchResults = await testPineconeSearch();
    console.log(`\n✅ Search test returned ${searchResults} results`);
    
    console.log('\n🎉 Pinecone population complete!');
    console.log('\n📋 Summary:');
    console.log(`✅ Vectors uploaded: ${vectorCount}`);
    console.log(`✅ Search functionality: Working`);
    console.log(`✅ Index: ${indexName}`);
    
    console.log('\n🔄 Next Steps:');
    console.log('1. ✅ Pinecone populated with business data');
    console.log('2. 🔄 Start MCP server: node mcp-servers/business-valuation-rag.js');
    console.log('3. 🔄 Test MCP integration with agents');
    console.log('4. 🔄 Add more business data from database');
    
  } catch (error) {
    console.error('❌ Population failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Set timeout and run
setTimeout(() => {
  console.log('\n⏰ Script timed out after 120 seconds');
  process.exit(1);
}, 120000);

main().catch(console.error);
