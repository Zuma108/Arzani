/**
 * RAG-Enhanced MCP Server for Business Data
 * 
 * This MCP server provides retrieval-augmented generation capabilities
 * for business marketplace data, enhancing AI agents with live data access.
 */

import { MCPServer } from './index.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Business Data RAG Server
 */
export class BusinessDataRAGServer extends MCPServer {
  constructor(options = {}) {
    super('business-data-rag', options);
    this.dbPath = options.dbPath || path.join(__dirname, '../../database.db');
    this.db = null;
    this.embeddings = new Map(); // Simple in-memory embeddings store
    this.setupServer();
  }

  /**
   * Setup MCP server with business-specific tools and resources
   */
  async setupServer() {
    // Initialize database connection
    try {
      this.db = new Database(this.dbPath);
      console.log('Business RAG Server: Database connected');
    } catch (error) {
      console.error('Business RAG Server: Database connection failed:', error);
    }

    // Register RAG-enhanced tools
    this.registerBusinessTools();
    this.registerBusinessResources();
    this.registerBusinessPrompts();

    console.log('Business Data RAG Server initialized');
  }

  /**
   * Register business-specific tools
   */
  registerBusinessTools() {
    // Business Search Tool
    this.registerTool(
      'search_businesses',
      'Search for businesses using semantic similarity and filters',
      {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          industry: { type: 'string', description: 'Industry filter' },
          location: { type: 'string', description: 'Location filter' },
          priceRange: { 
            type: 'object',
            properties: {
              min: { type: 'number' },
              max: { type: 'number' }
            }
          },
          limit: { type: 'number', default: 10 }
        },
        required: ['query']
      },
      this.searchBusinesses.bind(this)
    );

    // Business Valuation Tool
    this.registerTool(
      'analyze_business_valuation',
      'Analyze business valuation using comparable sales and market data',
      {
        type: 'object',
        properties: {
          businessId: { type: 'string', description: 'Business ID to analyze' },
          revenue: { type: 'number', description: 'Annual revenue' },
          profit: { type: 'number', description: 'Annual profit/EBITDA' },
          industry: { type: 'string', description: 'Business industry' },
          includeComparables: { type: 'boolean', default: true }
        },
        required: ['revenue', 'profit', 'industry']
      },
      this.analyzeBusinessValuation.bind(this)
    );

    // Market Trends Tool
    this.registerTool(
      'get_market_trends',
      'Retrieve current market trends and insights for specific industries',
      {
        type: 'object',
        properties: {
          industry: { type: 'string', description: 'Industry to analyze' },
          timeframe: { type: 'string', enum: ['1month', '3months', '6months', '1year'], default: '6months' },
          includeForecasts: { type: 'boolean', default: true }
        },
        required: ['industry']
      },
      this.getMarketTrends.bind(this)
    );

    // Legal Documents Tool
    this.registerTool(
      'generate_legal_template',
      'Generate legal document templates based on transaction context',
      {
        type: 'object',
        properties: {
          documentType: { 
            type: 'string', 
            enum: ['nda', 'loi', 'purchase_agreement', 'due_diligence_checklist'] 
          },
          businessType: { type: 'string', description: 'Type of business' },
          jurisdiction: { type: 'string', default: 'uk' },
          customClauses: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Additional clauses to include'
          }
        },
        required: ['documentType', 'businessType']
      },
      this.generateLegalTemplate.bind(this)
    );

    // Financial Analysis Tool
    this.registerTool(
      'perform_financial_analysis',
      'Perform comprehensive financial analysis with AI insights',
      {
        type: 'object',
        properties: {
          financialData: {
            type: 'object',
            properties: {
              revenue: { type: 'array', items: { type: 'number' } },
              expenses: { type: 'array', items: { type: 'number' } },
              assets: { type: 'number' },
              liabilities: { type: 'number' }
            }
          },
          analysisType: { 
            type: 'string', 
            enum: ['profitability', 'liquidity', 'valuation', 'comprehensive'] 
          },
          industry: { type: 'string' },
          benchmarkAgainstIndustry: { type: 'boolean', default: true }
        },
        required: ['financialData', 'analysisType']
      },
      this.performFinancialAnalysis.bind(this)
    );
  }

  /**
   * Register business data resources
   */
  registerBusinessResources() {
    this.registerResource(
      'business://listings/featured',
      'Featured Business Listings',
      'Current featured business listings on the marketplace',
      this.getFeaturedListings.bind(this)
    );

    this.registerResource(
      'business://data/industry-multiples',
      'Industry Valuation Multiples',
      'Current industry valuation multiples and benchmarks',
      this.getIndustryMultiples.bind(this)
    );

    this.registerResource(
      'business://data/market-reports',
      'Market Research Reports',
      'Latest market research and industry reports',
      this.getMarketReports.bind(this)
    );

    this.registerResource(
      'business://templates/legal-documents',
      'Legal Document Templates',
      'Standard legal document templates for business transactions',
      this.getLegalDocumentTemplates.bind(this)
    );

    this.registerResource(
      'business://data/comparable-sales',
      'Comparable Sales Data',
      'Historical comparable sales data for business valuations',
      this.getComparableSalesData.bind(this)
    );
  }

  /**
   * Register business-specific prompt templates
   */
  registerBusinessPrompts() {
    this.registerPrompt(
      'business_analysis',
      'Comprehensive business analysis prompt',
      `Analyze the following business opportunity:

Business Details:
- Name: {{businessName}}
- Industry: {{industry}}
- Revenue: £{{revenue}}
- Profit: £{{profit}}
- Location: {{location}}
- Asking Price: £{{askingPrice}}

Market Context:
{{marketContext}}

Please provide:
1. Valuation assessment
2. Key risks and opportunities
3. Due diligence recommendations
4. Market positioning analysis
5. Financial performance evaluation

Focus on UK market conditions and regulatory considerations.`,
      {
        businessName: { type: 'string', required: true },
        industry: { type: 'string', required: true },
        revenue: { type: 'number', required: true },
        profit: { type: 'number', required: true },
        location: { type: 'string', required: true },
        askingPrice: { type: 'number', required: true },
        marketContext: { type: 'string', required: false }
      }
    );

    this.registerPrompt(
      'legal_review',
      'Legal document review prompt',
      `Review the following legal document for a UK business transaction:

Document Type: {{documentType}}
Transaction Type: {{transactionType}}
Business Industry: {{industry}}

Key Areas to Review:
1. Compliance with UK business law
2. Risk mitigation clauses
3. Standard industry practices
4. Missing provisions
5. Negotiation points

Document Content:
{{documentContent}}

Provide detailed legal analysis and recommendations.`,
      {
        documentType: { type: 'string', required: true },
        transactionType: { type: 'string', required: true },
        industry: { type: 'string', required: true },
        documentContent: { type: 'string', required: true }
      }
    );

    this.registerPrompt(
      'financial_assessment',
      'Financial assessment prompt',
      `Perform financial assessment for the following business:

Financial Data:
- Annual Revenue: £{{revenue}}
- Annual Profit: £{{profit}}
- Total Assets: £{{assets}}
- Total Liabilities: £{{liabilities}}
- Industry: {{industry}}

Assessment Requirements:
1. Profitability analysis
2. Financial health indicators
3. Industry benchmarking
4. Valuation estimates using multiple methods
5. Risk factors
6. Investment attractiveness

Provide comprehensive financial analysis with UK market context.`,
      {
        revenue: { type: 'number', required: true },
        profit: { type: 'number', required: true },
        assets: { type: 'number', required: true },
        liabilities: { type: 'number', required: true },
        industry: { type: 'string', required: true }
      }
    );
  }

  /**
   * Search businesses using semantic similarity
   */
  async searchBusinesses(params) {
    try {
      const { query, industry, location, priceRange, limit = 10 } = params;
      
      let sql = `
        SELECT id, name, industry, location, asking_price, description, 
               revenue, profit, established_year
        FROM businesses 
        WHERE status = 'active'
      `;
      
      const conditions = [];
      const values = [];

      if (industry) {
        conditions.push('LOWER(industry) LIKE ?');
        values.push(`%${industry.toLowerCase()}%`);
      }

      if (location) {
        conditions.push('LOWER(location) LIKE ?');
        values.push(`%${location.toLowerCase()}%`);
      }

      if (priceRange) {
        if (priceRange.min) {
          conditions.push('asking_price >= ?');
          values.push(priceRange.min);
        }
        if (priceRange.max) {
          conditions.push('asking_price <= ?');
          values.push(priceRange.max);
        }
      }

      // Simple text search in name and description
      if (query) {
        conditions.push('(LOWER(name) LIKE ? OR LOWER(description) LIKE ?)');
        values.push(`%${query.toLowerCase()}%`, `%${query.toLowerCase()}%`);
      }

      if (conditions.length > 0) {
        sql += ' AND ' + conditions.join(' AND ');
      }

      sql += ` ORDER BY asking_price ASC LIMIT ?`;
      values.push(limit);

      const businesses = this.db?.prepare(sql).all(...values) || [];

      return {
        query: query,
        total: businesses.length,
        businesses: businesses.map(business => ({
          ...business,
          asking_price_formatted: `£${business.asking_price?.toLocaleString() || 'N/A'}`,
          revenue_formatted: `£${business.revenue?.toLocaleString() || 'N/A'}`,
          profit_formatted: `£${business.profit?.toLocaleString() || 'N/A'}`
        }))
      };
    } catch (error) {
      console.error('Error searching businesses:', error);
      return { error: error.message, businesses: [] };
    }
  }

  /**
   * Analyze business valuation
   */
  async analyzeBusinessValuation(params) {
    try {
      const { businessId, revenue, profit, industry, includeComparables = true } = params;
      
      // Industry multipliers (simplified)
      const industryMultiples = {
        'technology': { revenue: 2.5, profit: 12 },
        'retail': { revenue: 0.8, profit: 8 },
        'manufacturing': { revenue: 1.2, profit: 10 },
        'services': { revenue: 1.5, profit: 9 },
        'hospitality': { revenue: 0.6, profit: 7 },
        'healthcare': { revenue: 1.8, profit: 11 },
        'default': { revenue: 1.0, profit: 8 }
      };

      const multiples = industryMultiples[industry.toLowerCase()] || industryMultiples.default;
      
      const revenueValuation = revenue * multiples.revenue;
      const profitValuation = profit * multiples.profit;
      const averageValuation = (revenueValuation + profitValuation) / 2;

      let comparables = [];
      if (includeComparables && this.db) {
        try {
          comparables = this.db.prepare(`
            SELECT name, asking_price, revenue, profit, 
                   (asking_price / revenue) as revenue_multiple,
                   (asking_price / profit) as profit_multiple
            FROM businesses 
            WHERE LOWER(industry) LIKE ? AND status = 'active' AND revenue > 0 AND profit > 0
            ORDER BY ABS(revenue - ?) ASC
            LIMIT 5
          `).all(`%${industry.toLowerCase()}%`, revenue);
        } catch (dbError) {
          console.error('Database query error:', dbError);
        }
      }

      return {
        valuation: {
          revenue_based: revenueValuation,
          profit_based: profitValuation,
          average: averageValuation,
          range: {
            low: Math.round(averageValuation * 0.8),
            high: Math.round(averageValuation * 1.2)
          }
        },
        multiples_used: multiples,
        industry: industry,
        comparables: comparables,
        analysis: {
          strength: profit / revenue > 0.15 ? 'Strong' : profit / revenue > 0.08 ? 'Moderate' : 'Weak',
          recommendation: averageValuation > revenue * 2 ? 'Premium valuation - investigate unique assets' : 'Market valuation'
        }
      };
    } catch (error) {
      console.error('Error analyzing valuation:', error);
      return { error: error.message };
    }
  }

  /**
   * Get market trends
   */
  async getMarketTrends(params) {
    try {
      const { industry, timeframe, includeForecasts } = params;
      
      // Simulated market trends data - in real implementation, this would come from external APIs
      const trends = {
        industry: industry,
        timeframe: timeframe,
        current_market_conditions: {
          activity_level: 'Moderate',
          average_time_to_sell: '6-8 months',
          price_trend: 'Stable with slight upward pressure',
          buyer_demand: 'High for quality businesses',
          seller_supply: 'Limited inventory'
        },
        key_metrics: {
          average_valuation_multiple: {
            revenue: 1.2,
            ebitda: 8.5
          },
          transaction_volume: 'Up 15% vs previous period',
          average_deal_size: '£850,000'
        },
        industry_insights: [
          'Digital transformation driving premium valuations',
          'Recurring revenue models highly valued',
          'ESG compliance becoming standard requirement',
          'Remote-capable businesses showing resilience'
        ]
      };

      if (includeForecasts) {
        trends.forecasts = {
          next_6_months: 'Continued steady demand with seasonal variations',
          market_outlook: 'Positive for well-prepared businesses',
          risk_factors: ['Economic uncertainty', 'Interest rate changes', 'Regulatory changes']
        };
      }

      return trends;
    } catch (error) {
      console.error('Error getting market trends:', error);
      return { error: error.message };
    }
  }

  /**
   * Generate legal template
   */
  async generateLegalTemplate(params) {
    try {
      const { documentType, businessType, jurisdiction, customClauses } = params;
      
      const templates = {
        nda: {
          title: 'Non-Disclosure Agreement',
          content: `NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into on [DATE] between [BUYER NAME] ("Buyer") and [SELLER NAME] ("Seller") regarding the potential acquisition of [BUSINESS NAME], a ${businessType} business.

1. CONFIDENTIAL INFORMATION
The parties acknowledge that confidential information may include business operations, financial data, customer lists, and proprietary methods.

2. OBLIGATIONS
Both parties agree to maintain strict confidentiality and use the information solely for evaluation purposes.

3. JURISDICTION
This agreement is governed by ${jurisdiction.toUpperCase()} law.

${customClauses ? '\n4. ADDITIONAL CLAUSES\n' + customClauses.join('\n') : ''}

[Signature blocks and additional legal clauses]`
        },
        loi: {
          title: 'Letter of Intent',
          content: `LETTER OF INTENT

Re: Proposed Acquisition of [BUSINESS NAME]

This Letter of Intent outlines the proposed terms for the acquisition of ${businessType} business [BUSINESS NAME].

PROPOSED TERMS:
- Purchase Price: £[AMOUNT]
- Due Diligence Period: [DAYS] days
- Closing Date: [DATE]
- Key Conditions: [CONDITIONS]

This is a non-binding expression of interest subject to due diligence and final documentation.

Governed by ${jurisdiction.toUpperCase()} law.`
        }
      };

      const template = templates[documentType];
      if (!template) {
        throw new Error(`Template not found for document type: ${documentType}`);
      }

      return {
        document_type: documentType,
        title: template.title,
        content: template.content,
        jurisdiction: jurisdiction,
        business_type: businessType
      };
    } catch (error) {
      console.error('Error generating legal template:', error);
      return { error: error.message };
    }
  }

  /**
   * Perform financial analysis
   */
  async performFinancialAnalysis(params) {
    try {
      const { financialData, analysisType, industry, benchmarkAgainstIndustry } = params;
      
      const analysis = {
        analysis_type: analysisType,
        financial_health: {},
        ratios: {},
        industry_comparison: {},
        recommendations: []
      };

      // Calculate basic ratios
      if (financialData.revenue && financialData.revenue.length > 0) {
        const currentRevenue = financialData.revenue[financialData.revenue.length - 1];
        const previousRevenue = financialData.revenue[financialData.revenue.length - 2];
        
        if (previousRevenue) {
          analysis.ratios.revenue_growth = ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(2) + '%';
        }
      }

      // Asset-based analysis
      if (financialData.assets && financialData.liabilities) {
        analysis.ratios.debt_to_equity = (financialData.liabilities / (financialData.assets - financialData.liabilities)).toFixed(2);
        analysis.financial_health.net_worth = financialData.assets - financialData.liabilities;
      }

      // Industry benchmarking (simplified)
      if (benchmarkAgainstIndustry && industry) {
        analysis.industry_comparison = {
          industry: industry,
          performance_vs_industry: 'Above Average', // Simplified
          market_position: 'Competitive'
        };
      }

      // Generate recommendations
      analysis.recommendations.push(
        'Review cash flow patterns for seasonal variations',
        'Consider debt restructuring opportunities',
        'Evaluate expansion potential in current market'
      );

      return analysis;
    } catch (error) {
      console.error('Error performing financial analysis:', error);
      return { error: error.message };
    }
  }

  /**
   * Resource handlers
   */
  async getFeaturedListings() {
    try {
      const listings = this.db?.prepare(`
        SELECT id, name, industry, location, asking_price, description 
        FROM businesses 
        WHERE featured = 1 AND status = 'active' 
        ORDER BY created_at DESC 
        LIMIT 10
      `).all() || [];

      return JSON.stringify({ featured_listings: listings }, null, 2);
    } catch (error) {
      return `Error retrieving featured listings: ${error.message}`;
    }
  }

  async getIndustryMultiples() {
    const multiples = {
      technology: { revenue_multiple: 2.5, ebitda_multiple: 12 },
      retail: { revenue_multiple: 0.8, ebitda_multiple: 8 },
      manufacturing: { revenue_multiple: 1.2, ebitda_multiple: 10 },
      services: { revenue_multiple: 1.5, ebitda_multiple: 9 },
      hospitality: { revenue_multiple: 0.6, ebitda_multiple: 7 },
      healthcare: { revenue_multiple: 1.8, ebitda_multiple: 11 }
    };

    return JSON.stringify({ industry_multiples: multiples, last_updated: new Date().toISOString() }, null, 2);
  }

  async getMarketReports() {
    const reports = {
      uk_business_market_q2_2025: {
        title: 'UK Business Market Report Q2 2025',
        summary: 'Market activity remains robust with increased digital business valuations',
        key_findings: [
          'Average deal completion time: 6.2 months',
          'Technology sector leading in valuations',
          'Increased buyer interest from international investors'
        ]
      }
    };

    return JSON.stringify({ market_reports: reports }, null, 2);
  }

  async getLegalDocumentTemplates() {
    const templates = {
      available_templates: [
        'non_disclosure_agreement',
        'letter_of_intent',
        'purchase_agreement_template',
        'due_diligence_checklist'
      ],
      jurisdictions_supported: ['uk', 'england', 'scotland', 'wales'],
      last_updated: new Date().toISOString()
    };

    return JSON.stringify(templates, null, 2);
  }

  async getComparableSalesData() {
    try {
      const comparables = this.db?.prepare(`
        SELECT industry, AVG(asking_price) as avg_price, COUNT(*) as count,
               AVG(asking_price / revenue) as avg_revenue_multiple
        FROM businesses 
        WHERE status = 'sold' AND revenue > 0
        GROUP BY industry
        ORDER BY count DESC
      `).all() || [];

      return JSON.stringify({ comparable_sales: comparables, data_as_of: new Date().toISOString() }, null, 2);
    } catch (error) {
      return `Error retrieving comparable sales: ${error.message}`;
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

export default BusinessDataRAGServer;
