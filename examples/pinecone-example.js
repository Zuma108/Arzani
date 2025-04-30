import pineconeService from '../services/pineconeService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Example script demonstrating how to use Pinecone for similarity search in your marketplace
 * 
 * This example shows:
 * 1. Creating an index if it doesn't exist
 * 2. Upserting business data as vector embeddings
 * 3. Performing a similarity search
 * 
 * To run this example:
 * node examples/pinecone-example.js
 */
async function runPineconeExample() {
  try {
    console.log('Starting Pinecone example...');
    
    // Step 1: Create a new index (if it doesn't exist)
    const indexName = 'marketplace-demo';
    const dimension = 2; // Using small dimension for demo purposes
    
    // Create the index
    console.log(`Creating index '${indexName}' if it doesn't exist...`);
    const index = await pineconeService.createIndex({
      indexName,
      dimension,
      metric: 'cosine'
    });
    
    console.log('Index ready');
    
    // Step 2: Prepare some sample business data vectors
    // In a real application, these would be embeddings from OpenAI or similar
    const sampleBusinesses = [
      {
        id: 'business-001',
        vector: [0.1, 0.9],  // Vector representation
        metadata: {
          title: 'Coffee Shop',
          category: 'Food & Beverage',
          price: 120000,
          location: 'London',
          description: 'Popular coffee shop in downtown area'
        }
      },
      {
        id: 'business-002',
        vector: [0.8, 0.2],
        metadata: {
          title: 'Tech Startup',
          category: 'Technology',
          price: 500000,
          location: 'Manchester',
          description: 'SaaS company with established customer base'
        }
      },
      {
        id: 'business-003',
        vector: [0.2, 0.8],
        metadata: {
          title: 'Bakery',
          category: 'Food & Beverage',
          price: 95000,
          location: 'Brighton',
          description: 'Artisan bakery with loyal customers'
        }
      }
    ];
    
    // Step 3: Upsert the vectors to Pinecone
    console.log('Upserting sample business data to Pinecone...');
    
    // Format data for Pinecone upsert
    const vectors = sampleBusinesses.map(business => ({
      id: business.id,
      values: business.vector,
      metadata: business.metadata
    }));
    
    const upsertResult = await pineconeService.upsertVectors({
      vectors,
      indexName
    });
    
    console.log('Upsert result:', upsertResult);
    
    // Step 4: Perform a similarity search
    console.log('\nPerforming similarity search...');
    
    // This vector is similar to the Coffee Shop (sample query for "Food & Beverage" businesses)
    const queryVector = [0.15, 0.85];
    
    const searchResults = await pineconeService.queryVectors({
      queryVector,
      topK: 2,
      indexName
    });
    
    console.log('Search results:');
    console.log(JSON.stringify(searchResults, null, 2));
    
    console.log('\nPinecone example completed successfully!');
  } catch (error) {
    console.error('Error in Pinecone example:', error);
  }
}

// Run the example
runPineconeExample();