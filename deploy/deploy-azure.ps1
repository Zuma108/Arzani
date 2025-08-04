# Azure PowerShell deployment script

# Login to Azure (will prompt for credentials)
Connect-AzAccount

# Set variables
$resourceGroupName = "my-marketplace"
$webAppName = "arzani"
$deploymentFile = ".\azure-deployment.zip"

# Check if deployment file exists
if (-not (Test-Path $deploymentFile)) {
    Write-Error "Deployment file not found. Run deploy-azure.sh first."
    exit 1
}

# Deploy to Azure App Service
Write-Host "Deploying to Azure App Service..."
Publish-AzWebApp -ResourceGroupName $resourceGroupName -Name $webAppName -ArchivePath $deploymentFile -Force

Write-Host "Deployment complete!"
