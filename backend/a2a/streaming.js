/**
 * A2A Protocol Streaming Implementation for Arzani-AI
 * 
 * Handles Server-Sent Events (SSE) streaming for long-running tasks
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class A2AStreaming {
  constructor() {
    // Map of active streaming connections by taskId
    this.activeStreams = new Map();
  }

  /**
   * Initialize a streaming connection for a task
   * @param {string} taskId - Unique identifier for the task
   * @param {object} res - Express response object
   * @returns {object} Stream controller
   */
  initStream(taskId, res) {
    // Set headers for SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable Nginx buffering
    });

    // Prevent timeout
    res.socket.setTimeout(0);

    const streamId = uuidv4();
    
    // Create stream controller
    const controller = {
      id: streamId,
      taskId,
      response: res,
      
      // Send a status update
      sendStatusUpdate: (state, metadata = {}) => {
        const event = {
          event: 'status',
          data: {
            task_id: taskId,
            state,
            timestamp: new Date().toISOString(),
            ...metadata
          }
        };
        this._sendEvent(res, event);
        return controller;
      },
      
      // Send artifact update
      sendArtifactUpdate: (artifact) => {
        const event = {
          event: 'artifact',
          data: {
            task_id: taskId,
            artifact,
            timestamp: new Date().toISOString()
          }
        };
        this._sendEvent(res, event);
        return controller;
      },
      
      // Send message update
      sendMessageUpdate: (message) => {
        const event = {
          event: 'message',
          data: {
            task_id: taskId,
            message,
            timestamp: new Date().toISOString()
          }
        };
        this._sendEvent(res, event);
        return controller;
      },
      
      // Send error
      sendError: (error) => {
        const event = {
          event: 'error',
          data: {
            task_id: taskId,
            error: {
              message: error.message || 'Unknown error',
              code: error.code || 'ERROR'
            },
            timestamp: new Date().toISOString()
          }
        };
        this._sendEvent(res, event);
        return controller;
      },
      
      // Close the stream
      close: () => {
        this._closeStream(streamId);
        return true;
      }
    };
    
    // Store active stream
    this.activeStreams.set(streamId, controller);
    
    // Handle client disconnection
    res.on('close', () => {
      logger.info(`Client disconnected from stream ${streamId}`);
      this._closeStream(streamId);
    });
    
    // Send initial connection event
    controller.sendStatusUpdate('connected');
    
    logger.info(`Initialized stream ${streamId} for task ${taskId}`);
    return controller;
  }
  
  /**
   * Send an SSE event to the client
   * @private
   */
  _sendEvent(res, event) {
    try {
      res.write(`event: ${event.event}\n`);
      res.write(`data: ${JSON.stringify(event.data)}\n\n`);
    } catch (error) {
      logger.error('Error sending SSE event:', error);
    }
  }
  
  /**
   * Close and clean up a stream
   * @private
   */
  _closeStream(streamId) {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      try {
        stream.response.end();
      } catch (error) {
        // Ignore errors if connection already closed
        logger.debug('Error closing stream:', error.message);
      }
      
      this.activeStreams.delete(streamId);
      logger.info(`Stream ${streamId} closed and removed`);
    }
  }
  
  /**
   * Get an active stream by task ID
   */
  getStreamForTask(taskId) {
    for (const [id, stream] of this.activeStreams.entries()) {
      if (stream.taskId === taskId) {
        return stream;
      }
    }
    return null;
  }
  
  /**
   * Close all active streams
   */
  closeAllStreams() {
    for (const [id, stream] of this.activeStreams.entries()) {
      stream.close();
    }
    this.activeStreams.clear();
    logger.info('Closed all active streams');
    return true;
  }
}

// Export as singleton
const streaming = new A2AStreaming();
module.exports = streaming;
