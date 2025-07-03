/**
 * Enhanced MCP Agent Integration with Business Valuation RAG
 * 
 * This module provides enhanced AI agents with business valuation knowledge
 * through MCP RAG server integration.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Business Valuation RAG Client
 * Manages connection to the business valuation RAG MCP server
 */
export class BusinessValuationRAGClient {
  constructor(options = {}) {
    this.client = null;
    this.transport = null;
    this.serverProcess = null;
    this.connected = false;
    this.options = options;
  }

  /**
   * Start the RAG server and connect
   */
  async connect() {
    try {
      console.log('🔌 Starting Business Valuation RAG server...');
      
      // Start the MCP server process
      const serverPath = path.join(__dirname, '../../mcp-servers/business-valuation-rag.js');
      this.serverProcess = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      // Setup transport
      this.transport = new StdioClientTransport({
        stdin: this.serverProcess.stdin,
        stdout: this.serverProcess.stdout
      });

      // Create client
      this.client = new Client(
        {
          name: 'business-valuation-rag-client',
          version: '1.0.0'
        },
        {
          capabilities: {}
        }
      );

      // Connect to server
      await this.client.connect(this.transport);
      this.connected = true;
      
      console.log('✅ Connected to Business Valuation RAG server');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to RAG server:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the server
   */
  async disconnect() {
    if (this.client && this.connected) {
      await this.client.close();
      this.connected = false;
    }
    
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }
    
    console.log('🔌 Disconnected from Business Valuation RAG server');
  }

  /**
   * Search business valuations
   */
  async searchBusinessValuations(query, filters = {}) {
    if (!this.connected) {
      throw new Error('RAG client not connected');
    }

    const args = { query, ...filters };
    const response = await this.client.callTool({
      name: 'search_business_valuations',
      arguments: args
    });

    return response.content[0].text;
  }

  /**
   * Get industry benchmarks
   */
  async getIndustryBenchmarks(industry, limit = 5) {
    if (!this.connected) {
      throw new Error('RAG client not connected');
    }

    const response = await this.client.callTool({
      name: 'get_industry_benchmarks',
      arguments: { industry, limit }
    });

    return response.content[0].text;
  }

  /**
   * Find similar businesses
   */
  async findSimilarBusinesses(description, filters = {}) {
    if (!this.connected) {
      throw new Error('RAG client not connected');
    }

    const args = { description, ...filters };
    const response = await this.client.callTool({
      name: 'find_similar_businesses',
      arguments: args
    });

    return response.content[0].text;
  }

  /**
   * Get valuation multiples
   */
  async getValuationMultiples(query, filters = {}) {
    if (!this.connected) {
      throw new Error('RAG client not connected');
    }

    const args = { query, ...filters };
    const response = await this.client.callTool({
      name: 'get_valuation_multiples',
      arguments: args
    });

    return response.content[0].text;
  }
}

/**
 * MCP-Enhanced Finance Agent
 * Finance agent with business valuation RAG capabilities
 */
export class MCPFinanceAgent extends EventEmitter {
  constructor(options = {}) {
    super();
    this.ragClient = new BusinessValuationRAGClient(options.rag);
    this.initialized = false;
  }

  async initialize() {
    try {
      await this.ragClient.connect();
      this.initialized = true;
      console.log('🏦 MCP Finance Agent initialized with RAG capabilities');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize MCP Finance Agent:', error);
      throw error;
    }
  }

  async shutdown() {
    if (this.ragClient) {
      await this.ragClient.disconnect();
    }
    this.initialized = false;
  }

  /**
   * Analyze business valuation with RAG context
   */
  async analyzeBusinessValuation(businessData) {
    if (!this.initialized) {
      throw new Error('Finance agent not initialized');
    }

    try {
      const industry = businessData.industry;
      const revenue = businessData.revenue;
      const description = businessData.description || '';

      // Get industry benchmarks
      const benchmarks = await this.ragClient.getIndustryBenchmarks(industry);
      
      // Find similar businesses
      const similarBusinesses = await this.ragClient.findSimilarBusinesses(
        `${description} ${industry} business revenue ${revenue}`,
        { industry, revenue }
      );

      // Search for relevant valuation cases
      const valuationCases = await this.ragClient.searchBusinessValuations(
        `${industry} business valuation revenue ${revenue}`,
        { 
          industry,
          min_revenue: revenue * 0.5,
          max_revenue: revenue * 2
        }
      );

      return {
        industry_benchmarks: benchmarks,
        similar_businesses: similarBusinesses,
        valuation_cases: valuationCases,
        analysis: this.generateAnalysis(benchmarks, similarBusinesses, valuationCases, businessData)
      };
    } catch (error) {
      console.error('Error in business valuation analysis:', error);
      throw error;
    }
  }

  /**
   * Get valuation multiples with context
   */
  async getValuationMultiples(industry, businessType = '') {
    if (!this.initialized) {
      throw new Error('Finance agent not initialized');
    }

    const query = `${industry} ${businessType} valuation multiples revenue EBITDA`;
    return await this.ragClient.getValuationMultiples(query, { industry });
  }

  /**
   * Generate comprehensive analysis
   */
  generateAnalysis(benchmarks, similarBusinesses, valuationCases, businessData) {
    return `
FINANCE AGENT ANALYSIS:

📊 INDUSTRY BENCHMARKS:
${benchmarks}

🏢 SIMILAR BUSINESSES:
${similarBusinesses}

💼 RELEVANT VALUATION CASES:
${valuationCases}

📈 RECOMMENDATION:
Based on the industry benchmarks and similar business cases, this ${businessData.industry} business with £${businessData.revenue?.toLocaleString()} revenue should be valued using industry-standard multiples. Consider the range of similar businesses and apply appropriate adjustments for unique factors such as growth rate, market position, and operational efficiency.

Key factors to consider:
- Industry-specific multiples and benchmarks
- Comparison to similar sized businesses in the sector
- Revenue and EBITDA trends
- Market conditions and growth prospects
- Risk factors and business model sustainability
    `.trim();
  }
}

/**
 * MCP-Enhanced Broker Agent
 * Broker agent with business valuation RAG capabilities
 */
export class MCPBrokerAgent extends EventEmitter {
  constructor(options = {}) {
    super();
    this.ragClient = new BusinessValuationRAGClient(options.rag);
    this.initialized = false;
  }

  async initialize() {
    try {
      await this.ragClient.connect();
      this.initialized = true;
      console.log('🤝 MCP Broker Agent initialized with RAG capabilities');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize MCP Broker Agent:', error);
      throw error;
    }
  }

  async shutdown() {
    if (this.ragClient) {
      await this.ragClient.disconnect();
    }
    this.initialized = false;
  }

  /**
   * Generate market insights for business brokerage
   */
  async generateMarketInsights(businessData) {
    if (!this.initialized) {
      throw new Error('Broker agent not initialized');
    }

    try {
      const industry = businessData.industry;
      const location = businessData.location || '';

      // Get industry benchmarks
      const benchmarks = await this.ragClient.getIndustryBenchmarks(industry);
      
      // Find similar businesses in the area
      const similarBusinesses = await this.ragClient.findSimilarBusinesses(
        `${industry} business ${location}`,
        { industry, location }
      );

      // Search for market trends
      const marketTrends = await this.ragClient.searchBusinessValuations(
        `${industry} market trends pricing recent sales`,
        { industry }
      );

      return {
        market_benchmarks: benchmarks,
        comparable_sales: similarBusinesses,
        market_trends: marketTrends,
        broker_insights: this.generateBrokerInsights(benchmarks, similarBusinesses, marketTrends, businessData)
      };
    } catch (error) {
      console.error('Error generating market insights:', error);
      throw error;
    }
  }

  /**
   * Generate pricing recommendations
   */
  async generatePricingRecommendations(businessData) {
    if (!this.initialized) {
      throw new Error('Broker agent not initialized');
    }

    const multiples = await this.ragClient.getValuationMultiples(
      `${businessData.industry} pricing multiples market value`,
      { industry: businessData.industry }
    );

    return {
      pricing_multiples: multiples,
      recommendation: this.generatePricingRecommendation(multiples, businessData)
    };
  }

  generateBrokerInsights(benchmarks, comparables, trends, businessData) {
    return `
BROKER MARKET INSIGHTS:

🏪 MARKET BENCHMARKS:
${benchmarks}

🏢 COMPARABLE SALES:
${comparables}

📈 MARKET TRENDS:
${trends}

💰 BROKERAGE RECOMMENDATION:
This ${businessData.industry} business should be positioned competitively in the current market. Based on recent comparable sales and industry benchmarks, consider:

1. Market positioning relative to similar businesses
2. Current market demand for ${businessData.industry} businesses
3. Pricing strategy to attract qualified buyers
4. Marketing approach highlighting unique value propositions
5. Timeline considerations based on current market conditions

The data suggests this business type has specific market characteristics that should inform the sale strategy and pricing approach.
    `.trim();
  }

  generatePricingRecommendation(multiples, businessData) {
    return `
PRICING RECOMMENDATION:
${multiples}

Based on current market multiples and comparable transactions, recommend positioning this business within the industry-standard range while considering unique factors such as location, growth potential, and operational efficiency.
    `.trim();
  }
}

/**
 * MCP-Enhanced Legal Agent
 * Legal agent with business valuation RAG capabilities
 */
export class MCPLegalAgent extends EventEmitter {
  constructor(options = {}) {
    super();
    this.ragClient = new BusinessValuationRAGClient(options.rag);
    this.initialized = false;
  }

  async initialize() {
    try {
      await this.ragClient.connect();
      this.initialized = true;
      console.log('⚖️ MCP Legal Agent initialized with RAG capabilities');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize MCP Legal Agent:', error);
      throw error;
    }
  }

  async shutdown() {
    if (this.ragClient) {
      await this.ragClient.disconnect();
    }
    this.initialized = false;
  }

  /**
   * Generate valuation support documentation
   */
  async generateValuationSupport(businessData) {
    if (!this.initialized) {
      throw new Error('Legal agent not initialized');
    }

    try {
      const industry = businessData.industry;

      // Get industry benchmarks for legal documentation
      const benchmarks = await this.ragClient.getIndustryBenchmarks(industry);
      
      // Find precedent transactions
      const precedents = await this.ragClient.searchBusinessValuations(
        `${industry} legal precedent valuation methodology`,
        { industry }
      );

      return {
        industry_benchmarks: benchmarks,
        legal_precedents: precedents,
        legal_analysis: this.generateLegalAnalysis(benchmarks, precedents, businessData)
      };
    } catch (error) {
      console.error('Error generating legal valuation support:', error);
      throw error;
    }
  }

  generateLegalAnalysis(benchmarks, precedents, businessData) {
    return `
LEGAL VALUATION ANALYSIS:

📊 INDUSTRY BENCHMARKS:
${benchmarks}

⚖️ LEGAL PRECEDENTS:
${precedents}

📝 LEGAL CONSIDERATIONS:
For this ${businessData.industry} business valuation, the following legal aspects should be documented:

1. Valuation Methodology: Industry-standard approaches supported by market data
2. Comparable Transactions: Similar businesses providing valuation precedents
3. Market Evidence: Industry benchmarks supporting valuation conclusions
4. Risk Factors: Legal and operational considerations affecting value
5. Documentation Requirements: Supporting evidence for valuation opinions

The legal framework for this valuation should reference industry standards and comparable market transactions to provide defensible valuation conclusions.
    `.trim();
  }
}

// Export singleton instances
export const mcpFinanceAgent = new MCPFinanceAgent();
export const mcpBrokerAgent = new MCPBrokerAgent();
export const mcpLegalAgent = new MCPLegalAgent();
