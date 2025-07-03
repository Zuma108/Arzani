/**
 * Advanced Table Processing System for AI Agents
 * 
 * This module provides comprehensive table validation, enhancement, and 
 * processing capabilities specifically designed for AI-generated content.
 */

import { 
  validateTableStructure, 
  generateTableTemplate,
  formatCurrencyForTable,
  formatPercentageForTable,
  rightAlignNumbers
} from '../config/markdown-config.js';

/**
 * Process and enhance tables in markdown content
 * @param {string} markdownContent - Raw markdown content
 * @param {string} agentType - Type of agent (finance, legal, broker, orchestrator)
 * @returns {object} - Processing result with enhanced content and validation info
 */
export function processAgentTables(markdownContent, agentType) {
  const result = {
    content: markdownContent,
    tablesProcessed: 0,
    validationErrors: [],
    enhancements: []
  };

  // Extract tables from markdown
  const tableRegex = /(\|.*\|[\r\n]+)+/g;
  const tables = markdownContent.match(tableRegex);
  
  if (!tables || tables.length === 0) {
    return result;
  }

  let processedContent = markdownContent;

  tables.forEach((table, index) => {
    try {
      // Validate table structure
      const validation = validateTableStructure(table);
      
      if (!validation.valid) {
        result.validationErrors.push({
          table: index + 1,
          error: validation.error,
          originalTable: table
        });
        
        // Attempt to fix common issues
        const fixedTable = attemptTableFix(table, agentType);
        if (fixedTable && validateTableStructure(fixedTable).valid) {
          processedContent = processedContent.replace(table, fixedTable);
          result.enhancements.push(`Fixed table ${index + 1}: ${validation.error}`);
        }
      } else {
        // Enhance valid tables
        const enhancedTable = enhanceTable(table, agentType);
        if (enhancedTable !== table) {
          processedContent = processedContent.replace(table, enhancedTable);
          result.enhancements.push(`Enhanced table ${index + 1} formatting`);
        }
      }
      
      result.tablesProcessed++;
    } catch (error) {
      result.validationErrors.push({
        table: index + 1,
        error: `Processing failed: ${error.message}`,
        originalTable: table
      });
    }
  });

  result.content = processedContent;
  return result;
}

/**
 * Attempt to fix common table formatting issues
 * @param {string} table - Malformed table markdown
 * @param {string} agentType - Agent type for context
 * @returns {string} - Fixed table or original if unfixable
 */
function attemptTableFix(table, agentType) {
  let fixed = table.trim();
  
  // Fix missing pipes at start/end of lines
  const lines = fixed.split('\n');
  const fixedLines = lines.map(line => {
    let fixedLine = line.trim();
    if (fixedLine.includes('|') && !fixedLine.startsWith('|')) {
      fixedLine = '| ' + fixedLine;
    }
    if (fixedLine.includes('|') && !fixedLine.endsWith('|')) {
      fixedLine = fixedLine + ' |';
    }
    return fixedLine;
  });
  
  fixed = fixedLines.join('\n');
  
  // Fill empty cells with appropriate defaults
  const filledTable = fillEmptyCells(fixed, agentType);
  
  // Ensure proper separator line
  const withSeparator = ensureProperSeparator(filledTable);
  
  return withSeparator;
}

/**
 * Fill empty cells with appropriate default values
 * @param {string} table - Table markdown
 * @param {string} agentType - Agent type for context-appropriate defaults
 * @returns {string} - Table with filled cells
 */
function fillEmptyCells(table, agentType) {
  const lines = table.split('\n');
  const defaults = {
    finance: { currency: '£0', percentage: '0.0%', number: '0', text: 'N/A' },
    legal: { date: 'TBD', status: 'Pending', text: 'N/A', cost: '£TBD' },
    broker: { price: '£TBD', status: 'N/A', text: 'N/A', rating: 'N/A' },
    orchestrator: { status: '📋 Ready', percentage: 'N/A', text: 'N/A' }
  };
  
  const agentDefaults = defaults[agentType] || defaults.orchestrator;
  
  return lines.map((line, index) => {
    if (index === 1) return line; // Skip separator line
    
    return line.replace(/\|\s*\|/g, (match) => {
      // Determine appropriate default based on column context
      if (line.includes('£') || line.includes('Price') || line.includes('Cost')) {
        return `| ${agentDefaults.currency || agentDefaults.text} |`;
      } else if (line.includes('%') || line.includes('Rate')) {
        return `| ${agentDefaults.percentage || agentDefaults.text} |`;
      } else if (line.includes('Status')) {
        return `| ${agentDefaults.status || agentDefaults.text} |`;
      } else {
        return `| ${agentDefaults.text} |`;
      }
    });
  }).join('\n');
}

/**
 * Ensure table has proper separator line
 * @param {string} table - Table markdown
 * @returns {string} - Table with proper separator
 */
function ensureProperSeparator(table) {
  const lines = table.split('\n');
  if (lines.length < 2) return table;
  
  const headerLine = lines[0];
  const separatorLine = lines[1];
  
  // Count columns in header
  const columns = headerLine.split('|').filter(col => col.trim() !== '').length;
  
  // Generate proper separator
  if (!separatorLine.includes('-') || separatorLine.split('|').length !== columns + 2) {
    const newSeparator = '|' + Array(columns).fill('').map(() => '-----').join('|') + '|';
    lines[1] = newSeparator;
  }
  
  return lines.join('\n');
}

/**
 * Enhance table formatting and alignment
 * @param {string} table - Valid table markdown
 * @param {string} agentType - Agent type for context
 * @returns {string} - Enhanced table
 */
function enhanceTable(table, agentType) {
  let enhanced = table;
  
  // Apply right alignment for numeric columns
  enhanced = rightAlignNumbers(enhanced);
  
  // Add proper spacing
  enhanced = normalizeTableSpacing(enhanced);
  
  // Apply agent-specific enhancements
  enhanced = applyAgentSpecificEnhancements(enhanced, agentType);
  
  return enhanced;
}

/**
 * Normalize spacing in table markdown
 * @param {string} table - Table markdown
 * @returns {string} - Table with normalized spacing
 */
function normalizeTableSpacing(table) {
  const lines = table.split('\n');
  
  return lines.map(line => {
    if (!line.includes('|')) return line;
    
    const parts = line.split('|');
    const normalized = parts.map(part => {
      if (part.trim() === '') return '';
      return ` ${part.trim()} `;
    });
    
    return normalized.join('|');
  }).join('\n');
}

/**
 * Apply agent-specific table enhancements
 * @param {string} table - Table markdown
 * @param {string} agentType - Agent type
 * @returns {string} - Enhanced table
 */
function applyAgentSpecificEnhancements(table, agentType) {
  switch (agentType) {
    case 'finance':
      return enhanceFinanceTable(table);
    case 'legal':
      return enhanceLegalTable(table);
    case 'broker':
      return enhanceBrokerTable(table);
    case 'orchestrator':
      return enhanceOrchestratorTable(table);
    default:
      return table;
  }
}

/**
 * Enhance finance-specific table formatting
 * @param {string} table - Table markdown
 * @returns {string} - Enhanced finance table
 */
function enhanceFinanceTable(table) {
  let enhanced = table;
  
  // Format currency values
  enhanced = enhanced.replace(/£(\d+(?:,\d{3})*(?:\.\d{2})?)/g, (match, amount) => {
    const numAmount = parseFloat(amount.replace(/,/g, ''));
    return formatCurrencyForTable(numAmount, 0);
  });
  
  // Format percentages
  enhanced = enhanced.replace(/(\d+(?:\.\d+)?)%/g, (match, percentage) => {
    return formatPercentageForTable(parseFloat(percentage), 1);
  });
  
  // Add bold formatting to totals and key figures
  enhanced = enhanced.replace(/\|\s*(Total|Final|Overall|Average|Avg)\s*\|/gi, '| **$1** |');
  
  return enhanced;
}

/**
 * Enhance legal-specific table formatting
 * @param {string} table - Table markdown
 * @returns {string} - Enhanced legal table
 */
function enhanceLegalTable(table) {
  let enhanced = table;
  
  // Standardize status indicators
  enhanced = enhanced.replace(/\|\s*(Compliant|Complete|Done)\s*\|/gi, '| ✅ $1 |');
  enhanced = enhanced.replace(/\|\s*(Partial|In Progress|Pending)\s*\|/gi, '| ⚠️ $1 |');
  enhanced = enhanced.replace(/\|\s*(Non-compliant|Missing|Failed)\s*\|/gi, '| ❌ $1 |');
  
  // Format legal costs
  enhanced = enhanced.replace(/£(\d+(?:,\d{3})*)-(\d+(?:,\d{3})*)/g, '£$1-$2');
  
  return enhanced;
}

/**
 * Enhance broker-specific table formatting
 * @param {string} table - Table markdown
 * @returns {string} - Enhanced broker table
 */
function enhanceBrokerTable(table) {
  let enhanced = table;
  
  // Format EBITDA multiples
  enhanced = enhanced.replace(/(\d+(?:\.\d+)?)x/g, '$1x');
  
  // Standardize status indicators
  enhanced = enhanced.replace(/\|\s*(Sold|Completed)\s*\|/gi, '| ✅ Sold |');
  enhanced = enhanced.replace(/\|\s*(Active|Live|Available)\s*\|/gi, '| 🚀 Active |');
  enhanced = enhanced.replace(/\|\s*(Under Offer|Pending)\s*\|/gi, '| ⏳ Under Offer |');
  
  return enhanced;
}

/**
 * Enhance orchestrator-specific table formatting
 * @param {string} table - Table markdown
 * @returns {string} - Enhanced orchestrator table
 */
function enhanceOrchestratorTable(table) {
  let enhanced = table;
  
  // Standardize agent emojis
  enhanced = enhanced.replace(/Finance Agent|Finance/g, '📊 Finance');
  enhanced = enhanced.replace(/Legal Agent|Legal/g, '⚖️ Legal');
  enhanced = enhanced.replace(/Broker Agent|Broker/g, '🏢 Broker');
  enhanced = enhanced.replace(/Orchestrator Agent|Orchestrator/g, '🔄 Orchestrator');
  
  // Standardize status indicators
  enhanced = enhanced.replace(/\|\s*(Complete|Completed|Done)\s*\|/gi, '| ✅ Complete |');
  enhanced = enhanced.replace(/\|\s*(In Progress|Working|Active)\s*\|/gi, '| ⚠️ In Progress |');
  enhanced = enhanced.replace(/\|\s*(Blocked|Error|Failed)\s*\|/gi, '| ❌ Blocked |');
  enhanced = enhanced.replace(/\|\s*(Ready|Queued|Waiting)\s*\|/gi, '| 📋 Ready |');
  
  return enhanced;
}

/**
 * Generate a table template for a specific agent and use case
 * @param {string} agentType - Agent type
 * @param {string} useCase - Specific use case (valuation, compliance, etc.)
 * @param {object} data - Data to populate template
 * @returns {string} - Generated table markdown
 */
export function generateAgentTable(agentType, useCase, data = {}) {
  const template = generateTableTemplate(agentType, useCase);
  if (!template) {
    return generateDefaultTable(agentType, data);
  }
  
  // If data is provided, populate template
  if (Object.keys(data).length > 0) {
    return populateTableTemplate(template, data);
  }
  
  return template;
}

/**
 * Generate a default table when no template is available
 * @param {string} agentType - Agent type
 * @param {object} data - Data to include
 * @returns {string} - Default table markdown
 */
function generateDefaultTable(agentType, data) {
  const keys = Object.keys(data);
  if (keys.length === 0) {
    return `
| Item | Value |
|------|-------|
| Status | N/A |`;
  }
  
  const header = `| ${keys.join(' | ')} |`;
  const separator = `|${keys.map(() => '---').join('|')}|`;
  const values = Object.values(data);
  const row = `| ${values.join(' | ')} |`;
  
  return [header, separator, row].join('\n');
}

/**
 * Populate a table template with actual data
 * @param {string} template - Table template
 * @param {object} data - Data to populate
 * @returns {string} - Populated table
 */
function populateTableTemplate(template, data) {
  let populated = template;
  
  // Replace placeholder values with actual data
  Object.entries(data).forEach(([key, value]) => {
    const placeholderRegex = new RegExp(`\\{\\{${key}\\}\\}|\\$\\{${key}\\}`, 'g');
    populated = populated.replace(placeholderRegex, value);
  });
  
  return populated;
}

export default {
  processAgentTables,
  generateAgentTable,
  validateTableStructure,
  enhanceTable
};
