@echo off
echo === Updating Pinecone for Revenue Agent ===
echo.
echo Choose an option:
echo 1. Run full update (remove broker references + add B2B providers)
echo 2. Only remove broker agent references
echo 3. Only add B2B data provider information
echo.
set /p option="Enter option (1-3): "

if "%option%"=="1" (
    echo.
    echo Running full update process...
    node update-pinecone-for-revenue-agent.js
) else if "%option%"=="2" (
    echo.
    echo Removing broker agent references...
    node delete-broker-rag-data.js
) else if "%option%"=="3" (
    echo.
    echo Adding B2B data provider information...
    node add-b2b-providers-to-pinecone.js
) else (
    echo.
    echo Invalid option. Please run the script again.
    goto end
)

echo.
echo Process completed. Press any key to exit.
:end
pause > nul
