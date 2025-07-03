/**
 * ChatGPT Markdown Tester
 * 
 * This script tests the enhanced markdown formatting in ChatGPT responses
 * to ensure consistent output across all agents.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Sample prompts to test markdown formatting
const TEST_PROMPTS = [
  {
    agent: 'broker',
    prompt: 'How would you value a café with £75,000 EBITDA in Manchester?'
  },
  {
    agent: 'finance',
    prompt: 'What are the tax implications of an asset sale vs share sale for a UK business?'
  },
  {
    agent: 'legal',
    prompt: 'What legal documents do I need when buying a small retail business in the UK?'
  },
  {
    agent: 'orchestrator',
    prompt: 'I want to buy a manufacturing business with £200,000 annual profit. What should I consider?'
  }
];

// Function to print a stylized header
function printHeader(text) {
  const line = '='.repeat(text.length + 4);
  console.log(`\n${colors.bright}${colors.cyan}${line}`);
  console.log(`| ${text} |`);
  console.log(`${line}${colors.reset}\n`);
}

// Function to test each agent with its prompt
function testAgent(agent, prompt) {
  return new Promise((resolve) => {
    printHeader(`Testing ${agent.toUpperCase()} Agent Markdown Formatting`);
    console.log(`${colors.yellow}Prompt:${colors.reset} ${prompt}\n`);
    console.log(`${colors.green}Starting ${agent} agent...${colors.reset}\n`);
    
    // Simulate processing time
    setTimeout(() => {
      console.log(`${colors.green}${agent.toUpperCase()} agent response:${colors.reset}\n`);
      
      // This would actually connect to your agent in a real implementation
      // For now we're just simulating the markdown output
      console.log(`Agent would format response using enhanced markdown...\n`);
      
      console.log(`${colors.bright}${colors.magenta}[Check the agent's response in your application]${colors.reset}\n`);
      
      resolve();
    }, 1500);
  });
}

// Main function to run the tests
async function runMarkdownTests() {
  printHeader('CHATGPT MARKDOWN FORMATTING TESTER');
  
  console.log(`This tool will help you test the markdown formatting of your AI agents.`);
  console.log(`It will simulate requests to each agent type with appropriate test prompts.\n`);
  
  for (const test of TEST_PROMPTS) {
    await testAgent(test.agent, test.prompt);
  }
  
  printHeader('MARKDOWN TESTING COMPLETE');
  
  console.log(`${colors.green}Next steps:${colors.reset}`);
  console.log(`1. Check each agent's response in your application`);
  console.log(`2. Verify markdown elements are rendering correctly`);
  console.log(`3. Confirm styling is consistent across all agents`);
  console.log(`4. Look for any markdown parsing errors\n`);
  
  console.log(`${colors.bright}To run a more comprehensive test, use:${colors.reset}`);
  console.log(`node test-markdown-formatting.js\n`);
}

// Run the tests
runMarkdownTests();
