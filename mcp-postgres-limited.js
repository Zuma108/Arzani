#!/usr/bin/env node

/**
 * Custom MCP PostgreSQL Server with Operation Restrictions
 * This server wraps the standard PostgreSQL MCP server and filters out DELETE operations
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import pg from 'pg';

const { Pool } = pg;

class LimitedPostgreSQLServer {
  constructor() {
    this.server = new Server(
      {
        name: 'limited-postgresql-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Database connection
    this.pool = new Pool({
      connectionString: process.env.POSTGRES_CONNECTION_STRING
    });

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      await this.pool.end();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'query',
            description: 'Execute a SELECT query on the PostgreSQL database',
            inputSchema: {
              type: 'object',
              properties: {
                sql: {
                  type: 'string',
                  description: 'The SELECT SQL query to execute'
                },
                params: {
                  type: 'array',
                  items: { type: ['string', 'number', 'boolean', 'null'] },
                  description: 'Query parameters (optional)'
                }
              },
              required: ['sql']
            }
          },
          {
            name: 'execute',
            description: 'Execute INSERT, UPDATE, or CREATE queries on the PostgreSQL database (DELETE operations are blocked)',
            inputSchema: {
              type: 'object',
              properties: {
                sql: {
                  type: 'string',
                  description: 'The INSERT, UPDATE, or CREATE SQL query to execute (DELETE queries will be rejected)'
                },
                params: {
                  type: 'array',
                  items: { type: ['string', 'number', 'boolean', 'null'] },
                  description: 'Query parameters (optional)'
                }
              },
              required: ['sql']
            }
          },
          {
            name: 'list_tables',
            description: 'List all tables in the database',
            inputSchema: {
              type: 'object',
              properties: {
                schema: {
                  type: 'string',
                  description: 'Schema name (default: public)'
                }
              }
            }
          },
          {
            name: 'describe_table',
            description: 'Get table structure',
            inputSchema: {
              type: 'object',
              properties: {
                table: {
                  type: 'string',
                  description: 'Table name'
                },
                schema: {
                  type: 'string',
                  description: 'Schema name (default: public)'
                }
              },
              required: ['table']
            }
          },
          {
            name: 'list_schemas',
            description: 'List all schemas in the database',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'query':
            return await this.handleQuery(args);
          case 'execute':
            return await this.handleExecute(args);
          case 'list_tables':
            return await this.handleListTables(args);
          case 'describe_table':
            return await this.handleDescribeTable(args);
          case 'list_schemas':
            return await this.handleListSchemas();
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Database error: ${error.message}`
        );
      }
    });
  }

  // Check if SQL contains prohibited operations
  containsProhibitedOperation(sql) {
    const normalizedSql = sql.toLowerCase().trim();
    // Check for DELETE statements
    if (normalizedSql.match(/\bdelete\s+from\b/i)) {
      return true;
    }
    // Check for DROP statements (but allow CREATE)
    if (normalizedSql.match(/\bdrop\s+(table|database|schema|index|view)\b/i)) {
      return true;
    }
    // Check for TRUNCATE statements
    if (normalizedSql.match(/\btruncate\s+(table\s+)?/i)) {
      return true;
    }
    return false;
  }

  async handleQuery(args) {
    const { sql, params = [] } = args;
    
    // Only allow SELECT queries for the query tool
    if (!sql.toLowerCase().trim().startsWith('select')) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Query tool only supports SELECT statements. Use execute tool for INSERT/UPDATE operations.'
      );
    }

    const result = await this.pool.query(sql, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.rows, null, 2)
        }
      ]
    };
  }

  async handleExecute(args) {
    const { sql, params = [] } = args;
    
    // Block prohibited operations
    if (this.containsProhibitedOperation(sql)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'DELETE, DROP, and TRUNCATE operations are not allowed by this MCP server configuration.'
      );
    }

    // Allow INSERT, UPDATE, and CREATE operations
    const normalizedSql = sql.toLowerCase().trim();
    if (!normalizedSql.startsWith('insert') && 
        !normalizedSql.startsWith('update') && 
        !normalizedSql.startsWith('create') &&
        !normalizedSql.startsWith('alter')) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Execute tool supports INSERT, UPDATE, CREATE, and ALTER statements. DELETE operations are blocked.'
      );
    }

    const result = await this.pool.query(sql, params);
    return {
      content: [
        {
          type: 'text',
          text: `Query executed successfully. Rows affected: ${result.rowCount}`
        }
      ]
    };
  }

  async handleListTables(args) {
    const { schema = 'public' } = args;
    const result = await this.pool.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name',
      [schema]
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.rows, null, 2)
        }
      ]
    };
  }

  async handleDescribeTable(args) {
    const { table, schema = 'public' } = args;
    const result = await this.pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY' 
          AND tc.table_name = $1 
          AND tc.table_schema = $2
      ) pk ON c.column_name = pk.column_name
      WHERE c.table_name = $1 AND c.table_schema = $2
      ORDER BY c.ordinal_position
    `, [table, schema]);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.rows, null, 2)
        }
      ]
    };
  }

  async handleListSchemas() {
    const result = await this.pool.query(
      'SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT LIKE \'pg_%\' AND schema_name != \'information_schema\' ORDER BY schema_name'
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.rows, null, 2)
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Limited PostgreSQL MCP server running on stdio');
  }
}

const server = new LimitedPostgreSQLServer();
server.run().catch(console.error);