@echo off
:: deploy-programmatic-seo.bat
:: This batch file manages the deployment of programmatic SEO content
:: It provides options for populating, verifying, and testing the programmatic blog system

echo ==== PROGRAMMATIC SEO DEPLOYMENT TOOL ====
echo.

:menu
echo Please select an option:
echo 1. Populate database with sample programmatic blog content
echo 2. Verify programmatic blog content structure
echo 3. Test programmatic SEO features
echo 4. Run all (populate, verify, test)
echo 5. Exit
echo.

set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" goto populate
if "%choice%"=="2" goto verify
if "%choice%"=="3" goto test
if "%choice%"=="4" goto all
if "%choice%"=="5" goto end

echo Invalid choice. Please try again.
echo.
goto menu

:populate
echo.
echo ==== POPULATING DATABASE WITH SAMPLE CONTENT ====
echo.
node populate-sample-blog-content.js
echo.
echo Press any key to return to the menu...
pause > nul
goto menu

:verify
echo.
echo ==== VERIFYING BLOG CONTENT STRUCTURE ====
echo.
node verify-programmatic-blog-content.js
echo.
echo Press any key to return to the menu...
pause > nul
goto menu

:test
echo.
echo ==== TESTING PROGRAMMATIC SEO FEATURES ====
echo.
node test-programmatic-seo-features.js
echo.
echo Press any key to return to the menu...
pause > nul
goto menu

:all
echo.
echo ==== RUNNING COMPLETE WORKFLOW ====
echo.
echo Step 1: Populating database with sample content...
node populate-sample-blog-content.js
echo.
echo Step 2: Verifying blog content structure...
node verify-programmatic-blog-content.js
echo.
echo Step 3: Testing programmatic SEO features...
node test-programmatic-seo-features.js
echo.
echo Complete workflow finished.
echo Press any key to return to the menu...
pause > nul
goto menu

:end
echo.
echo Exiting programmatic SEO deployment tool.
exit /b 0
