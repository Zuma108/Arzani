/**
 * A2A Protocol Utilities
 * 
 * Provides common utility functions for A2A protocol implementation
 * including UUID generation, error handling, and state management
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a new UUID for A2A tasks
 * @returns {string} A new UUID
 */
export function generateTaskId() {
  return uuidv4();
}

/**
 * Generate a unique ID for JSON-RPC requests
 * @returns {string} A unique ID for a JSON-RPC request
 */
export function generateJsonRpcId() {
  return `a2a-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/**
 * Create a standard JSON-RPC error object
 * @param {number} code - The error code
 * @param {string} message - The error message
 * @param {object} [data] - Additional error data
 * @returns {object} A JSON-RPC error object
 */
export function createJsonRpcError(code, message, data = undefined) {
  const error = {
    code,
    message,
  };
  
  if (data) {
    error.data = data;
  }
  
  return error;
}

/**
 * Create a full JSON-RPC error response
 * @param {string} id - The JSON-RPC request ID
 * @param {number} code - The error code
 * @param {string} message - The error message
 * @param {object} [data] - Additional error data
 * @returns {object} A complete JSON-RPC error response
 */
export function createErrorResponse(id, code, message, data = undefined) {
  return {
    jsonrpc: '2.0',
    id,
    error: createJsonRpcError(code, message, data),
  };
}

/**
 * Create a task object with the given properties
 * @param {object} options - Task options
 * @param {string} [options.id] - Task ID (generated if not provided)
 * @param {string} [options.parentId] - Parent task ID
 * @param {string} [options.agentId] - Agent ID
 * @param {string} [options.state] - Task state (defaults to 'submitted')
 * @returns {object} A task object
 */
export function createTask({ id, parentId, agentId, state = 'submitted' } = {}) {
  const task = {
    id: id || generateTaskId(),
  };
  
  if (parentId) {
    task.parentId = parentId;
  }
  
  if (agentId) {
    task.agentId = agentId;
  }
  
  if (state) {
    task.state = state;
  }
  
  return task;
}

/**
 * Create a message object with the given parts
 * @param {Array} parts - Message parts
 * @param {string} [role='agent'] - Message role
 * @returns {object} A message object
 */
export function createMessage(parts, role = 'agent') {
  return {
    parts,
    role,
  };
}

/**
 * Create a text part for a message
 * @param {string} text - The text content
 * @param {string} [name] - Optional name for the part
 * @returns {object} A text part object
 */
export function createTextPart(text, name) {
  const part = {
    type: 'text',
    text,
  };
  
  if (name) {
    part.name = name;
  }
  
  return part;
}

/**
 * Create a data part for a message
 * @param {object} data - The data content
 * @param {string} [name] - Optional name for the part
 * @returns {object} A data part object
 */
export function createDataPart(data, name) {
  const part = {
    type: 'data',
    data,
  };
  
  if (name) {
    part.name = name;
  }
  
  return part;
}

/**
 * Create a file part for a message
 * @param {string} content - The file content (base64 encoded)
 * @param {string} mimetype - The file MIME type
 * @param {string} [filename] - The file name
 * @param {string} [name] - Optional name for the part
 * @returns {object} A file part object
 */
export function createFilePart(content, mimetype, filename, name) {
  const file = {
    content,
    mimetype,
  };
  
  if (filename) {
    file.name = filename;
  }
  
  const part = {
    type: 'file',
    file,
  };
  
  if (name) {
    part.name = name;
  }
  
  return part;
}

/**
 * Create a complete JSON-RPC request for tasks/send
 * @param {object} task - The task object
 * @param {object} message - The message object
 * @param {string} [id] - JSON-RPC request ID (generated if not provided)
 * @returns {object} A complete JSON-RPC request for tasks/send
 */
export function createTaskRequest(task, message, id) {
  return {
    jsonrpc: '2.0',
    id: id || generateJsonRpcId(),
    method: 'tasks/send',
    params: {
      task,
      message,
    },
  };
}

/**
 * Create a complete JSON-RPC response for a successful tasks/send request
 * @param {string} id - The JSON-RPC request ID
 * @param {object} task - The task object
 * @param {object} message - The message object
 * @returns {object} A complete JSON-RPC response for a successful tasks/send request
 */
export function createTaskResponse(id, task, message) {
  return {
    jsonrpc: '2.0',
    id,
    result: {
      task,
      message,
    },
  };
}

/**
 * Standard JSON-RPC error codes
 */
export const ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  VALIDATION_FAILED: -32000,
  TASK_NOT_FOUND: -32001,
  UNAUTHORIZED: -32002,
  RATE_LIMITED: -32003,
};