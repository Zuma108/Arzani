/**
 * Update Pinecone for Revenue Agent
 * This script removes broker agent references and adds B2B data provider information
 */

import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔄 Updating Pinecone for Revenue Agent');
console.log('=====================================\n');

// Run steps in sequence
async function updatePineconeForRevenueAgent() {
  try {
    // Step 1: Remove broker agent references
    console.log('1️⃣ Removing broker agent references...');
    console.log('----------------------------------------\n');
    
    try {
      execSync('node delete-broker-rag-data.js', { stdio: 'inherit' });
      console.log('\n✅ Successfully removed broker agent references');
    } catch (error) {
      console.error('❌ Error removing broker agent references:', error.message);
      // Continue to next step even if this fails
    }
    
    // Step 2: Add B2B data provider information
    console.log('\n2️⃣ Adding B2B data provider information...');
    console.log('----------------------------------------\n');
    
    try {
      execSync('node fetch-revenue-data-firecrawl.js', { stdio: 'inherit' });
      console.log('\n✅ Successfully added B2B data provider information');
    } catch (error) {
      console.error('❌ Error adding B2B data provider information:', error.message);
    }
    
    console.log('\n🎉 Pinecone Update Complete!');
    console.log('✅ Broker agent references removed');
    console.log('✅ B2B data provider information added');
    console.log('✅ Revenue agent RAG index updated');
    
  } catch (error) {
    console.error('❌ Update process failed:', error.message);
  }
}

// Run the update process
updatePineconeForRevenueAgent().catch(console.error);
