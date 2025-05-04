@echo off
echo Testing Nginx configuration...
nginx -t

if %ERRORLEVEL% EQU 0 (
    echo Configuration test successful. Reloading Nginx...
    
    :: For Windows we need to use the -s reload parameter
    nginx -s reload
    
    echo Nginx reloaded successfully.
    echo Checking if client_max_body_size is properly applied:
    findstr "client_max_body_size" C:\path\to\nginx\conf\*.conf
) else (
    echo Configuration test failed. Please fix the errors before reloading.
)
