/**
 * A2A Protocol Client Implementation for Arzani-AI
 * 
 * This client enables inter-agent communication using the Agent2Agent protocol.
 */

const axios = require('axios');
const EventSource = require('eventsource');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class A2AClient {
  constructor(agentUrl, options = {}) {
    this.agentUrl = agentUrl;
    this.authToken = options.authToken || null;
    this.timeout = options.timeout || 30000;
  }

  /**
   * Fetch an agent's capabilities card
   */
  async getAgentCard() {
    try {
      const response = await axios.get(`${this.agentUrl}/.well-known/agent.json`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch agent card:', error);
      throw new Error(`A2A discovery failed: ${error.message}`);
    }
  }

  /**
   * Send a task to an agent and get the result
   */
  async sendTask(message, options = {}) {
    const taskId = options.taskId || uuidv4();
    
    const requestBody = {
      task_id: taskId,
      message: {
        role: "user",
        parts: Array.isArray(message) ? message : [{ text: message }]
      }
    };

    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const response = await axios.post(
        `${this.agentUrl}/tasks/send`,
        requestBody,
        {
          headers,
          timeout: this.timeout
        }
      );
      
      return response.data;
    } catch (error) {
      logger.error('A2A task send failed:', error);
      throw new Error(`Failed to send A2A task: ${error.message}`);
    }
  }
  
  /**
   * Send a task and subscribe to streaming updates
   */
  sendTaskWithStreaming(message, onUpdate, onComplete, onError, options = {}) {
    const taskId = options.taskId || uuidv4();
    
    const requestUrl = new URL(`${this.agentUrl}/tasks/sendSubscribe`);
    requestUrl.searchParams.append('task_id', taskId);
    
    // Convert message to JSON string for URL params
    const messagePart = Array.isArray(message) ? message : [{ text: message }];
    requestUrl.searchParams.append('message', JSON.stringify({
      role: "user",
      parts: messagePart
    }));

    const eventSourceOptions = {};
    
    if (this.authToken) {
      eventSourceOptions.headers = {
        'Authorization': `Bearer ${this.authToken}`
      };
    }
    
    const eventSource = new EventSource(requestUrl.toString(), eventSourceOptions);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onUpdate(data);
      
      // Check if task has reached a terminal state
      if (['completed', 'failed', 'canceled'].includes(data.state)) {
        eventSource.close();
        onComplete(data);
      }
    };
    
    eventSource.onerror = (error) => {
      eventSource.close();
      onError(error);
    };
    
    // Return a function to cancel the subscription
    return {
      taskId,
      cancel: () => eventSource.close()
    };
  }
}

module.exports = A2AClient;
