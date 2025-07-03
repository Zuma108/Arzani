@echo off
echo Starting A2A Multi-Agent System...

cd /d "c:\Users\Micha\OneDrive\Documents\my-marketplace-project"

echo.
echo Killing any existing processes on A2A ports...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5001') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5002') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5003') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5004') do taskkill /f /pid %%a >nul 2>&1

timeout /t 3 >nul

echo.
echo Starting Orchestrator Agent (port 5001)...
start "Orchestrator Agent" cmd /c "cd services\orchestrator && node index.js"

timeout /t 3 >nul

echo Starting Broker Agent (port 5002)...
start "Broker Agent" cmd /c "cd services\broker && node index.js"

timeout /t 3 >nul

echo Starting Legal Agent (port 5003)...
start "Legal Agent" cmd /c "cd services\legal && node index.js"

timeout /t 3 >nul

echo Starting Finance Agent (port 5004)...
start "Finance Agent" cmd /c "cd services\finance && node index.js"

echo.
echo All A2A agents started in separate windows!
echo Agents running on ports: 5001 (Orchestrator), 5002 (Broker), 5003 (Legal), 5004 (Finance)
echo.
pause
