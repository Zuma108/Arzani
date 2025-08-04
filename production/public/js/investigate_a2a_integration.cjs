// A2A Integration Investigation Script
// This script systematically checks database schema alignment and integration issues

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

class ArzaniIntegrationInvestigator {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 5432,
    });
    
    this.results = {
      schemaIssues: [],
      integrationIssues: [],
      duplications: [],
      recommendations: []
    };
  }

  async investigate() {
    console.log('🔍 Starting Arzani-X Integration Investigation...\n');
    
    try {
      // Phase 1: Database Schema Verification
      await this.verifyDatabaseSchema();
      
      // Phase 2: Integration Point Analysis
      await this.analyzeIntegrationPoints();
      
      // Phase 3: Duplication Detection
      await this.detectDuplications();
      
      // Phase 4: Generate Report
      await this.generateReport();
      
      console.log('✅ Investigation complete! Check the generated report.');
      
    } catch (error) {
      console.error('❌ Investigation failed:', error);
    } finally {
      await this.pool.end();
    }
  }

  async verifyDatabaseSchema() {
    console.log('📊 Phase 1: Database Schema Verification');
    
    // Check A2A tables existence
    const tablesQuery = `
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_name LIKE 'a2a_%'
      ORDER BY table_name;
    `;
    
    const tables = await this.pool.query(tablesQuery);
    console.log(`   Found ${tables.rows.length} A2A tables`);
    
    // Expected tables based on code analysis
    const expectedTables = [
      'a2a_chat_sessions',
      'a2a_chat_messages', 
      'a2a_tasks',
      'a2a_agent_interactions',
      'a2a_session_context',
      'a2a_file_uploads',
      'a2a_agent_transitions',
      'a2a_thread_cache',
      'a2a_thread_preferences',
      'a2a_thread_analytics'
    ];
    
    const existingTables = tables.rows.map(row => row.table_name);
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      this.results.schemaIssues.push({
        type: 'MISSING_TABLES',
        severity: 'HIGH',
        tables: missingTables,
        impact: 'Integration features will fail'
      });
      console.log(`   ❌ Missing tables: ${missingTables.join(', ')}`);
    }
    
    // Check a2a_chat_sessions schema specifically
    await this.verifySessionsTableSchema();
    
    // Check a2a_chat_messages schema specifically  
    await this.verifyMessagesTableSchema();
    
    console.log('   ✅ Schema verification complete\n');
  }

  async verifySessionsTableSchema() {
    const expectedColumns = [
      'id', 'user_id', 'agent_type', 'title', 'session_name', 
      'last_active_at', 'updated_at', 'created_at', 'is_pinned', 
      'avatar_url', 'unread_count', 'is_active'
    ];
    
    try {
      const columnsQuery = `
        SELECT column_name, data_type, is_nullable, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'a2a_chat_sessions' 
        ORDER BY ordinal_position;
      `;
      
      const columns = await this.pool.query(columnsQuery);
      const existingColumns = columns.rows.map(row => row.column_name);
      const missingColumns = expectedColumns.filter(col => !existingColumns.includes(col));
      
      if (missingColumns.length > 0) {
        this.results.schemaIssues.push({
          type: 'MISSING_COLUMNS',
          severity: 'HIGH',
          table: 'a2a_chat_sessions',
          columns: missingColumns,
          impact: 'Sidebar conversations will not load properly'
        });
        console.log(`   ❌ a2a_chat_sessions missing columns: ${missingColumns.join(', ')}`);
      } else {
        console.log('   ✅ a2a_chat_sessions schema correct');
      }
    } catch (error) {
      this.results.schemaIssues.push({
        type: 'TABLE_NOT_EXISTS',
        severity: 'CRITICAL',
        table: 'a2a_chat_sessions',
        error: error.message,
        impact: 'Complete conversation system failure'
      });
      console.log('   ❌ a2a_chat_sessions table does not exist');
    }
  }

  async verifyMessagesTableSchema() {
    const expectedColumns = [
      'id', 'session_id', 'content', 'sender_type', 'agent_type', 
      'created_at', 'metadata'
    ];
    
    try {
      const columnsQuery = `
        SELECT column_name, data_type, is_nullable, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'a2a_chat_messages' 
        ORDER BY ordinal_position;
      `;
      
      const columns = await this.pool.query(columnsQuery);
      const existingColumns = columns.rows.map(row => row.column_name);
      const missingColumns = expectedColumns.filter(col => !existingColumns.includes(col));
      
      if (missingColumns.length > 0) {
        this.results.schemaIssues.push({
          type: 'MISSING_COLUMNS',
          severity: 'HIGH', 
          table: 'a2a_chat_messages',
          columns: missingColumns,
          impact: 'Message persistence will fail'
        });
        console.log(`   ❌ a2a_chat_messages missing columns: ${missingColumns.join(', ')}`);
      } else {
        console.log('   ✅ a2a_chat_messages schema correct');
      }
    } catch (error) {
      this.results.schemaIssues.push({
        type: 'TABLE_NOT_EXISTS',
        severity: 'CRITICAL',
        table: 'a2a_chat_messages',
        error: error.message,
        impact: 'Message storage completely broken'
      });
      console.log('   ❌ a2a_chat_messages table does not exist');
    }
  }

  async analyzeIntegrationPoints() {
    console.log('🔗 Phase 2: Integration Point Analysis');
    
    // Check API endpoint consistency
    await this.checkAPIEndpoints();
    
    // Check frontend-backend data flow
    await this.checkDataFlow();
    
    console.log('   ✅ Integration analysis complete\n');
  }

  async checkAPIEndpoints() {
    console.log('   📡 Checking API endpoint consistency...');
    
    // Read threads.js to check what endpoints are expected
    const threadsApiPath = path.join(__dirname, 'api', 'threads.js');
    
    if (fs.existsSync(threadsApiPath)) {
      const threadsContent = fs.readFileSync(threadsApiPath, 'utf8');
      
      // Check for expected routes
      const expectedRoutes = [
        'GET /threads',
        'POST /threads', 
        'GET /threads/:id/messages',
        'PUT /threads/:id/pin',
        'DELETE /threads/:id'
      ];
      
      const foundRoutes = [];
      if (threadsContent.includes("router.get('/threads'")) foundRoutes.push('GET /threads');
      if (threadsContent.includes("router.post('/threads'")) foundRoutes.push('POST /threads');
      if (threadsContent.includes("router.get('/threads/:id/messages'")) foundRoutes.push('GET /threads/:id/messages');
      if (threadsContent.includes("router.put('/threads/:id/pin'")) foundRoutes.push('PUT /threads/:id/pin');
      if (threadsContent.includes("router.delete('/threads/:id'")) foundRoutes.push('DELETE /threads/:id');
      
      const missingRoutes = expectedRoutes.filter(route => !foundRoutes.includes(route));
      
      if (missingRoutes.length > 0) {
        this.results.integrationIssues.push({
          type: 'MISSING_API_ROUTES',
          severity: 'HIGH',
          routes: missingRoutes,
          impact: 'Frontend sidebar operations will fail'
        });
        console.log(`     ❌ Missing API routes: ${missingRoutes.join(', ')}`);
      } else {
        console.log('     ✅ All expected API routes found');
      }
    } else {
      this.results.integrationIssues.push({
        type: 'MISSING_API_FILE',
        severity: 'CRITICAL',
        file: 'api/threads.js',
        impact: 'No API endpoints for conversation management'
      });
      console.log('     ❌ threads.js API file not found');
    }
  }

  async checkDataFlow() {
    console.log('   🔄 Checking data flow consistency...');
    
    // Check if persistence manager methods align with API expectations
    const persistencePath = path.join(__dirname, 'public', 'js', 'arzani-x-persistence.js');
    
    if (fs.existsSync(persistencePath)) {
      const persistenceContent = fs.readFileSync(persistencePath, 'utf8');
      
      // Check for expected methods
      const expectedMethods = [
        'createSession',
        'saveMessage', 
        'loadMessages',
        'getSessions',
        'updateSessionTitle'
      ];
      
      const foundMethods = [];
      expectedMethods.forEach(method => {
        if (persistenceContent.includes(`${method}(`)) {
          foundMethods.push(method);
        }
      });
      
      const missingMethods = expectedMethods.filter(method => !foundMethods.includes(method));
      
      if (missingMethods.length > 0) {
        this.results.integrationIssues.push({
          type: 'MISSING_PERSISTENCE_METHODS',
          severity: 'MEDIUM',
          methods: missingMethods,
          impact: 'Some persistence operations may fail'
        });
        console.log(`     ❌ Missing persistence methods: ${missingMethods.join(', ')}`);
      } else {
        console.log('     ✅ All expected persistence methods found');
      }
    } else {
      this.results.integrationIssues.push({
        type: 'MISSING_PERSISTENCE_FILE',
        severity: 'HIGH',
        file: 'public/js/arzani-x-persistence.js',
        impact: 'No persistence layer for frontend'
      });
      console.log('     ❌ arzani-x-persistence.js file not found');
    }
  }

  async detectDuplications() {
    console.log('🔍 Phase 3: Duplication Detection');
    
    // Check for duplicate message handling
    await this.checkMessageHandlingDuplication();
    
    // Check for duplicate conversation management
    await this.checkConversationDuplication();
    
    console.log('   ✅ Duplication detection complete\n');
  }

  async checkMessageHandlingDuplication() {
    console.log('   💬 Checking message handling duplication...');
    
    const filesToCheck = [
      'views/Arzani-x.ejs',
      'public/js/arzani-x.js',
      'public/js/arzani-x-persistence.js'
    ];
    
    const messageHandlingPatterns = [
      'handleUserMessage',
      'saveMessage',
      'sendMessage',
      'addMessage'
    ];
    
    const foundPatterns = {};
    
    filesToCheck.forEach(file => {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        messageHandlingPatterns.forEach(pattern => {
          const matches = (content.match(new RegExp(pattern, 'g')) || []).length;
          if (matches > 0) {
            if (!foundPatterns[pattern]) foundPatterns[pattern] = [];
            foundPatterns[pattern].push({ file, occurrences: matches });
          }
        });
      }
    });
    
    // Check for duplications
    Object.keys(foundPatterns).forEach(pattern => {
      if (foundPatterns[pattern].length > 1) {
        const totalOccurrences = foundPatterns[pattern].reduce((sum, item) => sum + item.occurrences, 0);
        if (totalOccurrences > 2) { // More than expected
          this.results.duplications.push({
            type: 'MESSAGE_HANDLING_DUPLICATION',
            severity: 'MEDIUM',
            pattern,
            files: foundPatterns[pattern],
            impact: 'Potential duplicate message sending'
          });
          console.log(`     ⚠️ Potential duplication: ${pattern} found in multiple files`);
        }
      }
    });
    
    console.log('     ✅ Message handling duplication check complete');
  }

  async checkConversationDuplication() {
    console.log('   💭 Checking conversation management duplication...');
    
    const conversationPatterns = [
      'createNewChat',
      'loadConversations',
      'selectConversation',
      'switchConversation'
    ];
    
    const filesToCheck = [
      'views/Arzani-x.ejs',
      'public/js/arzani-x.js',
      'public/js/arzani-x-persistence.js'
    ];
    
    const foundPatterns = {};
    
    filesToCheck.forEach(file => {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        conversationPatterns.forEach(pattern => {
          const matches = (content.match(new RegExp(pattern, 'g')) || []).length;
          if (matches > 0) {
            if (!foundPatterns[pattern]) foundPatterns[pattern] = [];
            foundPatterns[pattern].push({ file, occurrences: matches });
          }
        });
      }
    });
    
    // Check for duplications
    Object.keys(foundPatterns).forEach(pattern => {
      if (foundPatterns[pattern].length > 1) {
        this.results.duplications.push({
          type: 'CONVERSATION_MANAGEMENT_DUPLICATION',
          severity: 'MEDIUM',
          pattern,
          files: foundPatterns[pattern],
          impact: 'Inconsistent conversation state management'
        });
        console.log(`     ⚠️ Conversation method duplication: ${pattern} in multiple files`);
      }
    });
    
    console.log('     ✅ Conversation duplication check complete');
  }

  async generateReport() {
    console.log('📝 Phase 4: Generating Investigation Report');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: this.results.schemaIssues.length + this.results.integrationIssues.length + this.results.duplications.length,
        criticalIssues: [...this.results.schemaIssues, ...this.results.integrationIssues].filter(issue => issue.severity === 'CRITICAL').length,
        highIssues: [...this.results.schemaIssues, ...this.results.integrationIssues].filter(issue => issue.severity === 'HIGH').length,
        mediumIssues: [...this.results.schemaIssues, ...this.results.integrationIssues, ...this.results.duplications].filter(issue => issue.severity === 'MEDIUM').length
      },
      findings: this.results,
      recommendations: this.generateRecommendations()
    };
    
    const reportPath = path.join(__dirname, 'ARZANI_X_INVESTIGATION_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Also generate markdown summary
    await this.generateMarkdownSummary(report);
    
    console.log(`   ✅ Report generated: ${reportPath}`);
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Schema recommendations
    if (this.results.schemaIssues.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: 'RUN_SCHEMA_ALIGNMENT',
        description: 'Execute fix_a2a_chat_schema_alignment.sql to fix database schema issues',
        script: 'fix_a2a_chat_schema_alignment.sql'
      });
    }
    
    // Integration recommendations
    if (this.results.integrationIssues.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: 'FIX_INTEGRATION_POINTS',
        description: 'Ensure all API endpoints and persistence methods are properly implemented',
        files: ['api/threads.js', 'public/js/arzani-x-persistence.js']
      });
    }
    
    // Duplication recommendations
    if (this.results.duplications.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'CONSOLIDATE_DUPLICATED_CODE',
        description: 'Merge duplicate methods and create single source of truth for each operation',
        approach: 'Create centralized persistence manager and remove redundant methods'
      });
    }
    
    return recommendations;
  }

  async generateMarkdownSummary(report) {
    const markdown = `# Arzani-X Integration Investigation Report

**Generated**: ${new Date().toLocaleString()}

## Summary
- **Total Issues**: ${report.summary.totalIssues}
- **Critical Issues**: ${report.summary.criticalIssues}
- **High Priority Issues**: ${report.summary.highIssues}
- **Medium Priority Issues**: ${report.summary.mediumIssues}

## Schema Issues
${report.findings.schemaIssues.map(issue => `- **${issue.type}** (${issue.severity}): ${issue.impact}`).join('\n')}

## Integration Issues  
${report.findings.integrationIssues.map(issue => `- **${issue.type}** (${issue.severity}): ${issue.impact}`).join('\n')}

## Duplications Found
${report.findings.duplications.map(dup => `- **${dup.type}** (${dup.severity}): ${dup.impact}`).join('\n')}

## Recommendations
${report.recommendations.map(rec => `1. **${rec.action}** (${rec.priority}): ${rec.description}`).join('\n')}

## Next Steps
1. Review and fix schema issues first (CRITICAL/HIGH priority)
2. Verify integration points are working
3. Consolidate duplicate code  
4. Test complete conversation flow
5. Validate sidebar ↔ main chat synchronization

---
*Investigation completed using automated analysis tools*`;

    const markdownPath = path.join(__dirname, 'ARZANI_X_INVESTIGATION_SUMMARY.md');
    fs.writeFileSync(markdownPath, markdown);
    console.log(`   ✅ Markdown summary generated: ${markdownPath}`);
  }
}

// Run the investigation
if (require.main === module) {
  const investigator = new ArzaniIntegrationInvestigator();
  investigator.investigate().catch(console.error);
}

module.exports = ArzaniIntegrationInvestigator;
