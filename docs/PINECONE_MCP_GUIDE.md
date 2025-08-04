# How to Add Data to Pinecone for MCP RAG System

## Overview
This guide shows you how to populate your Pinecone vector database with business valuation data for the MCP (Model Context Protocol) RAG system.

## 🎯 Quick Start

### Option 1: Use the Automated Script
```bash
node add-data-to-pinecone-mcp.js
```

### Option 2: Manual API Approach (if scripts hang)
If Node.js scripts are hanging, you can use Pinecone's web interface or REST API:

1. **Access Pinecone Console**: https://app.pinecone.io/
2. **Find your index**: `marketplace-index`
3. **Use the web interface to upload vectors**

## 📊 Data Structure

### Business Record Format
```javascript
{
  id: 'business_unique_id',
  business_name: 'Company Name Ltd',
  industry: 'Technology/Software',
  annual_revenue: 1500000,
  ebitda: 300000,
  location: 'London, UK',
  employees: 18,
  valuation_multiple: 5.5,
  asking_price: 1800000,
  description: 'Business description...',
  financial_highlights: 'Key financial metrics...',
  risk_factors: ['Risk 1', 'Risk 2'],
  growth_potential: 'High/Medium/Low - description',
  mcp_category: 'category_tag'
}
```

### Vector Metadata Structure
```javascript
{
  business_name: "Company Name",
  industry: "Technology/Software",
  location: "London, UK",
  annual_revenue: 1500000,
  ebitda: 300000,
  ebitda_margin: 20.0,
  employees: 18,
  valuation_multiple: 5.5,
  asking_price: 1800000,
  mcp_category: "high_value_tech",
  revenue_tier: "medium", // small/medium/large
  employee_tier: "medium", // small/medium/large
  search_text: "Full formatted text for search...",
  created_for_mcp: "2025-06-04T18:00:00.000Z"
}
```

## 🔧 Manual Steps (Alternative Approach)

### Step 1: Prepare Your Data
Create a JSON file with your business data:

```json
[
  {
    "id": "biz_001",
    "business_name": "Your Business Name",
    "industry": "Your Industry",
    "annual_revenue": 1000000,
    "ebitda": 200000,
    "location": "City, Country",
    "employees": 10,
    "valuation_multiple": 4.0,
    "asking_price": 900000,
    "description": "Business description",
    "financial_highlights": "Key metrics",
    "risk_factors": ["Risk 1", "Risk 2"],
    "growth_potential": "Growth description",
    "mcp_category": "category"
  }
]
```

### Step 2: Generate Embeddings
Use OpenAI API to generate embeddings for each business:

```javascript
// Format business for search
const searchText = `
Business: ${business.business_name}
Industry: ${business.industry}
Revenue: £${business.annual_revenue}
EBITDA: £${business.ebitda}
Location: ${business.location}
Description: ${business.description}
...
`;

// Generate embedding
const embedding = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: searchText
});
```

### Step 3: Upload to Pinecone
Upload vectors to your Pinecone index:

```javascript
// Using existing service
await pineconeService.upsertVectors([{
  id: business.id,
  values: embedding.data[0].embedding,
  metadata: { /* business metadata */ }
}]);
```

## 🧪 Testing Your Data

### Test Search Functionality
```javascript
// Search for businesses
const results = await pineconeService.queryVectors({
  vector: queryEmbedding.data[0].embedding,
  topK: 5,
  includeMetadata: true
});
```

### Sample Test Queries
- "Technology companies in London with high growth"
- "Manufacturing businesses with revenue over £2M"
- "Service companies with EBITDA margin above 15%"
- "Businesses suitable for acquisition under £1M"

## 🔄 Integration with MCP

### 1. Start MCP Server
```bash
node mcp-servers/business-valuation-rag.js
```

### 2. Available MCP Tools
- `search_business_valuations`: Search businesses by criteria
- `get_industry_benchmarks`: Get industry-specific metrics
- `find_similar_businesses`: Find similar businesses
- `get_valuation_multiples`: Get valuation data

### 3. Test with Agents
```javascript
// Finance Agent
const financeAgent = new MCPFinanceAgent();
const result = await financeAgent.searchBusinesses("tech companies London");

// Broker Agent  
const brokerAgent = new MCPBrokerAgent();
const matches = await brokerAgent.findSimilarBusinesses(businessCriteria);

// Legal Agent
const legalAgent = new MCPLegalAgent();
const analysis = await legalAgent.analyzeInvestmentRisks(businessId);
```

## 📈 Data Categories for MCP

### Recommended Categories
- `high_value_tech`: Technology companies >£1M revenue
- `stable_manufacturing`: Manufacturing with stable cash flow
- `service_consulting`: Professional services firms
- `growth_potential`: High-growth businesses
- `acquisition_ready`: Businesses ready for acquisition
- `distressed_assets`: Distressed sale opportunities

### Revenue Tiers
- `small`: <£1M annual revenue
- `medium`: £1M-£5M annual revenue  
- `large`: >£5M annual revenue

### Employee Tiers
- `small`: <15 employees
- `medium`: 15-50 employees
- `large`: >50 employees

## 🚨 Troubleshooting

### If Scripts Hang
1. Kill Node processes: `Stop-Process -Name node -Force`
2. Check environment variables in `.env`
3. Test Pinecone API key manually
4. Use Pinecone web console as backup

### Connection Issues
1. Verify PINECONE_API_KEY in `.env`
2. Check OPENAI_API_KEY in `.env`
3. Ensure internet connectivity
4. Try smaller batch sizes

### Search Not Working
1. Verify vectors were uploaded successfully
2. Check embedding dimensions match (1536 for text-embedding-3-small)
3. Test with simpler queries first
4. Check metadata filters

## ✅ Success Checklist

- [ ] Pinecone index exists and accessible
- [ ] Business data formatted correctly
- [ ] Embeddings generated successfully
- [ ] Vectors uploaded to Pinecone
- [ ] Search functionality tested
- [ ] MCP server starts without errors
- [ ] Agents can query the system
- [ ] Results are relevant and accurate

## 📞 Support

If you need help:
1. Check the logs for specific error messages
2. Verify all environment variables are set
3. Test individual components separately
4. Use the web interfaces as fallbacks
