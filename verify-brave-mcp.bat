@echo off
echo 🔍 Verifying Brave MCP Accessibility for All AI Agents
echo =====================================================
echo.

REM Change to the project directory
cd /d "%~dp0"

REM Run the verification script
node scripts/verify-brave-mcp-accessibility.js

echo.
echo Verification complete. Check the output above for results.
pause
