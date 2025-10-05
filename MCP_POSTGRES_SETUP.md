# Limited PostgreSQL MCP Server Configuration

## Overview

This project now uses a custom PostgreSQL MCP server that restricts database operations to prevent accidental data deletion. The server allows **SELECT**, **INSERT**, and **UPDATE** operations while blocking **DELETE**, **DROP**, and **TRUNCATE** operations.

## Files

- `mcp-postgres-limited.js` - Custom MCP server with operation restrictions
- `.vscode/mcp.json` - Updated MCP configuration using the custom server
- `test-mcp-limited.js` - Test script to verify the restrictions work

## What's Blocked

❌ **DELETE** statements - `DELETE FROM table WHERE ...`
❌ **DROP** statements - `DROP TABLE`, `DROP DATABASE`, etc.
❌ **TRUNCATE** statements - `TRUNCATE TABLE`

## What's Allowed

✅ **SELECT** queries - Read data from any table
✅ **INSERT** statements - Add new records
✅ **UPDATE** statements - Modify existing records
✅ **Administrative queries** - List tables, describe schemas, etc.

## How It Works

The custom MCP server acts as a middleware layer that:

1. Receives MCP tool calls from VS Code
2. Analyzes the SQL statements for prohibited operations
3. Blocks dangerous operations with clear error messages
4. Executes safe operations normally

## Usage in VS Code

After restarting VS Code, you can use the PostgreSQL MCP tools as normal:

```
- mcp_postgresql_query - Execute SELECT queries
- mcp_postgresql_execute - Execute INSERT/UPDATE queries (DELETE blocked)
- mcp_postgresql_list_tables - List database tables
- mcp_postgresql_describe_table - Get table structure
- mcp_postgresql_list_schemas - List database schemas
```

## Testing

Run the test script to verify the restrictions:

```bash
node test-mcp-limited.js
```

This will test that:
- SELECT queries work normally
- DELETE queries are properly blocked
- Administrative functions work

## Security Benefits

- Prevents accidental data deletion through MCP operations
- Maintains full read access for analysis and debugging
- Allows necessary INSERT/UPDATE operations for data management
- Provides clear error messages when blocked operations are attempted

## Configuration

The server connects using the same database credentials as your main application:
- Database: `my-marketplace`
- User: `marketplace_user`
- Connection defined in `.vscode/mcp.json`

To modify the restrictions, edit the `containsDeleteOperation()` function in `mcp-postgres-limited.js`.