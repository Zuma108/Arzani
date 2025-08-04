/**
 * User Document RAG System
 * Handles upload, processing, and retrieval of user-specific business documents
 * for personalized agent responses
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { PDFExtract } from 'pdf-extract';
import mammoth from 'mammoth';
import csv from 'csv-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

// Initialize services
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const indexName = 'marketplace-index';

/**
 * Document type classification for agent routing
 */
const DOCUMENT_TYPES = {
  // Legal documents
  contract: { agents: ['legal', 'general'], category: 'legal' },
  nda: { agents: ['legal', 'general'], category: 'legal' },
  terms_conditions: { agents: ['legal', 'general'], category: 'legal' },
  compliance_report: { agents: ['legal', 'general'], category: 'legal' },
  
  // Financial documents
  financial_statement: { agents: ['finance', 'general'], category: 'finance' },
  cash_flow: { agents: ['finance', 'revenue', 'general'], category: 'finance' },
  balance_sheet: { agents: ['finance', 'general'], category: 'finance' },
  invoice: { agents: ['finance', 'revenue', 'general'], category: 'finance' },
  tax_return: { agents: ['finance', 'general'], category: 'finance' },
  
  // Revenue/business documents
  business_plan: { agents: ['revenue', 'finance', 'general'], category: 'business' },
  market_research: { agents: ['revenue', 'general'], category: 'business' },
  sales_report: { agents: ['revenue', 'finance', 'general'], category: 'business' },
  pricing_strategy: { agents: ['revenue', 'general'], category: 'business' },
  customer_data: { agents: ['revenue', 'general'], category: 'business' },
  
  // General business
  meeting_notes: { agents: ['general'], category: 'general' },
  email_correspondence: { agents: ['general'], category: 'general' },
  other: { agents: ['general'], category: 'general' }
};

/**
 * User Document Manager
 */
export class UserDocumentManager {
  constructor() {
    this.index = pinecone.index(indexName);
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.setupUploadDirectory();
  }

  /**
   * Setup upload directory
   */
  async setupUploadDirectory() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('❌ Error creating upload directory:', error);
    }
  }

  /**
   * Process and store user document
   */
  async processUserDocument(userId, file, documentType, metadata = {}) {
    console.log(`📄 Processing document for user ${userId}: ${file.originalname}`);

    try {
      // Extract text content based on file type
      const textContent = await this.extractTextFromFile(file);
      
      if (!textContent || textContent.length < 50) {
        throw new Error('Unable to extract meaningful text from document');
      }

      // Classify document type if not provided
      if (!documentType || documentType === 'auto') {
        documentType = await this.classifyDocumentType(textContent, file.originalname);
      }

      // Chunk the content
      const chunks = this.chunkDocument(textContent, {
        documentType,
        preserveStructure: true,
        maxChunkSize: 1000,
        overlap: 100
      });

      // Prepare records for Pinecone
      const userNamespace = `user_${userId}`;
      const records = await this.prepareDocumentRecords(
        chunks, 
        userId, 
        file, 
        documentType, 
        metadata
      );

      // Upload to Pinecone
      await this.uploadDocumentToPinecone(records, userNamespace);

      // Store file metadata in knowledge graph
      await this.storeDocumentMetadata(userId, file, documentType, records.length);

      console.log(`✅ Successfully processed ${records.length} chunks from ${file.originalname}`);

      return {
        success: true,
        documentId: records[0].id.split('_chunk_')[0],
        chunksCreated: records.length,
        documentType,
        relevantAgents: DOCUMENT_TYPES[documentType]?.agents || ['general']
      };

    } catch (error) {
      console.error(`❌ Error processing document ${file.originalname}:`, error);
      throw error;
    }
  }

  /**
   * Extract text content from various file types
   */
  async extractTextFromFile(file) {
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    try {
      switch (fileExtension) {
        case '.pdf':
          return await this.extractFromPDF(file.buffer);
        
        case '.docx':
        case '.doc':
          return await this.extractFromWord(file.buffer);
        
        case '.txt':
          return file.buffer.toString('utf-8');
        
        case '.csv':
          return await this.extractFromCSV(file.buffer);
        
        case '.json':
          return this.extractFromJSON(file.buffer);
        
        default:
          // Try to read as text
          return file.buffer.toString('utf-8');
      }
    } catch (error) {
      console.error(`❌ Error extracting text from ${fileExtension}:`, error);
      throw new Error(`Unsupported file type: ${fileExtension}`);
    }
  }

  /**
   * Extract text from PDF
   */
  async extractFromPDF(buffer) {
    return new Promise((resolve, reject) => {
      const pdfExtract = new PDFExtract();
      pdfExtract.extractBuffer(buffer, {}, (err, data) => {
        if (err) {
          reject(err);
          return;
        }
        
        try {
          const text = data.pages
            .map(page => page.content.map(item => item.str).join(' '))
            .join('\n\n');
          resolve(text);
        } catch (parseError) {
          reject(parseError);
        }
      });
    });
  }

  /**
   * Extract text from Word documents
   */
  async extractFromWord(buffer) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  /**
   * Extract and format CSV data
   */
  async extractFromCSV(buffer) {
    return new Promise((resolve, reject) => {
      const results = [];
      const text = buffer.toString('utf-8');
      
      // Simple CSV parsing - could use csv-parser for more complex cases
      const lines = text.split('\n');
      const headers = lines[0]?.split(',').map(h => h.trim()) || [];
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim());
          const row = headers.reduce((obj, header, index) => {
            obj[header] = values[index] || '';
            return obj;
          }, {});
          results.push(row);
        }
      }
      
      // Convert to readable text format
      const textOutput = `CSV Data with ${results.length} rows:\n\n` +
        `Headers: ${headers.join(', ')}\n\n` +
        results.map(row => 
          headers.map(h => `${h}: ${row[h]}`).join(', ')
        ).join('\n');
      
      resolve(textOutput);
    });
  }

  /**
   * Extract and format JSON data
   */
  extractFromJSON(buffer) {
    try {
      const jsonData = JSON.parse(buffer.toString('utf-8'));
      return `JSON Document:\n\n${JSON.stringify(jsonData, null, 2)}`;
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  }

  /**
   * Use AI to classify document type
   */
  async classifyDocumentType(textContent, filename) {
    try {
      const prompt = `Analyze this document and classify it into one of these categories:

${Object.keys(DOCUMENT_TYPES).join(', ')}

Document filename: ${filename}
Document content (first 500 chars): ${textContent.substring(0, 500)}

Respond with just the category name that best fits this document.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 50,
        temperature: 0.1
      });

      const classification = response.choices[0].message.content.trim().toLowerCase();
      
      // Validate classification
      if (DOCUMENT_TYPES[classification]) {
        return classification;
      }
      
      // Fallback to 'other' if classification not recognized
      console.warn(`⚠️ Unknown document classification: ${classification}, defaulting to 'other'`);
      return 'other';

    } catch (error) {
      console.error('❌ Error classifying document:', error);
      return 'other'; // Safe fallback
    }
  }

  /**
   * Intelligent document chunking
   */
  chunkDocument(content, options = {}) {
    const { 
      documentType, 
      preserveStructure = true, 
      maxChunkSize = 1000, 
      overlap = 100 
    } = options;

    // Document type specific chunking strategies
    if (documentType === 'financial_statement' || documentType === 'balance_sheet') {
      return this.chunkFinancialDocument(content, maxChunkSize);
    }
    
    if (documentType === 'contract' || documentType === 'nda') {
      return this.chunkLegalDocument(content, maxChunkSize);
    }
    
    if (documentType === 'business_plan') {
      return this.chunkBusinessPlan(content, maxChunkSize);
    }

    // Default chunking strategy
    return this.chunkByParagraphs(content, maxChunkSize, overlap);
  }

  /**
   * Chunk financial documents by sections
   */
  chunkFinancialDocument(content, maxChunkSize) {
    // Look for financial statement sections
    const sections = content.split(/(?=(?:Assets|Liabilities|Revenue|Expenses|Cash Flow|Income|Balance Sheet|P&L|Profit|Loss))/i);
    
    return sections
      .filter(section => section.trim().length > 50)
      .map(section => section.trim())
      .slice(0, 20); // Limit to 20 sections
  }

  /**
   * Chunk legal documents by clauses
   */
  chunkLegalDocument(content, maxChunkSize) {
    // Split by numbered sections or clauses
    const clauses = content.split(/(?=\d+\.|\b(?:WHEREAS|NOW THEREFORE|Article|Section|Clause)\b)/i);
    
    return clauses
      .filter(clause => clause.trim().length > 50)
      .map(clause => clause.trim())
      .slice(0, 15); // Limit to 15 clauses
  }

  /**
   * Chunk business plans by sections
   */
  chunkBusinessPlan(content, maxChunkSize) {
    // Look for business plan sections
    const sections = content.split(/(?=(?:Executive Summary|Market Analysis|Financial Projections|Marketing Strategy|Operations|Management|Products|Services))/i);
    
    return sections
      .filter(section => section.trim().length > 100)
      .map(section => section.trim())
      .slice(0, 10); // Limit to 10 sections
  }

  /**
   * Default paragraph-based chunking
   */
  chunkByParagraphs(content, maxChunkSize, overlap) {
    const paragraphs = content.split('\n\n');
    const chunks = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length <= maxChunkSize) {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          // Add overlap
          const words = currentChunk.split(' ');
          const overlapWords = words.slice(-Math.floor(overlap / 6));
          currentChunk = overlapWords.join(' ') + '\n\n' + paragraph;
        } else {
          currentChunk = paragraph;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 50);
  }

  /**
   * Prepare document records for Pinecone
   */
  async prepareDocumentRecords(chunks, userId, file, documentType, metadata) {
    const baseId = `user_${userId}_doc_${Date.now()}`;
    const agentTypes = DOCUMENT_TYPES[documentType]?.agents || ['general'];

    const records = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunkId = `${baseId}_chunk_${i}`;
      
      const record = {
        id: chunkId,
        values: [], // Will be populated by Pinecone embedding
        metadata: {
          user_id: userId,
          document_name: file.originalname,
          document_type: documentType,
          document_category: DOCUMENT_TYPES[documentType]?.category || 'general',
          agent_type: agentTypes, // Multiple agents can access
          chunk_index: i,
          total_chunks: chunks.length,
          upload_date: new Date().toISOString(),
          file_size: file.size,
          file_type: path.extname(file.originalname),
          text: chunks[i], // This will be embedded
          ...metadata
        }
      };

      records.push(record);
    }

    return records;
  }

  /**
   * Upload document records to Pinecone
   */
  async uploadDocumentToPinecone(records, namespace) {
    try {
      const batchSize = 50;
      
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        await this.index.namespace(namespace).upsert(batch);
        console.log(`📤 Uploaded batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(records.length/batchSize)} to user namespace`);
      }
      
    } catch (error) {
      console.error('❌ Error uploading to Pinecone:', error);
      throw error;
    }
  }

  /**
   * Store document metadata in knowledge graph
   */
  async storeDocumentMetadata(userId, file, documentType, chunkCount) {
    // This would use the Knowledge Graph MCP to track document relationships
    console.log(`📊 Storing metadata for user ${userId} document: ${file.originalname}`);
    
    // Implementation would create entities and relationships in the knowledge graph
    // to track document usage patterns and relationships
  }

  /**
   * Get user's documents
   */
  async getUserDocuments(userId, options = {}) {
    try {
      const { documentType, limit = 50 } = options;
      const userNamespace = `user_${userId}`;

      const filter = { user_id: userId };
      if (documentType) {
        filter.document_type = documentType;
      }

      const queryResponse = await this.index.namespace(userNamespace).query({
        vector: new Array(1536).fill(0), // Dummy vector for metadata query
        topK: limit,
        includeMetadata: true,
        filter
      });

      // Group by document
      const documents = {};
      queryResponse.matches?.forEach(match => {
        const docName = match.metadata.document_name;
        if (!documents[docName]) {
          documents[docName] = {
            name: docName,
            type: match.metadata.document_type,
            category: match.metadata.document_category,
            uploadDate: match.metadata.upload_date,
            chunks: 0,
            relevantAgents: match.metadata.agent_type
          };
        }
        documents[docName].chunks++;
      });

      return Object.values(documents);

    } catch (error) {
      console.error('❌ Error getting user documents:', error);
      return [];
    }
  }

  /**
   * Delete user document
   */
  async deleteUserDocument(userId, documentName) {
    try {
      const userNamespace = `user_${userId}`;
      
      // Find all chunks for this document
      const queryResponse = await this.index.namespace(userNamespace).query({
        vector: new Array(1536).fill(0),
        topK: 1000,
        includeMetadata: true,
        filter: {
          user_id: userId,
          document_name: documentName
        }
      });

      // Delete all chunks
      const idsToDelete = queryResponse.matches?.map(match => match.id) || [];
      
      if (idsToDelete.length > 0) {
        await this.index.namespace(userNamespace).deleteMany(idsToDelete);
        console.log(`🗑️ Deleted ${idsToDelete.length} chunks for document ${documentName}`);
      }

      return { success: true, deletedChunks: idsToDelete.length };

    } catch (error) {
      console.error('❌ Error deleting user document:', error);
      throw error;
    }
  }
}

export { UserDocumentManager, DOCUMENT_TYPES };
