# RAG-Enhanced AI Agents Implementation

## Overview

This document describes the implementation of Retrieval-Augmented Generation (RAG) capabilities for the Legal, Broker, and Finance AI agents in the UK business transaction platform. Each agent can now query a Pinecone vector database populated with authoritative UK content to provide more accurate, context-grounded responses.

## Architecture

### Components

1. **Pinecone Vector Database**: Stores chunked, embedded content from official UK sources
2. **OpenAI Embeddings**: Used for query vectorization and content embedding
3. **Agent RAG Integration**: Each agent queries relevant namespaces for context
4. **ReAct Prompting**: Enhanced prompts include RAG results for better reasoning

### Data Flow

```
User Query → Agent → RAG Query → Pinecone Search → Content Retrieval → 
Enhanced Prompt → OpenAI API → Contextual Response → User
```

## Pinecone Namespace Structure

### Legal Agent Namespaces
- `legal_guidance`: General UK legal guidance and regulations
- Additional specialized legal namespaces can be added

### Broker Agent Namespaces
- `cma_mergers`: Competition and Markets Authority merger guidance
- `companies_house`: Companies House registration and compliance
- `deal_close`: Business transaction completion processes
- `industry_standards`: Industry-specific brokerage standards

### Finance Agent Namespaces
- `business_finance`: General UK business financing guidance
- `startup_loans`: Start Up Loans Company information
- `efg_scheme`: Enterprise Finance Guarantee scheme details
- `grant_funding`: Government grant and funding opportunities

## Implementation Details

### Legal Agent RAG Integration

```javascript
// Query function
async function queryLegalRAG(query, category = null) {
  // Searches legal_guidance namespace
  // Returns relevant UK legal content
}

// Enhanced analysis with RAG
async function performUKLegalAnalysis(query, context, analysisType) {
  const ragResults = await queryLegalRAG(query, context.legalArea);
  const reactPrompt = constructUKReActPromptWithRAG(query, context, analysisType, ragResults);
  // AI analysis with RAG context
}
```

### Broker Agent RAG Integration

```javascript
// Query function
async function queryBrokerRAG(query, category = null) {
  // Searches across cma_mergers, companies_house, deal_close, industry_standards
  // Returns top 5 most relevant results
}

// Enhanced general requests
async function handleGeneralBrokerRequest(task, message, query) {
  const ragResults = await queryBrokerRAG(query);
  const enhancedPrompt = constructUKBrokerReActPromptWithRAG(query, ragResults);
  // AI analysis with brokerage context
}
```

### Finance Agent RAG Integration

```javascript
// Query function
async function queryFinanceRAG(query, category = null) {
  // Searches across business_finance, startup_loans, efg_scheme, grant_funding
  // Returns top 5 most relevant results
}

// Enhanced general requests
async function handleGeneralFinanceRequest(task, message, query) {
  const ragResults = await queryFinanceRAG(trimmedQuery);
  const enhancedPrompt = constructUKFinanceReActPromptWithRAG(trimmedQuery, ragResults);
  // AI analysis with financial context
}
```

## RAG Query Process

### 1. Query Vectorization
- User query is embedded using OpenAI's `text-embedding-3-small` model
- Embedding captures semantic meaning of the query

### 2. Vector Search
- Pinecone searches relevant namespaces using cosine similarity
- Top K results retrieved (typically 3-5 per namespace)
- Results include content, metadata, and relevance scores

### 3. Context Enhancement
- RAG results formatted into structured guidance
- Includes title, category, source, content, and relevance score
- Context injected into AI prompt for grounded reasoning

### 4. Response Generation
- Enhanced prompt sent to OpenAI GPT-4.1-mini
- AI generates response using both query and RAG context
- Response includes citations and source transparency

## Content Sources

### Legal Content
- **gov.uk**: UK government legal guidance
- **ICO**: Data protection and privacy regulations
- **Companies House**: Corporate law and compliance
- **HSE**: Health and safety regulations

### Broker Content
- **CMA**: Competition and Markets Authority guidance
- **Companies House**: Business registration and compliance
- **Industry Standards**: Best practices for business transactions
- **Deal Closing**: Transaction completion processes

### Finance Content
- **Business Finance**: UK business financing options
- **Start Up Loans**: Government-backed business loans
- **Enterprise Finance Guarantee**: Government loan guarantees
- **Grant Funding**: Available grants and funding schemes

## Benefits

### 1. Accuracy
- Responses grounded in authoritative UK sources
- Reduced hallucination through factual context
- Up-to-date regulatory information

### 2. Authority
- References to official government sources
- Compliance with current UK regulations
- Professional credibility

### 3. Transparency
- Source attribution in responses
- Relevance scores for content
- Clear citation of authorities

### 4. Efficiency
- Faster access to relevant information
- Reduced need for manual research
- Consistent application of regulations

## Usage Examples

### Legal Agent
```
Query: "What are the UK GDPR compliance requirements for a business sale?"

RAG Sources:
- ICO guidance on data protection in business transfers
- UK GDPR Article 26 joint controller requirements
- Data transfer agreement templates

Response: Comprehensive UK GDPR compliance guidance with official sources
```

### Broker Agent
```
Query: "What due diligence is required for a UK business acquisition?"

RAG Sources:
- CMA merger notification requirements
- Companies House due diligence checklists
- Industry standard practices

Response: Complete due diligence checklist with regulatory references
```

### Finance Agent
```
Query: "What government funding is available for UK business acquisitions?"

RAG Sources:
- Enterprise Finance Guarantee scheme details
- Start Up Loans eligibility criteria
- Grant funding opportunities

Response: Detailed funding options with application guidance
```

## Testing

### Test Script
Run `test-all-agents-rag.js` to verify RAG functionality:

```bash
node test-all-agents-rag.js
```

### Test Coverage
- Legal agent RAG integration
- Broker agent RAG integration  
- Finance agent RAG integration
- Source attribution validation
- Response quality assessment

## Performance Monitoring

### Metrics Tracked
- RAG query response times
- Relevance scores of retrieved content
- Number of sources used per response
- Token usage optimization
- Error rates and fallback scenarios

### Logging
- RAG query logging with source information
- Performance metrics for optimization
- Error tracking for reliability

## Future Enhancements

### 1. Content Expansion
- Additional specialized namespaces
- More granular content chunking
- Industry-specific guidance

### 2. Search Optimization
- Hybrid search (vector + keyword)
- Query expansion techniques
- Custom embedding models

### 3. Response Enhancement
- Multi-step reasoning with RAG
- Source ranking and filtering
- Dynamic content updates

### 4. User Experience
- Interactive source exploration
- Confidence scoring
- Explanation generation

## Configuration

### Environment Variables
- `PINECONE_API_KEY`: Pinecone database access
- `PINECONE_INDEX_NAME`: Vector database index name
- `OPENAI_API_KEY`: OpenAI API access for embeddings and chat

### Model Configuration
- Embedding Model: `text-embedding-3-small`
- Chat Model: `gpt-4.1-mini`
- Temperature: 0.2-0.3 for consistency
- Max Tokens: Optimized per agent

## Troubleshooting

### Common Issues
1. **Pinecone Connection**: Verify API key and index name
2. **Empty RAG Results**: Check namespace population
3. **High Latency**: Optimize query complexity
4. **Token Limits**: Adjust content chunking

### Error Handling
- Graceful fallback to non-RAG responses
- Comprehensive error logging
- Retry mechanisms for transient failures

## Conclusion

The RAG integration provides each agent with access to authoritative, up-to-date UK content, significantly improving response accuracy and professional credibility. The system maintains transparency through source attribution while optimizing performance through efficient vector search and intelligent content chunking.
