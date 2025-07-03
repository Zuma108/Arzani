#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import pineconeService from '../services/pineconeService.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate vector embeddings from text using OpenAI
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
 * MCP Server for Business Valuation RAG
 * Provides search capabilities over business valuation knowledge base
 */
class BusinessValuationRAGServer {
  constructor() {
    this.server = new Server(
      {
        name: 'business-valuation-rag',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_business_valuations',
            description: 'Search business valuation cases and examples based on query',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query for business valuation information'
                },
                industry: {
                  type: 'string',
                  description: 'Filter by specific industry (optional)'
                },
                min_revenue: {
                  type: 'number',
                  description: 'Minimum revenue filter (optional)'
                },
                max_revenue: {
                  type: 'number',
                  description: 'Maximum revenue filter (optional)'
                },
                min_value: {
                  type: 'number',
                  description: 'Minimum valuation filter (optional)'
                },
                max_value: {
                  type: 'number',
                  description: 'Maximum valuation filter (optional)'
                },
                limit: {
                  type: 'number',
                  description: 'Number of results to return (default: 10)',
                  default: 10
                }
              },
              required: ['query']
            }
          },
          {
            name: 'get_industry_benchmarks',
            description: 'Get industry-specific valuation benchmarks and metrics',
            inputSchema: {
              type: 'object',
              properties: {
                industry: {
                  type: 'string',
                  description: 'Industry name to get benchmarks for'
                },
                limit: {
                  type: 'number',
                  description: 'Number of results to return (default: 5)',
                  default: 5
                }
              },
              required: ['industry']
            }
          },
          {
            name: 'find_similar_businesses',
            description: 'Find businesses similar to a given description or characteristics',
            inputSchema: {
              type: 'object',
              properties: {
                description: {
                  type: 'string',
                  description: 'Description of the business to find similar cases for'
                },
                revenue: {
                  type: 'number',
                  description: 'Revenue of the business (optional)'
                },
                industry: {
                  type: 'string',
                  description: 'Industry of the business (optional)'
                },
                location: {
                  type: 'string',
                  description: 'Location of the business (optional)'
                },
                limit: {
                  type: 'number',
                  description: 'Number of results to return (default: 8)',
                  default: 8
                }
              },
              required: ['description']
            }
          },
          {
            name: 'get_valuation_multiples',
            description: 'Get valuation multiples and benchmarks for specific criteria',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Query for specific valuation multiples or benchmarks'
                },
                industry: {
                  type: 'string',
                  description: 'Filter by industry (optional)'
                },
                multiple_type: {
                  type: 'string',
                  description: 'Type of multiple (revenue, ebitda, etc.) (optional)'
                },
                limit: {
                  type: 'number',
                  description: 'Number of results to return (default: 10)',
                  default: 10
                }
              },
              required: ['query']
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_business_valuations':
            return await this.searchBusinessValuations(args);
          case 'get_industry_benchmarks':
            return await this.getIndustryBenchmarks(args);
          case 'find_similar_businesses':
            return await this.findSimilarBusinesses(args);
          case 'get_valuation_multiples':
            return await this.getValuationMultiples(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ]
        };
      }
    });
  }

  /**
   * Search business valuation cases
   */
  async searchBusinessValuations(args) {
    const { query, industry, min_revenue, max_revenue, min_value, max_value, limit = 10 } = args;

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Build filter
    let filter = {
      type: { $eq: 'business_valuation' }
    };

    if (industry) {
      filter.industry = { $eq: industry };
    }

    if (min_revenue !== undefined) {
      filter.revenue = { ...(filter.revenue || {}), $gte: min_revenue };
    }

    if (max_revenue !== undefined) {
      filter.revenue = { ...(filter.revenue || {}), $lte: max_revenue };
    }

    if (min_value !== undefined) {
      filter.estimated_value = { ...(filter.estimated_value || {}), $gte: min_value };
    }

    if (max_value !== undefined) {
      filter.estimated_value = { ...(filter.estimated_value || {}), $lte: max_value };
    }

    // Perform vector search
    const searchResults = await pineconeService.queryVectors({
      queryVector: queryEmbedding,
      topK: parseInt(limit),
      filter: Object.keys(filter).length > 1 ? filter : { type: { $eq: 'business_valuation' } }
    });

    // Format results
    const results = searchResults.matches.map(match => ({
      similarity: match.score,
      business_name: match.metadata.business_name,
      industry: match.metadata.industry,
      location: match.metadata.location,
      revenue: match.metadata.revenue,
      ebitda: match.metadata.ebitda,
      estimated_value: match.metadata.estimated_value,
      valuation_range: `£${match.metadata.valuation_range_min?.toLocaleString()} - £${match.metadata.valuation_range_max?.toLocaleString()}`,
      multiple_used: `${match.metadata.multiple_used}x ${match.metadata.multiple_type}`,
      confidence_score: match.metadata.confidence_score,
      years_in_operation: match.metadata.years_in_operation,
      text_preview: match.metadata.text_content
    }));

    const responseText = `Found ${results.length} relevant business valuation cases:\n\n` +
      results.map((result, index) => 
        `${index + 1}. ${result.business_name} (${result.industry})\n` +
        `   Location: ${result.location}\n` +
        `   Revenue: £${result.revenue?.toLocaleString()}\n` +
        `   EBITDA: £${result.ebitda?.toLocaleString()}\n` +
        `   Estimated Value: £${result.estimated_value?.toLocaleString()}\n` +
        `   Valuation Range: ${result.valuation_range}\n` +
        `   Multiple Used: ${result.multiple_used}\n` +
        `   Confidence: ${result.confidence_score}%\n` +
        `   Years Operating: ${result.years_in_operation}\n` +
        `   Similarity: ${(result.similarity * 100).toFixed(1)}%\n`
      ).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: responseText
        }
      ]
    };
  }

  /**
   * Get industry benchmarks
   */
  async getIndustryBenchmarks(args) {
    const { industry, limit = 5 } = args;

    // Generate embedding for industry query
    const queryText = `${industry} industry valuation benchmarks metrics multiples`;
    const queryEmbedding = await generateEmbedding(queryText);

    // Build filter for industry metrics
    let filter = {
      type: { $eq: 'industry_metrics' }
    };

    if (industry) {
      filter.industry = { $eq: industry };
    }

    // Perform vector search
    const searchResults = await pineconeService.queryVectors({
      queryVector: queryEmbedding,
      topK: parseInt(limit),
      filter
    });

    // Format results
    const results = searchResults.matches.map(match => ({
      similarity: match.score,
      industry: match.metadata.industry,
      avg_sales_multiple: match.metadata.avg_sales_multiple,
      avg_ebitda_multiple: match.metadata.avg_ebitda_multiple,
      avg_profit_margin: match.metadata.avg_profit_margin,
      business_count: match.metadata.business_count,
      median_price: match.metadata.median_price,
      avg_revenue: match.metadata.avg_revenue,
      avg_ebitda: match.metadata.avg_ebitda,
      growth_rate: match.metadata.growth_rate,
      risk_score: match.metadata.risk_score,
      market_conditions: match.metadata.market_conditions
    }));

    const responseText = `Industry benchmarks for "${industry}":\n\n` +
      results.map((result, index) => 
        `${index + 1}. ${result.industry} Industry\n` +
        `   Average Sales Multiple: ${result.avg_sales_multiple}x\n` +
        `   Average EBITDA Multiple: ${result.avg_ebitda_multiple}x\n` +
        `   Average Profit Margin: ${result.avg_profit_margin}%\n` +
        `   Businesses Analyzed: ${result.business_count}\n` +
        `   Median Price: £${result.median_price?.toLocaleString()}\n` +
        `   Average Revenue: £${result.avg_revenue?.toLocaleString()}\n` +
        `   Average EBITDA: £${result.avg_ebitda?.toLocaleString()}\n` +
        `   Growth Rate: ${result.growth_rate}%\n` +
        `   Risk Score: ${result.risk_score}\n` +
        `   Market Conditions: ${result.market_conditions}\n` +
        `   Relevance: ${(result.similarity * 100).toFixed(1)}%\n`
      ).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: responseText
        }
      ]
    };
  }

  /**
   * Find similar businesses
   */
  async findSimilarBusinesses(args) {
    const { description, revenue, industry, location, limit = 8 } = args;

    // Create comprehensive query text
    let queryText = description;
    if (revenue) queryText += ` revenue £${revenue}`;
    if (industry) queryText += ` ${industry} industry`;
    if (location) queryText += ` location ${location}`;

    // Generate embedding
    const queryEmbedding = await generateEmbedding(queryText);

    // Build filter
    let filter = {
      type: { $eq: 'business_valuation' }
    };

    if (industry) {
      filter.industry = { $eq: industry };
    }

    // Perform vector search
    const searchResults = await pineconeService.queryVectors({
      queryVector: queryEmbedding,
      topK: parseInt(limit),
      filter
    });

    // Format results
    const results = searchResults.matches.map(match => ({
      similarity: match.score,
      business_name: match.metadata.business_name,
      industry: match.metadata.industry,
      location: match.metadata.location,
      revenue: match.metadata.revenue,
      ebitda: match.metadata.ebitda,
      estimated_value: match.metadata.estimated_value,
      multiple_used: match.metadata.multiple_used,
      multiple_type: match.metadata.multiple_type,
      years_in_operation: match.metadata.years_in_operation,
      employee_count: match.metadata.employee_count
    }));

    const responseText = `Found ${results.length} similar businesses:\n\n` +
      results.map((result, index) => 
        `${index + 1}. ${result.business_name}\n` +
        `   Industry: ${result.industry}\n` +
        `   Location: ${result.location}\n` +
        `   Revenue: £${result.revenue?.toLocaleString()}\n` +
        `   EBITDA: £${result.ebitda?.toLocaleString()}\n` +
        `   Estimated Value: £${result.estimated_value?.toLocaleString()}\n` +
        `   Multiple: ${result.multiple_used}x ${result.multiple_type}\n` +
        `   Years Operating: ${result.years_in_operation}\n` +
        `   Employees: ${result.employee_count}\n` +
        `   Similarity: ${(result.similarity * 100).toFixed(1)}%\n`
      ).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: responseText
        }
      ]
    };
  }

  /**
   * Get valuation multiples
   */
  async getValuationMultiples(args) {
    const { query, industry, multiple_type, limit = 10 } = args;

    // Create comprehensive query text
    let queryText = `${query} valuation multiples`;
    if (industry) queryText += ` ${industry}`;
    if (multiple_type) queryText += ` ${multiple_type}`;

    // Generate embedding
    const queryEmbedding = await generateEmbedding(queryText);

    // Build filter to include both business valuations and industry metrics
    let filter = {};

    if (industry) {
      filter.industry = { $eq: industry };
    }

    if (multiple_type) {
      filter.multiple_type = { $eq: multiple_type };
    }

    // Perform vector search
    const searchResults = await pineconeService.queryVectors({
      queryVector: queryEmbedding,
      topK: parseInt(limit),
      filter: Object.keys(filter).length > 0 ? filter : undefined
    });

    // Format results
    const results = searchResults.matches.map(match => {
      if (match.metadata.type === 'industry_metrics') {
        return {
          type: 'Industry Benchmark',
          similarity: match.score,
          industry: match.metadata.industry,
          sales_multiple: match.metadata.avg_sales_multiple,
          ebitda_multiple: match.metadata.avg_ebitda_multiple,
          profit_margin: match.metadata.avg_profit_margin,
          business_count: match.metadata.business_count
        };
      } else {
        return {
          type: 'Business Case',
          similarity: match.score,
          business_name: match.metadata.business_name,
          industry: match.metadata.industry,
          revenue: match.metadata.revenue,
          estimated_value: match.metadata.estimated_value,
          multiple_used: match.metadata.multiple_used,
          multiple_type: match.metadata.multiple_type
        };
      }
    });

    const responseText = `Valuation multiples and benchmarks:\n\n` +
      results.map((result, index) => {
        if (result.type === 'Industry Benchmark') {
          return `${index + 1}. ${result.industry} Industry Benchmarks\n` +
            `   Average Sales Multiple: ${result.sales_multiple}x\n` +
            `   Average EBITDA Multiple: ${result.ebitda_multiple}x\n` +
            `   Average Profit Margin: ${result.profit_margin}%\n` +
            `   Based on ${result.business_count} businesses\n` +
            `   Relevance: ${(result.similarity * 100).toFixed(1)}%\n`;
        } else {
          return `${index + 1}. ${result.business_name} (${result.industry})\n` +
            `   Revenue: £${result.revenue?.toLocaleString()}\n` +
            `   Valuation: £${result.estimated_value?.toLocaleString()}\n` +
            `   Multiple Used: ${result.multiple_used}x ${result.multiple_type}\n` +
            `   Relevance: ${(result.similarity * 100).toFixed(1)}%\n`;
        }
      }).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: responseText
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Business Valuation RAG MCP server running on stdio');
  }
}

// Start the server
const server = new BusinessValuationRAGServer();
server.run().catch(console.error);
