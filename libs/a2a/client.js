/**
 * A2A Protocol Client
 * 
 * Provides functionality for making A2A protocol requests to other agents
 * and handling Server-Sent Events (SSE) for streaming responses.
 */

import { createTaskRequest, createErrorResponse, ERROR_CODES } from './utils.js';
import { validateTaskResponse } from './schema.js';

/**
 * A2A Client class for making A2A protocol requests
 */
export class A2AClient {
  /**
   * Create a new A2A client
   * @param {object} options - Client options
   * @param {string} options.agentId - The ID of the agent making requests
   * @param {string} [options.authToken] - Authentication token for requests
   * @param {boolean} [options.sseEnabled] - Whether to use SSE for streaming responses
   */
  constructor({ agentId, authToken, sseEnabled = false } = {}) {
    this.agentId = agentId;
    this.authToken = authToken;
    this.sseEnabled = sseEnabled;
  }

  /**
   * Send a task to another agent
   * 
   * @param {string} url - The URL of the agent's tasks/send endpoint
   * @param {object} task - The task object
   * @param {object} message - The message object
   * @param {object} [options] - Request options
   * @param {string} [options.id] - JSON-RPC request ID
   * @param {number} [options.timeout] - Request timeout in milliseconds
   * @returns {Promise<object>} The response from the agent
   */
  async sendTask(url, task, message, { id, timeout = 30000 } = {}) {
    const request = createTaskRequest(task, message, id);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
        },
        body: JSON.stringify(request),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Validate response against A2A schema
      if (!validateTaskResponse(data)) {
        const errors = validateTaskResponse.errors || [];
        throw new Error(`Invalid A2A response: ${JSON.stringify(errors)}`);
      }
      
      return data;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeout}ms`);
      }
      
      throw err;
    }
  }

  /**
   * Subscribe to streaming task updates using Server-Sent Events
   * 
   * @param {string} url - The URL of the agent's tasks/sendSubscribe endpoint
   * @param {string} taskId - The task ID to subscribe to
   * @param {function} onMessage - Callback for message events
   * @param {function} onError - Callback for error events
   * @param {function} onComplete - Callback when task completes
   * @returns {object} An object with a close method to stop the subscription
   */
  subscribeToTask(url, taskId, onMessage, onError, onComplete) {
    if (!this.sseEnabled) {
      throw new Error('SSE is not enabled for this client');
    }

    const eventSource = new EventSource(`${url}?taskId=${taskId}`, {
      headers: this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {}
    });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
        
        // Check if the task has completed or failed
        if (data.result?.task?.state === 'completed' || data.result?.task?.state === 'failed') {
          eventSource.close();
          onComplete(data);
        }
      } catch (err) {
        onError(err);
      }
    };

    eventSource.onerror = (err) => {
      onError(err);
      eventSource.close();
    };

    return {
      close: () => eventSource.close()
    };
  }

  /**
   * Fetch an agent's capabilities by retrieving its agent card
   * 
   * @param {string} baseUrl - The base URL of the agent
   * @returns {Promise<object>} The agent's capabilities
   */
  async getAgentCapabilities(baseUrl) {
    try {
      const url = new URL('/.well-known/agent.json', baseUrl);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (err) {
      throw err;
    }
  }
}

export default A2AClient;