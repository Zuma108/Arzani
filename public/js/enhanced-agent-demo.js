/**
 * Enhanced Agent Integration Example
 * 
 * Demonstrates how agents can use the hybrid retrieval system
 * with knowledge mapping for continuous improvement
 */

import hybridRetriever from '../../services/knowledge/enhanced-hybrid-retrieval.js';
import { AgentKnowledgeMapper } from '../../services/knowledge/knowledge-mapping.js';

/**
 * Enhanced Finance Agent with Knowledge Mapping Integration
 */
export class EnhancedFinanceAgent {
  constructor() {
    this.agentType = 'finance';
    this.knowledgeMapper = new AgentKnowledgeMapper(this.agentType);
    this.sessionMetrics = {
      totalQueries: 0,
      avgConfidence: 0,
      avgResponseTime: 0,
      userSatisfaction: 0
    };
  }

  /**
   * Process financial query with knowledge mapping and learning
   */
  async processFinancialQuery(query, userId = null, context = {}) {
    console.log(`💰 [Finance Agent] Processing: "${query.substring(0, 50)}..."`);
    
    const startTime = Date.now();
    
    try {
      // 1. Retrieve knowledge using hybrid system
      const knowledgeResult = await hybridRetriever.retrieveKnowledge(
        query,
        this.agentType,
        userId,
        {
          maxResults: 8,
          includeUserDocs: true,
          searchFallback: true,
          confidenceThreshold: 0.7 // Higher threshold for financial advice
        }
      );
      
      const responseTime = Date.now() - startTime;
      
      // 2. Record interaction for learning
      const interaction = this.knowledgeMapper.recordInteraction(
        query,
        knowledgeResult,
        null, // User feedback will be added later
        { ...context, responseTime }
      );
      
      // 3. Get optimization recommendations
      const optimization = this.knowledgeMapper.getOptimizationRecommendations();
      
      // 4. Apply optimizations if available
      if (optimization.recommendedSources.length > 0) {
        console.log(`🎯 [Finance Agent] Applying optimization: Focus on ${optimization.recommendedSources.join(', ')}`);
      }
      
      // 5. Format response with confidence indicators
      const response = this.formatFinanceResponse(knowledgeResult, optimization);
      
      // 6. Update session metrics
      this.updateSessionMetrics(knowledgeResult.metadata.confidence, responseTime);
      
      console.log(`✅ [Finance Agent] Query processed in ${responseTime}ms with ${(knowledgeResult.metadata.confidence * 100).toFixed(1)}% confidence`);
      
      return {
        response,
        metadata: {
          confidence: knowledgeResult.metadata.confidence,
          responseTime,
          sources: knowledgeResult.metadata.breakdown,
          optimization: optimization.summary,
          interactionId: interaction.id
        }
      };
      
    } catch (error) {
      console.error(`❌ [Finance Agent] Error processing query:`, error);
      
      // Record failed interaction for learning
      this.knowledgeMapper.recordInteraction(
        query,
        { results: [], metadata: { confidence: 0, responseTime: Date.now() - startTime } },
        'error',
        { error: error.message, ...context }
      );
      
      throw error;
    }
  }

  /**
   * Record user feedback for continuous improvement
   */
  async recordUserFeedback(interactionId, feedback, rating = null) {
    console.log(`📝 [Finance Agent] Recording feedback for interaction ${interactionId}: ${feedback}`);
    
    // Find the interaction and update with feedback
    const interaction = this.knowledgeMapper.sessionInteractions.find(i => i.id === interactionId);
    if (interaction) {
      interaction.userFeedback = feedback;
      interaction.rating = rating;
      
      // Learn from the feedback
      this.knowledgeMapper.learnFromInteraction(interaction);
      
      // Update global knowledge memory
      if (feedback === 'helpful' || rating >= 4) {
        hybridRetriever.memoryMap.recordSuccessfulPattern(
          interaction.query,
          this.agentType,
          Object.keys(interaction.results.sources || {}),
          interaction.results.confidence,
          feedback
        );
      }
      
      console.log(`🧠 [Finance Agent] Feedback processed and learned`);
    }
  }

  /**
   * Format finance response with confidence indicators
   */
  formatFinanceResponse(knowledgeResult, optimization) {
    const confidenceLevel = knowledgeResult.metadata.confidence;
    const confidenceIndicator = this.getConfidenceIndicator(confidenceLevel);
    
    let response = `${confidenceIndicator} **Financial Analysis**\n\n`;
    
    // Add knowledge-based insights
    if (knowledgeResult.results.length > 0) {
      response += `Based on analysis of ${knowledgeResult.results.length} relevant sources:\n\n`;
      
      knowledgeResult.results.slice(0, 3).forEach((result, index) => {
        response += `**${index + 1}.** ${result.content.substring(0, 200)}...\n`;
        if (result.metadata.source_url) {
          response += `   *Source: ${result.metadata.source_url}*\n\n`;
        }
      });
    }
    
    // Add optimization insights
    if (optimization.insights.length > 0) {
      response += `\n**💡 Insights from Previous Queries:**\n`;
      optimization.insights.forEach(insight => {
        response += `- ${insight}\n`;
      });
    }
    
    // Add confidence disclaimer
    response += `\n> **Confidence Level:** ${(confidenceLevel * 100).toFixed(1)}% - `;
    if (confidenceLevel >= 0.8) {
      response += `High confidence in provided information`;
    } else if (confidenceLevel >= 0.6) {
      response += `Medium confidence - consider additional verification`;
    } else {
      response += `Lower confidence - recommend professional consultation`;
    }
    
    return response;
  }

  /**
   * Get confidence indicator emoji
   */
  getConfidenceIndicator(confidence) {
    if (confidence >= 0.8) return '🎯';
    if (confidence >= 0.6) return '📊';
    return '⚠️';
  }

  /**
   * Update session metrics for performance tracking
   */
  updateSessionMetrics(confidence, responseTime) {
    this.sessionMetrics.totalQueries++;
    this.sessionMetrics.avgConfidence = (
      (this.sessionMetrics.avgConfidence * (this.sessionMetrics.totalQueries - 1)) + confidence
    ) / this.sessionMetrics.totalQueries;
    
    this.sessionMetrics.avgResponseTime = (
      (this.sessionMetrics.avgResponseTime * (this.sessionMetrics.totalQueries - 1)) + responseTime
    ) / this.sessionMetrics.totalQueries;
  }

  /**
   * Get agent performance summary
   */
  getPerformanceSummary() {
    const optimization = this.knowledgeMapper.getOptimizationRecommendations();
    
    return {
      session: this.sessionMetrics,
      optimization: optimization.summary,
      learningProgress: {
        totalInteractions: this.knowledgeMapper.sessionInteractions.length,
        successfulPatterns: this.knowledgeMapper.sessionInteractions.filter(i => i.success).length,
        confidenceTrend: this.knowledgeMapper.getConfidenceTrend()
      }
    };
  }
}

/**
 * Example usage demonstration
 */
export async function demonstrateEnhancedAgent() {
  console.log('🚀 Demonstrating Enhanced Finance Agent with Knowledge Mapping\n');
  
  const financeAgent = new EnhancedFinanceAgent();
  
  // Example queries for demonstration
  const testQueries = [
    "What's a typical EBITDA multiple for a UK restaurant business?",
    "How does Business Asset Disposal Relief work for business sales?",
    "What are the key financial metrics buyers look at during due diligence?",
    "Should I structure my business sale as an asset sale or share sale?"
  ];
  
  for (let i = 0; i < testQueries.length; i++) {
    const query = testQueries[i];
    console.log(`📝 Query ${i + 1}: "${query}"`);
    
    try {
      const result = await financeAgent.processFinancialQuery(query, 'user123', {
        sessionId: 'demo-session',
        queryIndex: i
      });
      
      console.log(`   ✅ Confidence: ${(result.metadata.confidence * 100).toFixed(1)}%`);
      console.log(`   ⏱️ Response Time: ${result.metadata.responseTime}ms`);
      console.log(`   🔍 Sources: ${Object.keys(result.metadata.sources).length}`);
      
      // Simulate user feedback
      const feedback = Math.random() > 0.3 ? 'helpful' : 'needs_improvement';
      const rating = Math.floor(Math.random() * 2) + 4; // 4-5 stars
      
      await financeAgent.recordUserFeedback(result.metadata.interactionId, feedback, rating);
      
      console.log(`   📝 Feedback: ${feedback} (${rating}/5 stars)\n`);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
  }
  
  // Show performance summary
  const summary = financeAgent.getPerformanceSummary();
  console.log('📊 Agent Performance Summary:');
  console.log(`   Total Queries: ${summary.session.totalQueries}`);
  console.log(`   Average Confidence: ${(summary.session.avgConfidence * 100).toFixed(1)}%`);
  console.log(`   Average Response Time: ${summary.session.avgResponseTime.toFixed(0)}ms`);
  console.log(`   Learning Progress: ${summary.learningProgress.successfulPatterns}/${summary.learningProgress.totalInteractions} successful patterns`);
  
  console.log('\n✅ Enhanced Agent Demonstration Complete!');
}

// Run demonstration if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateEnhancedAgent().catch(console.error);
}
