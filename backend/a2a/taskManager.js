/**
 * Task Manager for A2A Protocol
 * 
 * Manages task lifecycle and state transitions
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../db/models');
const logger = require('../utils/logger');
const streaming = require('./streaming');

class TaskManager {
  constructor() {
    // In-memory task store (tasks also persisted to database)
    this.tasks = new Map();
    
    // Valid task states
    this.TASK_STATES = [
      'submitted',    // Initial state
      'working',      // Processing
      'input-required', // Waiting for user input
      'completed',    // Successfully completed
      'failed',       // Failed with error
      'canceled'      // Canceled by user/system
    ];
    
    // Terminal states
    this.TERMINAL_STATES = ['completed', 'failed', 'canceled'];
  }
  
  /**
   * Create a new task
   */
  createTask(taskId = null, agentType = null) {
    const id = taskId || uuidv4();
    
    // Check if task already exists
    if (this.tasks.has(id)) {
      return this.tasks.get(id);
    }
    
    // Create new task object
    const task = {
      task_id: id,
      agent_type: agentType,
      state: 'submitted',
      messages: [],
      artifacts: [],
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Store in memory
    this.tasks.set(id, task);
    
    // Persist to database
    this._persistTask(task).catch(err => {
      logger.error(`Failed to persist task ${id}:`, err);
    });
    
    logger.info(`Created task ${id} for agent ${agentType}`);
    return task;
  }
  
  /**
   * Get task by ID
   */
  getTask(taskId) {
    return this.tasks.get(taskId) || null;
  }
  
  /**
   * Update task state and properties
   */
  updateTask(taskId, updates = {}) {
    const task = this.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    // Validate state transition if state is being updated
    if (updates.state && !this._isValidStateTransition(task.state, updates.state)) {
      throw new Error(`Invalid state transition from ${task.state} to ${updates.state}`);
    }
    
    // Update task properties
    Object.assign(task, {
      ...updates,
      updated_at: new Date().toISOString()
    });
    
    // Persist changes
    this._persistTask(task).catch(err => {
      logger.error(`Failed to persist task ${taskId} updates:`, err);
    });
    
    // If we have an active stream for this task, send updates
    const stream = streaming.getStreamForTask(taskId);
    if (stream) {
      // Send status update if state changed
      if (updates.state) {
        stream.sendStatusUpdate(updates.state, { 
          metadata: task.metadata 
        });
      }
      
      // Send artifact updates if any
      if (updates.artifacts && updates.artifacts.length > 0) {
        const lastArtifact = updates.artifacts[updates.artifacts.length - 1];
        stream.sendArtifactUpdate(lastArtifact);
      }
      
      // Send message updates if any
      if (updates.messages && updates.messages.length > 0) {
        const lastMessage = updates.messages[updates.messages.length - 1];
        stream.sendMessageUpdate(lastMessage);
      }
      
      // Close stream if reached terminal state
      if (updates.state && this.TERMINAL_STATES.includes(updates.state)) {
        setTimeout(() => {
          stream.close();
        }, 1000); // Give the client a moment to receive the final updates
      }
    }
    
    return task;
  }
  
  /**
   * Add a message to a task
   */
  addMessage(taskId, message) {
    const task = this.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    // Add message to task
    task.messages.push(message);
    
    // Update timestamp
    task.updated_at = new Date().toISOString();
    
    // Persist changes
    this._persistTask(task).catch(err => {
      logger.error(`Failed to persist task ${taskId} message update:`, err);
    });
    
    return task;
  }
  
  /**
   * Add an artifact to a task
   */
  addArtifact(taskId, artifact) {
    const task = this.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    // Add artifact to task
    task.artifacts.push(artifact);
    
    // Update timestamp
    task.updated_at = new Date().toISOString();
    
    // Persist changes
    this._persistTask(task).catch(err => {
      logger.error(`Failed to persist task ${taskId} artifact update:`, err);
    });
    
    return task;
  }
  
  /**
   * Cancel a task
   */
  cancelTask(taskId, reason = 'User requested cancellation') {
    const task = this.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    // Only cancel if not in terminal state
    if (!this.TERMINAL_STATES.includes(task.state)) {
      return this.updateTask(taskId, {
        state: 'canceled',
        metadata: {
          ...task.metadata,
          cancellation_reason: reason
        }
      });
    }
    
    return task;
  }
  
  /**
   * List all tasks (optionally filtered)
   */
  listTasks(filters = {}) {
    let result = Array.from(this.tasks.values());
    
    // Apply filters
    if (filters.state) {
      result = result.filter(task => task.state === filters.state);
    }
    
    if (filters.agentType) {
      result = result.filter(task => task.agent_type === filters.agentType);
    }
    
    // Sort by creation time (newest first)
    result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    return result;
  }
  
  /**
   * Validate if state transition is allowed
   * @private
   */
  _isValidStateTransition(currentState, newState) {
    // Validate states exist
    if (!this.TASK_STATES.includes(currentState) || !this.TASK_STATES.includes(newState)) {
      return false;
    }
    
    // Can't transition from terminal state
    if (this.TERMINAL_STATES.includes(currentState)) {
      return false;
    }
    
    // All other transitions are valid
    return true;
  }
  
  /**
   * Persist task to database
   * @private
   */
  async _persistTask(task) {
    try {
      await db.SessionState.upsert({
        session_id: task.task_id,
        stage: task.state,
        payload: JSON.stringify(task),
        updated_at: new Date()
      });
    } catch (error) {
      logger.error(`Error persisting task ${task.task_id}:`, error);
      throw error;
    }
  }
  
  /**
   * Load all tasks from database during startup
   */
  async loadTasks() {
    try {
      const sessions = await db.SessionState.findAll();
      
      for (const session of sessions) {
        try {
          const task = JSON.parse(session.payload);
          this.tasks.set(task.task_id, task);
        } catch (err) {
          logger.warn(`Could not parse task from session ${session.session_id}:`, err);
        }
      }
      
      logger.info(`Loaded ${this.tasks.size} tasks from database`);
    } catch (error) {
      logger.error('Error loading tasks from database:', error);
    }
  }
}

module.exports = { TaskManager };
