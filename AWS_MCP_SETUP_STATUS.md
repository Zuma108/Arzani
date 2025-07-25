# AWS Labs MCP Servers - Manual Setup Guide

## Status: Repository Successfully Cloned! ✅

The AWS Labs MCP repository has been successfully cloned to your project directory at `mcp/`.

## Next Steps

### 1. Start Docker Desktop
Before building the MCP servers, you need to start Docker Desktop:
- Open Docker Desktop application on your Windows machine
- Wait for it to fully start (the Docker icon in system tray should be green)

### 2. Build the MCP Servers
Once Docker is running, execute these commands one by one:

```bash
# Build PostgreSQL MCP Server (for your RDS database)
cd mcp/src/postgres-mcp-server/
docker build -t awslabs/postgres-mcp-server:latest .
cd ../../..

# Build DynamoDB MCP Server
cd mcp/src/dynamodb-mcp-server/
docker build -t awslabs/dynamodb-mcp-server:latest .
cd ../../..

# Build Aurora DSQL MCP Server
cd mcp/src/aurora-dsql-mcp-server/
docker build -t awslabs/aurora-dsql-mcp-server:latest .
cd ../../..

# Build ElastiCache Valkey MCP Server
cd mcp/src/valkey-mcp-server/
docker build -t awslabs/valkey-mcp-server:latest .
cd ../../..
```

### 3. Set Environment Variables
Set your AWS credentials (required for the AWS Labs MCP server):

```powershell
$env:AWS_ACCESS_KEY_ID = "your-access-key-here"
$env:AWS_SECRET_ACCESS_KEY = "your-secret-key-here"
$env:AWS_REGION = "eu-west-2"
```

### 4. Test Your Configuration
After building the Docker images, your MCP configuration should work with:
- **Standard PostgreSQL MCP**: Direct connection to your RDS database
- **AWS Labs PostgreSQL MCP**: Enhanced AI-friendly interface with schema analysis

## Configuration Already Added ✅

Your `.vscode/mcp.json` has been updated with both configurations:

1. **postgres** - Your existing direct PostgreSQL connection
2. **awslabs-postgres** - New AWS Labs MCP server with AI capabilities

## Quick Start for Your Database Issue

Since you have the materialized view issue, the AWS Labs MCP server can help:

1. Start Docker Desktop
2. Build the PostgreSQL MCP server
3. Set your AWS credentials
4. Ask your AI assistant: "Analyze my database schema and help fix the materialized view refresh issue"

## Alternative: Use Without Docker

If you prefer not to use Docker, you can continue using your existing PostgreSQL MCP server which is already working and connected to your production database.

The AWS Labs version provides additional AI-friendly features but your current setup is sufficient for applying the database fix we created earlier.
