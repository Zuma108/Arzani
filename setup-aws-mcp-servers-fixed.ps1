# AWS Labs MCP Servers Setup Script
# Based on: https://aws.amazon.com/blogs/database/supercharging-aws-database-development-with-aws-mcp-servers/

Write-Host "Setting up AWS Labs MCP Servers..." -ForegroundColor Green

# Check if Docker is installed
try {
    docker --version | Out-Null
    Write-Host "✓ Docker is installed" -ForegroundColor Green
}
catch {
    Write-Host "✗ Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    Write-Host "Download from: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    exit 1
}

# Clone the AWS Labs MCP repository
Write-Host "Cloning AWS Labs MCP repository..." -ForegroundColor Yellow
if (Test-Path "mcp") {
    Write-Host "MCP directory already exists, pulling latest changes..." -ForegroundColor Yellow
    Set-Location mcp
    git pull
    Set-Location ..
} else {
    git clone https://github.com/awslabs/mcp.git
}

# Build the PostgreSQL MCP server for Aurora/RDS
Write-Host "Building PostgreSQL MCP Server..." -ForegroundColor Yellow
Set-Location mcp/src/postgres-mcp-server/
docker build -t awslabs/postgres-mcp-server:latest .
Set-Location ../../..

# Build DynamoDB MCP server
Write-Host "Building DynamoDB MCP Server..." -ForegroundColor Yellow
Set-Location mcp/src/dynamodb-mcp-server/
docker build -t awslabs/dynamodb-mcp-server:latest .
Set-Location ../../..

# Build Aurora DSQL MCP server
Write-Host "Building Aurora DSQL MCP Server..." -ForegroundColor Yellow
Set-Location mcp/src/aurora-dsql-mcp-server/
docker build -t awslabs/aurora-dsql-mcp-server:latest .
Set-Location ../../..

# Build ElastiCache Valkey MCP server
Write-Host "Building ElastiCache Valkey MCP Server..." -ForegroundColor Yellow
Set-Location mcp/src/valkey-mcp-server/
docker build -t awslabs/valkey-mcp-server:latest .
Set-Location ../../..

Write-Host "✓ AWS Labs MCP Servers setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Available MCP servers:" -ForegroundColor Cyan
Write-Host "- awslabs/postgres-mcp-server:latest (for Aurora PostgreSQL/RDS PostgreSQL)" -ForegroundColor White
Write-Host "- awslabs/dynamodb-mcp-server:latest (for DynamoDB)" -ForegroundColor White
Write-Host "- awslabs/aurora-dsql-mcp-server:latest (for Aurora DSQL)" -ForegroundColor White
Write-Host "- awslabs/valkey-mcp-server:latest (for ElastiCache)" -ForegroundColor White
Write-Host ""
Write-Host "Your mcp.json has been updated with the AWS Labs PostgreSQL MCP server configuration." -ForegroundColor Green
Write-Host "Make sure to set your AWS credentials in environment variables:" -ForegroundColor Yellow
Write-Host "  - AWS_ACCESS_KEY_ID" -ForegroundColor White
Write-Host "  - AWS_SECRET_ACCESS_KEY" -ForegroundColor White
Write-Host "  - AWS_REGION (set to eu-west-2 for your RDS instance)" -ForegroundColor White
