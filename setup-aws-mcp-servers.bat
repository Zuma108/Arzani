@echo off
REM AWS Labs MCP Servers Setup Script
REM Based on: https://aws.amazon.com/blogs/database/supercharging-aws-database-development-with-aws-mcp-servers/

echo Setting up AWS Labs MCP Servers...

REM Check if Docker is installed
docker --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ✗ Docker is not installed. Please install Docker Desktop first.
    echo Download from: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
) else (
    echo ✓ Docker is installed
)

REM Clone the AWS Labs MCP repository
echo Cloning AWS Labs MCP repository...
if exist "mcp" (
    echo MCP directory already exists, pulling latest changes...
    cd mcp
    git pull
    cd ..
) else (
    git clone https://github.com/awslabs/mcp.git
)

REM Build the PostgreSQL MCP server for Aurora/RDS
echo Building PostgreSQL MCP Server...
cd mcp\src\postgres-mcp-server\
docker build -t awslabs/postgres-mcp-server:latest .
cd ..\..\..

REM Build DynamoDB MCP server
echo Building DynamoDB MCP Server...
cd mcp\src\dynamodb-mcp-server\
docker build -t awslabs/dynamodb-mcp-server:latest .
cd ..\..\..

REM Build Aurora DSQL MCP server
echo Building Aurora DSQL MCP Server...
cd mcp\src\aurora-dsql-mcp-server\
docker build -t awslabs/aurora-dsql-mcp-server:latest .
cd ..\..\..

REM Build ElastiCache Valkey MCP server
echo Building ElastiCache Valkey MCP Server...
cd mcp\src\valkey-mcp-server\
docker build -t awslabs/valkey-mcp-server:latest .
cd ..\..\..

echo.
echo ✓ AWS Labs MCP Servers setup complete!
echo.
echo Available MCP servers:
echo - awslabs/postgres-mcp-server:latest (for Aurora PostgreSQL/RDS PostgreSQL)
echo - awslabs/dynamodb-mcp-server:latest (for DynamoDB)
echo - awslabs/aurora-dsql-mcp-server:latest (for Aurora DSQL)
echo - awslabs/valkey-mcp-server:latest (for ElastiCache)
echo.
echo Your mcp.json has been updated with the AWS Labs PostgreSQL MCP server configuration.
echo Make sure to set your AWS credentials in environment variables:
echo   - AWS_ACCESS_KEY_ID
echo   - AWS_SECRET_ACCESS_KEY
echo   - AWS_REGION (set to eu-west-2 for your RDS instance)
echo.
pause
