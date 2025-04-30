/**
 * A2A Protocol endpoints for Arzani-AI
 */

const express = require('express');
const router = express.Router();
const agentRegistry = require('../a2a/agentRegistry');
const { v4: uuidv4 } = require('uuid');
const { TaskManager } = require('../a2a/taskManager');
const streaming = require('../a2a/streaming');
const logger = require('../utils/logger');

// Initialize task manager
const taskManager = new TaskManager();

// Load existing tasks on startup
taskManager.loadTasks().catch(err => {
  logger.error('Failed to load tasks during startup:', err);
});

// Agent discovery endpoint
router.get('/:agentType/.well-known/agent.json', async (req, res) => {
  try {
    const agentType = req.params.agentType;
    const agentCard = await agentRegistry.getAgentCard(agentType);
    res.json(agentCard);
  } catch (error) {
    res.status(404).json({ error: 'Agent not found' });
  }
});

// Task sending endpoint (non-streaming)
router.post('/:agentType/tasks/send', async (req, res) => {
  try {
    const agentType = req.params.agentType;
    const { task_id, message } = req.body;
    
    if (!task_id || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create or retrieve task
    let task = taskManager.getTask(task_id);
    if (!task) {
      task = taskManager.createTask(task_id, agentType);
    }
    
    // Update task state to working
    taskManager.updateTask(task_id, { state: 'working' });
    
    // Add incoming message to task
    taskManager.addMessage(task_id, message);
    
    // Process the message
    const response = await agentRegistry.sendTaskToAgent(agentType, message);
    
    // Add response message
    if (response.message) {
      taskManager.addMessage(task_id, response.message);
    }
    
    // Add artifacts if any
    if (response.artifacts && Array.isArray(response.artifacts)) {
      for (const artifact of response.artifacts) {
        taskManager.addArtifact(task_id, artifact);
      }
    }
    
    // Update task state to completed
    task = taskManager.updateTask(task_id, { 
      state: 'completed',
      metadata: {
        ...task.metadata,
        completion_time: new Date().toISOString()
      }
    });
    
    res.json(task);
  } catch (error) {
    logger.error(`Error in /tasks/send:`, error);
    
    // If task exists, mark it as failed
    if (req.body && req.body.task_id) {
      try {
        const task = taskManager.getTask(req.body.task_id);
        if (task) {
          taskManager.updateTask(task.task_id, {
            state: 'failed',
            metadata: {
              ...task.metadata,
              error: error.message
            }
          });
        }
      } catch (updateErr) {
        logger.error(`Error updating task state:`, updateErr);
      }
    }
    
    res.status(500).json({ 
      error: error.message,
      task_id: req.body?.task_id
    });
  }
});

// Streaming task endpoint
router.get('/:agentType/tasks/sendSubscribe', async (req, res) => {
  const agentType = req.params.agentType;
  const task_id = req.query.task_id || uuidv4();
  let messageData;
  
  try {
    // Parse message from query string
    if (req.query.message) {
      messageData = JSON.parse(req.query.message);
    } else {
      throw new Error('Missing message parameter');
    }
    
    // Create or retrieve task
    let task = taskManager.getTask(task_id);
    if (!task) {
      task = taskManager.createTask(task_id, agentType);
    }
    
    // Initialize streaming connection
    const stream = streaming.initStream(task_id, res);
    
    // Update task state to working
    taskManager.updateTask(task_id, { state: 'working' });
    
    // Add incoming message to task
    taskManager.addMessage(task_id, messageData);
    
    // Process message in the background
    setTimeout(async () => {
      try {
        // Get streaming callbacks
        const callbacks = {
          onUpdate: (data) => {
            if (data.message) {
              task = taskManager.addMessage(task_id, data.message);
            }
            
            if (data.artifacts && Array.isArray(data.artifacts)) {
              for (const artifact of data.artifacts) {
                task = taskManager.addArtifact(task_id, artifact);
              }
            }
            
            if (data.state && data.state !== task.state) {
              task = taskManager.updateTask(task_id, { state: data.state });
            }
          },
          onComplete: (finalData) => {
            // Update task with final state
            task = taskManager.updateTask(task_id, { 
              state: 'completed',
              metadata: {
                ...task.metadata,
                completion_time: new Date().toISOString()
              }
            });
          },
          onError: (error) => {
            // Update task with error state
            task = taskManager.updateTask(task_id, {
              state: 'failed',
              metadata: {
                ...task.metadata,
                error: error.message
              }
            });
          }
        };
        
        // Start streaming task to agent
        await agentRegistry.streamTaskToAgent(agentType, messageData, callbacks, { taskId: task_id });
      } catch (error) {
        logger.error(`Error processing streaming task ${task_id}:`, error);
        
        // Update task state to failed
        taskManager.updateTask(task_id, {
          state: 'failed',
          metadata: {
            ...task.metadata,
            error: error.message
          }
        });
        
        // Send error through stream
        stream.sendError(error);
      }
    }, 10); // Small delay to ensure headers are sent first
    
  } catch (error) {
    logger.error(`Error setting up streaming task:`, error);
    res.status(400).json({ 
      error: error.message,
      task_id
    });
  }
});

// Task status endpoint
router.get('/:agentType/tasks/:taskId/status', async (req, res) => {
  const { taskId } = req.params;
  
  try {
    const task = taskManager.getTask(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({
      task_id: task.task_id,
      state: task.state,
      updated_at: task.updated_at
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel task endpoint
router.post('/:agentType/tasks/:taskId/cancel', async (req, res) => {
  const { taskId } = req.params;
  const reason = req.body?.reason || 'User requested cancellation';
  
  try {
    const task = taskManager.getTask(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const updatedTask = taskManager.cancelTask(taskId, reason);
    res.json({
      task_id: updatedTask.task_id,
      state: updatedTask.state,
      metadata: updatedTask.metadata
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
