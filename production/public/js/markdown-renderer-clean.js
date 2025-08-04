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
      return `<${tag}${startAttr}>${body}</${tag}>`;
    };
    renderer.listitem = text => `<li>${text}</li>`;

    // PARAGRAPHS: rely on prose for spacing, drop extra my-3
    renderer.paragraph = text => `<p>${text}</p>`;

    // TABLES: Enhanced responsive tables with agent-specific styling
    renderer.table = (hdr, body) => {
      return `
        <div class="table-wrapper overflow-x-auto my-6 rounded-lg border border-gray-200 shadow-sm">
          <table class="w-full table-auto min-w-full">
            <thead class="bg-gradient-to-r from-gray-50 to-gray-100">${hdr}</thead>
            <tbody class="bg-white divide-y divide-gray-100">${body}</tbody>
          </table>
        </div>`;
    };
    
    renderer.tablecell = (content, flags) => {
      const tag = flags.header ? 'th' : 'td';
      
      // Enhanced styling for headers
      if (flags.header) {
        const align = flags.align ? ` style="text-align:${flags.align}"` : '';
        return `<${tag}${align} class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">${content}</${tag}>`;
      }
      
      // Enhanced styling for data cells with type detection
      let cellClass = 'px-4 py-3 text-sm text-gray-900 whitespace-nowrap';
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
      return `
        <div class="relative group my-4 rounded border border-gray-200 overflow-hidden">
          <div class="bg-gray-100 px-3 py-1 text-xs font-mono flex justify-between">
            <span>${language}</span>
            <button class="copy-btn opacity-0 group-hover:opacity-100 text-gray-600" onclick="copyCodeToClipboard(this)">Copy</button>
          </div>
          <pre class="bg-white p-4 overflow-x-auto text-sm"><code class="language-${language}">${escaped ? code : this.escape(code)}</code></pre>
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
   * Render markdown to HTML with ChatGPT-like formatting
   * @param {string} markdown - Raw markdown text
   * @param {string} agentType - Type of agent (for styling)
   * @returns {string} - Sanitized HTML
   */
  renderToHtml(markdown, agentType = 'orchestrator') {
    try {
      // Pre-process markdown for better formatting
      let processedMarkdown = this.preprocessMarkdown(markdown, agentType);
      
      // Convert to HTML
      let html = marked.parse(processedMarkdown);
      
      // Post-process HTML for better styling
      html = this.postprocessHtml(html, agentType);
        
      // Sanitize for security
      return DOMPurify.sanitize(html, {
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
        ]
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
    let processed = markdown;

    // Handle agent response formatting patterns
    processed = this.preprocessAgentResponses(processed);

    // ENHANCED TABLE PROCESSING - Apply advanced table validation and enhancement
    processed = this.enhanceTablesForAgent(processed, agentType);

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
    processed = processed.replace(/(\d+(?:\.\d+)?%)/g, '**$1**'); // Percentages
    processed = processed.replace(/(\$\d+(?:,\d{3})*(?:\.\d{2})?)/g, '**$1**'); // Currency

    // Ensure proper line breaks around elements
    processed = processed.replace(/\n{3,}/g, '\n\n'); // Normalize multiple line breaks
    processed = processed.replace(/^(\|.*\|)$/gm, '\n$1\n'); // Tables need spacing

    return processed.trim();
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

    // Update copy button functionality for new code block structure
    processed = processed.replace(/onclick="copyCodeToClipboard\(this\)"/g, 'onclick="copyCodeToClipboard(this)"');

    return processed;
  }

  /**
   * Enhanced table processing with AI agent-specific improvements
   * @param {string} content - Content with tables to enhance
   * @param {string} agentType - Type of agent (finance, legal, broker, orchestrator)
   * @returns {string} - Content with enhanced tables
   */
  enhanceTablesForAgent(content, agentType) {
    const tableRegex = /(\|[^|\n]*\|(?:\r?\n\|[^|\n]*\|)*)/g;
    
    return content.replace(tableRegex, (tableMatch) => {
      try {
        return this.processTableForAgent(tableMatch, agentType);
      } catch (error) {
        console.warn('Table enhancement failed:', error);
        return tableMatch; // Return original on error
      }
    });
  }

  /**
   * Process a single table for specific agent type
   * @param {string} table - Table markdown
   * @param {string} agentType - Agent type
   * @returns {string} - Enhanced table
   */
  processTableForAgent(table, agentType) {
    let enhanced = table.trim();

    // Basic structure fixes
    enhanced = this.fixTableStructure(enhanced);
    
    // Fill empty cells
    enhanced = this.fillEmptyTableCells(enhanced);
    
    // Apply agent-specific enhancements
    switch (agentType) {
      case 'finance':
        enhanced = this.enhanceFinanceTable(enhanced);
        break;
      case 'legal':
        enhanced = this.enhanceLegalTable(enhanced);
        break;
      case 'broker':
        enhanced = this.enhanceBrokerTable(enhanced);
        break;
      case 'orchestrator':
        enhanced = this.enhanceOrchestratorTable(enhanced);
        break;
    }

    // Ensure proper spacing
    enhanced = this.normalizeTableSpacing(enhanced);

    return enhanced;
  }

  /**
   * Fix basic table structure issues
   */
  fixTableStructure(table) {
    const lines = table.split('\n').filter(line => line.trim());
    if (lines.length < 2) return table;

    return lines.map((line, index) => {
      let fixed = line.trim();
      
      // Ensure proper pipe structure
      if (!fixed.startsWith('|')) fixed = '| ' + fixed;
      if (!fixed.endsWith('|')) fixed = fixed + ' |';
      
      // Fix separator line
      if (index === 1 && !fixed.includes('-')) {
        const columnCount = (lines[0].match(/\|/g) || []).length - 1;
        fixed = '|' + '---------|'.repeat(columnCount);
      }
      
      return fixed;
    }).join('\n');
  }

  /**
   * Fill empty table cells with appropriate content
   */
  fillEmptyTableCells(table) {
    return table.replace(/\|\s*\|/g, '| - |');
  }

  /**
   * Normalize table spacing
   */
  normalizeTableSpacing(table) {
    return table.replace(/\|([^|\n]*)\|/g, (match, content) => {
      return `| ${content.trim()} |`;
    });
  }

  /**
   * Finance-specific table enhancements
   */
  enhanceFinanceTable(table) {
    // Right-align numeric columns, format currency
    return table.replace(/\|\s*(\$?[\d,]+\.?\d*)\s*\|/g, (match, num) => {
      const formatted = num.includes('$') ? num : (num.includes('.') ? parseFloat(num.replace(/,/g, '')).toFixed(2) : num);
      return `| **${formatted}** |`;
    });
  }

  /**
   * Legal-specific table enhancements
   */
  enhanceLegalTable(table) {
    // Emphasize legal terms and dates
    return table.replace(/\|\s*([A-Z][a-z]+ \d{1,2}, \d{4}|\d{1,2}\/\d{1,2}\/\d{4})\s*\|/g, '| **$1** |')
           .replace(/\|\s*(Article|Section|Clause|Amendment|Law|Act|Code)\s+([^\|]+)\s*\|/gi, '| **$1 $2** |');
  }

  /**
   * Broker-specific table enhancements
   */
  enhanceBrokerTable(table) {
    // Highlight property details and contact info
    return table.replace(/\|\s*(\$[\d,]+)\s*\|/g, '| **$1** |')
           .replace(/\|\s*(\d+\s*(?:bed|bath|sqft|acre)s?)\s*\|/gi, '| *$1* |')
           .replace(/\|\s*([\w\.-]+@[\w\.-]+\.\w+)\s*\|/g, '| `$1` |');
  }

  /**
   * Orchestrator-specific table enhancements
   */
  enhanceOrchestratorTable(table) {
    // Emphasize status and priority columns
    return table.replace(/\|\s*(High|Medium|Low|Critical|Normal)\s*\|/gi, '| **$1** |')
           .replace(/\|\s*(Complete|Pending|In Progress|Failed|Success)\s*\|/gi, '| *$1* |')
           .replace(/\|\s*(Agent|Task|Status|Priority)\s*\|/gi, '| **$1** |');
  }

  /**
   * Generate a test markdown document to showcase all features
   * @returns {string} - Test markdown content
   */
  generateTestMarkdown() {
    return `# Header Level 1: Main Title
This is a paragraph with **bold text**, *italic text*, and \`inline code\`.

## Header Level 2: Section Title

### Header Level 3: Subsection

Here's a paragraph with a [link to example](https://example.com) and some more text.

#### Bullet Points and Lists

- First bullet point with **bold emphasis**
- Second bullet point with *italic text*
- Third bullet point with \`inline code\`
  - Nested bullet point
  - Another nested item

#### Numbered Lists

1. First numbered item
2. Second numbered item with **important data**
3. Third numbered item
   1. Nested numbered item
   2. Another nested numbered item

#### Tables with Headers

| Property | Value | Description |
|----------|-------|-------------|
| **Name** | John Doe | Full name of the person |
| **Age** | 32 | Age in years |
| **Salary** | **$85,000** | Annual salary |
| **Department** | Engineering | Work department |

#### Blockquotes and Callouts

> This is a regular blockquote with some important information.

> **Note:** This is an informational callout box.

> **Warning:** This is a warning callout with critical information.

> **Important:** This is an important notice that requires attention.

> **Tip:** This is a helpful tip for better results.

#### Code Blocks

Here's some JavaScript code:

\`\`\`javascript
function greetUser(name) {
    const greeting = \`Hello, \${name}!\`;
    console.log(greeting);
    return greeting;
}

// Usage example
const userName = "World";
greetUser(userName);
\`\`\`

Here's some Python code:

\`\`\`python
def calculate_total(items):
    """Calculate total price of items"""
    total = 0
    for item in items:
        total += item.get('price', 0)
    return total

# Example usage
shopping_cart = [
    {'name': 'Apple', 'price': 1.50},
    {'name': 'Banana', 'price': 0.75}
]
total_cost = calculate_total(shopping_cart)
print(f"Total: $\{total_cost:.2f}")
\`\`\`

#### Data and Statistics

Some key metrics:
- Revenue growth: **25.5%**
- Customer satisfaction: **92%**
- Budget allocation: **$125,000**
- Team size: **15 people**

---

#### Visual Hierarchy Example

##### Step 1: Data Collection
Gather all necessary information from multiple sources.

##### Step 2: Analysis
Process the collected data using statistical methods.

##### Step 3: Reporting
Present findings with clear visualizations and recommendations.

---

This test document demonstrates all enhanced markdown features including formatted headers, bullet points, numbered lists, tables, blockquotes, callouts, line spacing, visual hierarchy, and rich text styling.`;
  }

  /**
   * Test the markdown renderer with all features
   * @returns {string} - Rendered HTML
   */
  testAllFeatures() {
    const testMarkdown = this.generateTestMarkdown();
    return this.renderToHtml(testMarkdown, 'test');
  }
}

// Global copy functions for code blocks
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

// Initialize global renderer
window.arzaniRenderer = new ArzaniMarkdownRenderer();

// Global test function to showcase all markdown features
window.testMarkdownFeatures = function() {
  console.log('Testing all markdown features...');
  const testHtml = window.arzaniRenderer.testAllFeatures();
  
  // Create a test container if it doesn't exist
  let testContainer = document.getElementById('markdown-test-container');
  if (!testContainer) {
    testContainer = document.createElement('div');
    testContainer.id = 'markdown-test-container';
    testContainer.style.cssText = `
      position: fixed;
      top: 50px;
      right: 50px;
      width: 60%;
      max-height: 80vh;
      background: white;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
      overflow-y: auto;
      z-index: 10000;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    `;
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
      position: absolute;
      top: 10px;
      right: 15px;
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #6b7280;
    `;
    closeButton.onclick = () => testContainer.remove();
    
    testContainer.appendChild(closeButton);
    document.body.appendChild(testContainer);
  }
  
  testContainer.innerHTML = `
    <button onclick="this.parentElement.remove()" style="position: absolute; top: 10px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280;">×</button>
    <h2 style="margin-top: 0; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Markdown Features Test</h2>
    ${testHtml}
  `;
  
  console.log('Markdown test container created. Check the right side of your screen!');
  return testHtml;
};

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ArzaniMarkdownRenderer;
}
