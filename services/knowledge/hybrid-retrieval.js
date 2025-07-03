/**
 * Hybrid Knowledge Retrieval System - Enhanced with Direct MCP Integration
 * 
 * Combines Firecrawl MCP (web scraping), Pinecone MCP (vector search), and Brave Search
 * with knowledge mapping and sequential thinking for AI agents.
 * 
 * Features:
 * - Direct MCP tool integration (no local servers required)
 * - Firecrawl MCP for enhanced web content extraction
 * - Pinecone MCP for vector knowledge retrieval
 * - Sequential thinking for query optimization
 * - Knowledge pattern learning and memory
 * - Agent-specific optimization strategies
 * - Multi-source result ranking and deduplication
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

// Initialize OpenAI for embeddings
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Agent-specific knowledge namespaces for targeted retrieval
 */
const AGENT_NAMESPACES = {
  legal: ['legal_guidance', 'companies_house', 'cma_mergers', 'compliance-tax', 'uk_legal_frameworks'],
  finance: ['financial-planning', 'business_finance', 'efg_scheme', 'startup_loans', 'funding-investment', 'tax_planning'],
  revenue: ['revenue-growth', 'grant_funding', 'data-providers', 'industry_standards', 'market_analysis'],
  orchestrator: [] // Can access all namespaces
};

/**
 * Default confidence thresholds for each agent type
 */
const DEFAULT_CONFIDENCE_THRESHOLDS = {
  legal: 0.75,      // High threshold for legal accuracy
  finance: 0.70,    // High threshold for financial advice
  revenue: 0.65,    // Medium threshold for business insights
  orchestrator: 0.60 // Lower threshold for general coordination
};

/**
 * Knowledge Memory Map for learning retrieval patterns
 */
class KnowledgeMemoryMap {
  constructor() {
    this.queryPatterns = new Map();
    this.agentPreferences = new Map();
    this.sourcePerformance = new Map();
    this.userContexts = new Map();
    this.confidenceHistory = [];
  }

  /**
   * Record a successful retrieval pattern
   */
  recordSuccessfulPattern(query, agentType, sources, confidence, userFeedback = null) {
    const patternKey = this.generatePatternKey(query, agentType);
    const pattern = {
      query: query.substring(0, 200),
      agentType,
      sources,
      confidence,
      userFeedback,
      timestamp: new Date().toISOString(),
      successCount: 1
    };

    if (this.queryPatterns.has(patternKey)) {
      const existing = this.queryPatterns.get(patternKey);
      existing.successCount++;
      existing.confidence = (existing.confidence + confidence) / 2; // Running average
      existing.timestamp = new Date().toISOString();
    } else {
      this.queryPatterns.set(patternKey, pattern);
    }

    // Update agent preferences
    this.updateAgentPreferences(agentType, sources, confidence);
    
    // Track confidence history for adaptive thresholds
    this.confidenceHistory.push({ agentType, confidence, timestamp: Date.now() });
    if (this.confidenceHistory.length > 1000) {
      this.confidenceHistory.shift(); // Keep only recent history
    }
  }

  /**
   * Update agent preferences based on successful retrievals
   */
  updateAgentPreferences(agentType, sources, confidence) {
    if (!this.agentPreferences.has(agentType)) {
      this.agentPreferences.set(agentType, { sourceWeights: new Map(), avgConfidence: 0, totalQueries: 0 });
    }

    const prefs = this.agentPreferences.get(agentType);
    prefs.totalQueries++;
    prefs.avgConfidence = (prefs.avgConfidence * (prefs.totalQueries - 1) + confidence) / prefs.totalQueries;

    sources.forEach(source => {
      const currentWeight = prefs.sourceWeights.get(source) || 0;
      prefs.sourceWeights.set(source, currentWeight + confidence);
    });
  }

  /**
   * Generate pattern key for query classification
   */
  generatePatternKey(query, agentType) {
    const keywords = query.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 5)
      .sort()
      .join('-');
    return `${agentType}-${keywords}`;
  }

  /**
   * Get similar patterns for query optimization
   */
  getSimilarPatterns(query, agentType, limit = 3) {
    const patternKey = this.generatePatternKey(query, agentType);
    const similar = [];
    
    for (const [key, pattern] of this.queryPatterns) {
      if (key.startsWith(agentType) && key !== patternKey) {
        // Simple similarity based on keyword overlap
        const similarity = this.calculatePatternSimilarity(patternKey, key);
        if (similarity > 0.3) {
          similar.push({ ...pattern, similarity });
        }
      }
    }

    return similar
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Calculate similarity between pattern keys
   */
  calculatePatternSimilarity(key1, key2) {
    const words1 = new Set(key1.split('-'));
    const words2 = new Set(key2.split('-'));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size;
  }

  /**
   * Get adaptive confidence threshold for agent
   */
  getAdaptiveThreshold(agentType) {
    const recentHistory = this.confidenceHistory
      .filter(h => h.agentType === agentType && Date.now() - h.timestamp < 86400000) // Last 24 hours
      .map(h => h.confidence);

    if (recentHistory.length < 5) {
      return DEFAULT_CONFIDENCE_THRESHOLDS[agentType] || 0.65;
    }

    const avgConfidence = recentHistory.reduce((sum, c) => sum + c, 0) / recentHistory.length;
    const defaultThreshold = DEFAULT_CONFIDENCE_THRESHOLDS[agentType] || 0.65;
    
    // Adjust threshold based on recent performance (±0.1 range)
    return Math.max(0.4, Math.min(0.8, avgConfidence * 0.8 + defaultThreshold * 0.2));
  }
}

/**
 * Result ranking and confidence scoring system
 */
class ResultRanker {
  constructor() {
    this.sourceWeights = {
      user_document: 1.0,      // Highest priority - user's own documents
      static_knowledge: 0.8,   // High priority - curated knowledge base
      brave_search: 0.6,       // Medium priority - real-time web search
      fallback: 0.3           // Lowest priority - static fallback responses
    };
  }

  /**
   * Combine and rank results from multiple sources
   */
  combineAndRankResults(results, query, maxResults = 10) {
    const allResults = [];

    // Process each source type
    ['userDocuments', 'staticKnowledge', 'braveSearch', 'fallback'].forEach(sourceType => {
      if (results[sourceType] && Array.isArray(results[sourceType])) {
        results[sourceType].forEach(result => {
          allResults.push({
            ...result,
            sourceType,
            weight: this.sourceWeights[result.source] || this.sourceWeights[sourceType] || 0.5,
            combinedScore: this.calculateCombinedScore(result, query, sourceType)
          });
        });
      }
    });

    // Deduplicate similar results
    const deduplicated = this.deduplicateResults(allResults);

    // Sort by combined score and return top results
    return deduplicated
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, maxResults);
  }

  /**
   * Calculate combined score considering relevance, recency, and source weight
   */
  calculateCombinedScore(result, query, sourceType) {
    const relevanceScore = result.score || 0.5;
    const sourceWeight = this.sourceWeights[sourceType] || 0.5;
    
    // Recency bonus for time-sensitive content
    let recencyBonus = 1.0;
    if (result.metadata?.timestamp || result.metadata?.upload_date) {
      const timestamp = new Date(result.metadata.timestamp || result.metadata.upload_date);
      const daysSince = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60 * 24);
      recencyBonus = Math.max(0.8, 1.0 - (daysSince / 365)); // Decay over a year
    }

    // Content length bonus for substantial results
    let contentBonus = 1.0;
    if (result.content) {
      const contentLength = result.content.length;
      contentBonus = Math.min(1.2, 0.8 + (contentLength / 1000)); // Bonus for longer content
    }

    return relevanceScore * sourceWeight * recencyBonus * contentBonus;
  }

  /**
   * Remove duplicate or very similar results
   */
  deduplicateResults(results) {
    const deduplicated = [];
    const seenContent = new Set();

    for (const result of results) {
      const contentHash = this.generateContentHash(result.content || result.title || '');
      
      if (!seenContent.has(contentHash)) {
        seenContent.add(contentHash);
        
        // Check for very similar content
        const isSimilar = deduplicated.some(existing => 
          this.calculateContentSimilarity(result.content, existing.content) > 0.8
        );

        if (!isSimilar) {
          deduplicated.push(result);
        }
      }
    }

    return deduplicated;
  }

  /**
   * Generate simple hash for content deduplication
   */
  generateContentHash(content) {
    const normalized = content.toLowerCase().replace(/[^\w\s]/g, '').substring(0, 200);
    return normalized.split(/\s+/).filter(w => w.length > 3).slice(0, 10).join('-');
  }

  /**
   * Calculate similarity between two content strings
   */
  calculateContentSimilarity(content1, content2) {
    if (!content1 || !content2) return 0;
    
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
}

/**
 * Main Hybrid Knowledge Retrieval System
 */
export class HybridKnowledgeRetriever {
  constructor(options = {}) {
    this.options = {
      maxResults: options.maxResults || 10,
      enableMemoryLearning: options.enableMemoryLearning !== false,
      braveSearchEnabled: options.braveSearchEnabled !== false,
      cacheEmbeddings: options.cacheEmbeddings !== false,
      ...options
    };

    // Initialize MCP clients
    this.mcpClient = new PineconeMCPClient({
      mcpServerUrl: process.env.MCP_SERVER_URL,
      fallbackToSDK: true,
      healthCheckInterval: 30000
    });

    // Initialize knowledge systems
    this.memoryMap = new KnowledgeMemoryMap();
    this.resultRanker = new ResultRanker();
    
    // Performance tracking
    this.stats = {
      totalQueries: 0,
      cacheHits: 0,
      braveSearchRequests: 0,
      avgConfidence: 0,
      avgResponseTime: 0
    };
    
    // Embedding cache for performance
    this.embeddingCache = new Map();
    
    this.initialize();
  }

  /**
   * Initialize the hybrid retrieval system
   */
  async initialize() {
    console.log('🔍 Initializing Hybrid Knowledge Retrieval System...');
    
    try {
      // Initialize MCP client
      await this.mcpClient.initialize();
      
      // Setup event listeners for monitoring
      this.mcpClient.on('operation_completed', (event) => {
        console.log(`📊 Pinecone operation: ${event.method} via ${event.provider} (success: ${event.success})`);
      });
      
      this.mcpClient.on('health_check', (status) => {
        if (!status.mcpConnected && !status.sdkAvailable) {
          console.error('⚠️  All Pinecone providers are unavailable!');
        }
      });
      
      console.log('✅ Hybrid Knowledge Retrieval System initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Hybrid Knowledge Retrieval System:', error);
      throw error;
    }
  }

  /**
   * Main retrieval method - combines all knowledge sources intelligently
   */
  async retrieveKnowledge(query, agentType, userId = null, options = {}) {
    const startTime = Date.now();
    this.stats.totalQueries++;
    
    const {
      maxResults = this.options.maxResults,
      includeUserDocs = true,
      forceBraveSearch = false,
      confidenceThreshold = null
    } = options;

    console.log(`🔍 Retrieving knowledge for ${agentType} agent: "${query.substring(0, 100)}..."`);

    // Check for similar patterns in memory
    const similarPatterns = this.memoryMap.getSimilarPatterns(query, agentType);
    if (similarPatterns.length > 0) {
      console.log(`🧠 Found ${similarPatterns.length} similar patterns in memory`);
    }

    const results = {
      userDocuments: [],
      staticKnowledge: [],
      braveSearch: [],
      fallback: [],
      confidence: 0,
      strategy: 'hybrid'
    };

    try {
      // Step 1: Query user-specific documents (highest priority)
      if (includeUserDocs && userId) {
        results.userDocuments = await this.queryUserDocuments(query, userId, agentType, maxResults);
        console.log(`📄 Found ${results.userDocuments.length} relevant user documents`);
      }

      // Step 2: Query static knowledge base using MCP client
      results.staticKnowledge = await this.queryStaticKnowledge(query, agentType, maxResults);
      console.log(`📚 Found ${results.staticKnowledge.length} relevant static knowledge entries`);

      // Step 3: Calculate confidence score
      results.confidence = this.calculateConfidence(results.userDocuments, results.staticKnowledge);
      
      // Get adaptive threshold for this agent
      const adaptiveThreshold = confidenceThreshold || this.memoryMap.getAdaptiveThreshold(agentType);
      
      // Step 4: Brave search fallback if confidence is low or forced
      if ((results.confidence < adaptiveThreshold || forceBraveSearch) && this.options.braveSearchEnabled) {
        console.log(`🌐 Confidence ${results.confidence.toFixed(2)} below threshold ${adaptiveThreshold.toFixed(2)}, triggering Brave search`);
        results.braveSearch = await this.performBraveSearch(query, agentType, maxResults);
        results.strategy = 'hybrid_with_search';
        this.stats.braveSearchRequests++;
      }

      // Step 5: Combine and rank all results
      const combinedResults = this.resultRanker.combineAndRankResults(results, query, maxResults);

      // Step 6: Learn from this interaction if memory learning is enabled
      if (this.options.enableMemoryLearning) {
        const sources = this.extractSourceTypes(results);
        this.memoryMap.recordSuccessfulPattern(query, agentType, sources, results.confidence);
      }

      // Update statistics
      const responseTime = Date.now() - startTime;
      this.updateStats(results.confidence, responseTime);

      console.log(`✅ Retrieved ${combinedResults.length} total knowledge items (confidence: ${results.confidence.toFixed(2)}, time: ${responseTime}ms)`);
      
      return {
        results: combinedResults,
        metadata: {
          confidence: results.confidence,
          strategy: results.strategy,
          responseTime,
          adaptiveThreshold,
          breakdown: {
            userDocs: results.userDocuments.length,
            staticKnowledge: results.staticKnowledge.length,
            braveSearch: results.braveSearch.length
          },
          similarPatterns: similarPatterns.length
        }
      };

    } catch (error) {
      console.error('❌ Error in hybrid knowledge retrieval:', error);
      
      // Fallback to basic responses
      results.fallback = this.generateFallbackResponses(query, agentType);
      const fallbackResults = this.resultRanker.combineAndRankResults(results, query, maxResults);
      
      return {
        results: fallbackResults,
        metadata: {
          confidence: 0.2,
          strategy: 'fallback_only',
          error: error.message,
          responseTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Query user-specific documents with enhanced error handling
   */
  async queryUserDocuments(query, userId, agentType, maxResults) {
    try {
      const userNamespace = `user_${userId}`;
      const queryEmbedding = await this.generateEmbedding(query);
      
      const queryResponse = await this.mcpClient.queryVectors({
        queryVector: queryEmbedding,
        topK: maxResults,
        namespace: userNamespace,
        includeMetadata: true,
        filter: {
          agent_type: { $in: [agentType, 'general'] }
        }
      });

      return queryResponse.matches?.map(match => ({
        content: match.metadata?.text || '',
        score: match.score,
        source: 'user_document',
        metadata: {
          ...match.metadata,
          document_type: match.metadata?.document_type || 'unknown',
          upload_date: match.metadata?.upload_date,
          provider: 'user_namespace'
        }
      })) || [];

    } catch (error) {
      console.error('❌ Error querying user documents:', error);
      return [];
    }
  }

  /**
   * Query static knowledge base using MCP client with namespace optimization
   */
  async queryStaticKnowledge(query, agentType, maxResults) {
    try {
      const namespaces = AGENT_NAMESPACES[agentType] || this.getAllNamespaces();
      const allResults = [];
      const queryEmbedding = await this.generateEmbedding(query);

      // Query each relevant namespace in parallel for better performance
      const namespacePromises = namespaces.map(async (namespace) => {
        try {
          const queryResponse = await this.mcpClient.queryVectors({
            queryVector: queryEmbedding,
            topK: Math.ceil(maxResults / namespaces.length) + 1,
            namespace: namespace,
            includeMetadata: true
          });

          return queryResponse.matches?.map(match => ({
            content: match.metadata?.text || '',
            score: match.score,
            source: 'static_knowledge',
            namespace: namespace,
            metadata: {
              ...match.metadata,
              knowledge_domain: namespace,
              source_url: match.metadata?.source_url,
              provider: queryResponse.provider || 'unknown'
            }
          })) || [];

        } catch (nsError) {
          console.warn(`⚠️ Error querying namespace ${namespace}:`, nsError.message);
          return [];
        }
      });

      const namespaceResults = await Promise.all(namespacePromises);
      namespaceResults.forEach(results => allResults.push(...results));

      // Sort by relevance score and return top results
      return allResults
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);

    } catch (error) {
      console.error('❌ Error querying static knowledge:', error);
      return [];
    }
  }

  /**
   * Perform Brave search with intelligent query optimization
   */
  async performBraveSearch(query, agentType, maxResults) {
    try {
      if (!mcpService.isReady()) {
        console.warn('⚠️ MCP service not ready, skipping Brave search');
        return [];
      }

      // Optimize query for better search results
      const optimizedQuery = this.optimizeSearchQuery(query, agentType);
      
      const searchResults = await mcpService.braveWebSearch(optimizedQuery, {
        count: Math.min(maxResults, 10),
        offset: 0
      });

      if (!searchResults || !Array.isArray(searchResults)) {
        console.warn('⚠️ Invalid Brave search response');
        return [];
      }

      return searchResults.map(result => ({
        content: result.description || result.snippet || '',
        title: result.title || '',
        score: this.calculateSearchRelevance(result, query),
        source: 'brave_search',
        metadata: {
          url: result.url,
          title: result.title,
          published_date: result.published_date,
          provider: 'brave_search',
          search_query: optimizedQuery
        }
      }));

    } catch (error) {
      console.error('❌ Error performing Brave search:', error);
      return [];
    }
  }

  /**
   * Optimize search query based on agent type and patterns
   */
  optimizeSearchQuery(query, agentType) {
    let optimized = query;

    // Add agent-specific context terms
    const contextTerms = {
      legal: ['UK law', 'legal requirements', 'compliance'],
      finance: ['UK business finance', 'financial planning', 'tax implications'],
      revenue: ['business growth', 'revenue optimization', 'market analysis'],
      orchestrator: ['business guidance', 'professional advice']
    };

    const terms = contextTerms[agentType] || contextTerms.orchestrator;
    const randomTerm = terms[Math.floor(Math.random() * terms.length)];
    
    // Add context if not already present
    if (!optimized.toLowerCase().includes(randomTerm.toLowerCase())) {
      optimized += ` ${randomTerm}`;
    }

    // Add UK context for legal and finance queries
    if ((agentType === 'legal' || agentType === 'finance') && !optimized.toLowerCase().includes('uk')) {
      optimized += ' UK';
    }

    return optimized;
  }

  /**
   * Calculate search result relevance score
   */
  calculateSearchRelevance(result, originalQuery) {
    let score = 0.5; // Base score

    const queryTerms = originalQuery.toLowerCase().split(/\s+/);
    const title = (result.title || '').toLowerCase();
    const description = (result.description || result.snippet || '').toLowerCase();

    // Title match bonus
    queryTerms.forEach(term => {
      if (title.includes(term)) score += 0.2;
      if (description.includes(term)) score += 0.1;
    });

    // URL quality bonus
    if (result.url) {
      const url = result.url.toLowerCase();
      if (url.includes('gov.uk') || url.includes('hmrc.gov.uk')) score += 0.3; // Official UK sources
      if (url.includes('companieshouse.gov.uk')) score += 0.2; // Companies House
      if (url.includes('fca.org.uk') || url.includes('ico.org.uk')) score += 0.2; // Regulatory bodies
    }

    // Recency bonus
    if (result.published_date) {
      const daysSince = (Date.now() - new Date(result.published_date).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 30) score += 0.1; // Recent content bonus
    }

    return Math.min(1.0, score);
  }

  /**
   * Generate embedding with caching for performance
   */
  async generateEmbedding(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text provided for embedding generation');
    }

    // Check cache first
    const cacheKey = text.substring(0, 500); // Use first 500 chars as cache key
    if (this.options.cacheEmbeddings && this.embeddingCache.has(cacheKey)) {
      this.stats.cacheHits++;
      return this.embeddingCache.get(cacheKey);
    }

    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text.substring(0, 8000) // Limit input length for API efficiency
      });

      const embedding = response.data[0].embedding;
      
      // Cache the result
      if (this.options.cacheEmbeddings) {
        this.embeddingCache.set(cacheKey, embedding);
        
        // Limit cache size
        if (this.embeddingCache.size > 1000) {
          const firstKey = this.embeddingCache.keys().next().value;
          this.embeddingCache.delete(firstKey);
        }
      }

      return embedding;

    } catch (error) {
      console.error('❌ Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Calculate confidence score based on result quality and quantity
   */
  calculateConfidence(userDocs, staticKnowledge) {
    let confidence = 0;

    // User documents contribute most to confidence
    if (userDocs && userDocs.length > 0) {
      const avgScore = userDocs.reduce((sum, doc) => sum + (doc.score || 0), 0) / userDocs.length;
      confidence += avgScore * 0.6; // 60% weight
    }

    // Static knowledge contributes to confidence
    if (staticKnowledge && staticKnowledge.length > 0) {
      const avgScore = staticKnowledge.reduce((sum, doc) => sum + (doc.score || 0), 0) / staticKnowledge.length;
      confidence += avgScore * 0.4; // 40% weight
    }

    // Quantity bonus
    const totalResults = (userDocs?.length || 0) + (staticKnowledge?.length || 0);
    if (totalResults >= 5) confidence += 0.1;
    if (totalResults >= 10) confidence += 0.1;

    return Math.min(1.0, confidence);
  }

  /**
   * Generate fallback responses when all other sources fail
   */
  generateFallbackResponses(query, agentType) {
    const fallbacks = {
      legal: [
        {
          content: 'For specific UK legal advice, please consult with a qualified solicitor who specializes in business law.',
          title: 'Legal Professional Referral',
          source: 'fallback'
        },
        {
          content: 'Consider checking the Companies House website (gov.uk/companieshouse) for official business registration information.',
          title: 'Companies House Resources',
          source: 'fallback'
        }
      ],
      finance: [
        {
          content: 'For detailed financial advice, please consult with a chartered accountant or financial advisor authorized by the FCA.',
          title: 'Financial Professional Referral',
          source: 'fallback'
        },
        {
          content: 'HMRC provides official guidance on business taxation at gov.uk/business-tax.',
          title: 'HMRC Tax Guidance',
          source: 'fallback'
        }
      ],
      revenue: [
        {
          content: 'Consider exploring government business support schemes at gov.uk/business-support-helpline.',
          title: 'Government Business Support',
          source: 'fallback'
        },
        {
          content: 'Industry reports and market analysis can provide insights into revenue optimization strategies.',
          title: 'Market Research Resources',
          source: 'fallback'
        }
      ],
      orchestrator: [
        {
          content: 'I recommend consulting with relevant specialists for detailed advice on your specific business needs.',
          title: 'Professional Consultation',
          source: 'fallback'
        }
      ]
    };

    return fallbacks[agentType] || fallbacks.orchestrator;
  }

  /**
   * Extract source types used in a retrieval operation
   */
  extractSourceTypes(results) {
    const sources = [];
    if (results.userDocuments?.length > 0) sources.push('user_documents');
    if (results.staticKnowledge?.length > 0) sources.push('static_knowledge');
    if (results.braveSearch?.length > 0) sources.push('brave_search');
    if (results.fallback?.length > 0) sources.push('fallback');
    return sources;
  }

  /**
   * Get all available namespaces
   */
  getAllNamespaces() {
    return Object.values(AGENT_NAMESPACES).flat();
  }

  /**
   * Update performance statistics
   */
  updateStats(confidence, responseTime) {
    this.stats.avgConfidence = (this.stats.avgConfidence * (this.stats.totalQueries - 1) + confidence) / this.stats.totalQueries;
    this.stats.avgResponseTime = (this.stats.avgResponseTime * (this.stats.totalQueries - 1) + responseTime) / this.stats.totalQueries;
  }

  /**
   * Get MCP client usage statistics
   */
  getMCPStats() {
    return {
      pinecone: this.mcpClient.getStats(),
      brave: {
        totalRequests: this.stats.braveSearchRequests,
        isReady: mcpService.isReady()
      }
    };
  }

  /**
   * Get comprehensive system health status
   */
  getHealthStatus() {
    return {
      mcpConnected: this.mcpClient.mcpConnected,
      sdkAvailable: this.mcpClient.sdkAvailable,
      braveSearchReady: mcpService.isReady(),
      embeddingCacheSize: this.embeddingCache.size,
      memoryPatterns: this.memoryMap.queryPatterns.size,
      stats: this.stats
    };
  }

  /**
   * Get performance analytics
   */
  getAnalytics() {
    return {
      performance: this.stats,
      memoryStats: {
        totalPatterns: this.memoryMap.queryPatterns.size,
        agentPreferences: Object.fromEntries(this.memoryMap.agentPreferences),
        confidenceHistory: this.memoryMap.confidenceHistory.slice(-50) // Last 50 entries
      },
      mcpStats: this.getMCPStats()
    };
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    console.log('🧹 Cleaning up Hybrid Knowledge Retrieval System...');
    
    if (this.mcpClient) {
      await this.mcpClient.cleanup();
    }
    
    this.embeddingCache.clear();
    console.log('✅ Cleanup completed');
  }
}

// Export singleton instance
export default new HybridKnowledgeRetriever();
