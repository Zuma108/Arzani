/**
 * Comprehensive Typewriter Test for Arzani-X
 * Tests all markdown elements with typewriter animation
 */

// Function to run the comprehensive typewriter test
function runComprehensiveTypewriterTest() {
  // Make sure arzaniClient exists
  if (!window.arzaniClient) {
    console.error('⚠️ arzaniClient not found. Run this script after the page loads.');
    return;
  }
  
  // Test content with ALL markdown elements
  const testContent = `
# Comprehensive Typewriter Test

## Headings and Basic Formatting

This is a comprehensive test of the **typewriter animation** with *markdown formatting*.

### Lists

- List item one
- List item two
  - Nested list item 2.1
  - Nested list item 2.2
- List item three

### Numbered Lists

1. First numbered item
2. Second numbered item
   1. Nested numbered item 2.1
   2. Nested numbered item 2.2
3. Third numbered item

### Code Examples

Here's an inline code example: \`const x = 10;\`

And a code block:

\`\`\`javascript
function testMarkdown() {
  const message = "Hello, world!";
  console.log(message);
  return true;
}
\`\`\`

### Tables

| Feature | Status | Notes |
|---------|--------|-------|
| Headings | ✅ | Working correctly |
| Lists | ✅ | Working correctly |
| Code | ✅ | Working correctly |
| Tables | ✅ | Working correctly |

### Blockquotes

> This is a simple blockquote

> **Note:** This is a callout blockquote with **bold text**

### Mixed Content

- Item with **bold** and *italic* and \`code\` elements
- Item with [link](https://example.com)

## Final Section

This is the end of the comprehensive typewriter test.
`;

  // Add the test message
  console.log('🧪 Running comprehensive typewriter test...');
  window.arzaniClient.addConversationMessage(testContent, 'assistant');
  
  console.log('✅ Test message added to conversation');
}

// Export the test function
window.runComprehensiveTypewriterTest = runComprehensiveTypewriterTest;

// Log instructions
console.log('🧪 Typewriter Test Loaded');
console.log('🧪 Run test by executing: runComprehensiveTypewriterTest()');
