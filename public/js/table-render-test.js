/**
 * Enhanced Table Rendering Test Script
 * This file helps debug and fix table rendering issues in Arzani-X
 */

// Add this after the page loads
document.addEventListener('DOMContentLoaded', function() {
  // Wait a bit to ensure all scripts are loaded and initialized
  setTimeout(() => {
    initializeTableTest();
  }, 1000);
  
  function initializeTableTest() {
    // Check if we're on the Arzani-X page with renderer available
    if (!window.arzaniRenderer) {
      console.warn('⚠️ arzaniRenderer not available on this page');
      return;
    }

    console.log('🧪 Enhanced Table Rendering Test initialized');
    
    // Create the test container
    const testContainer = document.createElement('div');
    testContainer.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2';
    
    // Add multiple test buttons for different test cases
    const testButton1 = createTestButton('Test Standard Table', testStandardTable);
    const testButton2 = createTestButton('Test Complex Table', testComplexTable);
    const testButton3 = createTestButton('Direct Marked.js Test', testDirectMarked);
    
    testContainer.appendChild(testButton1);
    testContainer.appendChild(testButton2);
    testContainer.appendChild(testButton3);
    document.body.appendChild(testContainer);
    
    // Create a debug panel
    createDebugPanel();
    
    console.log('🔧 Checking table render configuration:', {
      hasRenderer: !!window.arzaniRenderer,
      rendererMethods: Object.keys(window.arzaniRenderer),
      hasTableMethod: !!window.arzaniRenderer.hasMarkdownTable,
      markedAvailable: !!window.marked,
      domPurifyAvailable: !!window.DOMPurify
    });
  }
  
  function createTestButton(text, onClick) {
    const button = document.createElement('button');
    button.innerText = text;
    button.className = 'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium';
    button.onclick = onClick;
    return button;
  }
  
  function createDebugPanel() {
    // Create a collapsible debug panel
    const debugPanel = document.createElement('div');
    debugPanel.className = 'fixed top-4 right-4 z-50 bg-white shadow-lg rounded-lg p-4 max-w-md max-h-[80vh] overflow-auto';
    debugPanel.innerHTML = `
      <div class="flex justify-between items-center mb-2">
        <h3 class="font-bold text-lg">Table Rendering Debug</h3>
        <button id="closeDebugPanel" class="text-gray-500 hover:text-gray-700">×</button>
      </div>
      <div id="debugOutput" class="text-xs font-mono overflow-auto bg-gray-100 p-2 rounded"></div>
    `;
    debugPanel.style.display = 'none';
    document.body.appendChild(debugPanel);
    
    document.getElementById('closeDebugPanel').addEventListener('click', () => {
      debugPanel.style.display = 'none';
    });
    
    // Override console.log to also output to our debug panel
    const originalConsoleLog = console.log;
    console.log = function() {
      const args = Array.from(arguments);
      originalConsoleLog.apply(console, args);
      
      const debugOutput = document.getElementById('debugOutput');
      if (debugOutput) {
        const logItem = document.createElement('div');
        logItem.className = 'mb-1 border-b border-gray-200 pb-1';
        logItem.innerHTML = args.map(arg => {
          if (typeof arg === 'object') {
            return `<span class="text-blue-600">${JSON.stringify(arg, null, 2)}</span>`;
          } else {
            return String(arg);
          }
        }).join(' ');
        debugOutput.appendChild(logItem);
        debugOutput.scrollTop = debugOutput.scrollHeight;
      }
    };
    
    return debugPanel;
  }
  
  // Test with a standard simple markdown table
  function testStandardTable() {
    console.log('🧪 Running standard table rendering test');
    debugPanel = document.querySelector('.fixed.top-4.right-4');
    if (debugPanel) debugPanel.style.display = 'block';
    
    // Sample markdown with a standard table
    const markdownWithTable = `
# Standard Table Test

Here's a simple test table:

| Header 1 | Header 2 | Header 3 |
| -------- | -------- | -------- |
| Value 1  | Value 2  | Value 3  |
| Value 4  | Value 5  | Value 6  |

And here's some text after the table.
`;

    runTableTest(markdownWithTable, 'standard');
  }
    
  // Test with a more complex table
  function testComplexTable() {
    console.log('🧪 Running complex table rendering test');
    debugPanel = document.querySelector('.fixed.top-4.right-4');
    if (debugPanel) debugPanel.style.display = 'block';
    
    // Sample markdown with a more complex table
    const markdownWithTable = `
# Complex Table Test

This table has alignment and various types of content:

| Left | Center | Right | Mixed Types |
| :--- | :----: | ----: | ----------- |
| Text | $100   | 50%   | Normal      |
| More | $200   | 75%   | **Bold**    |
| Data | $300   | 100%  | *Italic*    |

The table above should render properly.
`;

    runTableTest(markdownWithTable, 'complex');
  }
  
  // Test direct marked.js rendering without our custom pipeline
  function testDirectMarked() {
    console.log('🧪 Running direct marked.js test');
    debugPanel = document.querySelector('.fixed.top-4.right-4');
    if (debugPanel) debugPanel.style.display = 'block';
    
    const markdownWithTable = `
# Direct Marked.js Test

| Col 1 | Col 2 | Col 3 |
| ----- | ----- | ----- |
| A     | B     | C     |
| D     | E     | F     |
`;

    // Test with direct marked parsing
    if (window.marked) {
      const rawOutput = window.marked.parse(markdownWithTable);
      console.log('🔍 Raw marked.js output:', rawOutput);
      
      // Create test message with direct marked output
      try {
        // Sanitize and display in a direct way
        const safeHtml = window.DOMPurify.sanitize(rawOutput);
        const testMessage = document.createElement('div');
        testMessage.className = 'message-bubble bg-gray-100 rounded-lg rounded-tl-none p-4 max-w-[80%] relative group';
        testMessage.innerHTML = `
          <div class="message-text">
            <h3 class="text-sm font-medium mb-2">Direct Marked.js Rendering</h3>
            <div class="direct-render">${safeHtml}</div>
          </div>
        `;
        
        // Add to the chat UI
        const messagesContainer = document.querySelector('.messages-container');
        if (messagesContainer) {
          messagesContainer.appendChild(testMessage);
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        console.log('✅ Direct rendering test added to UI');
      } catch (error) {
        console.error('❌ Failed to add direct test message:', error);
      }
    } else {
      console.error('❌ marked.js not directly available');
    }
  }
  
  // Main test function that runs all the diagnostics
  function runTableTest(markdownWithTable, testType) {
    // Log the original markdown
    console.log(`🔍 Original ${testType} Markdown:`, markdownWithTable);
    
    // Get the current ArzaniX instance
    const arzaniInstance = window.arzaniClient;
    if (!arzaniInstance) {
      console.error('❌ ArzaniA2AClient instance not found');
      alert('Cannot run test - ArzaniA2AClient instance not found');
      return;
    }
    
    // Step-by-step diagnosis
    try {
      // Step 1: Test hasMarkdownTable detection
      const hasTable = window.arzaniRenderer.hasMarkdownTable(markdownWithTable);
      console.log('🔍 Table detection result:', hasTable);
      
      // Step 2: Test preprocessing (if available)
      let preprocessed = markdownWithTable;
      if (window.arzaniRenderer.preprocessMarkdown) {
        preprocessed = window.arzaniRenderer.preprocessMarkdown(markdownWithTable);
        console.log('🔍 Preprocessed markdown:', preprocessed);
        
        // Check if table still exists after preprocessing
        const hasTableAfterPreprocess = window.arzaniRenderer.hasMarkdownTable(preprocessed);
        console.log('🔍 Table detected after preprocessing:', hasTableAfterPreprocess);
      }
      
      // Step 3: Test table structure fixing directly on the table part
      let tableMatch = null;
      const tableRegex = /(\|[^\n]*\|[\s\r\n]*(?:\|[^\n]*\|[\s\r\n]*)+)/g;
      const matches = preprocessed.match(tableRegex);
      
      if (matches && matches.length > 0) {
        tableMatch = matches[0];
        console.log('🔍 Extracted table from markdown:', tableMatch);
        
        if (window.arzaniRenderer.fixTableStructure) {
          const fixedTable = window.arzaniRenderer.fixTableStructure(tableMatch);
          console.log('🔍 Fixed table structure:', fixedTable);
          
          // Test if we replace the old table with the fixed one
          const fixedMarkdown = preprocessed.replace(tableMatch, fixedTable);
          console.log('🔍 Markdown with fixed table:', fixedMarkdown);
          
          // Check if table still detected
          const hasTableAfterFix = window.arzaniRenderer.hasMarkdownTable(fixedMarkdown);
          console.log('🔍 Table detected after fixing:', hasTableAfterFix);
        }
      } else {
        console.log('⚠️ No table pattern matched in markdown after preprocessing');
      }
      
      // Step 4: Test direct rendering with renderToHtml
      const renderedHtml = window.arzaniRenderer.renderToHtml(markdownWithTable, 'orchestrator');
      console.log('🔍 Renderer output HTML:', renderedHtml);
      
      // Step 5: Test the raw marked.js output for comparison
      if (window.marked) {
        const rawMarkedOutput = window.marked.parse(markdownWithTable);
        console.log('🔍 Raw marked.js output:', rawMarkedOutput);
        console.log('🔍 Does raw marked output contain <table>:', rawMarkedOutput.includes('<table'));
      }
      
      // Step 6: Check for table HTML tags in our renderer output
      console.log('🔍 Does renderer output contain <table>:', renderedHtml.includes('<table'));
      console.log('🔍 Does renderer output contain <th>:', renderedHtml.includes('<th'));
      console.log('🔍 Does renderer output contain <td>:', renderedHtml.includes('<td'));
      
      // Create a test message in the UI
      try {
        // First, add our renderer version
        const messageId = arzaniInstance.addMessageToCurrentSection(`${testType.toUpperCase()} TABLE TEST:\n\n${markdownWithTable}`, 'assistant');
        console.log('✅ Test message added with ID:', messageId);
      } catch (error) {
        console.error('❌ Failed to add test message:', error);
      }
    } catch (error) {
      console.error('❌ Rendering pipeline test failed:', error);
    }
  }
});
