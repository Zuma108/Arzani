/**
 * A2A Protocol - Main Entry Point
 * 
 * Exports all A2A components for use in the application
 */

const A2AClient = require('./client');
const agentRegistry = require('./agentRegistry');
const { TaskManager } = require('./taskManager');
const streaming = require('./streaming');
const webhookManager = require('./webhooks');
const security = require('./security');

// Initialize components on startup
async function initialize() {
  // Create task manager instance
  const taskManager = new TaskManager();
  
  // Load existing tasks from database
  await taskManager.loadTasks();
  
  return {
    initialized: true,
    taskCount: taskManager.tasks.size
  };
}

module.exports = {
  A2AClient,
  agentRegistry,
  TaskManager,
  streaming,
  webhookManager,
  security,
  initialize
};
