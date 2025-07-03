/**
 * Model Context Protocol (MCP) Integration Framework
 * 
 * This module implements RAG-enhanced MCP integration for AI agents,
 * providing standardized context management and retrieval capabilities
 * based on Anthropic's MCP specification.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// MCP Protocol Version
const MCP_VERSION = '2024-11-05';

// MCP Message Types
const MessageTypes = {
  REQUEST: 'request',
  RESPONSE: 'response',
  NOTIFICATION: 'notification'
};

// MCP Method Names
const Methods = {
  INITIALIZE: 'initialize',
  LIST_TOOLS: 'tools/list',
  CALL_TOOL: 'tools/call',
  LIST_RESOURCES: 'resources/list',
  READ_RESOURCE: 'resources/read',
  LIST_PROMPTS: 'prompts/list',
  GET_PROMPT: 'prompts/get'
};

// Validation Schemas
const InitializeRequestSchema = z.object({
  protocolVersion: z.string(),
  capabilities: z.object({
    tools: z.object({}).optional(),
    resources: z.object({}).optional(),
    prompts: z.object({}).optional()
  }),
  clientInfo: z.object({
    name: z.string(),
    version: z.string()
  })
});

const ToolCallRequestSchema = z.object({
  name: z.string(),
  arguments: z.record(z.any()).optional()
});

const ResourceReadRequestSchema = z.object({
  uri: z.string()
});

/**
 * MCP Server Implementation
 */
export class MCPServer extends EventEmitter {
  constructor(name, options = {}) {
    super();
    this.name = name;
    this.options = options;
    this.capabilities = {
      tools: {},
      resources: {},
      prompts: {}
    };
    this.tools = new Map();
    this.resources = new Map();
    this.prompts = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the MCP server
   */
  async initialize(request) {
    try {
      const validated = InitializeRequestSchema.parse(request);
      
      this.initialized = true;
      
      return {
        protocolVersion: MCP_VERSION,
        capabilities: this.capabilities,
        serverInfo: {
          name: this.name,
          version: '1.0.0'
        }
      };
    } catch (error) {
      throw new Error(`Initialization failed: ${error.message}`);
    }
  }

  /**
   * Register a tool with the MCP server
   */
  registerTool(name, description, inputSchema, handler) {
    this.tools.set(name, {
      name,
      description,
      inputSchema,
      handler
    });
    
    this.capabilities.tools[name] = {
      description,
      inputSchema
    };
  }

  /**
   * Register a resource with the MCP server
   */
  registerResource(uri, name, description, handler) {
    this.resources.set(uri, {
      uri,
      name,
      description,
      handler
    });
  }

  /**
   * Register a prompt template with the MCP server
   */
  registerPrompt(name, description, template, arguments_schema) {
    this.prompts.set(name, {
      name,
      description,
      template,
      arguments: arguments_schema
    });
  }

  /**
   * List available tools
   */
  async listTools() {
    return {
      tools: Array.from(this.tools.values()).map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }))
    };
  }

  /**
   * Execute a tool
   */
  async callTool(request) {
    const validated = ToolCallRequestSchema.parse(request);
    const tool = this.tools.get(validated.name);
    
    if (!tool) {
      throw new Error(`Tool not found: ${validated.name}`);
    }

    try {
      const result = await tool.handler(validated.arguments || {});
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Tool execution failed: ${error.message}`);
    }
  }

  /**
   * List available resources
   */
  async listResources() {
    return {
      resources: Array.from(this.resources.values()).map(resource => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description
      }))
    };
  }

  /**
   * Read a resource
   */
  async readResource(request) {
    const validated = ResourceReadRequestSchema.parse(request);
    const resource = this.resources.get(validated.uri);
    
    if (!resource) {
      throw new Error(`Resource not found: ${validated.uri}`);
    }

    try {
      const content = await resource.handler();
      return {
        contents: [
          {
            uri: validated.uri,
            mimeType: 'text/plain',
            text: content
          }
        ]
      };
    } catch (error) {
      throw new Error(`Resource read failed: ${error.message}`);
    }
  }

  /**
   * List available prompts
   */
  async listPrompts() {
    return {
      prompts: Array.from(this.prompts.values()).map(prompt => ({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments
      }))
    };
  }

  /**
   * Get a prompt template
   */
  async getPrompt(name, arguments_obj = {}) {
    const prompt = this.prompts.get(name);
    
    if (!prompt) {
      throw new Error(`Prompt not found: ${name}`);
    }

    // Simple template substitution
    let processedTemplate = prompt.template;
    for (const [key, value] of Object.entries(arguments_obj)) {
      processedTemplate = processedTemplate.replace(
        new RegExp(`{{${key}}}`, 'g'), 
        value
      );
    }

    return {
      description: prompt.description,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: processedTemplate
          }
        }
      ]
    };
  }

  /**
   * Handle incoming MCP message
   */
  async handleMessage(message) {
    try {
      const { method, params, id } = message;

      let result;
      switch (method) {
        case Methods.INITIALIZE:
          result = await this.initialize(params);
          break;
        case Methods.LIST_TOOLS:
          result = await this.listTools();
          break;
        case Methods.CALL_TOOL:
          result = await this.callTool(params);
          break;
        case Methods.LIST_RESOURCES:
          result = await this.listResources();
          break;
        case Methods.READ_RESOURCE:
          result = await this.readResource(params);
          break;
        case Methods.LIST_PROMPTS:
          result = await this.listPrompts();
          break;
        case Methods.GET_PROMPT:
          result = await this.getPrompt(params.name, params.arguments);
          break;
        default:
          throw new Error(`Unknown method: ${method}`);
      }

      return {
        jsonrpc: '2.0',
        id,
        result
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32603,
          message: error.message
        }
      };
    }
  }
}

/**
 * MCP Client Implementation
 */
export class MCPClient extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = options;
    this.requestId = 0;
    this.pendingRequests = new Map();
    this.capabilities = null;
    this.serverInfo = null;
  }

  /**
   * Generate next request ID
   */
  nextRequestId() {
    return ++this.requestId;
  }

  /**
   * Send a request to the MCP server
   */
  async sendRequest(method, params = {}) {
    const id = this.nextRequestId();
    const message = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.emit('message', message);
      
      // Set timeout
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Handle response from MCP server
   */
  handleResponse(response) {
    const { id, result, error } = response;
    const request = this.pendingRequests.get(id);
    
    if (request) {
      this.pendingRequests.delete(id);
      if (error) {
        request.reject(new Error(error.message));
      } else {
        request.resolve(result);
      }
    }
  }

  /**
   * Initialize connection with MCP server
   */
  async initialize() {
    const result = await this.sendRequest(Methods.INITIALIZE, {
      protocolVersion: MCP_VERSION,
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      },
      clientInfo: {
        name: 'Arzani-AI-Agent',
        version: '1.0.0'
      }
    });

    this.capabilities = result.capabilities;
    this.serverInfo = result.serverInfo;
    return result;
  }

  /**
   * List available tools
   */
  async listTools() {
    return await this.sendRequest(Methods.LIST_TOOLS);
  }

  /**
   * Call a tool
   */
  async callTool(name, arguments_obj = {}) {
    return await this.sendRequest(Methods.CALL_TOOL, {
      name,
      arguments: arguments_obj
    });
  }

  /**
   * List available resources
   */
  async listResources() {
    return await this.sendRequest(Methods.LIST_RESOURCES);
  }

  /**
   * Read a resource
   */
  async readResource(uri) {
    return await this.sendRequest(Methods.READ_RESOURCE, { uri });
  }

  /**
   * List available prompts
   */
  async listPrompts() {
    return await this.sendRequest(Methods.LIST_PROMPTS);
  }

  /**
   * Get a prompt
   */
  async getPrompt(name, arguments_obj = {}) {
    return await this.sendRequest(Methods.GET_PROMPT, {
      name,
      arguments: arguments_obj
    });
  }
}

export { MCP_VERSION, MessageTypes, Methods };
