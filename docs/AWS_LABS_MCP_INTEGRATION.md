# AWS Labs MCP Servers Integration

This document describes the integration of AWS Labs MCP servers into your Arzani Marketplace project, based on the AWS blog post: [Supercharging AWS database development with AWS MCP servers](https://aws.amazon.com/blogs/database/supercharging-aws-database-development-with-aws-mcp-servers/).

## What Are AWS Labs MCP Servers?

AWS Labs MCP (Model Context Protocol) servers are open-source tools that enable AI assistants to interact directly with AWS database services through a standardized protocol. These servers act as bridges between AI tools (like Claude, Cursor, VS Code with Amazon Q) and your AWS databases.

## Benefits for Your Project

1. **Schema-driven Development**: AI can understand your database structure and suggest optimizations
2. **Natural Language Queries**: Generate SQL queries using natural language prompts
3. **Automated Testing**: Generate tests based on live database schemas
4. **Real-time Troubleshooting**: Monitor and diagnose database issues with AI assistance
5. **Context-Aware Development**: AI understands your database relationships and constraints

## Available MCP Servers

### PostgreSQL MCP Server (for your RDS instance)
- **Purpose**: Direct integration with your AWS RDS PostgreSQL database
- **Docker Image**: `awslabs/postgres-mcp-server:latest`
- **Use Cases**: 
  - Schema exploration and understanding
  - Query generation and optimization
  - Database troubleshooting
  - Test data generation

### DynamoDB MCP Server
- **Purpose**: Integration with DynamoDB tables
- **Docker Image**: `awslabs/dynamodb-mcp-server:latest`
- **Use Cases**: NoSQL query assistance, access pattern optimization

### Aurora DSQL MCP Server
- **Purpose**: Integration with Aurora DSQL (serverless)
- **Docker Image**: `awslabs/aurora-dsql-mcp-server:latest`

### ElastiCache (Valkey) MCP Server
- **Purpose**: Integration with ElastiCache for caching optimization
- **Docker Image**: `awslabs/valkey-mcp-server:latest`

## Configuration Added to Your Project

I've updated your `.vscode/mcp.json` file to include the AWS Labs PostgreSQL MCP server alongside your existing PostgreSQL MCP configuration:

```json
{
  "awslabs-postgres": {
    "command": "docker",
    "args": [
      "run", "-i", "--rm",
      "-e", "AWS_ACCESS_KEY_ID=${env:AWS_ACCESS_KEY_ID}",
      "-e", "AWS_SECRET_ACCESS_KEY=${env:AWS_SECRET_ACCESS_KEY}",
      "-e", "AWS_REGION=eu-west-2",
      "awslabs/postgres-mcp-server:latest",
      "--connection_string", "postgresql://marketplace_user:Olumide123!@my-marketplace.cfwmyg8aso0q.eu-west-2.rds.amazonaws.com:5432/my_marketplace",
      "--readonly", "false"
    ],
    "type": "stdio"
  }
}
```

## Setup Instructions

### Prerequisites
1. Docker Desktop installed on your system
2. AWS credentials configured in environment variables
3. Access to your AWS RDS PostgreSQL instance

### Quick Setup
Run the setup script I created:
```powershell
.\setup-aws-mcp-servers.ps1
```

### Manual Setup
1. Clone the AWS Labs MCP repository:
   ```bash
   git clone https://github.com/awslabs/mcp.git
   ```

2. Build the PostgreSQL MCP server:
   ```bash
   cd mcp/src/postgres-mcp-server/
   docker build -t awslabs/postgres-mcp-server:latest .
   ```

3. Set environment variables:
   ```powershell
   $env:AWS_ACCESS_KEY_ID = "your-access-key"
   $env:AWS_SECRET_ACCESS_KEY = "your-secret-key"
   $env:AWS_REGION = "eu-west-2"
   ```

## Usage Examples

### With VS Code + Amazon Q
Once configured, you can use natural language prompts in VS Code:

- "Show me the schema of the businesses table"
- "Generate a query to find all businesses created in the last 30 days"
- "Create a test that validates the foreign key relationships in my database"
- "Help me understand why the market_trends_mv materialized view is failing"

### With Claude Desktop
Configure the same settings in Claude Desktop's `claude_desktop_config.json` for similar functionality.

### With Cursor IDE
The configuration works directly with Cursor when Amazon Q CLI is installed.

## Integration with Your Current Issues

This MCP server integration is particularly relevant to your current materialized view issue:

1. **Schema Analysis**: The AI can analyze your current database schema and identify conflicts
2. **Query Optimization**: It can suggest better approaches for materialized view refresh
3. **Error Diagnosis**: It can help understand why concurrent refresh is failing on AWS RDS
4. **Migration Planning**: It can help plan database schema changes safely

## Security Considerations

- The MCP server runs in a Docker container locally
- Database credentials are passed through environment variables
- `--readonly false` allows write operations (change to `true` for read-only access)
- All communication happens locally between your IDE and the Docker container

## Next Steps

1. Run the setup script to install the MCP servers
2. Configure your AWS credentials
3. Test the integration by asking your AI assistant about your database schema
4. Use it to help resolve the current materialized view issue

## Documentation Links

- [AWS Labs MCP GitHub Repository](https://github.com/awslabs/mcp)
- [PostgreSQL MCP Server Documentation](https://awslabs.github.io/mcp/servers/postgres-mcp-server/)
- [Model Context Protocol Official Site](https://modelcontextprotocol.io/introduction)
- [AWS Blog Post](https://aws.amazon.com/blogs/database/supercharging-aws-database-development-with-aws-mcp-servers/)
