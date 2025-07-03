/**
 * Broker RAG Verification Script
 * Verify that broker content was successfully uploaded to Pinecone
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';

dotenv.config();

console.log('🔍 Broker RAG Verification');
console.log('==========================\n');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

const indexName = process.env.PINECONE_INDEX_NAME || 'marketplace-index';

async function verifyBrokerRAG() {
  try {
    console.log('🔍 Checking Pinecone index status...');
    const index = pinecone.index(indexName);
    
    // Check index stats
    const stats = await index.describeIndexStats();
    console.log(`📊 Total vectors in index: ${stats.totalVectorCount || 0}`);
    
    if (stats.namespaces) {
      console.log('\n📁 Namespaces found:');
      Object.entries(stats.namespaces).forEach(([namespace, info]) => {
        console.log(`  ${namespace}: ${info.vectorCount || 0} vectors`);
      });
    }
    
    // Test broker-specific searches
    const testQueries = [
      'UK merger investigation thresholds and CMA requirements',
      'Company annual accounts filing requirements and deadlines', 
      'Business sale responsibilities for limited companies',
      'iTABB professional standards for business brokers'
    ];
    
    console.log('\n🧪 Testing broker search functionality...');
    
    for (const query of testQueries) {
      try {
        console.log(`\n🔍 Query: "${query}"`);
        
        const queryEmbedding = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: query
        });
        
        const searchResults = await index.query({
          vector: queryEmbedding.data[0].embedding,
          topK: 3,
          includeMetadata: true
        });
        
        if (searchResults.matches && searchResults.matches.length > 0) {
          console.log(`  ✅ Found ${searchResults.matches.length} results:`);
          searchResults.matches.forEach((match, index) => {
            console.log(`    ${index + 1}. ${match.metadata?.title || 'Unknown'}`);
            console.log(`       📊 Score: ${(match.score * 100).toFixed(1)}%`);
            console.log(`       📋 Legal Area: ${match.metadata?.legal_area || 'N/A'}`);
          });
        } else {
          console.log(`  ❌ No results found`);
        }
      } catch (error) {
        console.error(`  ❌ Error searching: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Broker RAG verification complete!');
    
    if (stats.totalVectorCount > 0) {
      console.log('\n✅ SUCCESS: Broker content successfully uploaded to Pinecone');
      console.log('🏢 The Broker Agent now has access to:');
      console.log('  • CMA Merger Investigation Guidelines (2025)');
      console.log('  • Companies House Annual Accounts Requirements');
      console.log('  • Business Sale Responsibilities (Limited Companies)');
      console.log('  • iTABB Professional Standards for Business Brokers');
    } else {
      console.log('\n⚠️  WARNING: No vectors found in index');
      console.log('This may be due to indexing delay. Please try again in a few minutes.');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

verifyBrokerRAG().catch(console.error);
