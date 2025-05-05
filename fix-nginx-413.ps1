# PowerShell script to fix Nginx 413 Request Entity Too Large error
Write-Host "Starting Nginx 413 Error Fix Script..." -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Path to nginx.conf - this assumes you're using a standard Nginx installation
# If your Nginx is installed in a different location, you may need to adjust this
$nginxConfPaths = @(
    "C:\nginx\conf\nginx.conf",
    "C:\Program Files\nginx\conf\nginx.conf", 
    "C:\nginx-1.27.5\conf\nginx.conf"
)

$configFound = $false

foreach ($nginxConfPath in $nginxConfPaths) {
    if (Test-Path $nginxConfPath) {
        $configFound = $true
        Write-Host "Found Nginx configuration at: $nginxConfPath" -ForegroundColor Green
        
        # Backup the original file
        $backupPath = "$nginxConfPath.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Copy-Item -Path $nginxConfPath -Destination $backupPath
        Write-Host "Created backup at: $backupPath" -ForegroundColor Green
        
        # Read the configuration
        $content = Get-Content -Path $nginxConfPath -Raw
        
        # Replace client_max_body_size directives or add them if missing
        if ($content -match "client_max_body_size\s+\d+[mM];") {
            $newContent = $content -replace "client_max_body_size\s+\d+[mM];", "client_max_body_size 25M;"
            Write-Host "Increased client_max_body_size to 25M" -ForegroundColor Yellow
        } else {
            # If no client_max_body_size directive is found, add it to the http block
            if ($content -match "http\s*{") {
                $newContent = $content -replace "http\s*{", "http {`n    client_max_body_size 25M;"
                Write-Host "Added client_max_body_size 25M to http block" -ForegroundColor Yellow
            } else {
                Write-Host "Could not locate http block in configuration. Manual edit may be required." -ForegroundColor Red
                $newContent = $content
            }
        }
        
        # Update the configuration
        Set-Content -Path $nginxConfPath -Value $newContent
        
        # Verify the change
        if ((Get-Content -Path $nginxConfPath -Raw) -match "client_max_body_size 25M;") {
            Write-Host "Configuration successfully updated!" -ForegroundColor Green
        } else {
            Write-Host "Failed to update configuration. Please check the file manually." -ForegroundColor Red
        }
        
        # Restart Nginx to apply changes
        Write-Host "Attempting to restart Nginx service..." -ForegroundColor Cyan
        
        # Try using Windows service first
        $nginxService = Get-Service -Name "nginx" -ErrorAction SilentlyContinue
        if ($nginxService) {
            try {
                Restart-Service -Name "nginx" -ErrorAction Stop
                Write-Host "Nginx service restarted successfully!" -ForegroundColor Green
            } catch {
                Write-Host "Failed to restart Nginx service. Error: $_" -ForegroundColor Red
                Write-Host "Trying alternative restart method..." -ForegroundColor Yellow
                
                # Try alternative method - stopping and starting the process
                try {
                    $nginxDir = Split-Path -Parent $nginxConfPath
                    $nginxRootDir = Split-Path -Parent $nginxDir
                    
                    # Stop any running Nginx process
                    $nginxProcesses = Get-Process -Name "nginx" -ErrorAction SilentlyContinue
                    if ($nginxProcesses) {
                        $nginxProcesses | ForEach-Object { $_.Kill() }
                        Start-Sleep -Seconds 1
                    }
                    
                    # Start Nginx
                    Start-Process -FilePath "$nginxRootDir\nginx.exe" -NoNewWindow
                    Write-Host "Nginx restarted manually" -ForegroundColor Green
                } catch {
                    Write-Host "Failed to restart Nginx manually. Error: $_" -ForegroundColor Red
                    Write-Host "Please restart Nginx manually to apply changes." -ForegroundColor Yellow
                }
            }
        } else {
            # No service found, try direct process manipulation
            try {
                $nginxDir = Split-Path -Parent $nginxConfPath
                $nginxRootDir = Split-Path -Parent $nginxDir
                
                # Stop any running Nginx process
                $nginxProcesses = Get-Process -Name "nginx" -ErrorAction SilentlyContinue
                if ($nginxProcesses) {
                    $nginxProcesses | ForEach-Object { $_.Kill() }
                    Start-Sleep -Seconds 1
                }
                
                # Start Nginx
                Start-Process -FilePath "$nginxRootDir\nginx.exe" -NoNewWindow
                Write-Host "Nginx restarted manually" -ForegroundColor Green
            } catch {
                Write-Host "Failed to restart Nginx manually. Error: $_" -ForegroundColor Red
                Write-Host "Please restart Nginx manually to apply changes." -ForegroundColor Yellow
                Write-Host "You can use the command: nginx -s reload (from the Nginx directory)" -ForegroundColor Yellow
            }
        }
        
        break
    }
}

if (-not $configFound) {
    Write-Host "Could not find Nginx configuration file." -ForegroundColor Red
    Write-Host "Please enter the full path to your nginx.conf file:" -ForegroundColor Yellow
    $customPath = Read-Host
    
    if (Test-Path $customPath) {
        Write-Host "Found custom Nginx configuration at: $customPath" -ForegroundColor Green
        # (Same logic as above for modifying the file)
        # Backup the original file
        $backupPath = "$customPath.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Copy-Item -Path $customPath -Destination $backupPath
        Write-Host "Created backup at: $backupPath" -ForegroundColor Green
        
        # Read the configuration
        $content = Get-Content -Path $customPath -Raw
        
        # Replace client_max_body_size directives or add them if missing
        if ($content -match "client_max_body_size\s+\d+[mM];") {
            $newContent = $content -replace "client_max_body_size\s+\d+[mM];", "client_max_body_size 25M;"
            Write-Host "Increased client_max_body_size to 25M" -ForegroundColor Yellow
        } else {
            # If no client_max_body_size directive is found, add it to the http block
            if ($content -match "http\s*{") {
                $newContent = $content -replace "http\s*{", "http {`n    client_max_body_size 25M;"
                Write-Host "Added client_max_body_size 25M to http block" -ForegroundColor Yellow
            } else {
                Write-Host "Could not locate http block in configuration. Manual edit may be required." -ForegroundColor Red
                $newContent = $content
            }
        }
        
        # Update the configuration
        Set-Content -Path $customPath -Value $newContent
        
        Write-Host "Please restart your Nginx server manually to apply changes." -ForegroundColor Yellow
    } else {
        Write-Host "Invalid path. The file does not exist." -ForegroundColor Red
        Write-Host "Please modify your Nginx configuration manually to include:" -ForegroundColor Yellow
        Write-Host "client_max_body_size 25M;" -ForegroundColor Cyan
        Write-Host "This setting should be placed in the http { } or server { } block." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Script completed. If you continue to experience issues, please check your Nginx error logs" -ForegroundColor Cyan
Write-Host "or manually set 'client_max_body_size 25M;' in your nginx.conf file." -ForegroundColor Cyan