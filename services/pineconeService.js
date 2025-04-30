import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Pinecone service for vector embeddings and similarity search
 * This service handles integration with Pinecone for storing and 
 * retrieving vector embeddings for the marketplace
 */
class PineconeService {
  constructor() {
    this.client = null;
    this.indexName = process.env.PINECONE_INDEX_NAME || 'marketplace-index';
    this.initialize();
  }

  /**
   * Initialize the Pinecone client
   */
  initialize() {
    try {
      // Check if API key is available
      if (!process.env.PINECONE_API_KEY) {
        console.error('PINECONE_API_KEY not found in environment variables');
        return;
      }

      // Initialize the Pinecone client
      this.client = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY
      });

      console.log('Pinecone client initialized successfully');
    } catch (error) {
      console.error('Error initializing Pinecone client:', error);
    }
  }

  /**
   * Create a new Pinecone index
   * @param {Object} options - Index creation options
   * @param {number} options.dimension - Vector dimension size
   * @param {string} options.metric - Distance metric (e.g., 'cosine', 'euclidean')
   * @param {string} options.indexName - Optional custom index name
   * @returns {Promise} Promise resolving to the created index
   */
  async createIndex(options = {}) {
    try {
      if (!this.client) {
        throw new Error('Pinecone client not initialized');
      }

      const dimension = options.dimension || 1536; // Default to OpenAI embedding dimension
      const metric = options.metric || 'cosine';
      const indexName = options.indexName || this.indexName;

      // Check if index already exists
      const indexList = await this.client.listIndexes();
      console.log('Index list returned by Pinecone:', indexList);
      
      // Handle different responses from listIndexes() based on Pinecone SDK version
      let indexExists = false;
      
      if (Array.isArray(indexList)) {
        // Handle array response (older SDK version)
        indexExists = indexList.some(idx => idx.name === indexName);
      } else if (indexList && typeof indexList === 'object') {
        // Handle object response (newer SDK version)
        indexExists = Object.keys(indexList).includes(indexName);
      }
      
      if (indexExists) {
        console.log(`Index '${indexName}' already exists. Skipping creation.`);
        return this.client.index(indexName);
      }

      console.log(`Creating new Pinecone index: ${indexName}`);
      await this.client.createIndex({
        name: indexName,
        dimension: dimension,
        metric: metric,
        spec: { 
          serverless: { 
            cloud: 'aws', 
            region: 'us-east-1' 
          }
        }
      });

      console.log(`Index '${indexName}' created successfully`);
      return this.client.index(indexName);
    } catch (error) {
      console.error('Error creating Pinecone index:', error);
      throw error;
    }
  }

  /**
   * Get a reference to an existing index
   * @param {string} indexName - Name of the index to retrieve
   * @returns {Object} Pinecone index object
   */
  getIndex(indexName = this.indexName) {
    try {
      if (!this.client) {
        throw new Error('Pinecone client not initialized');
      }
      return this.client.index(indexName);
    } catch (error) {
      console.error(`Error getting Pinecone index '${indexName}':`, error);
      throw error;
    }
  }

  /**
   * Upsert vectors to the specified index
   * @param {Object} options - Upsert options
   * @param {Array} options.vectors - Array of vector objects to upsert
   * @param {string} options.indexName - Optional custom index name
   * @returns {Promise} Promise resolving to the upsert response
   */
  async upsertVectors(options) {
    try {
      if (!this.client) {
        throw new Error('Pinecone client not initialized');
      }

      if (!options.vectors || !Array.isArray(options.vectors)) {
        throw new Error('Invalid vectors array provided');
      }

      const indexName = options.indexName || this.indexName;
      const index = this.getIndex(indexName);
      const namespace = options.namespace || '';

      const response = await index.upsert({
        vectors: options.vectors,
        namespace
      });

      return response;
    } catch (error) {
      console.error('Error upserting vectors:', error);
      throw error;
    }
  }

  /**
   * Query vectors from the specified index
   * @param {Object} options - Query options
   * @param {Array} options.queryVector - The query vector
   * @param {number} options.topK - Number of results to return
   * @param {string} options.indexName - Optional custom index name
   * @returns {Promise} Promise resolving to the query response
   */
  async queryVectors(options) {
    try {
      if (!this.client) {
        throw new Error('Pinecone client not initialized');
      }

      if (!options.queryVector) {
        throw new Error('Query vector is required');
      }

      const indexName = options.indexName || this.indexName;
      const index = this.getIndex(indexName);
      const topK = options.topK || 10;
      const namespace = options.namespace || '';
      const includeMetadata = options.includeMetadata !== false;
      const includeValues = options.includeValues || false;

      const response = await index.query({
        vector: options.queryVector,
        topK,
        namespace,
        includeMetadata,
        includeValues
      });

      return response;
    } catch (error) {
      console.error('Error querying vectors:', error);
      throw error;
    }
  }

  /**
   * Delete vectors from the specified index
   * @param {Object} options - Delete options
   * @param {Array} options.ids - Array of vector IDs to delete
   * @param {string} options.indexName - Optional custom index name
   * @returns {Promise} Promise resolving to the delete response
   */
  async deleteVectors(options) {
    try {
      if (!this.client) {
        throw new Error('Pinecone client not initialized');
      }

      if (!options.ids || !Array.isArray(options.ids)) {
        throw new Error('Invalid vector IDs array provided');
      }

      const indexName = options.indexName || this.indexName;
      const index = this.getIndex(indexName);
      const namespace = options.namespace || '';

      const response = await index.deleteMany({
        ids: options.ids,
        namespace
      });

      return response;
    } catch (error) {
      console.error('Error deleting vectors:', error);
      throw error;
    }
  }
}

export default new PineconeService();