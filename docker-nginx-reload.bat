@echo off
echo Updating Nginx configuration in Docker...

REM Update this to your container name
set CONTAINER_NAME=your_nginx_container_name

docker exec -it %CONTAINER_NAME% bash -c "echo 'client_max_body_size 15M;' > /etc/nginx/conf.d/upload_size.conf && nginx -t && nginx -s reload"

if %ERRORLEVEL% EQU 0 (
    echo Successfully updated Nginx configuration in Docker container.
) else (
    echo Failed to update Nginx configuration. Check container name and try again.
)
