# Business Valuation RAG MCP System

This system enhances the marketplace's AI agents (Finance, Broker, Legal) with retrieval-augmented generation (RAG) capabilities for business valuation data.

## Overview

The RAG MCP system provides:
- **Vector-based search** of business valuation cases and industry benchmarks
- **MCP server** for structured access to valuation knowledge
- **Enhanced AI agents** with contextual business valuation insights
- **Real-time queries** against the business valuation database

## Architecture

```
Database (PostgreSQL) 
    ↓ (extract & vectorize)
Vector Database (Pinecone)
    ↓ (MCP protocol)
RAG MCP Server
    ↓ (enhanced agents)
Finance Agent | Broker Agent | Legal Agent
```

## Components

### 1. Data Population (`scripts/populate-rag-data.js`)
Extracts business valuation data from your PostgreSQL database and creates vector embeddings:

- **Business Valuations**: Individual valuation cases with full context
- **Industry Metrics**: Benchmarks and multipliers by industry
- **Vector Embeddings**: OpenAI text-embedding-3-small (1536 dimensions)

### 2. MCP RAG Server (`mcp-servers/business-valuation-rag.js`)
Provides structured access to the valuation knowledge base:

**Tools Available:**
- `search_business_valuations` - Find relevant valuation cases
- `get_industry_benchmarks` - Get industry-specific metrics
- `find_similar_businesses` - Find comparable businesses
- `get_valuation_multiples` - Get valuation multiples and benchmarks

### 3. Enhanced Agents (`services/mcp/enhanced-agent-integration.js`)
AI agents with RAG capabilities:

- **MCPFinanceAgent**: Financial analysis with industry context
- **MCPBrokerAgent**: Market insights and pricing recommendations  
- **MCPLegalAgent**: Legal precedents and valuation support

## Setup Instructions

### 1. Prerequisites
Ensure you have:
- PostgreSQL database with business valuation data
- Pinecone account and API key
- OpenAI API key
- Node.js and required dependencies

### 2. Environment Variables
Add to your `.env` file:
```bash
# OpenAI for embeddings
OPENAI_API_KEY=your_openai_key

# Pinecone for vector storage
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX_NAME=marketplace-index

# Database (should already exist)
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=your_db_host
DB_NAME=your_db_name
DB_PORT=5432
```

### 3. Install Dependencies
```bash
npm install @modelcontextprotocol/sdk @pinecone-database/pinecone openai
```

### 4. Populate RAG Data
Run the data population script:
```bash
# Full setup (populate + test)
node scripts/test-rag-integration.js full

# Or just populate data
node scripts/test-rag-integration.js populate
```

### 5. Test Integration
```bash
# Test the RAG integration
node scripts/test-rag-integration.js test
```

## Usage Examples

### Finance Agent with RAG
```javascript
import { mcpFinanceAgent } from './services/mcp/enhanced-agent-integration.js';

// Initialize the agent
await mcpFinanceAgent.initialize();

// Analyze a business with RAG context
const analysis = await mcpFinanceAgent.analyzeBusinessValuation({
  business_name: 'Local Restaurant',
  industry: 'Food & Beverage',
  revenue: 250000,
  ebitda: 45000,
  description: 'Popular family restaurant'
});

console.log(analysis.industry_benchmarks);
console.log(analysis.similar_businesses);
console.log(analysis.analysis);

await mcpFinanceAgent.shutdown();
```

### Direct RAG Queries
```javascript
import { BusinessValuationRAGClient } from './services/mcp/enhanced-agent-integration.js';

const ragClient = new BusinessValuationRAGClient();
await ragClient.connect();

// Search for restaurant valuations
const results = await ragClient.searchBusinessValuations(
  'restaurant food service business valuation',
  { 
    industry: 'Food & Beverage',
    min_revenue: 100000,
    max_revenue: 500000,
    limit: 5
  }
);

// Get industry benchmarks
const benchmarks = await ragClient.getIndustryBenchmarks('Technology');

await ragClient.disconnect();
```

## Data Sources

The RAG system extracts data from these database tables:

### `questionnaire_submissions`
- Business details (name, industry, description)
- Financial data (revenue, EBITDA, assets, debt)
- Operational data (years in operation, employees)
- Location and business characteristics

### `business_valuations`
- Valuation results and ranges
- Multiples used and confidence scores
- Valuation summaries and detailed analysis

### `industry_metrics`
- Industry-specific multipliers
- Market benchmarks and averages
- Risk scores and growth rates

## RAG Query Capabilities

### 1. Semantic Search
Find businesses and valuations based on natural language queries:
- "tech startup with recurring revenue model"
- "manufacturing business in the Midlands with 50+ employees"
- "restaurant with strong EBITDA margins"

### 2. Filtered Search
Combine semantic search with structured filters:
- Revenue ranges (min/max)
- Industry categories
- Geographic locations
- Valuation ranges
- Business characteristics

### 3. Industry Analysis
Get comprehensive industry insights:
- Average valuation multiples
- Market trends and conditions
- Risk assessments
- Benchmark comparisons

### 4. Comparable Analysis
Find similar businesses for valuation purposes:
- Size-based comparables
- Industry-specific matches
- Geographic proximity
- Business model similarities

## Vector Embedding Strategy

### Text Preparation
Each business record is converted to comprehensive text including:
```
Business: [Name] | Industry: [Industry] | Location: [Location]
Financials: Revenue £[X], EBITDA £[Y], Growth [Z]%
Valuation: £[Value] ([Min]-[Max]), [Multiple]x [Type]
Context: [Description and additional details]
```

### Metadata Storage
Rich metadata enables precise filtering:
- Financial metrics (revenue, EBITDA, valuation)
- Business characteristics (industry, location, size)
- Valuation details (multiples, confidence, methodology)
- Temporal data (dates, trends)

## Integration with Existing Agents

The RAG system enhances your existing agents:

### Finance Agent Enhancement
- Industry benchmark context for valuations
- Comparable business analysis
- Historical valuation trend data
- Risk assessment insights

### Broker Agent Enhancement  
- Market pricing intelligence
- Comparable sales data
- Industry-specific selling strategies
- Buyer preference insights

### Legal Agent Enhancement
- Valuation methodology precedents
- Industry-standard practices
- Documentation requirements
- Legal compliance considerations

## Performance Considerations

### Vector Search Performance
- Pinecone provides sub-100ms search times
- Embedding generation adds ~200ms per query
- Batch operations for efficiency
- Caching for frequent queries

### Data Freshness
- Manual refresh of vector database
- Incremental updates for new data
- Periodic full refresh recommended
- Real-time updates not currently supported

## Troubleshooting

### Common Issues

1. **"RAG client not connected"**
   - Ensure MCP server is running
   - Check environment variables
   - Verify Pinecone connectivity

2. **"No vectors found"**
   - Run data population script
   - Check Pinecone index exists
   - Verify database connectivity

3. **"Embedding generation failed"**
   - Check OpenAI API key
   - Verify API quota
   - Check network connectivity

### Debug Mode
Enable verbose logging:
```bash
DEBUG=mcp:* node scripts/test-rag-integration.js test
```

### Health Checks
```bash
# Test database connection
node scripts/test-rag-integration.js populate

# Test vector search
node scripts/test-rag-integration.js test

# Full system test
node scripts/test-rag-integration.js full
```

## Future Enhancements

### Planned Features
- Real-time data synchronization
- Advanced filtering capabilities
- Multi-language support
- Custom embedding models
- Analytics and usage tracking

### Integration Opportunities
- Claude/ChatGPT integration
- Business listing search enhancement
- Automated valuation reports
- Market trend analysis
- Competitive intelligence

## Configuration

All settings are managed through:
- `config/mcp-config.json` - MCP server configuration
- `.env` - Environment variables
- Individual agent options in code

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review logs for error details
3. Test individual components
4. Verify all prerequisites are met

The RAG MCP system provides powerful contextual intelligence to your business valuation agents, enabling more accurate and insightful analysis based on real market data and industry benchmarks.
