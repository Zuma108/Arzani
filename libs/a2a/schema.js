/**
 * A2A Protocol JSON Schema Validation
 * 
 * Implements JSON schema validation for A2A protocol messages using Ajv
 * Based on Google's A2A protocol v0.3 specification
 */

import Ajv from 'ajv';
const ajv = new Ajv({ allErrors: true });

// Basic A2A Message Part Schemas
const textPartSchema = {
  type: 'object',
  required: ['type', 'text'],
  properties: {
    type: { const: 'text' },
    text: { type: 'string' },
    name: { type: 'string' }
  },
  additionalProperties: false
};

const dataPartSchema = {
  type: 'object',
  required: ['type', 'data'],
  properties: {
    type: { const: 'data' },
    data: { type: 'object' },
    name: { type: 'string' }
  },
  additionalProperties: false
};

const filePartSchema = {
  type: 'object',
  required: ['type', 'file'],
  properties: {
    type: { const: 'file' },
    file: {
      type: 'object',
      required: ['content', 'mimetype'],
      properties: {
        name: { type: 'string' },
        content: { type: 'string' },
        mimetype: { type: 'string' }
      },
      additionalProperties: false
    },
    name: { type: 'string' }
  },
  additionalProperties: false
};

// A2A Message Schema
const messageSchema = {
  type: 'object',
  required: ['parts'],
  properties: {
    parts: {
      type: 'array',
      items: {
        oneOf: [
          textPartSchema,
          dataPartSchema,
          filePartSchema
        ]
      }
    },
    role: { 
      type: 'string',
      enum: ['user', 'agent', 'task'] 
    }
  },
  additionalProperties: false
};

// A2A Task Schema
const taskSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    parentId: { type: 'string', format: 'uuid' },
    agentId: { type: 'string' },
    state: { 
      type: 'string',
      enum: ['submitted', 'working', 'input-required', 'completed', 'failed']
    }
  },
  additionalProperties: false
};

// A2A JSON-RPC Request Schema for tasks/send
const tasksRequestSchema = {
  type: 'object',
  required: ['jsonrpc', 'id', 'method', 'params'],
  properties: {
    jsonrpc: { const: '2.0' },
    id: { type: 'string' },
    method: { const: 'tasks/send' },
    params: {
      type: 'object',
      required: ['task', 'message'],
      properties: {
        task: taskSchema,
        message: messageSchema
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
};

// A2A JSON-RPC Response Schema
const tasksResponseSchema = {
  type: 'object',
  required: ['jsonrpc', 'id'],
  properties: {
    jsonrpc: { const: '2.0' },
    id: { type: 'string' },
    result: {
      type: 'object',
      required: ['task', 'message'],
      properties: {
        task: taskSchema,
        message: messageSchema
      },
      additionalProperties: false
    },
    error: {
      type: 'object',
      required: ['code', 'message'],
      properties: {
        code: { type: 'integer' },
        message: { type: 'string' },
        data: { type: 'object' }
      },
      additionalProperties: false
    }
  },
  oneOf: [
    { required: ['result'] },
    { required: ['error'] }
  ],
  additionalProperties: false
};

// Well-known agent card schema
const agentCardSchema = {
  type: 'object',
  required: ['name', 'description', 'contact', 'capabilities'],
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    contact: { type: 'object' },
    capabilities: {
      type: 'object',
      properties: {
        'tasks/send': { type: 'object' }
      }
    }
  },
  additionalProperties: true
};

// Compile validators
const validateTaskRequest = ajv.compile(tasksRequestSchema);
const validateTaskResponse = ajv.compile(tasksResponseSchema);
const validateMessage = ajv.compile(messageSchema);
const validateAgentCard = ajv.compile(agentCardSchema);

export {
  validateTaskRequest,
  validateTaskResponse,
  validateMessage,
  validateAgentCard,
  taskSchema,
  messageSchema,
  agentCardSchema
};