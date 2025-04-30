import express from 'express';
import pineconeService from '../services/pineconeService.js';
import OpenAI from 'openai';
import { authenticateToken as authenticate } from '../middleware/auth.js';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

// Initialize OpenAI client with API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Simple rate limiter class
class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.requests = new Map();
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  // Create middleware function
  middleware() {
    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress;
      const now = Date.now();
      const windowStart = now - this.windowMs;
      
      if (!this.requests.has(ip)) {
        this.requests.set(ip, []);
      }
      
      // Remove old requests outside current window
      const recentRequests = this.requests.get(ip).filter(time => time > windowStart);
      
      // Check if maxRequests limit is reached
      if (recentRequests.length >= this.maxRequests) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests, please try again later.'
        });
      }
      
      // Add current request
      recentRequests.push(now);
      this.requests.set(ip, recentRequests);
      
      next();
    };
  }
}

const searchLimiter = new RateLimiter(10, 60000); // 10 requests per minute

/**
 * Generate vector embeddings from text using OpenAI
 * @param {string} text - The text to convert to a vector embedding
 * @returns {Promise<Array>} The vector embedding
 */
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * @route POST /api/vector-search/index-business
 * @desc Index a business listing in Pinecone
 * @access Private
 */
router.post('/index-business', authenticate, async (req, res) => {
  try {
    const { businessId, title, description, category, location, price } = req.body;
    
    if (!businessId || !title || !description) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields (businessId, title, description)' 
      });
    }

    // Combine fields to create a rich text representation
    const textToEmbed = `${title}. ${description}. Category: ${category}. Location: ${location}.`;
    
    // Generate vector embedding from business details
    const embedding = await generateEmbedding(textToEmbed);
    
    // Store the embedding in Pinecone
    const vectorData = {
      id: businessId,
      values: embedding,
      metadata: {
        title,
        description,
        category,
        location,
        price: parseFloat(price) || 0,
        userId: req.user.userId // From auth middleware
      }
    };
    
    const result = await pineconeService.upsertVectors({
      vectors: [vectorData]
    });
    
    res.status(200).json({
      success: true,
      message: 'Business indexed successfully',
      result
    });
    
  } catch (error) {
    console.error('Error indexing business:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to index business',
      error: error.message
    });
  }
});

/**
 * @route POST /api/vector-search/similar-businesses
 * @desc Find similar businesses based on text description
 * @access Public (with rate limiting)
 */
router.post('/similar-businesses', searchLimiter.middleware(), async (req, res) => {
  try {
    const { query, category, maxPrice, minPrice, location, limit = 10 } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        message: 'Search query is required' 
      });
    }

    // Generate embedding from search query
    const queryEmbedding = await generateEmbedding(query);
    
    // Build filter based on optional parameters
    let filter = {};
    
    if (category) {
      filter.category = { $eq: category };
    }
    
    if (maxPrice !== undefined) {
      filter.price = { ...(filter.price || {}), $lte: parseFloat(maxPrice) };
    }
    
    if (minPrice !== undefined) {
      filter.price = { ...(filter.price || {}), $gte: parseFloat(minPrice) };
    }
    
    if (location) {
      filter.location = { $eq: location };
    }
    
    // Perform vector search
    const searchResults = await pineconeService.queryVectors({
      queryVector: queryEmbedding,
      topK: parseInt(limit),
      filter: Object.keys(filter).length > 0 ? filter : undefined
    });
    
    res.status(200).json({
      success: true,
      results: searchResults.matches.map(match => ({
        businessId: match.id,
        similarity: match.score,
        ...match.metadata
      }))
    });
    
  } catch (error) {
    console.error('Error searching similar businesses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search for similar businesses',
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/vector-search/business/:id
 * @desc Remove a business from the vector index
 * @access Private
 */
router.delete('/business/:id', authenticate, async (req, res) => {
  try {
    const businessId = req.params.id;
    
    // Optional: Verify the user owns this business before deleting
    // (implementation depends on your database structure)
    
    const result = await pineconeService.deleteVectors({
      ids: [businessId]
    });
    
    res.status(200).json({
      success: true,
      message: 'Business removed from index',
      result
    });
    
  } catch (error) {
    console.error('Error removing business from index:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove business from index',
      error: error.message
    });
  }
});

/**
 * @route GET /api/vector-search/status
 * @desc Check Pinecone service status
 * @access Public
 */
router.get('/status', async (req, res) => {
  try {
    const indexName = process.env.PINECONE_INDEX_NAME || 'marketplace-index';
    const index = pineconeService.getIndex(indexName);
    const stats = await index.describeIndexStats();
    
    res.status(200).json({
      success: true,
      message: 'Pinecone service is operational',
      stats
    });
  } catch (error) {
    console.error('Error checking Pinecone status:', error);
    res.status(500).json({
      success: false,
      message: 'Pinecone service error',
      error: error.message
    });
  }
});

export default router;