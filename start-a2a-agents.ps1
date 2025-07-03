# A2A Multi-Agent System Startup Script
# Starts all A2A agents in background processes

Write-Host "Starting A2A Multi-Agent System..." -ForegroundColor Green

# Function to start an agent in background
function Start-Agent {
    param(
        [string]$Name,
        [string]$Path,
        [int]$Port
    )
    
    Write-Host "Starting $Name on port $Port..." -ForegroundColor Yellow
    
    # Start the agent in a new PowerShell process
    $job = Start-Job -ScriptBlock {
        param($AgentPath, $AgentPort)
        Set-Location $AgentPath
        node index.js
    } -ArgumentList $Path, $Port -Name $Name
    
    if ($job) {
        Write-Host "✓ $Name started successfully (Job ID: $($job.Id))" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to start $Name" -ForegroundColor Red
    }
    
    return $job
}

# Change to project root
Set-Location "c:\Users\Micha\OneDrive\Documents\my-marketplace-project"

# Kill any existing processes on the A2A ports
$ports = @(5001, 5002, 5003, 5004)
foreach ($port in $ports) {
    $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
    if ($process) {
        Write-Host "Stopping existing process on port $port (PID: $process)" -ForegroundColor Yellow
        Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

# Start all agents
$jobs = @()

$jobs += Start-Agent -Name "Orchestrator" -Path "services\orchestrator" -Port 5001
Start-Sleep -Seconds 3

$jobs += Start-Agent -Name "Broker" -Path "services\broker" -Port 5002
Start-Sleep -Seconds 3

$jobs += Start-Agent -Name "Legal" -Path "services\legal" -Port 5003
Start-Sleep -Seconds 3

$jobs += Start-Agent -Name "Finance" -Path "services\finance" -Port 5004
Start-Sleep -Seconds 3

Write-Host "`nAll A2A agents started!" -ForegroundColor Green
Write-Host "Waiting for agents to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check agent health
Write-Host "`nChecking agent health..." -ForegroundColor Cyan

$agents = @(
    @{Name="Orchestrator"; Port=5001},
    @{Name="Broker"; Port=5002},
    @{Name="Legal"; Port=5003},
    @{Name="Finance"; Port=5004}
)

foreach ($agent in $agents) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$($agent.Port)/health" -Method GET -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ $($agent.Name) agent is healthy" -ForegroundColor Green
        } else {
            Write-Host "✗ $($agent.Name) agent health check failed" -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ $($agent.Name) agent is not responding" -ForegroundColor Red
    }
}

Write-Host "`nA2A Multi-Agent System is ready!" -ForegroundColor Green
Write-Host "Agents running on ports: 5001 (Orchestrator), 5002 (Broker), 5003 (Legal), 5004 (Finance)" -ForegroundColor Cyan
Write-Host "`nTo stop all agents, run: Get-Job | Stop-Job; Get-Job | Remove-Job" -ForegroundColor Yellow
Write-Host "To view agent logs: Get-Job | Receive-Job" -ForegroundColor Yellow
