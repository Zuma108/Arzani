@echo off
echo ===== GoDaddy SSL Certificate Resources =====
echo.
echo 1. GoDaddy Account Login
echo 2. GoDaddy SSL Certificate Help Center
echo 3. Check current SSL certificate status for arzani.co.uk
echo 4. View installation guide for Nginx
echo 5. Exit
echo.

:menu
set /p choice=Enter your choice (1-5): 

if "%choice%"=="1" (
    start https://account.godaddy.com/products
    goto menu
) else if "%choice%"=="2" (
    start https://www.godaddy.com/help/manage-ssl-certificates-28023
    goto menu
) else if "%choice%"=="3" (
    echo Checking certificate status...
    echo.
    powershell -ExecutionPolicy Bypass -File "%~dp0check-certificate.ps1"
    echo.
    pause
    cls
    goto :EOF
) else if "%choice%"=="4" (
    start "" "%~dp0nginx-ssl-installation-guide.md"
    goto menu
) else if "%choice%"=="5" (
    exit
) else (
    echo Invalid choice. Please try again.
    goto menu
)
