#!/usr/bin/env node

import readline from 'readline';
import chatGPTHelper from './chatGPT-helper.js';

// Create readline interface for CLI interaction
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Test user ID (replace with a real user ID in your database for testing)
const TEST_USER_ID = 1;
let currentConversationId = null;

console.log('ChatGPT Helper CLI');
console.log('==================');
console.log('Type "exit" to quit the program');
console.log('Type "new" to start a new conversation');
console.log('Type "archive" to archive the current conversation');
console.log('Type "unarchive" to unarchive the current conversation');
console.log('');

if (!currentConversationId) {
  console.log('Starting a new conversation...');
  startNewConversation();
}

// Start a new conversation
async function startNewConversation() {
  try {
    console.log('Creating a new AI assistant conversation...');
    const conversation = await chatGPTHelper.createAssistantConversation(
      TEST_USER_ID,
      'Hello, I\'d like to learn more about the marketplace.'
    );
    
    currentConversationId = conversation.conversationId;
    console.log(`Conversation started with ID: ${currentConversationId}`);
    console.log('Initial greeting has been sent. Type your message:');
    promptUser();
  } catch (error) {
    console.error('Error starting conversation:', error);
    process.exit(1);
  }
}

// Process user commands
async function processCommand(input) {
  if (input.toLowerCase() === 'exit') {
    console.log('Goodbye!');
    rl.close();
    process.exit(0);
  } else if (input.toLowerCase() === 'new') {
    console.log('Starting a new conversation...');
    startNewConversation();
  } else if (input.toLowerCase() === 'archive') {
    if (!currentConversationId) {
      console.log('No active conversation to archive.');
      promptUser();
      return;
    }
    
    const success = await chatGPTHelper.archiveConversation(currentConversationId, TEST_USER_ID);
    if (success) {
      console.log(`Conversation ${currentConversationId} archived successfully.`);
    } else {
      console.log('Failed to archive conversation.');
    }
    promptUser();
  } else if (input.toLowerCase() === 'unarchive') {
    if (!currentConversationId) {
      console.log('No active conversation to unarchive.');
      promptUser();
      return;
    }
    
    const success = await chatGPTHelper.unarchiveConversation(currentConversationId, TEST_USER_ID);
    if (success) {
      console.log(`Conversation ${currentConversationId} unarchived successfully.`);
    } else {
      console.log('Failed to unarchive conversation.');
    }
    promptUser();
  } else {
    // Process as a normal message
    sendMessage(input);
  }
}

// Send a message to the AI and get a response
async function sendMessage(message) {
  if (!currentConversationId) {
    console.log('No active conversation. Type "new" to start one.');
    promptUser();
    return;
  }
  
  try {
    console.log('\nSending message to AI...');
    
    // Record the user message in the database
    // This would typically be handled by your chat controller
    // For this CLI, we'll just call the AI directly
    
    const aiResponse = await chatGPTHelper.generateResponse(
      currentConversationId,
      TEST_USER_ID,
      message
    );
    
    console.log('\nAI Response:');
    console.log('-----------');
    console.log(aiResponse);
    console.log('-----------\n');
    
    promptUser();
  } catch (error) {
    console.error('Error sending message:', error);
    promptUser();
  }
}

// Prompt for user input
function promptUser() {
  rl.question('> ', (input) => {
    processCommand(input);
  });
}

// Handle application exit
process.on('SIGINT', () => {
  console.log('\nExiting application...');
  rl.close();
  process.exit(0);
});