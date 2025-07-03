@echo off
echo ===== SSL Certificate Renewal Helper =====
echo Checking SSL certificate status...

node ssl-renew-helper.js

echo.
echo ===========================================
echo If renewal is needed, please follow the instructions above.
echo Visit https://arzani.co.uk in your browser to check if the certificate is valid.
echo.
echo Press any key to exit...
pause > nul
