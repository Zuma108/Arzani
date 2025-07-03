/**
 * User Document Upload API Routes
 * Handles file uploads and RAG integration for personalized agent responses
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import { UserDocumentManager } from '../services/knowledge/user-document-manager.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Initialize document manager
const documentManager = new UserDocumentManager();

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store in memory for processing
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files at once
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedTypes = ['.pdf', '.docx', '.doc', '.txt', '.csv', '.json'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${fileExt} not supported. Allowed types: ${allowedTypes.join(', ')}`), false);
    }
  }
});

/**
 * POST /api/documents/upload
 * Upload and process user documents for RAG
 */
router.post('/upload', authenticateToken, upload.array('documents', 5), async (req, res) => {
  try {
    const userId = req.user.id;
    const { documentType, metadata: metadataStr } = req.body;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const metadata = metadataStr ? JSON.parse(metadataStr) : {};
    const results = [];

    console.log(`📤 Processing ${req.files.length} documents for user ${userId}`);

    // Process each file
    for (const file of req.files) {
      try {
        const result = await documentManager.processUserDocument(
          userId,
          file,
          documentType,
          {
            ...metadata,
            uploadedFrom: req.ip,
            userAgent: req.get('User-Agent')
          }
        );
        
        results.push({
          filename: file.originalname,
          success: true,
          ...result
        });

      } catch (error) {
        console.error(`❌ Error processing ${file.originalname}:`, error);
        results.push({
          filename: file.originalname,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalChunks = results.reduce((sum, r) => sum + (r.chunksCreated || 0), 0);

    res.json({
      success: true,
      message: `Successfully processed ${successCount}/${req.files.length} documents`,
      results,
      summary: {
        totalFiles: req.files.length,
        successfulFiles: successCount,
        totalChunks,
        failedFiles: req.files.length - successCount
      }
    });

  } catch (error) {
    console.error('❌ Error in document upload:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/documents
 * Get user's uploaded documents
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { documentType, limit } = req.query;

    const documents = await documentManager.getUserDocuments(userId, {
      documentType,
      limit: parseInt(limit) || 50
    });

    res.json({
      success: true,
      documents,
      count: documents.length
    });

  } catch (error) {
    console.error('❌ Error getting user documents:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/documents/:documentName
 * Delete a user document
 */
router.delete('/:documentName', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { documentName } = req.params;

    const result = await documentManager.deleteUserDocument(userId, documentName);

    res.json({
      success: true,
      message: `Document "${documentName}" deleted successfully`,
      ...result
    });

  } catch (error) {
    console.error('❌ Error deleting document:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/documents/search
 * Search within user's documents
 */
router.post('/search', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { query, agentType = 'general', maxResults = 10 } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    // Use the enhanced hybrid retrieval system to search user documents
    const { EnhancedHybridKnowledgeRetriever } = await import('../services/knowledge/enhanced-hybrid-retrieval.js');
    const retriever = new EnhancedHybridKnowledgeRetriever();
    
    const knowledgeResult = await retriever.retrieveKnowledge(
      query,
      agentType,
      userId,
      {
        maxResults,
        includeUserDocs: true,
        searchFallback: false // Only search user docs
      }
    );

    const userDocuments = knowledgeResult.results.filter(r => r.source === 'user_document');

    res.json({
      success: true,
      query,
      results: userDocuments,
      count: userDocuments.length,
      confidence: knowledgeResult.metadata.confidence
    });

  } catch (error) {
    console.error('❌ Error searching documents:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/documents/analytics
 * Get analytics about user's document usage
 */
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const documents = await documentManager.getUserDocuments(userId);
    
    // Calculate analytics
    const analytics = {
      totalDocuments: documents.length,
      totalChunks: documents.reduce((sum, doc) => sum + doc.chunks, 0),
      documentTypes: {},
      categories: {},
      recentUploads: documents
        .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate))
        .slice(0, 5),
      storageStats: {
        avgChunksPerDocument: documents.length > 0 ? 
          Math.round(documents.reduce((sum, doc) => sum + doc.chunks, 0) / documents.length) : 0
      }
    };

    // Count by type and category
    documents.forEach(doc => {
      analytics.documentTypes[doc.type] = (analytics.documentTypes[doc.type] || 0) + 1;
      analytics.categories[doc.category] = (analytics.categories[doc.category] || 0) + 1;
    });

    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('❌ Error getting document analytics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/documents/types
 * Get available document types for classification
 */
router.get('/types', (req, res) => {
  const { DOCUMENT_TYPES } = require('../services/knowledge/user-document-manager.js');
  
  const types = Object.entries(DOCUMENT_TYPES).map(([key, value]) => ({
    id: key,
    name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    category: value.category,
    relevantAgents: value.agents,
    description: getDocumentTypeDescription(key)
  }));

  res.json({
    success: true,
    documentTypes: types
  });
});

/**
 * Helper function to get document type descriptions
 */
function getDocumentTypeDescription(type) {
  const descriptions = {
    contract: 'Legal contracts and agreements',
    nda: 'Non-disclosure agreements',
    financial_statement: 'Financial statements and reports',
    cash_flow: 'Cash flow statements and projections',
    business_plan: 'Business plans and strategies',
    market_research: 'Market analysis and research reports',
    invoice: 'Invoices and billing documents',
    other: 'Other business documents'
  };
  
  return descriptions[type] || 'Business document';
}

// Error handling middleware
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Maximum is 5 files at once.'
      });
    }
  }
  
  res.status(500).json({
    success: false,
    error: error.message
  });
});

export default router;
