# 🚀 Quick Start - Hybrid Knowledge Retrieval System

## ✅ What's Been Implemented

Your AI agents now have a **complete hybrid knowledge retrieval system** that combines:

- **🔍 Brave MCP** - Real-time web search with rich summaries
- **🌲 Pinecone** - Vector database for static knowledge
- **📄 User Documents** - Personalized knowledge base

## 🎯 One-Command Setup

```bash
npm run start:hybrid
```

This will:
1. ✅ Check your environment variables
2. 🚀 Start all MCP servers (Brave, Firecrawl, Pinecone)
3. 🧪 Run comprehensive tests
4. 🎉 Confirm everything is working

## 📋 Prerequisites

### Required Environment Variables

Add these to your `.env` file:

```bash
# MCP API Keys
BRAVE_API_KEY=your_brave_search_api_key
PINECONE_API_KEY=your_pinecone_api_key

# OpenAI for embeddings and responses
OPENAI_API_KEY=your_openai_api_key

# Pinecone configuration
PINECONE_INDEX_NAME=marketplace-index
```

### Get API Keys

1. **Brave Search API**: [brave.com/search/api](https://brave.com/search/api)
2. **Pinecone**: [pinecone.io](https://pinecone.io)
3. **OpenAI**: [platform.openai.com](https://platform.openai.com)

## 🧪 Testing Individual Components

```bash
# Test just MCP servers
npm run start:mcp

# Test entire hybrid system
npm run test:hybrid
```

## 🎯 How It Works

### Before (Static Only)
```
User Query → Static Knowledge Base → Response
```

### After (Hybrid System) ⭐
```
User Query → User Documents + Static Knowledge + Real-Time Search → Enhanced Response
```

### Example Query Flow

1. **User asks**: *"What are the latest UK M&A compliance requirements?"*

2. **System checks**:
   - 📄 User's uploaded legal documents
   - 📚 Static legal knowledge base
   - 🔍 **Real-time Brave search** for "UK M&A compliance 2025"
   - � **Rich search summaries** from gov.uk and legal sites

3. **Agent responds** with comprehensive, current information

## 🎉 What Your Agents Can Now Do

### Revenue Agent
- Access current market trends and growth strategies
- Get real-time business intelligence
- Combine static business knowledge with live market data

### Finance Agent  
- Access current EBITDA multiples and valuations
- Get real-time financial news and regulations
- Combine financial models with live market conditions

### Legal Agent
- Access current UK business law changes
- Get real-time compliance updates
- Combine legal templates with current regulations

### Orchestrator
- Better intent classification with current context
- More accurate agent routing decisions
- Enhanced delegation with real-time insights

## 📈 Performance Features

- **Smart Fallback**: Only uses real-time search when confidence is low
- **Caching**: Results are cached to avoid repeated API calls
- **Error Resilience**: Graceful fallbacks if MCP servers fail
- **Cost Optimization**: Intelligent routing to minimize API usage

## 🔧 Advanced Usage

### Force Real-Time Search
```javascript
const result = await knowledgeRetriever.retrieveKnowledge(
  'latest UK business regulations 2025',
  'legal',
  userId,
  { forceSearch: true } // Always use real-time search
);
```

### Confidence-Based Routing
```javascript
// System automatically uses real-time search if confidence < 0.6
const result = await knowledgeRetriever.retrieveKnowledge(
  'specific query with low static knowledge',
  'revenue',
  userId,
  { searchFallback: true }
);
```

## 🎯 Next Steps

1. **Start your agent servers**:
   ```bash
   npm run start:agents-only
   ```

2. **Test with real queries** - your agents now have hybrid retrieval!

3. **Monitor performance** - check logs for confidence scores and search usage

4. **Read full documentation**: `docs/BRAVE_MCP_INTEGRATION.md`

## 🚨 Troubleshooting

### MCP Servers Won't Start
- ✅ Check API keys in `.env`
- ✅ Ensure Node.js version >= 18
- ✅ Run `npm install` to install dependencies

### Tests Failing
- ✅ Verify internet connection for real-time search
- ✅ Check API rate limits aren't exceeded
- ✅ Ensure Pinecone index exists and is accessible

### Low Performance
- ✅ Monitor API usage and costs
- ✅ Adjust confidence thresholds in `hybrid-retrieval.js`
- ✅ Consider caching for frequently requested information

---

## 🎉 Success!

Your AI agents now have a **powerful hybrid knowledge system** that provides:

- ✅ **Current information** via real-time search with rich summaries
- ✅ **Comprehensive coverage** from multiple sources  
- ✅ **Personalized responses** with user documents
- ✅ **Cost-effective** intelligent routing (no scraping costs)
- ✅ **Reliable fallbacks** for error resilience

**Happy querying!** 🚀
