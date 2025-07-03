/**
 * Add Business Data to Pinecone using Existing Service
 * This script demonstrates how to add data to your MCP RAG system
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import pineconeService from './services/pineconeService.js';

dotenv.config();

console.log('📊 Adding Business Data to Pinecone for MCP RAG');
console.log('===============================================\n');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Sample business data for your MCP system
const businessRecords = [
  {
    id: 'mcp_business_001',
    business_name: 'London Tech Innovations Ltd',
    industry: 'Technology/Software',
    annual_revenue: 1500000,
    ebitda: 300000,
    location: 'London, UK',
    employees: 18,
    valuation_multiple: 5.5,
    asking_price: 1800000,
    description: 'Enterprise software solutions for financial services. Strong recurring revenue with major banking clients.',
    financial_highlights: 'EBITDA margin 20%, 95% recurring revenue, 25% YoY growth',
    risk_factors: ['Regulatory changes', 'Client concentration', 'Technology disruption'],
    growth_potential: 'High - expanding into fintech and regulatory technology',
    mcp_category: 'high_value_tech'
  },
  {
    id: 'mcp_business_002',
    business_name: 'Cardiff Manufacturing Solutions',
    industry: 'Manufacturing/Engineering',
    annual_revenue: 3000000,
    ebitda: 450000,
    location: 'Cardiff, Wales',
    employees: 42,
    valuation_multiple: 4.2,
    asking_price: 2100000,
    description: 'Precision engineering and manufacturing for aerospace and automotive industries.',
    financial_highlights: 'EBITDA margin 15%, ISO certified, long-term contracts',
    risk_factors: ['Supply chain risks', 'Economic cycles', 'Raw material costs'],
    growth_potential: 'Stable - established contracts with expansion opportunities',
    mcp_category: 'stable_manufacturing'
  },
  {
    id: 'mcp_business_003',
    business_name: 'Birmingham Professional Services',
    industry: 'Professional Services/Consulting',
    annual_revenue: 1200000,
    ebitda: 240000,
    location: 'Birmingham, UK',
    employees: 16,
    valuation_multiple: 3.8,
    asking_price: 1000000,
    description: 'Management consulting and business advisory services for mid-market companies.',
    financial_highlights: 'EBITDA margin 20%, diversified client base, recurring contracts',
    risk_factors: ['Key person dependency', 'Economic sensitivity', 'Competition'],
    growth_potential: 'Moderate - potential for digital transformation services',
    mcp_category: 'service_consulting'
  }
];

// Format business data for vector search
function formatForMCPSearch(business) {
  return `
MCP Business Valuation Record:
Business Name: ${business.business_name}
Industry Sector: ${business.industry}
Geographic Location: ${business.location}
Financial Performance:
- Annual Revenue: £${business.annual_revenue.toLocaleString()}
- EBITDA: £${business.ebitda.toLocaleString()}
- EBITDA Margin: ${((business.ebitda/business.annual_revenue)*100).toFixed(1)}%
- Financial Highlights: ${business.financial_highlights}

Operational Details:
- Employee Count: ${business.employees}
- Business Description: ${business.description}

Valuation Information:
- Valuation Multiple: ${business.valuation_multiple}x EBITDA
- Asking Price: £${business.asking_price.toLocaleString()}

Investment Analysis:
- Risk Factors: ${business.risk_factors.join(', ')}
- Growth Potential: ${business.growth_potential}
- MCP Category: ${business.mcp_category}

Investment Summary: ${business.business_name} is a ${business.industry} business located in ${business.location}. The company generates £${business.annual_revenue.toLocaleString()} in annual revenue with £${business.ebitda.toLocaleString()} EBITDA (${((business.ebitda/business.annual_revenue)*100).toFixed(1)}% margin). Valued at ${business.valuation_multiple}x EBITDA multiple with an asking price of £${business.asking_price.toLocaleString()}.
  `.trim();
}

// Add data to Pinecone step by step
async function addBusinessDataToPinecone() {
  try {
    console.log('🚀 Starting Pinecone data addition process...\n');
    
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
    
    // Step 2: Process each business record
    console.log('2️⃣ Processing business records...');
    const vectors = [];
    
    for (const business of businessRecords) {
      console.log(`📈 Processing: ${business.business_name}`);
      
      try {
        // Generate formatted text for embedding
        const searchText = formatForMCPSearch(business);
        
        // Generate OpenAI embedding
        console.log('   🧠 Generating embedding...');
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: searchText
        });
        
        // Prepare vector data
        const vectorData = {
          id: business.id,
          values: embeddingResponse.data[0].embedding,
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
            mcp_category: business.mcp_category,
            revenue_tier: business.annual_revenue > 2000000 ? 'large' : business.annual_revenue > 1000000 ? 'medium' : 'small',
            employee_tier: business.employees > 30 ? 'large' : business.employees > 15 ? 'medium' : 'small',
            search_text: searchText,
            created_for_mcp: new Date().toISOString()
          }
        };
        
        vectors.push(vectorData);
        console.log(`   ✅ ${business.business_name}: Ready for upload`);
        
      } catch (error) {
        console.error(`   ❌ Error processing ${business.business_name}:`, error.message);
      }
    }
    
    console.log(`\n3️⃣ Uploading ${vectors.length} vectors to Pinecone...`);
    
    // Step 3: Upload vectors using existing service
    for (const vector of vectors) {
      try {
        await pineconeService.upsertVectors([vector]);
        console.log(`✅ Uploaded: ${vector.metadata.business_name}`);
      } catch (error) {
        console.error(`❌ Upload failed for ${vector.metadata.business_name}:`, error.message);
      }
    }
    
    console.log('\n4️⃣ Testing search functionality...');
    
    // Step 4: Test search
    const testQuery = "Technology companies in London with high EBITDA margins";
    console.log(`🔍 Test query: "${testQuery}"`);
    
    // Generate query embedding
    const queryEmbedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: testQuery
    });
    
    // Search using existing service
    const searchResults = await pineconeService.queryVectors({
      vector: queryEmbedding.data[0].embedding,
      topK: 3,
      includeMetadata: true
    });
    
    console.log('\n📊 Search Results:');
    if (searchResults && searchResults.matches) {
      searchResults.matches.forEach((match, index) => {
        console.log(`\n${index + 1}. ${match.metadata.business_name}`);
        console.log(`   🎯 Relevance: ${(match.score * 100).toFixed(1)}%`);
        console.log(`   🏢 Industry: ${match.metadata.industry}`);
        console.log(`   💰 Revenue: £${match.metadata.annual_revenue.toLocaleString()}`);
        console.log(`   📍 Location: ${match.metadata.location}`);
        console.log(`   📈 EBITDA Margin: ${match.metadata.ebitda_margin}%`);
      });
    } else {
      console.log('No results found - this might be expected for a new index');
    }
    
    console.log('\n🎉 MCP Data Addition Complete!');
    console.log('\n📋 Summary:');
    console.log(`✅ Business records processed: ${businessRecords.length}`);
    console.log(`✅ Vectors uploaded: ${vectors.length}`);
    console.log(`✅ Search functionality: Tested`);
    
    console.log('\n🔄 Next Steps for MCP Integration:');
    console.log('1. ✅ Data added to Pinecone vector database');
    console.log('2. 🔄 Start your MCP server: node mcp-servers/business-valuation-rag.js');
    console.log('3. 🔄 Test with Finance/Broker/Legal agents');
    console.log('4. 🔄 Add more business data from your database');
    
    console.log('\n💡 How to add more data:');
    console.log('- Modify the businessRecords array above');
    console.log('- Connect to your database to fetch real business data');
    console.log('- Use the same format and run this script again');
    
  } catch (error) {
    console.error('❌ Process failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Add timeout and run
console.log('⏱️  Script timeout: 90 seconds\n');
setTimeout(() => {
  console.log('\n⏰ Script timed out - may need to investigate connection issues');
  process.exit(1);
}, 90000);

addBusinessDataToPinecone().catch(console.error);
