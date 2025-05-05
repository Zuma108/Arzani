@echo off
echo ===============================================
echo Fix Nginx 413 Request Entity Too Large Error
echo ===============================================
echo.

:: Check for admin rights
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo This script requires administrator privileges.
    echo Right-click on this file and select "Run as administrator".
    echo.
    pause
    exit /b
)

:: Run the PowerShell script
echo Running fix script with PowerShell...
powershell.exe -ExecutionPolicy Bypass -File "%~dp0fix-nginx-413.ps1"

echo.
echo Script completed.
echo.
pause