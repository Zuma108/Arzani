/**
 * Knowledge Mapping Utilities
 * 
 * Provides utilities for agents to map and learn from knowledge interactions
 * Helps agents optimize their retrieval strategies over time
 */

import hybridRetriever from './enhanced-hybrid-retrieval.js';

/**
 * Agent Knowledge Mapper
 * 
 * Helps individual agents learn and optimize their knowledge retrieval patterns
 */
export class AgentKnowledgeMapper {
  constructor(agentType) {
    this.agentType = agentType;
    this.sessionInteractions = [];
    this.optimizationCache = new Map();
  }

  /**
   * Record a knowledge interaction for learning
   */
  recordInteraction(query, results, userFeedback = null, context = {}) {
    const interaction = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      query: query.substring(0, 500), // Limit query length
      agentType: this.agentType,
      results: {
        count: results.results?.length || 0,
        confidence: results.metadata?.confidence || 0,
        strategy: results.metadata?.strategy || 'unknown',
        responseTime: results.metadata?.responseTime || 0,
        sources: this.extractSourceBreakdown(results.metadata?.breakdown)
      },
      userFeedback,
      context,
      success: this.determineInteractionSuccess(results, userFeedback)
    };

    this.sessionInteractions.push(interaction);
    
    // Learn from this interaction
    this.learnFromInteraction(interaction);
    
    console.log(`📊 [${this.agentType}] Recorded interaction: confidence=${interaction.results.confidence.toFixed(2)}, success=${interaction.success}`);
    
    return interaction;
  }

  /**
   * Learn optimization patterns from successful interactions
   */
  learnFromInteraction(interaction) {
    if (interaction.success) {
      // Extract successful patterns
      const pattern = this.extractQueryPattern(interaction.query);
      
      if (!this.optimizationCache.has(pattern)) {
        this.optimizationCache.set(pattern, {
          successfulStrategies: [],
          averageConfidence: 0,
          bestResponseTime: Infinity,
          queryCount: 0
        });
      }

      const cached = this.optimizationCache.get(pattern);
      cached.successfulStrategies.push(interaction.results.strategy);
      cached.averageConfidence = (cached.averageConfidence * cached.queryCount + interaction.results.confidence) / (cached.queryCount + 1);
      cached.bestResponseTime = Math.min(cached.bestResponseTime, interaction.results.responseTime);
      cached.queryCount++;
      
      // Limit cache size
      if (this.optimizationCache.size > 100) {
        const oldestKey = this.optimizationCache.keys().next().value;
        this.optimizationCache.delete(oldestKey);
      }
    }
  }

  /**
   * Get optimization recommendations for a query
   */
  getOptimizationRecommendations(query) {
    const pattern = this.extractQueryPattern(query);
    const cached = this.optimizationCache.get(pattern);
    
    if (!cached || cached.queryCount < 2) {
      return {
        hasRecommendations: false,
        message: 'Insufficient data for optimization recommendations'
      };
    }

    const recommendations = {
      hasRecommendations: true,
      pattern,
      averageConfidence: cached.averageConfidence,
      recommendedStrategy: this.getMostSuccessfulStrategy(cached.successfulStrategies),
      expectedResponseTime: cached.bestResponseTime,
      suggestions: []
    };

    // Generate specific suggestions
    if (cached.averageConfidence < 0.6) {
      recommendations.suggestions.push({
        type: 'search_strategy',
        message: 'Consider forcing Brave search for this query type',
        action: 'set forceBraveSearch=true'
      });
    }

    if (cached.bestResponseTime > 3000) {
      recommendations.suggestions.push({
        type: 'performance',
        message: 'Enable caching for similar queries to improve response time',
        action: 'enable embedding cache'
      });
    }

    return recommendations;
  }

  /**
   * Extract a pattern from query for optimization learning
   */
  extractQueryPattern(query) {
    return query.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 3)
      .sort()
      .join('-');
  }

  /**
   * Determine if an interaction was successful
   */
  determineInteractionSuccess(results, userFeedback) {
    // Explicit user feedback takes precedence
    if (userFeedback !== null) {
      return userFeedback === 'positive' || userFeedback === 'helpful' || userFeedback === true;
    }

    // Implicit success indicators
    const confidence = results.metadata?.confidence || 0;
    const resultCount = results.results?.length || 0;
    
    return confidence > 0.6 && resultCount > 0;
  }

  /**
   * Extract source breakdown from metadata
   */
  extractSourceBreakdown(breakdown) {
    if (!breakdown) return {};
    
    return {
      userDocs: breakdown.userDocs || 0,
      staticKnowledge: breakdown.staticKnowledge || 0,
      braveSearch: breakdown.braveSearch || 0
    };
  }

  /**
   * Get most successful strategy from list
   */
  getMostSuccessfulStrategy(strategies) {
    const counts = {};
    strategies.forEach(strategy => {
      counts[strategy] = (counts[strategy] || 0) + 1;
    });
    
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }

  /**
   * Get session analytics
   */
  getSessionAnalytics() {
    const interactions = this.sessionInteractions;
    
    if (interactions.length === 0) {
      return {
        totalInteractions: 0,
        message: 'No interactions recorded this session'
      };
    }

    const successful = interactions.filter(i => i.success);
    const avgConfidence = interactions.reduce((sum, i) => sum + i.results.confidence, 0) / interactions.length;
    const avgResponseTime = interactions.reduce((sum, i) => sum + i.results.responseTime, 0) / interactions.length;

    return {
      totalInteractions: interactions.length,
      successfulInteractions: successful.length,
      successRate: (successful.length / interactions.length * 100).toFixed(1) + '%',
      averageConfidence: avgConfidence.toFixed(3),
      averageResponseTime: avgResponseTime.toFixed(0) + 'ms',
      strategiesUsed: [...new Set(interactions.map(i => i.results.strategy))],
      optimizationPatterns: this.optimizationCache.size,
      recommendations: this.getSessionRecommendations()
    };
  }

  /**
   * Get recommendations for the current session
   */
  getSessionRecommendations() {
    const interactions = this.sessionInteractions;
    const recommendations = [];

    if (interactions.length < 5) return recommendations;

    const avgConfidence = interactions.reduce((sum, i) => sum + i.results.confidence, 0) / interactions.length;
    const avgResponseTime = interactions.reduce((sum, i) => sum + i.results.responseTime, 0) / interactions.length;
    const successRate = interactions.filter(i => i.success).length / interactions.length;

    if (avgConfidence < 0.5) {
      recommendations.push({
        priority: 'high',
        type: 'confidence',
        message: 'Low average confidence detected. Consider enabling more aggressive search strategies.',
        action: 'Increase Brave search usage'
      });
    }

    if (avgResponseTime > 4000) {
      recommendations.push({
        priority: 'medium',
        type: 'performance',
        message: 'High response times detected. Enable caching for better performance.',
        action: 'Enable embedding caching'
      });
    }

    if (successRate < 0.7) {
      recommendations.push({
        priority: 'high',
        type: 'success_rate',
        message: 'Low success rate indicates query optimization needed.',
        action: 'Review query patterns and adjust retrieval strategy'
      });
    }

    return recommendations;
  }

  /**
   * Clear session data
   */
  clearSession() {
    const clearedCount = this.sessionInteractions.length;
    this.sessionInteractions = [];
    console.log(`🧹 [${this.agentType}] Cleared ${clearedCount} session interactions`);
    return clearedCount;
  }

  /**
   * Export optimization data for analysis
   */
  exportOptimizationData() {
    return {
      agentType: this.agentType,
      sessionInteractions: this.sessionInteractions,
      optimizationCache: Object.fromEntries(this.optimizationCache),
      analytics: this.getSessionAnalytics(),
      exportTimestamp: new Date().toISOString()
    };
  }
}

/**
 * Global Knowledge Coordination
 * 
 * Coordinates knowledge learning across all agents
 */
export class GlobalKnowledgeCoordinator {
  constructor() {
    this.agentMappers = new Map();
    this.globalPatterns = new Map();
    this.crossAgentInsights = [];
  }

  /**
   * Register an agent mapper
   */
  registerAgent(agentType) {
    if (!this.agentMappers.has(agentType)) {
      this.agentMappers.set(agentType, new AgentKnowledgeMapper(agentType));
      console.log(`📝 Registered knowledge mapper for ${agentType} agent`);
    }
    return this.agentMappers.get(agentType);
  }

  /**
   * Get agent mapper
   */
  getAgentMapper(agentType) {
    return this.agentMappers.get(agentType) || this.registerAgent(agentType);
  }

  /**
   * Record interaction through global coordinator
   */
  recordInteraction(agentType, query, results, userFeedback = null, context = {}) {
    const mapper = this.getAgentMapper(agentType);
    const interaction = mapper.recordInteraction(query, results, userFeedback, context);
    
    // Learn cross-agent patterns
    this.learnCrossAgentPatterns(interaction);
    
    return interaction;
  }

  /**
   * Learn patterns that span multiple agents
   */
  learnCrossAgentPatterns(interaction) {
    // Simple cross-agent pattern detection
    const queryKeywords = interaction.query.toLowerCase().split(/\s+/);
    
    queryKeywords.forEach(keyword => {
      if (keyword.length > 4) {
        if (!this.globalPatterns.has(keyword)) {
          this.globalPatterns.set(keyword, {
            agents: new Set(),
            totalQueries: 0,
            averageConfidence: 0
          });
        }
        
        const pattern = this.globalPatterns.get(keyword);
        pattern.agents.add(interaction.agentType);
        pattern.totalQueries++;
        pattern.averageConfidence = (pattern.averageConfidence * (pattern.totalQueries - 1) + interaction.results.confidence) / pattern.totalQueries;
      }
    });
  }

  /**
   * Get cross-agent insights
   */
  getCrossAgentInsights() {
    const insights = [];
    
    for (const [keyword, pattern] of this.globalPatterns) {
      if (pattern.agents.size > 1 && pattern.totalQueries > 5) {
        insights.push({
          keyword,
          agentsInvolved: Array.from(pattern.agents),
          queryCount: pattern.totalQueries,
          averageConfidence: pattern.averageConfidence.toFixed(3),
          insight: `Keyword "${keyword}" is queried across ${pattern.agents.size} agents with ${pattern.averageConfidence.toFixed(1)} average confidence`
        });
      }
    }
    
    return insights.sort((a, b) => b.queryCount - a.queryCount).slice(0, 10);
  }

  /**
   * Get global analytics
   */
  getGlobalAnalytics() {
    const agentAnalytics = {};
    let totalInteractions = 0;
    let totalSuccessful = 0;
    let totalConfidence = 0;

    for (const [agentType, mapper] of this.agentMappers) {
      const analytics = mapper.getSessionAnalytics();
      agentAnalytics[agentType] = analytics;
      
      totalInteractions += analytics.totalInteractions;
      totalSuccessful += analytics.successfulInteractions;
      totalConfidence += parseFloat(analytics.averageConfidence) * analytics.totalInteractions;
    }

    return {
      totalInteractions,
      totalSuccessful,
      globalSuccessRate: totalInteractions > 0 ? (totalSuccessful / totalInteractions * 100).toFixed(1) + '%' : '0%',
      globalAverageConfidence: totalInteractions > 0 ? (totalConfidence / totalInteractions).toFixed(3) : '0',
      agentAnalytics,
      crossAgentInsights: this.getCrossAgentInsights(),
      globalPatterns: this.globalPatterns.size
    };
  }

  /**
   * Cleanup old data
   */
  cleanup() {
    let totalCleared = 0;
    
    for (const [agentType, mapper] of this.agentMappers) {
      totalCleared += mapper.clearSession();
    }
    
    this.globalPatterns.clear();
    this.crossAgentInsights = [];
    
    console.log(`🧹 Global cleanup completed: ${totalCleared} interactions cleared`);
    return totalCleared;
  }
}

// Create global coordinator instance
export const globalKnowledgeCoordinator = new GlobalKnowledgeCoordinator();

// Helper function for agents to easily record interactions
export function recordKnowledgeInteraction(agentType, query, results, userFeedback = null, context = {}) {
  return globalKnowledgeCoordinator.recordInteraction(agentType, query, results, userFeedback, context);
}

// Helper function to get optimization recommendations
export function getOptimizationRecommendations(agentType, query) {
  const mapper = globalKnowledgeCoordinator.getAgentMapper(agentType);
  return mapper.getOptimizationRecommendations(query);
}

export default {
  AgentKnowledgeMapper,
  GlobalKnowledgeCoordinator,
  globalKnowledgeCoordinator,
  recordKnowledgeInteraction,
  getOptimizationRecommendations
};
