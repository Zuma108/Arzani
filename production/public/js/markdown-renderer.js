/**
 * Markdown Renderer for Arzani-X
 * Converts markdown responses to ChatGPT-like formatted HTML
 */

class ArzaniMarkdownRenderer {
  constructor() {
    this.initializeMarked();
  }

  initializeMarked() {
    // Configure marked with ChatGPT-like options
    marked.setOptions({
      breaks: true,
      gfm: true,
      headerIds: true,
      mangle: false,
      sanitize: false,
      smartLists: true,
      smartypants: true,
      highlight: (code, lang) => {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch (err) {}
        }
        return hljs.highlightAuto(code).value;
      }
    });

    // Custom renderer for ChatGPT-style formatting
    const renderer = new marked.Renderer();
    
    // HEADERS: medium weight, scroll-margin for anchors
    const hdrClasses = {
      1: 'text-3xl font-medium mt-8 mb-4 scroll-mt-24',
      2: 'text-2xl font-medium mt-6 mb-3 scroll-mt-20',
      3: 'text-xl font-medium mt-5 mb-2 scroll-mt-16',
      4: 'text-lg font-medium mt-4 mb-2 scroll-mt-12',
      5: 'text-base font-medium mt-3 mb-1 scroll-mt-8',
      6: 'text-sm font-medium mt-2 mb-1 scroll-mt-6'
    };
    renderer.heading = (text, level, raw) => {
      const anchor = raw.toLowerCase().replace(/[^\w]+/g, '-');
      return `<h${level} id="${anchor}" class="${hdrClasses[level] || hdrClasses[6]}">${text}</h${level}>`;
    };

    // PROSE container will handle list spacing
    renderer.list = (body, ordered, start) => {
      const tag = ordered ? 'ol' : 'ul';
      const startAttr = ordered && start !== 1 ? ` start="${start}"` : '';
      return `<${tag}${startAttr} class="message-content-${tag}">${body}</${tag}>`;
    };
    renderer.listitem = text => `<li class="message-content-li">${text}</li>`;

    // PARAGRAPHS: rely on prose for spacing, drop extra my-3
    renderer.paragraph = text => `<p>${text}</p>`;

    // TABLES: Enhanced responsive tables with agent-specific styling
    renderer.table = (hdr, body) => {
      return `
        <div class="arzani-table-wrapper overflow-x-auto my-6 rounded-lg border border-gray-200 shadow-sm">
          <table class="arzani-table w-full table-auto min-w-full">
            <thead class="arzani-table-head bg-gradient-to-r from-gray-50 to-gray-100">${hdr}</thead>
            <tbody class="arzani-table-body bg-white divide-y divide-gray-100">${body}</tbody>
          </table>
        </div>`;
    };
    
    renderer.tablecell = (content, flags) => {
      const tag = flags.header ? 'th' : 'td';
      
      // Enhanced styling for headers
      if (flags.header) {
        const align = flags.align ? ` style="text-align:${flags.align}"` : '';
        return `<${tag}${align} class="arzani-th px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">${content}</${tag}>`;
      }
      
      // Enhanced styling for data cells with type detection
      let cellClass = 'arzani-td px-4 py-3 text-sm text-gray-900 whitespace-nowrap';
      let cellStyle = flags.align ? ` style="text-align:${flags.align}"` : '';
      
      // Detect content type and apply appropriate styling
      const cleanContent = content.replace(/<[^>]*>/g, '').trim();
      
      // Currency values
      if (cleanContent.match(/£[\d,]+(?:\.\d{2})?[KM]?/)) {
        cellClass += ' font-medium text-green-700';
      }
      // Percentages
      else if (cleanContent.match(/\d+\.?\d*%/)) {
        cellClass += ' font-medium text-blue-700';
      }
      // Status indicators
      else if (cleanContent.match(/✅|⚠️|❌|📋|🚀|⏳/)) {
        cellClass += ' text-center';
      }
      // Numeric values
      else if (cleanContent.match(/^\d+\.?\d*x?$/)) {
        cellClass += ' font-mono text-right';
        cellStyle = ' style="text-align:right"';
      }
      
      // Add hover effect for data cells
      cellClass += ' hover:bg-gray-50 transition-colors duration-150';
      
      return `<${tag}${cellStyle} class="${cellClass}">${content}</${tag}>`;
    };

    // BLOCKQUOTES: callouts get tinted bg, others italic
    renderer.blockquote = quote => {
      const callouts = {
        'Note:': 'bg-blue-50 border-blue-200 text-blue-800',
        'Warning:': 'bg-yellow-50 border-yellow-200 text-yellow-800',
        'Important:': 'bg-red-50 border-red-200 text-red-800',
        'Tip:': 'bg-green-50 border-green-200 text-green-800',
        'Info:': 'bg-blue-50 border-blue-200 text-blue-800'
      };
      const match = quote.match(/^(<strong>)?(Note:|Warning:|Important:|Tip:|Info:)/);
      if (match) {
        const type = match[2];
        return `
          <div class="border-l-4 ${callouts[type]} p-4 my-4 rounded">
            ${quote}
          </div>`;
      }
      return `<blockquote class="border-l-2 border-gray-300 pl-4 italic my-4">${quote}</blockquote>`;
    };

    // INLINE CODE & CODE BLOCK
    renderer.codespan = code =>
      `<code class="bg-gray-50 px-1.5 py-0.5 rounded font-mono text-sm">${code}</code>`;

    renderer.code = (code, lang, escaped) => {
      const language = lang || 'text';
      // Use marked's escape function or fallback to manual escaping
      const escapeHtml = (text) => {
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      };
      
      const escapedCode = escaped ? code : escapeHtml(code);
      
      return `
        <div class="relative group my-4 rounded border border-gray-200 overflow-hidden">
          <div class="bg-gray-100 px-3 py-1 text-xs font-mono flex justify-between">
            <span>${language}</span>
            <button class="copy-btn opacity-0 group-hover:opacity-100 text-gray-600" onclick="copyCodeToClipboard(this)">Copy</button>
          </div>
          <pre class="bg-white p-4 overflow-x-auto text-sm"><code class="language-${language}">${escapedCode}</code></pre>
        </div>`;
    };

    // LINKS & EMPHASIS
    renderer.link = (href, title, text) => {
      const tit = title ? ` title="${title}"` : '';
      return `<a href="${href}"${tit} class="underline hover:text-blue-600" target="_blank" rel="noopener noreferrer">${text}</a>`;
    };
    renderer.strong = txt => `<strong class="font-medium text-gray-900">${txt}</strong>`;
    renderer.em = txt => `<em class="italic text-gray-700">${txt}</em>`;

    // Horizontal rule renderer
    renderer.hr = () => `<hr class="my-6 border-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent">`;

    marked.use({ renderer });
  }

  /**
   * Render markdown to HTML with ChatGPT-like formatting and thinking panel integration
   * @param {string} markdown - Raw markdown text
   * @param {string} agentType - Type of agent (for styling)
   * @param {Object} options - Additional rendering options
   * @returns {string} - Sanitized HTML with thinking panels
   */
  renderToHtml(markdown, agentType = 'orchestrator', options = {}) {
    try {
      // Extract thinking data and clean content
      const extracted = this.extractThinkingData(markdown, agentType);
      const cleanMarkdown = extracted.content;
      const thinkingData = extracted.thinkingData;
      
      // Check explicitly for markdown tables
      const hasTable = this.hasMarkdownTable(cleanMarkdown);
      if (hasTable) {
        console.log('🔍 TABLE DETECTED: Processing markdown with tables');
      }
      
      // Pre-process markdown for better formatting
      let processedMarkdown = this.preprocessMarkdown(cleanMarkdown, agentType);
      
      // If tables are detected, add debug info to content
      if (hasTable) {
        console.log('📊 PROCESSED MARKDOWN WITH TABLE:', processedMarkdown.substring(0, 200));
      }
      
      // Convert to HTML
      let html = marked.parse(processedMarkdown);
      
      // Debug HTML output for tables
      if (hasTable) {
        console.log('🎯 RENDERED HTML FOR TABLE:', html.substring(0, 300));
      }
      
      // Post-process HTML for better styling
      html = this.postprocessHtml(html, agentType);
      
      // Add thinking panel if we have thinking data
      let finalHtml = html;
      if (thinkingData && !options.skipThinkingPanel) {
        const thinkingPanelHtml = this.renderThinkingPanel(thinkingData, agentType);
        // Insert thinking panel at the beginning
        finalHtml = thinkingPanelHtml + html;
      }
        
      // Sanitize for security (enhanced to include thinking panel elements)
      return DOMPurify.sanitize(finalHtml, {
        ALLOWED_TAGS: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'br', 'strong', 'em', 'u', 's', 'del', 'ins',
          'ul', 'ol', 'li',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'blockquote', 'code', 'pre',
          'a', 'img',
          'div', 'span', 'hr',
          'button', 'svg', 'path'
        ],
        ALLOWED_ATTR: [
          'href', 'src', 'alt', 'class', 'id', 'target', 'rel',
          'onclick', 'style', 'title', 'data-*',
          'stroke', 'stroke-linecap', 'stroke-linejoin', 'stroke-width',
          'fill', 'viewBox', 'd', 'width', 'height'
        ],
        KEEP_CONTENT: true
      });
    } catch (error) {
      console.error('Markdown rendering error:', error);
      return `<p class="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4 my-4">
        <strong>Error rendering response:</strong> ${error.message}
        <br><small class="text-red-500 mt-2 block">Please try again or contact support if the issue persists.</small>
      </p>`;
    }
  }

  /**
   * Pre-process markdown for better formatting
   * @param {string} markdown - Raw markdown
   * @param {string} agentType - Type of agent for specific processing
   * @returns {string} - Processed markdown
   */
  preprocessMarkdown(markdown, agentType = 'orchestrator') {
    // Store original markdown for comparison
    const originalMarkdown = markdown;
    let processed = markdown;

    // Check for tables before processing
    const hasTableBefore = this.hasMarkdownTable(processed);
    if (hasTableBefore) {
      console.log('📊 TABLE DETECTED BEFORE PREPROCESSING');
    }

    // Handle agent response formatting patterns
    processed = this.preprocessAgentResponses(processed);

    // IMPORTANT: Extract tables before general processing to protect their structure
    const tableRegex = /(\|[^\n]*\|[\s\r\n]*(?:\|[^\n]*\|[\s\r\n]*)+)/g;
    const tablePlaceholders = [];
    let tableCount = 0;
    
    // Replace tables with placeholders to protect them during general processing
    // IMPROVED: Ensure tables have proper newlines before and after (critical for GFM parsing)
    processed = processed.replace(tableRegex, (tableMatch) => {
      // Ensure table has newlines before and after for proper GFM recognition
      const tableWithNewlines = `\n${tableMatch.trim()}\n`;
      
      const placeholder = `__TABLE_PLACEHOLDER_${tableCount}__`;
      tablePlaceholders.push({
        placeholder,
        content: tableWithNewlines
      });
      tableCount++;
      return placeholder;
    });

    // Apply general formatting (avoiding table areas)
    
    // Ensure proper spacing around headers
    processed = processed.replace(/^(#{1,6}\s)/gm, '\n$1');

    // Add enhanced callout boxes for common patterns
    processed = processed.replace(/^(Note:|Warning:|Important:|Tip:|Info:)/gm, '> **$1**');
    
    // Ensure proper list formatting with nested support
    processed = processed.replace(/^(\s*)(\d+\.|\-|\*|\+)\s/gm, '$1$2 ');

    // Enhanced emphasis patterns
    processed = processed.replace(/\*\*([^*]+)\*\*/g, '**$1**'); // Bold
    processed = processed.replace(/\*([^*]+)\*/g, '*$1*'); // Italic
    processed = processed.replace(/`([^`]+)`/g, '`$1`'); // Inline code

    // Handle special formatting for data/statistics
    processed = processed.replace(/(£[\d,]+(?:\.\d{2})?)/g, '**$1**'); // Bold GBP amounts
    processed = processed.replace(/\b(\d+\.?\d*%)\b/g, '**$1**'); // Bold percentages

    // Add space after emoji bullets for better rendering
    processed = processed.replace(/(^|\n)([\u{1F300}-\u{1F5FF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}])(\S)/gu, '$1$2 $3');

    // Restore tables from placeholders WITHOUT modifying them
    tablePlaceholders.forEach(({ placeholder, content }) => {
      processed = processed.replace(placeholder, content);
    });

    // Final check to ensure tables are still present
    const hasTableAfter = this.hasMarkdownTable(processed);
    if (hasTableBefore && !hasTableAfter) {
      console.warn('⚠️ TABLE LOST DURING PREPROCESSING - Reverting to original markdown');
      return originalMarkdown;
    }

    return processed;
  }

  /**
   * Process agent-specific response patterns
   * @param {string} content - Raw content
   * @returns {string} - Processed content
   */
  preprocessAgentResponses(content) {
    let processed = content;

    // Convert "Step X: AGENT NAME ANALYSIS" to headers
    processed = processed.replace(/^Step\s+(\d+):\s+([A-Z\s]+AGENT[A-Z\s]*)\s*$/gm, '## Step $1: $2');
    
    // Convert standalone agent names in caps to headers
    processed = processed.replace(/^([A-Z]{2,}\s+AGENT[A-Z\s]*)$/gm, '### $1');
    
    // Convert "→ Recommended..." lines to callouts
    processed = processed.replace(/^→\s+(.*)$/gm, '> **→** $1');
    
    // Convert "---" separators to horizontal rules
    processed = processed.replace(/^---+$/gm, '\n---\n');
    
    // Convert "Sources:" lines to italics
    processed = processed.replace(/^Sources:\s*(.*)$/gm, '*Sources: $1*');
    
    // Handle example sections
    processed = processed.replace(/^(Some Examples Of How I Can Help:)$/gm, '### $1');
    
    // Convert standalone caps lines to subheaders
    processed = processed.replace(/^([A-Z][A-Z\s&]+[A-Z])!?\s*$/gm, '**$1**');

    return processed;
  }

  /**
   * Post-process HTML for better styling
   * @param {string} html - Raw HTML
   * @param {string} agentType - Agent type for styling
   * @returns {string} - Enhanced HTML
   */
  postprocessHtml(html, agentType) {
    let processed = html;

    // Add agent-specific classes with ChatGPT-style prose container
    processed = `<div class="message-content agent-${agentType} prose prose-lg prose-blue max-w-none">${processed}</div>`;

    // Add custom table wrapper for fixing table overflow issues
    processed = processed.replace(/<table>/g, '<div class="arzani-table-wrapper"><table class="arzani-table">');
    processed = processed.replace(/<\/table>/g, '</table></div>');

    // Update copy button functionality for new code block structure
    processed = processed.replace(/onclick="copyCodeToClipboard\(this\)"/g, 'onclick="copyCodeToClipboard(this)"');

    return processed;
  }

  /**
   * Enhanced table processing with AI agent-specific improvements
   * SIMPLIFIED: Minimize modifications to allow marked.js to handle GFM table parsing
   * @param {string} content - Content with tables to enhance
   * @param {string} agentType - Type of agent (finance, legal, broker, orchestrator)
   * @returns {string} - Content with enhanced tables
   */
  enhanceTablesForAgent(content, agentType) {
    // Detect if content has tables
    if (!this.hasMarkdownTable(content)) {
      return content;
    }

    console.log(`📊 Enhancing tables for agent type: ${agentType}`);
    
    // Extract tables using regex
    const tableRegex = /(\|[^\n]*\|[\s\r\n]*(?:\|[^\n]*\|[\s\r\n]*)+)/g;
    let enhanced = content;
    
    // SIMPLIFIED: Only ensure proper newlines around tables for GFM compliance
    // Let marked.js handle the parsing with its built-in GFM support
    enhanced = enhanced.replace(tableRegex, (tableMatch) => {
      // Ensure proper newlines around tables for GFM compliance
      return `\n${tableMatch.trim()}\n`;
    });
    
    return enhanced;
  }

  /**
   * Convert markdown tables - Legacy compatibility method
   * @param {string} content - Content with tables to convert
   * @returns {string} - Content with converted tables
   */
  convertMarkdownTables(content) {
    // This is a legacy compatibility method that calls the enhanced table processing
    return this.enhanceTablesForAgent(content, 'orchestrator');
  }

  /**
   * Check if content contains markdown formatting
   * @param {string} content - Content to check
   * @returns {boolean} - True if content appears to contain markdown
   */
  isMarkdownContent(content) {
    if (!content || typeof content !== 'string') {
      return false;
    }

    // Check for common markdown patterns
    const markdownPatterns = [
      /^#{1,6}\s+/m,           // Headers
      /\*\*[^*]+\*\*/,         // Bold text
      /\*[^*]+\*/,             // Italic text
      /`[^`]+`/,               // Inline code
      /```[\s\S]*?```/,        // Code blocks
      /^\s*[-*+]\s+/m,         // Unordered lists
      /^\s*\d+\.\s+/m,         // Ordered lists
      /^\s*\|.*\|/m,           // Tables
      /^\s*>/m,                // Blockquotes
      /\[([^\]]+)\]\(([^)]+)\)/, // Links
      /!\[([^\]]*)\]\(([^)]+)\)/, // Images
      /^---+$/m,               // Horizontal rules
      /~~[^~]+~~/              // Strikethrough
    ];

    // Check if any markdown patterns are found
    return markdownPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Explicitly check if content contains a markdown table
   * IMPROVED: More reliable table detection with detailed logging
   * @param {string} content - Text to check for tables
   * @returns {boolean} - True if content contains table
   */
  hasMarkdownTable(content) {
    // Check for basic table structure
    if (!content || typeof content !== 'string') return false;
    
    // Table pattern matching both standard and simplified tables
    // Look for at least one line with pipes, followed by another line with pipes
    const hasTable = content.includes('|') && 
                     (
                       // Standard table with header row separator 
                       (/^\s*\|.*\|[\r\n]+\s*\|[\s-:]*\|/m.test(content)) ||
                       // Simplified table (at least two rows of pipe-separated content)
                       (/^\s*\|.*\|[\r\n]+\s*\|.*\|/m.test(content))
                     );
    
    if (hasTable) {
      console.log('📊 DETECTED TABLE in content');
      // Extract and log the table to help with debugging
      const tableMatches = content.match(/(\|[^\n]*\|[\s\r\n]*(?:\|[^\n]*\|[\s\r\n]*)+)/g);
      if (tableMatches) {
        // Check if tables have proper structure
        const firstTable = tableMatches[0];
        const lines = firstTable.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        if (lines.length >= 2) {
          const headerLine = lines[0];
          const separatorLine = lines[1];
          
          // Check if second line is a proper separator
          const isProperSeparator = /^\|(\s*[-:]+\s*\|)+$/.test(separatorLine);
          
          if (!isProperSeparator) {
            console.log('⚠️ Table detected but separator line may not be properly formatted');
          }
        } else {
          console.log('⚠️ Table detected but has less than 2 lines');
        }
      }
    }
    
    return hasTable;
  }

  /**
   * Render thinking panel with MCP integration and progressive disclosure
   * @param {Object} thinkingData - Structured thinking data from agents
   * @param {string} agentType - Type of agent (orchestrator, legal, finance, revenue)
   * @returns {string} - HTML for thinking panel
   */
  renderThinkingPanel(thinkingData, agentType = 'orchestrator') {
    if (!thinkingData || (!thinkingData.thoughts && !thinkingData.mcpSources && !thinkingData.memoryInsights)) {
      return '';
    }

    const panelId = `thinking-panel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const agentClass = `agent-${agentType}`;
    
    const agentIcons = {
      orchestrator: '🎯',
      legal: '⚖️',
      finance: '💰',
      revenue: '📈'
    };

    const agentNames = {
      orchestrator: 'Orchestrator',
      legal: 'Legal Agent',
      finance: 'Finance Agent', 
      revenue: 'Revenue Agent'
    };

    let html = `
      <div class="thinking-panel ${agentClass}" id="${panelId}">
        <div class="thinking-panel-header" onclick="toggleThinkingPanel('${panelId}')">
          <div class="thinking-panel-title">
            <span style="font-size: 16px;">${agentIcons[agentType] || '🤖'}</span>
            <span>${agentNames[agentType] || 'AI Agent'} Thinking</span>
            ${thinkingData.confidence ? `<div class="thinking-panel-badge">${Math.round(thinkingData.confidence * 100)}% confidence</div>` : ''}
          </div>
          <div class="thinking-panel-controls">
            ${thinkingData.status ? `<div class="thinking-status-indicator ${thinkingData.status}">${thinkingData.status}</div>` : ''}
            <svg class="thinking-panel-toggle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </div>
        </div>
        <div class="thinking-panel-content">`;

    // Add thinking steps (thoughts)
    if (thinkingData.thoughts && thinkingData.thoughts.length > 0) {
      html += '<div class="thinking-steps">';
      thinkingData.thoughts.forEach((thought, index) => {
        const stepClass = thought.status || 'completed';
        const thoughtText = typeof thought === 'string' ? thought : (thought.text || thought.content || thought.description || `Thought ${index + 1}`);
        const thoughtTitle = typeof thought === 'object' ? (thought.title || `Step ${index + 1}`) : `Step ${index + 1}`;
        
        html += `
          <div class="thinking-step">
            <div class="thinking-step-indicator ${stepClass}"></div>
            <div class="thinking-step-content">
              <div class="thinking-step-title">${thoughtTitle}</div>
              <div class="thinking-step-detail">${thoughtText}</div>
              ${thought.duration ? `<div style="font-size: 11px; color: #64748b; margin-top: 4px;">⏱️ ${thought.duration}ms</div>` : ''}
              ${thought.timestamp ? `<div style="font-size: 11px; color: #64748b; margin-top: 4px;">🕒 ${new Date(thought.timestamp).toLocaleTimeString()}</div>` : ''}
            </div>
          </div>`;
      });
      html += '</div>';
    }

    // Add MCP sources integration
    if (thinkingData.mcpSources && thinkingData.mcpSources.length > 0) {
      html += `
        <div class="thinking-sources">
          <div style="font-weight: 500; color: #374151; margin-bottom: 8px; font-size: 13px;">📊 Knowledge Sources</div>
          <div class="thinking-source-grid">`;
      
      thinkingData.mcpSources.forEach(source => {
        const sourceType = source.type || source.source || 'unknown';
        const iconClass = sourceType.toLowerCase().includes('pinecone') ? 'pinecone' : 
                         sourceType.toLowerCase().includes('brave') ? 'brave' : 
                         sourceType.toLowerCase().includes('knowledge') ? 'knowledge' : 'unknown';
        
        html += `
          <div class="thinking-source-item" title="${source.description || source.query || source.type}">
            <div class="thinking-source-header">
              <div class="thinking-source-icon ${iconClass}">
                ${iconClass === 'pinecone' ? 'P' : iconClass === 'brave' ? 'B' : iconClass === 'knowledge' ? 'K' : '?'}
              </div>
              <div class="thinking-source-name">${source.name || source.type || source.source}</div>
              ${source.confidence ? `<div class="thinking-source-confidence">${Math.round(source.confidence * 100)}%</div>` : ''}
            </div>
            <div class="thinking-source-meta">
              ${source.resultsCount ? `${source.resultsCount} results` : ''}
              ${source.responseTime ? ` • ${source.responseTime}ms` : ''}
              ${source.query ? ` • "${source.query}"` : ''}
            </div>
          </div>`;
      });
      
      html += '</div></div>';
    }

    // Add knowledge memory integration
    if (thinkingData.memoryInsights && thinkingData.memoryInsights.length > 0) {
      html += `
        <div class="thinking-memory-section">
          <div class="thinking-memory-header">
            <span style="font-size: 12px;">🧠</span>
            <span>Memory Insights</span>
          </div>
          <div class="thinking-memory-items">`;
      
      thinkingData.memoryInsights.forEach(insight => {
        const insightText = typeof insight === 'string' ? insight : (insight.text || insight.content || insight.description || insight.name);
        const insightType = typeof insight === 'object' ? insight.type : 'insight';
        
        html += `
          <div class="thinking-memory-item ${insightType}" title="${typeof insight === 'object' ? (insight.description || insight.text) : insight}">
            ${insightText}
          </div>`;
      });
      
      html += '</div></div>';
    }

    html += '</div></div>';
    return html;
  }

  /**
   * Fix basic table structure issues
   * SIMPLIFIED: Only fix critical issues, preserve GFM compliance
   */
  fixTableStructure(table) {
    console.log('🔍 Examining table structure:', table);
    
    const lines = table.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      console.log('⚠️ Table has less than 2 lines, cannot fix');
      return table;
    }

    // Only fix critical issues that would prevent GFM parsing
    
    // 1. Ensure header separator exists (row 1) if missing
    if (lines.length >= 2) {
      const headerLine = lines[0];
      const separatorLine = lines[1];
      
      // Check if the second line is a valid separator
      const isSeparator = /^\s*\|[-:\s|]*\|\s*$/.test(separatorLine);
      
      if (!isSeparator) {
        console.log('🔧 Missing header separator, adding one');
        // Count columns in header
        const columnCount = (headerLine.match(/\|/g) || []).length - 1;
        // Create proper separator
        const newSeparator = '|' + Array(columnCount).fill('---').join('|') + '|';
        // Insert separator after header
        lines.splice(1, 0, newSeparator);
      }
    }
    
    // 2. Ensure proper pipe structure for each line
    const processed = lines.map(line => {
      let fixed = line.trim();
      
      // Ensure each line starts and ends with pipes
      if (!fixed.startsWith('|')) fixed = '| ' + fixed;
      if (!fixed.endsWith('|')) fixed = fixed + ' |';
      
      return fixed;
    });
    
    const result = processed.join('\n');
    
    // Only log if changes were made
    if (result !== table.trim()) {
      console.log('✅ Fixed minimal table structure issues');
    }
    
    return result;
  }

  /**
   * Extract and process thinking data from markdown content
   * @param {string} markdown - Markdown content that may contain thinking annotations
   * @param {string} agentType - Type of agent
   * @returns {Object} - {content: processedMarkdown, thinkingData: extractedData}
   */
  extractThinkingData(markdown, agentType = 'orchestrator') {
    // Look for thinking data in various formats
    const thinkingPatterns = {
      // New agent thinking panel format: <!--THINKING_PANEL: {...}-->
      thinkingPanel: /<!--\s*THINKING_PANEL:\s*(\{.*?\})\s*-->/gs,
      // Legacy JSON thinking data: <!--THINKING: {...}-->
      json: /<!--\s*THINKING:\s*(\{.*?\})\s*-->/gs,
      // Structured thinking blocks: ```thinking ... ```
      block: /```thinking\n(.*?)\n```/gs,
      // Inline thinking steps: [THINKING: step description]
      inline: /\[THINKING:\s*([^\]]+)\]/g
    };

    let thinkingData = {
      id: null,
      agentType: agentType,
      thoughts: [],
      mcpSources: [],
      memoryInsights: [],
      confidence: null,
      status: 'completed',
      isActive: false
    };

    let cleanedContent = markdown;
    let foundThinkingData = false;

    // Extract new thinking panel format (priority)
    let match;
    while ((match = thinkingPatterns.thinkingPanel.exec(markdown)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        thinkingData = { ...thinkingData, ...parsed };
        foundThinkingData = true;
        cleanedContent = cleanedContent.replace(match[0], '');
      } catch (e) {
        console.warn('Failed to parse thinking panel JSON:', e);
      }
    }

    // Extract legacy JSON thinking data (fallback)
    if (!foundThinkingData) {
      while ((match = thinkingPatterns.json.exec(markdown)) !== null) {
        try {
          const parsed = JSON.parse(match[1]);
          // Convert legacy format to new format
          thinkingData = {
            ...thinkingData,
            thoughts: parsed.steps || [],
            mcpSources: parsed.sources || [],
            memoryInsights: parsed.memory || [],
            confidence: parsed.confidence,
            status: parsed.status
          };
          foundThinkingData = true;
          cleanedContent = cleanedContent.replace(match[0], '');
        } catch (e) {
          console.warn('Failed to parse thinking JSON:', e);
        }
      }
    }

    // Extract structured thinking blocks (fallback)
    if (!foundThinkingData) {
      while ((match = thinkingPatterns.block.exec(markdown)) !== null) {
        const blockContent = match[1];
        const steps = this.parseThinkingBlock(blockContent);
        thinkingData.thoughts.push(...steps);
        foundThinkingData = steps.length > 0;
        cleanedContent = cleanedContent.replace(match[0], '');
      }
    }

    // Extract inline thinking steps (fallback)
    if (!foundThinkingData) {
      const inlineSteps = [];
      while ((match = thinkingPatterns.inline.exec(markdown)) !== null) {
        inlineSteps.push({
          id: inlineSteps.length + 1,
          text: match[1],
          type: 'thinking',
          isCompleted: true,
          timestamp: new Date().toISOString()
        });
        cleanedContent = cleanedContent.replace(match[0], '');
      }
      
      if (inlineSteps.length > 0) {
        thinkingData.thoughts.push(...inlineSteps);
        foundThinkingData = true;
      }
    }

    return {
      content: cleanedContent.trim(),
      thinkingData: foundThinkingData ? thinkingData : null
    };
  }

  /**
   * Parse thinking block content into structured steps
   * @param {string} blockContent - Content of thinking block
   * @returns {Array} - Array of thinking steps
   */
  parseThinkingBlock(blockContent) {
    const lines = blockContent.split('\n').filter(line => line.trim());
    const steps = [];
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        steps.push({
          title: `Step ${steps.length + 1}`,
          detail: trimmed.substring(2),
          status: 'completed'
        });
      } else if (trimmed.match(/^\d+\./)) {
        steps.push({
          title: `Step ${steps.length + 1}`,
          detail: trimmed.replace(/^\d+\.\s*/, ''),
          status: 'completed'
        });
      } else if (trimmed) {
        steps.push({
          title: `Thought ${steps.length + 1}`,
          detail: trimmed,
          status: 'completed'
        });
      }
    });

    return steps;
  }
}

/**
 * Initialize global renderer instance
 */
window.arzaniRenderer = new ArzaniMarkdownRenderer();

/**
 * Global copy functions for code blocks
 */
window.copyToClipboard = function(button) {
  const codeBlock = button.nextElementSibling.querySelector('code');
  const text = codeBlock.textContent;
  
  navigator.clipboard.writeText(text).then(() => {
    button.textContent = 'Copied!';
    setTimeout(() => {
      button.textContent = 'Copy';
    }, 2000);
  });
};

// Enhanced copy function for ChatGPT-style code block structure
window.copyCodeToClipboard = function(button) {
  const codeContainer = button.closest('.relative');
  const codeBlock = codeContainer.querySelector('pre code');
  const text = codeBlock.textContent;
  
  navigator.clipboard.writeText(text).then(() => {
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    button.classList.add('text-green-600');
    
    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove('text-green-600');
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy code:', err);
    button.textContent = 'Failed';
    setTimeout(() => {
      button.textContent = 'Copy';
    }, 2000);
  });
};

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ArzaniMarkdownRenderer;
}
