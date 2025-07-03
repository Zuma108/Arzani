@echo off
echo Checking for required Node.js modules...

:: Check if express is installed
node -e "try { require.resolve('express'); console.log('Express is installed'); } catch(e) { console.log('Express is not installed'); process.exit(1); }"
if %errorlevel% neq 0 (
  echo Installing express...
  npm install express --no-save
)

echo Starting test server for markdown tables...
echo.
node test-server.cjs
