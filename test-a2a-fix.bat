@echo off
echo Running the A2A message logging fix test...
echo.

rem Run the ChatGPT helper with the test command
node chatGPT-helper-cli.js test-a2a

echo.
echo Test completed. Check the results above.
pause
