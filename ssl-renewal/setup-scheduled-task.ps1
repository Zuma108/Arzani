# Setup SSL Renewal Scheduled Task
# This script creates a scheduled task to run the SSL renewal script monthly
# Run this script as Administrator

$ErrorActionPreference = "Stop"

# Configuration
$ScriptPath = "$PSScriptRoot\renew-ssl.ps1"
$TaskName = "SSL_Certificate_Renewal"
$TaskDescription = "Monthly SSL certificate renewal for arzani.co.uk"

# Check if the script exists
if (-not (Test-Path $ScriptPath)) {
    Write-Error "SSL renewal script not found at: $ScriptPath"
    exit 1
}

# Create the scheduled task
try {
    # Remove existing task if it exists
    $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "Removed existing task: $TaskName"
    }

    # Create a new task
    $action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File `"$ScriptPath`""
    
    # Run task on the 1st of every month at 3 AM
    $trigger = New-ScheduledTaskTrigger -At "03:00" -Daily
    
    # Create principal (run with highest privileges for current user)
    $principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -RunLevel Highest
    
    # Create settings
    $settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 1) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 5)
    
    # Register the task
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description $TaskDescription

    Write-Host "Successfully created scheduled task: $TaskName"
    Write-Host "The SSL certificates will be renewed automatically on the 1st of each month at 3:00 AM"
} catch {
    Write-Error "Failed to create scheduled task: $_"
    exit 1
}

# Create a task to run the renewal now (optional)
$runNow = Read-Host "Do you want to run the SSL renewal now? (y/n)"

if ($runNow -eq "y" -or $runNow -eq "Y") {
    Write-Host "Running SSL renewal script now..."
    try {
        & PowerShell.exe -ExecutionPolicy Bypass -File "$ScriptPath"
    } catch {
        Write-Error "Failed to run SSL renewal script: $_"
    }
}

Write-Host "Setup complete!"
