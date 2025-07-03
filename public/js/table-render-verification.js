/**
 * Table Render Verification Script
 * 
 * This script tests the fixed markdown table rendering in the Arzani-X application.
 * It runs directly in the browser console to test rendering of different table formats.
 */

(function() {
  console.log('🧪 Starting table rendering verification...');
  
  // Ensure we have access to the renderer
  if (!window.arzaniRenderer) {
    console.error('❌ arzaniRenderer not available - are you on the Arzani-X page?');
    return;
  }
  
  // Test cases with different table formats
  const testCases = [
    {
      name: 'Simple Standard Table',
      markdown: `
# Simple Table Test

| Header 1 | Header 2 | Header 3 |
| -------- | -------- | -------- |
| Value 1  | Value 2  | Value 3  |
| Value 4  | Value 5  | Value 6  |
      `
    },
    {
      name: 'Table with Alignment',
      markdown: `
# Aligned Table Test

| Left | Center | Right |
| :--- | :----: | ----: |
| Left | Center | Right |
| Text | Text   | Text  |
      `
    },
    {
      name: 'Complex Table with Styling',
      markdown: `
# Complex Table

| Category | Amount (£) | Status | Notes |
| :------- | ---------: | :----: | :---- |
| Income   | £1,250.00  | ✅ Done | Monthly revenue |
| Expenses | £890.50    | ⚠️ Pending | Outstanding bills |
| Profit   | £359.50    | 📊 Tracked | **Q2 results** |
      `
    },
    {
      name: 'Finance Table',
      markdown: `
## Financial Valuation

| Method | Value Range | Confidence | Weight |
|--------|-------------|------------|--------|
| **EBITDA Multiple** | £1.2M - £1.5M | High | 40% |
| **DCF Analysis** | £1.1M - £1.3M | Medium | 30% |
| **Asset-Based** | £0.9M - £1.2M | Medium | 20% |
| **Comparable Sales** | £1.3M - £1.6M | Low | 10% |
      `
    },
    {
      name: 'Direct HTML Test',
      markdown: `
# Direct HTML Table Test
<table>
  <thead>
    <tr>
      <th>Header 1</th>
      <th>Header 2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Value 1</td>
      <td>Value 2</td>
    </tr>
  </tbody>
</table>
      `
    }
  ];
  
  // Run all test cases
  console.log(`🧪 Running ${testCases.length} table rendering tests...`);
  
  // Create test output container if it doesn't exist
  let testOutputContainer = document.getElementById('table-test-output');
  if (!testOutputContainer) {
    testOutputContainer = document.createElement('div');
    testOutputContainer.id = 'table-test-output';
    testOutputContainer.className = 'fixed top-20 right-4 bg-white shadow-lg rounded-lg p-4 max-w-xl max-h-[80vh] overflow-auto z-50';
    testOutputContainer.innerHTML = `
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-bold text-lg">Table Rendering Tests</h3>
        <button id="closeTestOutput" class="text-gray-500 hover:text-gray-700 text-xl">×</button>
      </div>
      <div id="test-results" class="space-y-6"></div>
    `;
    document.body.appendChild(testOutputContainer);
    
    document.getElementById('closeTestOutput').addEventListener('click', () => {
      testOutputContainer.style.display = 'none';
    });
  } else {
    testOutputContainer.style.display = 'block';
    document.getElementById('test-results').innerHTML = '';
  }
  
  const testResultsContainer = document.getElementById('test-results');
  
  // Process each test case
  testCases.forEach((testCase, index) => {
    console.log(`\n🧪 Test ${index + 1}: ${testCase.name}`);
    console.log('📝 Original Markdown:', testCase.markdown);
    
    // Test preprocessing (extraction & modification)
    const preprocessed = window.arzaniRenderer.preprocessMarkdown(testCase.markdown);
    console.log('🔄 After preprocessing:', preprocessed);
    
    // Check if table is detected
    const hasTable = window.arzaniRenderer.hasMarkdownTable(preprocessed);
    console.log('🔍 Table detected:', hasTable);
    
    // Full rendering with our pipeline
    const renderedHtml = window.arzaniRenderer.renderToHtml(testCase.markdown, 'orchestrator');
    console.log('🎨 Rendered HTML (excerpt):', renderedHtml.substring(0, 200) + '...');
    
    // Direct marked.js rendering for comparison
    const directMarkedHtml = window.marked.parse(testCase.markdown);
    console.log('📋 Direct marked.js (excerpt):', directMarkedHtml.substring(0, 200) + '...');
    
    // Check for table tags
    const hasTableTags = renderedHtml.includes('<table');
    console.log('🏷️ Contains <table> tags:', hasTableTags);
    
    // Add results to UI
    const testResult = document.createElement('div');
    testResult.className = 'test-case p-4 border rounded-lg' + (hasTableTags ? ' border-green-200 bg-green-50' : ' border-red-200 bg-red-50');
    
    testResult.innerHTML = `
      <h4 class="font-bold mb-2">${index + 1}. ${testCase.name}</h4>
      <div class="mb-2">
        <span class="inline-block px-2 py-1 text-xs rounded ${hasTableTags ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
          ${hasTableTags ? '✅ Table rendered' : '❌ Table not rendered'}
        </span>
        <span class="inline-block px-2 py-1 text-xs rounded ${hasTable ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
          ${hasTable ? '✅ Table detected' : '⚠️ Table not detected'}
        </span>
      </div>
      
      <div class="flex mb-2">
        <button class="toggle-section text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded mr-2" data-target="original-${index}">
          Original Markdown
        </button>
        <button class="toggle-section text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded mr-2" data-target="rendered-${index}">
          Rendered Result
        </button>
        <button class="toggle-section text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded" data-target="direct-${index}">
          Direct Marked.js
        </button>
      </div>
      
      <div id="original-${index}" class="section-content hidden">
        <h5 class="text-xs font-bold mb-1">Original Markdown:</h5>
        <pre class="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">${testCase.markdown.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
      </div>
      
      <div id="rendered-${index}" class="section-content hidden">
        <h5 class="text-xs font-bold mb-1">Rendered with our pipeline:</h5>
        <div class="text-xs bg-white p-2 rounded border overflow-auto max-h-60">${renderedHtml}</div>
      </div>
      
      <div id="direct-${index}" class="section-content hidden">
        <h5 class="text-xs font-bold mb-1">Direct marked.js rendering:</h5>
        <div class="text-xs bg-white p-2 rounded border overflow-auto max-h-60">${directMarkedHtml}</div>
      </div>
    `;
    
    testResultsContainer.appendChild(testResult);
  });
  
  // Add event listeners for toggle buttons
  document.querySelectorAll('.toggle-section').forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-target');
      const targetElement = document.getElementById(targetId);
      
      // Hide all sections in the same test case
      const testCase = button.closest('.test-case');
      testCase.querySelectorAll('.section-content').forEach(section => {
        section.classList.add('hidden');
      });
      
      // Show the target section
      targetElement.classList.remove('hidden');
    });
  });
  
  console.log('✅ All table tests completed. Check the test output panel for results.');
})();
