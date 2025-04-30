/**
 * A2A Chat Adapter
 * This adapter connects the frontend chat interface with the A2A protocol backend.
 * It handles sending messages, receiving responses (including streaming), and managing tasks.
 */

class A2AChatAdapter {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || '/api/a2a';
    this.defaultAgentId = options.defaultAgentId || 'marketplace-assistant';
    this.onMessageReceived = options.onMessageReceived || (() => {});
    this.onError = options.onError || console.error;
    this.activeTasks = new Map();
    this.eventSource = null;
  }

  /**
   * Send a message to an A2A-enabled agent
   * @param {string} message - The message content to send
   * @param {object} options - Optional parameters
   * @returns {Promise<object>} - The response object
   */
  async sendMessage(message, options = {}) {
    const agentId = options.agentId || this.defaultAgentId;
    const taskId = this._generateTaskId();
    const chatHistory = options.chatHistory || [];
    
    try {
      // Create a new task using A2A protocol
      const response = await fetch(`${this.baseUrl}/task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'task.submit',
          params: {
            agent_id: agentId,
            inputs: {
              messages: [
                ...chatHistory,
                {
                  role: 'user',
                  content: message
                }
              ]
            },
            stream: options.stream === undefined ? true : options.stream
          },
          id: taskId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'Unknown error from A2A server');
      }

      const task = data.result;
      this.activeTasks.set(taskId, task);

      // If we're streaming, set up the event source
      if (options.stream) {
        this._setupStreaming(task.task_id);
      } else {
        // For non-streaming, wait for task completion
        return this._pollForCompletion(task.task_id);
      }

      return task;
    } catch (error) {
      this.onError('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Cancel an active task
   * @param {string} taskId - The ID of the task to cancel
   */
  async cancelTask(taskId) {
    if (!this.activeTasks.has(taskId)) {
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/task/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'task.cancel',
          params: {},
          id: this._generateTaskId()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'Unknown error when canceling task');
      }

      // Clean up resources
      this._cleanupTask(taskId);
    } catch (error) {
      this.onError('Error canceling task:', error);
    }
  }

  /**
   * Set up server-sent events for streaming responses
   * @param {string} taskId - The ID of the task to stream
   * @private
   */
  _setupStreaming(taskId) {
    // Close any existing event source
    if (this.eventSource) {
      this.eventSource.close();
    }

    // Create a new event source for this task
    this.eventSource = new EventSource(`${this.baseUrl}/task/${taskId}/stream`);
    
    // Handle incoming messages
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Process the streamed content
        if (data.result && data.result.delta) {
          const message = {
            role: 'assistant',
            content: data.result.delta,
            taskId: taskId,
            isPartial: true
          };
          
          this.onMessageReceived(message);
        }
        
        // Check if the task is complete
        if (data.result && data.result.status === 'completed') {
          this._cleanupTask(taskId);
        }
      } catch (error) {
        this.onError('Error processing stream:', error);
      }
    };

    // Handle errors
    this.eventSource.onerror = (error) => {
      this.onError('Stream error:', error);
      this._cleanupTask(taskId);
    };
  }

  /**
   * Poll for task completion (used for non-streaming responses)
   * @param {string} taskId - The ID of the task to poll
   * @private
   */
  async _pollForCompletion(taskId) {
    try {
      const response = await fetch(`${this.baseUrl}/task/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'task.get',
          params: {},
          id: this._generateTaskId()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'Unknown error when polling task');
      }

      const task = data.result;
      
      // If the task is still running, poll again after a delay
      if (task.status === 'working' || task.status === 'pending') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this._pollForCompletion(taskId);
      }
      
      // If the task is complete, return the response
      if (task.status === 'completed' && task.outputs) {
        const message = {
          role: 'assistant',
          content: task.outputs.content || task.outputs.message || JSON.stringify(task.outputs),
          taskId: taskId
        };
        
        this.onMessageReceived(message);
        this._cleanupTask(taskId);
        return message;
      }
      
      // If the task failed, throw an error
      if (task.status === 'failed') {
        throw new Error(task.error || 'Task failed without error details');
      }
      
      return task;
    } catch (error) {
      this.onError('Error polling task:', error);
      throw error;
    }
  }

  /**
   * Clean up resources for a completed task
   * @param {string} taskId - The ID of the task to clean up
   * @private
   */
  _cleanupTask(taskId) {
    // Close event source if it's for this task
    if (this.eventSource && this.eventSource.url.includes(taskId)) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    // Remove from active tasks
    this.activeTasks.delete(taskId);
  }

  /**
   * Generate a unique task ID
   * @private
   */
  _generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Export the adapter for use in other scripts
window.A2AChatAdapter = A2AChatAdapter;