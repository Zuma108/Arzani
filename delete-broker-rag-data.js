/**
 * Delete Broker Agent References from Pinecone
 * This script identifies and removes all broker agent references from the Pinecone index
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import pineconeService from './services/pineconeService.js';

dotenv.config();

console.log('🗑️  Removing Broker Agent References from Pinecone');
console.log('================================================\n');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// List of broker-related terms to search for
const brokerTerms = [
  'broker agent',
  'business broker',
  'M&A broker',
  'mergers and acquisitions broker',
  'broker services',
  'dealmaker',
  'intermediary',
  'business sale broker',
  'sell-side advisor'
];

/**
 * Search for broker-related content across all namespaces
 */
async function findBrokerReferences() {
  try {
    console.log('🔍 Searching for broker references across all namespaces...\n');
    
    // Get the Pinecone index
    const index = pineconeService.getIndex();
    
    // List of vectors to delete
    const vectorsToDelete = new Map();
    
    // Get all namespaces from the index stats
    console.log('📊 Retrieving index statistics...');
    const indexStats = await index.describeIndexStats();
    const namespaces = Object.keys(indexStats.namespaces || {});
    
    console.log(`✅ Found ${namespaces.length} namespaces`);
    
    // Process each namespace
    for (const namespace of namespaces) {
      console.log(`\n📁 Searching namespace: ${namespace}`);
      
      // Search for each broker term
      for (const term of brokerTerms) {
        // Generate embedding for the broker term
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: term
        });
        
        const queryVector = embeddingResponse.data[0].embedding;
        
        // Search for similar vectors
        const searchResults = await pineconeService.queryVectors({
          queryVector: queryVector,
          topK: 20,
          namespace: namespace,
          includeMetadata: true
        });
        
        if (searchResults && searchResults.matches && searchResults.matches.length > 0) {
          console.log(`   🔎 Found ${searchResults.matches.length} potential matches for "${term}"`);
          
          // Process each match
          for (const match of searchResults.matches) {
            // Only consider matches with a score above threshold
            if (match.score >= 0.7) {
              // Check if metadata contains broker-related text
              let isBrokerContent = false;
              
              if (match.metadata && match.metadata.search_text) {
                const searchText = match.metadata.search_text.toLowerCase();
                
                // Check if any broker term is present in the text
                isBrokerContent = brokerTerms.some(term => 
                  searchText.includes(term.toLowerCase())
                );
                
                // Additional check for broker agent mentions
                if (!isBrokerContent && searchText.includes('broker') && 
                    (searchText.includes('agent') || searchText.includes('service') || 
                     searchText.includes('advisor') || searchText.includes('intermediary'))) {
                  isBrokerContent = true;
                }
              }
              
              if (isBrokerContent) {
                // Add to the list of vectors to delete
                const key = `${namespace}:${match.id}`;
                if (!vectorsToDelete.has(key)) {
                  vectorsToDelete.set(key, {
                    id: match.id,
                    namespace: namespace,
                    score: match.score,
                    metadata: match.metadata
                  });
                  
                  console.log(`   ✅ Marked for deletion: ${match.id} (Score: ${match.score.toFixed(2)})`);
                }
              }
            }
          }
        } else {
          console.log(`   ℹ️  No matches found for "${term}" in namespace "${namespace}"`);
        }
      }
    }
    
    return Array.from(vectorsToDelete.values());
  } catch (error) {
    console.error('❌ Error searching for broker references:', error);
    return [];
  }
}

/**
 * Delete broker references from Pinecone
 */
async function deleteBrokerReferences() {
  try {
    console.log('\n🚀 Starting broker reference removal process...\n');
    
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
    
    // Step 2: Find broker references
    console.log('2️⃣ Finding broker references...');
    const brokerReferences = await findBrokerReferences();
    
    if (brokerReferences.length === 0) {
      console.log('ℹ️  No broker references found to delete.');
      return;
    }
    
    console.log(`\n3️⃣ Found ${brokerReferences.length} broker references to delete.`);
    
    // Group vectors by namespace for efficient deletion
    const namespaceGroups = new Map();
    
    for (const ref of brokerReferences) {
      if (!namespaceGroups.has(ref.namespace)) {
        namespaceGroups.set(ref.namespace, []);
      }
      
      namespaceGroups.get(ref.namespace).push(ref.id);
    }
    
    // Step 3: Delete references
    console.log('🗑️  Deleting broker references...');
    
    for (const [namespace, ids] of namespaceGroups.entries()) {
      console.log(`   📁 Namespace: ${namespace} - Deleting ${ids.length} vectors`);
      
      try {
        const deleteResult = await pineconeService.deleteVectors({
          ids: ids,
          namespace: namespace
        });
        
        console.log(`   ✅ Successfully deleted ${ids.length} vectors from namespace "${namespace}"`);
      } catch (error) {
        console.error(`   ❌ Error deleting vectors from namespace "${namespace}":`, error.message);
      }
    }
    
    console.log('\n🎉 Broker Reference Removal Complete!');
    console.log('\n📋 Summary:');
    console.log(`✅ Total broker references removed: ${brokerReferences.length}`);
    console.log(`✅ Namespaces affected: ${namespaceGroups.size}`);
    
  } catch (error) {
    console.error('❌ Process failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Add timeout and run
console.log('⏱️  Script timeout: 180 seconds\n');
setTimeout(() => {
  console.log('\n⏰ Script timed out - may need to investigate connection issues');
  process.exit(1);
}, 180000);

deleteBrokerReferences().catch(console.error);
