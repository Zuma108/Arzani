import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';

// Promisify exec for async/await usage
const execAsync = promisify(exec);

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
    this.dockerAvailable = false;
    this.initialize();
  }

  /**
   * Check if Docker is available (disabled - not needed for MCP)
   * @returns {Promise<boolean>} Always returns false since we use MCP
   */
  async checkDockerAvailability() {
    // Docker not needed when using MCP
    return false;
  }

  /**
   * Initialize the Pinecone client
   */
  async initialize() {
    try {
      // Check if API key is available
      if (!process.env.PINECONE_API_KEY) {
        console.error('PINECONE_API_KEY not found in environment variables');
        return;
      }

      // Check Docker availability
      this.dockerAvailable = await this.checkDockerAvailability();
      
      // Initialize the Pinecone client - no environment parameter needed in newer SDK
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

      // Check if Docker is required but not available
      if (!this.dockerAvailable && options.requireDocker) {
        throw new Error('Docker is required but not available');
      }

      const dimension = options.dimension || 1536; // Default to OpenAI embedding dimension
      const metric = options.metric || 'cosine';
      const indexName = options.indexName || this.indexName;

      // Check if index already exists
      let indexList;
      try {
        indexList = await this.client.listIndexes();
        console.log('Index list returned by Pinecone:', indexList);
      } catch (listError) {
        console.error('Error listing Pinecone indexes:', listError);
        throw listError;
      }
      
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
      const createOptions = {
        name: indexName,
        dimension: dimension,
        metric: metric
      };
      
      // Only add serverless spec if Docker is available or we're using cloud environment
      if (this.dockerAvailable || process.env.PINECONE_ENVIRONMENT) {
        createOptions.spec = { 
          serverless: { 
            cloud: process.env.PINECONE_CLOUD || 'aws', 
            region: process.env.PINECONE_REGION || 'us-east-1' 
          }
        };
      }
      
      await this.client.createIndex(createOptions);

      console.log(`Index '${indexName}' created successfully`);
      return this.client.index(indexName);
    } catch (error) {
      console.error('Error creating Pinecone index:', error);
      if (error.message?.includes('docker')) {
        console.error('Docker-related error detected. Please ensure Docker Desktop is running.');
      }
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
      
      // Add additional logging for debugging
      console.log(`Getting Pinecone index: ${indexName}`);
      
      return this.client.index(indexName);
    } catch (error) {
      console.error(`Error getting Pinecone index '${indexName}':`, error);
      if (error.message?.includes('docker')) {
        console.error('Docker-related error detected. Please ensure Docker Desktop is running.');
      }
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

      // Check Docker availability if not already checked
      if (this.dockerAvailable === undefined) {
        this.dockerAvailable = await this.checkDockerAvailability();
      }
      
      // Check if Docker is required but not available
      if (!this.dockerAvailable && options.requireDocker) {
        throw new Error('Docker is required but not available for upsert operation');
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
      if (error.message?.includes('docker')) {
        console.error('Docker-related error detected. Please ensure Docker Desktop is running.');
      }
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

      // Check Docker availability if not already checked
      if (this.dockerAvailable === undefined) {
        this.dockerAvailable = await this.checkDockerAvailability();
      }
      
      // Check if Docker is required but not available
      if (!this.dockerAvailable && options.requireDocker) {
        throw new Error('Docker is required but not available for query operation');
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
      if (error.message?.includes('docker')) {
        console.error('Docker-related error detected. Please ensure Docker Desktop is running.');
      }
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

      // Check Docker availability if not already checked
      if (this.dockerAvailable === undefined) {
        this.dockerAvailable = await this.checkDockerAvailability();
      }
      
      // Check if Docker is required but not available
      if (!this.dockerAvailable && options.requireDocker) {
        throw new Error('Docker is required but not available for delete operation');
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
      if (error.message?.includes('docker')) {
        console.error('Docker-related error detected. Please ensure Docker Desktop is running.');
      }
      throw error;
    }
  }

  /**
   * Perform a health check on the Pinecone connection
   * @returns {Promise<boolean>} True if healthy, false otherwise
   */
  async healthCheck() {
    try {
      if (!this.client) {
        // Client not initialized - using MCP instead
        return false;
      }

      // List indexes to verify connection
      const indexes = await this.client.listIndexes();
      
      // Different SDK versions return different response types
      if (Array.isArray(indexes)) {
        return indexes.some(idx => idx.name === this.indexName);
      } else if (indexes && typeof indexes === 'object') {
        return Object.keys(indexes).includes(this.indexName);
      }
      
      return false;
    } catch (error) {
      console.error('Pinecone health check failed:', error);
      return false;
    }
  }
}

export default new PineconeService();