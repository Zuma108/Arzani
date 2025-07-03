@echo off
echo ===== Let's Encrypt SSL Certificate Renewal Tool =====
echo This tool will help you renew your Let's Encrypt SSL certificate for arzani.co.uk
echo.
echo Before proceeding, make sure:
echo  1. You have admin/root access to your server
echo  2. Certbot is installed on your server
echo.
echo Press any key to continue...
pause > nul

echo.
echo Step 1: Checking if certbot is installed locally...
where certbot > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Certbot is not installed or not in your PATH.
    echo.
    echo Would you like to:
    echo  1. Install Certbot using winget (Windows package manager)
    echo  2. Skip local installation (if you'll run renewal on your server)
    echo  3. Exit
    echo.
    set /p choice="Enter your choice (1-3): "
    
    if "%choice%"=="1" (
        echo Installing Certbot...
        winget install certbot
    ) else if "%choice%"=="2" (
        echo Skipping local installation.
    ) else (
        echo Exiting...
        goto :EOF
    )
) else (
    echo Certbot is installed on your system.
)

echo.
echo Step 2: Choose renewal method
echo  1. Renew certificate locally (if your website is hosted on this machine)
echo  2. Get SSH command to run on your remote server
echo  3. Exit
echo.
set /p renewal_method="Enter your choice (1-3): "

if "%renewal_method%"=="1" (
    echo.
    echo Running local certificate renewal...
    echo.
    echo certbot renew --force-renewal
    echo.
    echo Would you like to run this command now? (Y/N)
    set /p run_now="Enter your choice: "
    
    if /i "%run_now%"=="Y" (
        certbot renew --force-renewal
    ) else (
        echo Skipping automatic renewal.
    )
) else if "%renewal_method%"=="2" (
    echo.
    echo === SSH Command for Remote Server Renewal ===
    echo.
    echo Run the following command on your server:
    echo.
    echo sudo certbot renew --force-renewal
    echo.
    echo If that doesn't work, try:
    echo sudo certbot renew --cert-name arzani.co.uk --force-renewal
    echo.
    echo For a completely new certificate:
    echo sudo certbot certonly --webroot -w /path/to/your/website/root -d arzani.co.uk -d www.arzani.co.uk
    echo.
    echo Note: Replace "/path/to/your/website/root" with the actual path to your website files
) else (
    echo Exiting...
    goto :EOF
)

echo.
echo Step 3: Verify renewal
echo After renewal, verify your certificate using one of these methods:
echo  1. Check expiration date with our tool:
echo     powershell -ExecutionPolicy Bypass -File "%~dp0check-certificate.ps1"
echo.
echo  2. Visit https://arzani.co.uk in your browser and check the certificate
echo     by clicking the padlock icon in the address bar.
echo.
echo Press any key to exit...
pause > nul
