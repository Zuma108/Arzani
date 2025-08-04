/**
 * MCP Agent Integration
 * 
 * This module integrates MCP capabilities into existing AI agents,
 * providing retrieval-augmented generation functionality.
 */

import { MCPClient } from './index.js';
import { BusinessDataRAGServer } from './business-rag-server.js';
import { EventEmitter } from 'events';

/**
 * MCP-Enhanced Agent Base Class
 */
export class MCPEnhancedAgent extends EventEmitter {
  constructor(agentName, options = {}) {
    super();
    this.agentName = agentName;
    this.options = options;
    this.mcpClient = new MCPClient();
    this.ragServer = null;
    this.availableTools = new Map();
    this.availableResources = new Map();
    this.availablePrompts = new Map();
    this.initialized = false;
  }

  /**
   * Initialize MCP integration
   */
  async initialize() {
    try {
      // Start the RAG server
      this.ragServer = new BusinessDataRAGServer(this.options.ragServer);
      
      // Setup MCP client communication
      this.setupMCPCommunication();
      
      // Initialize connection
      await this.mcpClient.initialize();
      
      // Load available capabilities
      await this.loadCapabilities();
      
      this.initialized = true;
      console.log(`MCP-Enhanced Agent ${this.agentName} initialized successfully`);
      
      return true;
    } catch (error) {
      console.error(`Failed to initialize MCP-Enhanced Agent ${this.agentName}:`, error);
      throw error;
    }
  }

  /**
   * Setup MCP client-server communication
   */
  setupMCPCommunication() {
    // Handle messages from client to server
    this.mcpClient.on('message', async (message) => {
      const response = await this.ragServer.handleMessage(message);
      this.mcpClient.handleResponse(response);
    });
  }

  /**
   * Load available MCP capabilities
   */
  async loadCapabilities() {
    try {
      // Load tools
      const toolsResponse = await this.mcpClient.listTools();
      if (toolsResponse.tools) {
        toolsResponse.tools.forEach(tool => {
          this.availableTools.set(tool.name, tool);
        });
      }

      // Load resources
      const resourcesResponse = await this.mcpClient.listResources();
      if (resourcesResponse.resources) {
        resourcesResponse.resources.forEach(resource => {
          this.availableResources.set(resource.uri, resource);
        });
      }

      // Load prompts
      const promptsResponse = await this.mcpClient.listPrompts();
      if (promptsResponse.prompts) {
        promptsResponse.prompts.forEach(prompt => {
          this.availablePrompts.set(prompt.name, prompt);
        });
      }

      console.log(`Loaded ${this.availableTools.size} tools, ${this.availableResources.size} resources, ${this.availablePrompts.size} prompts`);
    } catch (error) {
      console.error('Error loading MCP capabilities:', error);
    }
  }

  /**
   * Use an MCP tool with RAG capabilities
   */
  async useTool(toolName, parameters = {}) {
    if (!this.initialized) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    if (!this.availableTools.has(toolName)) {
      throw new Error(`Tool '${toolName}' not available. Available tools: ${Array.from(this.availableTools.keys()).join(', ')}`);
    }

    try {
      const result = await this.mcpClient.callTool(toolName, parameters);
      
      // Log tool usage for analytics
      this.emit('tool_used', {
        tool: toolName,
        parameters,
        result,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      console.error(`Error using tool ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * Access an MCP resource
   */
  async getResource(resourceUri) {
    if (!this.initialized) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    if (!this.availableResources.has(resourceUri)) {
      throw new Error(`Resource '${resourceUri}' not available. Available resources: ${Array.from(this.availableResources.keys()).join(', ')}`);
    }

    try {
      const result = await this.mcpClient.readResource(resourceUri);
      
      // Log resource access
      this.emit('resource_accessed', {
        resource: resourceUri,
        result,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      console.error(`Error accessing resource ${resourceUri}:`, error);
      throw error;
    }
  }

  /**
   * Get an MCP prompt template
   */
  async getPrompt(promptName, parameters = {}) {
    if (!this.initialized) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    if (!this.availablePrompts.has(promptName)) {
      throw new Error(`Prompt '${promptName}' not available. Available prompts: ${Array.from(this.availablePrompts.keys()).join(', ')}`);
    }

    try {
      const result = await this.mcpClient.getPrompt(promptName, parameters);
      
      // Log prompt usage
      this.emit('prompt_used', {
        prompt: promptName,
        parameters,
        result,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      console.error(`Error getting prompt ${promptName}:`, error);
      throw error;
    }
  }

  /**
   * Enhanced search with RAG capabilities
   */
  async searchWithRAG(query, filters = {}) {
    try {
      const searchResult = await this.useTool('search_businesses', {
        query,
        ...filters
      });

      // Get additional context from resources
      const marketTrends = await this.getResource('business://data/market-reports');
      const industryData = await this.getResource('business://data/industry-multiples');

      return {
        searchResults: searchResult,
        contextualData: {
          marketTrends: JSON.parse(marketTrends.contents[0].text),
          industryMultiples: JSON.parse(industryData.contents[0].text)
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in RAG search:', error);
      throw error;
    }
  }

  /**
   * Enhanced business analysis with RAG
   */
  async analyzeBusinessWithRAG(businessData) {
    try {
      // Get valuation analysis
      const valuation = await this.useTool('analyze_business_valuation', {
        revenue: businessData.revenue,
        profit: businessData.profit,
        industry: businessData.industry,
        includeComparables: true
      });

      // Get market trends
      const trends = await this.useTool('get_market_trends', {
        industry: businessData.industry,
        timeframe: '6months',
        includeForecasts: true
      });

      // Get business analysis prompt
      const analysisPrompt = await this.getPrompt('business_analysis', {
        businessName: businessData.name,
        industry: businessData.industry,
        revenue: businessData.revenue,
        profit: businessData.profit,
        location: businessData.location,
        askingPrice: businessData.asking_price,
        marketContext: JSON.stringify(trends)
      });

      return {
        valuation,
        marketTrends: trends,
        analysisPrompt: analysisPrompt.messages[0].content.text,
        recommendations: this.generateRecommendations(valuation, trends),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in RAG business analysis:', error);
      throw error;
    }
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(valuation, trends) {
    const recommendations = [];

    if (valuation.valuation && trends) {
      // Price analysis
      if (valuation.analysis.strength === 'Strong') {
        recommendations.push('Strong financial performance indicates good investment potential');
      }

      // Market timing
      if (trends.current_market_conditions.buyer_demand === 'High for quality businesses') {
        recommendations.push('Current market conditions favor sellers of quality businesses');
      }

      // Valuation guidance
      const avgVal = valuation.valuation.average;
      if (avgVal) {
        recommendations.push(`Estimated value range: £${valuation.valuation.range.low.toLocaleString()} - £${valuation.valuation.range.high.toLocaleString()}`);
      }
    }

    return recommendations;
  }

  /**
   * Get agent capabilities summary
   */
  getCapabilities() {
    return {
      initialized: this.initialized,
      tools: Array.from(this.availableTools.keys()),
      resources: Array.from(this.availableResources.keys()),
      prompts: Array.from(this.availablePrompts.keys()),
      agentName: this.agentName
    };
  }

  /**
   * Shutdown MCP integration
   */
  async shutdown() {
    try {
      if (this.ragServer) {
        this.ragServer.close();
      }
      this.removeAllListeners();
      console.log(`MCP-Enhanced Agent ${this.agentName} shutdown complete`);
    } catch (error) {
      console.error(`Error shutting down MCP-Enhanced Agent ${this.agentName}:`, error);
    }
  }
}

/**
 * Finance Agent MCP Integration
 */
export class MCPFinanceAgent extends MCPEnhancedAgent {
  constructor(options = {}) {
    super('finance', options);
  }

  async performEnhancedFinancialAnalysis(businessData) {
    try {
      const analysis = await this.useTool('perform_financial_analysis', {
        financialData: {
          revenue: businessData.revenueHistory || [businessData.revenue],
          expenses: businessData.expenseHistory || [],
          assets: businessData.assets || 0,
          liabilities: businessData.liabilities || 0
        },
        analysisType: 'comprehensive',
        industry: businessData.industry,
        benchmarkAgainstIndustry: true
      });

      const valuation = await this.useTool('analyze_business_valuation', {
        revenue: businessData.revenue,
        profit: businessData.profit,
        industry: businessData.industry
      });

      return {
        financialAnalysis: analysis,
        valuation: valuation,
        recommendations: [
          ...this.generateRecommendations(valuation, null),
          'Consider engaging a qualified accountant for detailed review',
          'Ensure all financial records are properly documented'
        ]
      };
    } catch (error) {
      console.error('Error in enhanced financial analysis:', error);
      throw error;
    }
  }
}

/**
 * Legal Agent MCP Integration
 */
export class MCPLegalAgent extends MCPEnhancedAgent {
  constructor(options = {}) {
    super('legal', options);
  }

  async generateEnhancedLegalDocuments(documentRequest) {
    try {
      const template = await this.useTool('generate_legal_template', {
        documentType: documentRequest.type,
        businessType: documentRequest.businessType,
        jurisdiction: documentRequest.jurisdiction || 'uk',
        customClauses: documentRequest.customClauses
      });

      const reviewPrompt = await this.getPrompt('legal_review', {
        documentType: documentRequest.type,
        transactionType: documentRequest.transactionType || 'business_sale',
        industry: documentRequest.businessType,
        documentContent: template.content
      });

      return {
        document: template,
        reviewGuidance: reviewPrompt.messages[0].content.text,
        recommendations: [
          'Have this document reviewed by qualified legal counsel',
          'Ensure compliance with current UK business law',
          'Consider industry-specific requirements'
        ]
      };
    } catch (error) {
      console.error('Error generating enhanced legal documents:', error);
      throw error;
    }
  }
}

/**
 * Revenue Agent MCP Integration
 */
export class MCPRevenueAgent extends MCPEnhancedAgent {
  constructor(options = {}) {
    super('revenue', options);
  }

  async performEnhancedMarketAnalysis(searchCriteria) {
    try {
      const searchResults = await this.searchWithRAG(
        searchCriteria.query,
        {
          industry: searchCriteria.industry,
          location: searchCriteria.location,
          priceRange: searchCriteria.priceRange
        }
      );

      const marketTrends = await this.useTool('get_market_trends', {
        industry: searchCriteria.industry,
        timeframe: '6months',
        includeForecasts: true
      });

      return {
        searchResults: searchResults.searchResults,
        marketAnalysis: marketTrends,
        contextualData: searchResults.contextualData,
        recommendations: [
          'Consider multiple businesses for comparison',
          'Review market trends for timing decisions',
          'Engage professional advisors for due diligence'
        ]
      };
    } catch (error) {
      console.error('Error in enhanced market analysis:', error);
      throw error;
    }
  }
}
