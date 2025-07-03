@echo off
echo ===== SSL Certificate Manual Renewal Helper =====
echo.
echo This script will open useful websites for manual SSL certificate renewal.
echo.
echo Choose an option:
echo 1. Check current certificate status (SSL Labs)
echo 2. Get a free Let's Encrypt certificate
echo 3. Purchase commercial SSL certificate
echo 4. View renewal instructions
echo 5. Exit
echo.

:menu
set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" (
    echo Opening SSL checker in your browser...
    start https://www.ssllabs.com/ssltest/analyze.html?d=arzani.co.uk
    goto menu
)

if "%choice%"=="2" (
    echo Opening Let's Encrypt in your browser...
    start https://letsencrypt.org/getting-started/
    goto menu
)

if "%choice%"=="3" (
    echo Select a certificate provider:
    echo   A. DigiCert
    echo   B. Comodo/Sectigo
    echo   C. GoDaddy
    echo   D. Namecheap
    echo   E. Back to main menu
    echo.
    
    set /p provider="Enter your choice (A-E): "
    
    if /i "%provider%"=="A" start https://www.digicert.com/tls-ssl/tls-ssl-certificates
    if /i "%provider%"=="B" start https://sectigo.com/ssl-certificates
    if /i "%provider%"=="C" start https://www.godaddy.com/web-security/ssl-certificate
    if /i "%provider%"=="D" start https://www.namecheap.com/security/ssl-certificates/
    if /i "%provider%"=="E" goto menu
    
    goto menu
)

if "%choice%"=="4" (
    echo Opening renewal instructions...
    start MANUAL_RENEWAL_GUIDE.md
    goto menu
)

if "%choice%"=="5" (
    echo Goodbye!
    exit /b 0
)

echo Invalid choice. Please try again.
goto menu
