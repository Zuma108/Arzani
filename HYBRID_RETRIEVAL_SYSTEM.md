# Hybrid Knowledge Retrieval System for Multi-Agent AI Platform

## 🎯 **System Overview**

The Hybrid Knowledge Retrieval System combines **Brave Search** (real-time web search) and **Pinecone RAG** (vector document search) with **sequential thinking** and **knowledge mapping** to provide intelligent, adaptive knowledge retrieval for AI agents.

## 🏗️ **Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    AI AGENTS LAYER                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────│
│  │Orchestrator │ │   Finance   │ │    Legal    │ │ Revenue ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘│
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│               HYBRID RETRIEVAL LAYER                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │          HybridKnowledgeRetriever                       ││
│  │  • Agent-specific namespaces                           ││
│  │  • Confidence scoring & adaptive thresholds            ││
│  │  • Result ranking & deduplication                      ││
│  │  • Knowledge memory & pattern learning                 ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                 MCP INTEGRATION LAYER                       │
│  ┌─────────────────┐              ┌─────────────────────────┐│
│  │  Brave Search   │              │     Pinecone RAG       ││
│  │  • Real-time    │              │  • Vector embeddings   ││
│  │  • Web search   │              │  • Document search     ││
│  │  • MCP client   │              │  • MCP + SDK fallback  ││
│  └─────────────────┘              └─────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## 📁 **File Structure**

```
services/
├── knowledge/
│   ├── hybrid-retrieval.js         # Main hybrid retrieval system
│   ├── health-check.js             # System health monitoring  
│   ├── knowledge-mapping.js        # Learning and optimization
│   └── user-document-manager.js    # User document handling
├── mcp/
│   ├── mcp-integration-service.js  # MCP server orchestration
│   ├── pinecone-mcp-client.js      # Pinecone MCP client
│   └── agent-integration.js        # MCP-enhanced agent base
├── orchestrator/orchestrator.js    # ✅ Uses hybrid retrieval
├── finance/finance.js              # ✅ Uses hybrid retrieval  
├── legal/legal.js                  # ✅ Uses hybrid retrieval
└── revenue/revenue.js              # ✅ Uses hybrid retrieval
```

## 🚀 **Key Features**

### 1. **MCP-First Hybrid Retrieval**
- **Brave Search MCP**: Real-time web search for current information
- **Pinecone MCP**: Vector-based document search with SDK fallback
- **Sequential Thinking**: AI-powered query analysis and optimization

### 2. **Agent-Specific Intelligence** 
```javascript
const AGENT_NAMESPACES = {
  legal: ['legal_guidance', 'companies_house', 'cma_mergers', 'compliance-tax'],
  finance: ['financial-planning', 'business_finance', 'efg_scheme', 'startup_loans'],
  revenue: ['revenue-growth', 'grant_funding', 'data-providers', 'market_analysis'],
  orchestrator: [] // Can access all namespaces
};
```

### 3. **Confidence Scoring & Adaptive Behavior**
```javascript
const DEFAULT_CONFIDENCE_THRESHOLDS = {
  legal: 0.75,      // High threshold for legal accuracy
  finance: 0.70,    // High threshold for financial advice  
  revenue: 0.65,    // Medium threshold for business insights
  orchestrator: 0.60 // Lower threshold for general coordination
};
```

### 4. **Knowledge Memory & Learning**
- **Pattern Recognition**: Learn from successful query patterns
- **Agent Preferences**: Adapt to agent-specific source preferences
- **User Feedback**: Incorporate user satisfaction for optimization
- **Confidence History**: Track and improve confidence over time

## 💻 **Usage Examples**

### Basic Agent Integration
```javascript
import hybridRetriever from './services/knowledge/hybrid-retrieval.js';

// In your agent
const knowledgeResult = await hybridRetriever.retrieveKnowledge(
  "How to calculate EBITDA multiples for UK businesses?",
  'finance', // agentType
  userId,
  {
    maxResults: 8,
    includeUserDocs: true, 
    searchFallback: true,
    confidenceThreshold: 0.7
  }
);
```

### Enhanced Agent with Knowledge Mapping
```javascript
import { AgentKnowledgeMapper } from './services/knowledge/knowledge-mapping.js';

class EnhancedFinanceAgent {
  constructor() {
    this.knowledgeMapper = new AgentKnowledgeMapper('finance');
  }
  
  async processQuery(query, userId) {
    // 1. Retrieve knowledge
    const result = await hybridRetriever.retrieveKnowledge(query, 'finance', userId);
    
    // 2. Record interaction for learning
    const interaction = this.knowledgeMapper.recordInteraction(query, result);
    
    // 3. Get optimization recommendations  
    const optimization = this.knowledgeMapper.getOptimizationRecommendations();
    
    return { result, optimization, interactionId: interaction.id };
  }
}
```

## 🔧 **Configuration**

### Environment Variables
```bash
# Required for MCP integration
BRAVE_API_KEY=your_brave_search_api_key
PINECONE_API_KEY=your_pinecone_api_key
OPENAI_API_KEY=your_openai_api_key

# Optional configuration
PINECONE_INDEX_NAME=marketplace-index
MCP_SERVER_URL=ws://localhost:3001
```

### Agent Namespaces
Customize agent access patterns in `hybrid-retrieval.js`:
```javascript
const AGENT_NAMESPACES = {
  legal: ['your_legal_namespaces'],
  finance: ['your_finance_namespaces'],
  revenue: ['your_revenue_namespaces'],
  orchestrator: [] // Access all
};
```

## 📊 **Monitoring & Analytics**

### Health Check
```javascript
import { performHealthCheck } from './services/knowledge/health-check.js';

const healthStatus = await performHealthCheck();
console.log('System Health:', healthStatus.overall);
```

### Performance Analytics
```javascript
const analytics = hybridRetriever.getAnalytics();
console.log('Performance:', analytics.performance);
console.log('Memory Stats:', analytics.memoryStats);
console.log('MCP Stats:', analytics.mcpStats);
```

## 🧪 **Testing**

### Run System Test
```bash
node test-hybrid-retrieval.js
```

### Run Enhanced Agent Demo  
```bash
node enhanced-agent-demo.js
```

## 🛠️ **Advanced Features**

### 1. **Result Ranking Algorithm**
```javascript
combinedScore = relevanceScore × sourceWeight × recencyBonus × contentBonus
```

### 2. **Deduplication Strategy**
- Content hash comparison
- Similarity scoring (Jaccard similarity)
- Source diversity prioritization

### 3. **Adaptive Confidence Thresholds**
- Learn from user feedback
- Adjust based on agent performance
- Historical confidence tracking

### 4. **Fallback Strategies**
- MCP connection failures → SDK fallback
- Low confidence → Additional source consultation
- Network issues → Cached embeddings

## 🚀 **Getting Started**

### 1. **Initialize the System**
```javascript
import { mcpService } from './services/mcp/mcp-integration-service.js';

// Initialize MCP servers
await mcpService.initialize();
```

### 2. **Use in Your Agent**
```javascript
import hybridRetriever from './services/knowledge/hybrid-retrieval.js';

const result = await hybridRetriever.retrieveKnowledge(
  query, 
  agentType, 
  userId, 
  options
);
```

### 3. **Add Knowledge Mapping**
```javascript
import { AgentKnowledgeMapper } from './services/knowledge/knowledge-mapping.js';

const mapper = new AgentKnowledgeMapper(agentType);
mapper.recordInteraction(query, result, userFeedback);
```

## 🎯 **Best Practices**

### 1. **Query Optimization**
- Use specific, well-formed queries
- Include context and domain keywords
- Leverage agent-specific namespaces

### 2. **Performance Optimization**
- Set appropriate confidence thresholds
- Limit result counts for faster responses
- Use embedding caching for repeated queries

### 3. **Learning Optimization**
- Collect user feedback consistently
- Record interaction patterns
- Monitor confidence trends

### 4. **Error Handling**
- Implement fallback strategies
- Monitor MCP server health
- Cache critical embeddings locally

## 📈 **Roadmap**

### Immediate Enhancements
- [ ] Real-time performance dashboard
- [ ] Advanced caching strategies
- [ ] Multi-language support

### Future Features  
- [ ] Federated search across multiple knowledge bases
- [ ] AI-powered query expansion
- [ ] Knowledge graph integration
- [ ] Advanced user personalization

## 🏁 **Conclusion**

The Hybrid Knowledge Retrieval System provides a robust, scalable, and intelligent foundation for multi-agent AI platforms. With MCP-first architecture, knowledge mapping, and adaptive learning, it delivers high-quality, contextual knowledge retrieval that improves over time.

**Key Benefits:**
- ✅ **High Accuracy**: Confidence scoring and multiple source validation
- ✅ **Fast Performance**: Optimized queries and intelligent caching  
- ✅ **Continuous Learning**: Knowledge mapping and pattern recognition
- ✅ **Agent-Specific**: Tailored namespaces and confidence thresholds
- ✅ **Resilient**: Multiple fallback strategies and health monitoring
- ✅ **Scalable**: MCP architecture supports easy expansion
