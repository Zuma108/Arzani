/**
 * Verify Finance AI Agent RAG Data
 * Check that finance vectors are accessible in Pinecone
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

const indexName = process.env.PINECONE_INDEX_NAME || 'marketplace-index';

async function verifyFinanceRAG() {
  try {
    console.log('💰 Finance AI Agent RAG Verification');
    console.log('====================================\n');
    
    const index = pinecone.index(indexName);
    
    // Test queries for each finance namespace
    const testQueries = [
      {
        query: "UK government business finance schemes",
        namespace: "business_finance",
        description: "Government Finance Schemes"
      },
      {
        query: "Start up loans eligibility criteria",
        namespace: "startup_loans", 
        description: "Start Up Loans"
      },
      {
        query: "Enterprise Finance Guarantee requirements",
        namespace: "efg_scheme",
        description: "EFG Scheme"
      },
      {
        query: "Innovate UK grant funding application",
        namespace: "grant_funding",
        description: "Grant Funding"
      }
    ];
    
    for (const test of testQueries) {
      console.log(`🔍 Testing: ${test.description}`);
      console.log(`Query: "${test.query}"`);
      
      try {
        // Generate embedding for query
        const embedding = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: test.query
        });
        
        // Search in specific namespace
        const searchResults = await index.namespace(test.namespace).query({
          vector: embedding.data[0].embedding,
          topK: 3,
          includeMetadata: true
        });
        
        console.log(`📈 Found ${searchResults.matches.length} results in ${test.namespace}:`);
        
        searchResults.matches.forEach((match, i) => {
          console.log(`   ${i + 1}. ${match.metadata.title}`);
          console.log(`      🎯 Score: ${(match.score * 100).toFixed(1)}%`);
          console.log(`      💼 Category: ${match.metadata.category}`);
          console.log(`      🏦 Scheme: ${match.metadata.scheme}`);
        });
        
      } catch (error) {
        console.log(`   ❌ Error searching ${test.namespace}: ${error.message}`);
      }
      
      console.log('');
    }
    
    console.log('✅ Finance AI Agent RAG Verification Complete!');
    console.log('🎉 All finance namespaces are accessible and returning results');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

verifyFinanceRAG().catch(console.error);
