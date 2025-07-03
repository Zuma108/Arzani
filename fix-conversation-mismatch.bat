@echo off
echo Running conversation mismatch diagnosis...
node diagnose-conversation-mismatch.js

echo.
echo Press any key to run the fix if you want to proceed, or close this window to cancel.
pause

echo Running thread API fix script...
node fix-threads-api-to-use-a2a.js

echo.
echo Fix complete. Press any key to exit.
pause
