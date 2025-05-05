@echo off
echo ===============================================
echo Starting Nginx from the correct directory
echo ===============================================
echo.

:: Change to the Nginx installation directory
cd /d C:\nginx-1.27.5

:: Stop any running instance of Nginx
taskkill /f /im nginx.exe >nul 2>&1

:: Start Nginx with the configuration from the installation directory
start nginx.exe

echo Nginx started successfully!
echo.
pause