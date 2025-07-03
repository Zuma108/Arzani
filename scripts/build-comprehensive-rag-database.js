/**
 * Comprehensive RAG Database Builder
 * Uses Firecrawl MCP to systematically scrape authoritative sources
 * and populate Pinecone with domain-specific knowledge
 */

import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

const indexName = 'marketplace-index';

/**
 * Authoritative sources for each agent domain
 */
const KNOWLEDGE_SOURCES = {
  legal: {
    namespace: 'legal_guidance',
    sources: [
      'https://www.gov.uk/browse/business',
      'https://www.gov.uk/government/organisations/companies-house',
      'https://www.fca.org.uk/firms/handbook',
      'https://ico.org.uk/for-organisations/guide-to-data-protection/',
      'https://www.gov.uk/employment-law',
      'https://www.legislation.gov.uk/ukpga/2006/46/contents', // Companies Act 2006
      'https://www.gov.uk/guidance/merger-control-overview'
    ]
  },
  finance: {
    namespace: 'financial-planning', 
    sources: [
      'https://www.gov.uk/browse/tax/businesses',
      'https://www.hmrc.gov.uk/manuals/bimmanual/',
      'https://www.gov.uk/guidance/corporation-tax',
      'https://www.frc.org.uk/accountants/accounting-and-reporting-policy',
      'https://www.british-business-bank.co.uk/finance-hub/',
      'https://www.gov.uk/guidance/enterprise-finance-guarantee',
      'https://www.investmentadviser.co.uk/investment-adviser/result/sector/private-equity'
    ]
  },
  revenue: {
    namespace: 'revenue-growth',
    sources: [
      'https://www.gov.uk/government/statistics/business-population-estimates',
      'https://www.ons.gov.uk/businessindustryandtrade',
      'https://www.gov.uk/guidance/start-up-loans',
      'https://www.gov.uk/business-finance-support',
      'https://www.great.gov.uk/advice/',
      'https://www.nibusinessinfo.co.uk/content/business-growth-and-expansion',
      'https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/959890/business-population-estimates-2020.pdf'
    ]
  }
};

/**
 * Use Firecrawl MCP to scrape and process content
 */
async function scrapeAndProcessContent(url, agentType, namespace) {
  try {
    console.log(`🔍 Scraping ${url} for ${agentType} agent`);
    
    // Use Firecrawl MCP to scrape content
    const scrapedContent = await firecrawlScrape(url);
    
    if (!scrapedContent || !scrapedContent.content) {
      console.log(`⚠️ No content found for ${url}`);
      return null;
    }
    
    // Process and chunk content
    const chunks = chunkContent(scrapedContent.content, {
      maxChunkSize: 1000,
      overlap: 100,
      preserveStructure: true
    });
    
    // Prepare records for Pinecone
    const records = chunks.map((chunk, index) => ({
      id: `${agentType}_${Date.now()}_${index}`,
      values: [], // Will be populated by Pinecone's embedding
      metadata: {
        agent_type: agentType,
        source_url: url,
        source_title: scrapedContent.title || extractDomainTitle(url),
        content_type: 'authoritative_guidance',
        scraped_at: new Date().toISOString(),
        chunk_index: index,
        total_chunks: chunks.length,
        text: chunk // This will be embedded by Pinecone
      }
    }));
    
    // Upload to Pinecone with namespace
    await uploadToPinecone(records, namespace);
    
    console.log(`✅ Successfully processed ${records.length} chunks from ${url}`);
    return records.length;
    
  } catch (error) {
    console.error(`❌ Error processing ${url}:`, error.message);
    return null;
  }
}

/**
 * Firecrawl MCP wrapper function
 */
async function firecrawlScrape(url) {
  // This would use the Firecrawl MCP server
  // For now, showing the structure
  return {
    content: `Scraped content from ${url}`,
    title: `Title from ${url}`,
    metadata: {
      url: url,
      scraped_at: new Date().toISOString()
    }
  };
}

/**
 * Intelligent content chunking
 */
function chunkContent(content, options = {}) {
  const { maxChunkSize = 1000, overlap = 100, preserveStructure = true } = options;
  
  if (preserveStructure) {
    // Split by headings and sections first
    const sections = content.split(/\n(?=#{1,3}\s)/);
    const chunks = [];
    
    for (const section of sections) {
      if (section.length <= maxChunkSize) {
        chunks.push(section.trim());
      } else {
        // Further split large sections
        const subChunks = splitByParagraphs(section, maxChunkSize, overlap);
        chunks.push(...subChunks);
      }
    }
    
    return chunks.filter(chunk => chunk.length > 50); // Filter out tiny chunks
  }
  
  // Simple paragraph-based chunking
  return splitByParagraphs(content, maxChunkSize, overlap);
}

/**
 * Split content by paragraphs with overlap
 */
function splitByParagraphs(text, maxSize, overlap) {
  const paragraphs = text.split('\n\n');
  const chunks = [];
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length <= maxSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        // Add overlap from the end of current chunk
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(overlap / 6)); // Approximate word count
        currentChunk = overlapWords.join(' ') + '\n\n' + paragraph;
      } else {
        currentChunk = paragraph;
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Upload records to Pinecone
 */
async function uploadToPinecone(records, namespace) {
  const index = pinecone.index(indexName);
  
  // Batch upload in groups of 100
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    try {
      await index.namespace(namespace).upsert(batch);
      console.log(`📤 Uploaded batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(records.length/batchSize)} to namespace ${namespace}`);
    } catch (error) {
      console.error(`❌ Error uploading batch to ${namespace}:`, error.message);
    }
  }
}

/**
 * Extract domain title for metadata
 */
function extractDomainTitle(url) {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '').split('.')[0];
  } catch {
    return 'unknown_source';
  }
}

/**
 * Main execution function
 */
async function buildComprehensiveRAGDatabase() {
  console.log('🚀 Starting comprehensive RAG database build...');
  
  let totalProcessed = 0;
  
  for (const [agentType, config] of Object.entries(KNOWLEDGE_SOURCES)) {
    console.log(`\n📚 Processing ${agentType} agent sources...`);
    
    for (const url of config.sources) {
      const processed = await scrapeAndProcessContent(url, agentType, config.namespace);
      if (processed) {
        totalProcessed += processed;
      }
      
      // Rate limiting - be respectful
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`\n✅ RAG database build complete! Processed ${totalProcessed} total chunks.`);
}

/**
 * Run the build process
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  buildComprehensiveRAGDatabase().catch(console.error);
}

export { buildComprehensiveRAGDatabase, scrapeAndProcessContent };
