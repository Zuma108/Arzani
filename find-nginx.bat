@echo off
echo Searching for Nginx installation...

echo Checking common installation paths:
for %%p in (
  "C:\nginx"
  "C:\Program Files\nginx"
  "C:\Program Files (x86)\nginx"
  "C:\xampp\nginx"
  "C:\wamp\nginx"
  "C:\wamp64\nginx"
) do (
  if exist "%%p\nginx.exe" (
    echo Found Nginx at: %%p
    echo To use it, run: %%p\nginx.exe -s reload
  )
)

echo.
echo Searching for nginx.exe on C: drive (this might take a while)...
where /r C:\ nginx.exe 2>nul

echo.
echo If Nginx is running in Docker or WSL, you'll need to access it differently.
echo - For Docker: docker exec [container_name] nginx -s reload
echo - For WSL: wsl -d [distro_name] sudo systemctl reload nginx
