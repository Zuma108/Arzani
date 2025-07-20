@echo off
echo =====================================
echo Deploying Programmatic Blog Strategy
echo =====================================

echo Verifying required files for deployment...
if not exist "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\controllers\blogController_new.js" (
    echo ERROR: blogController_new.js not found!
    echo Deployment cannot continue.
    pause
    exit /b 1
)

if not exist "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\routes\blogRoutes_new.js" (
    echo ERROR: blogRoutes_new.js not found!
    echo Deployment cannot continue.
    pause
    exit /b 1
)

if not exist "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\views\blog\blog-post_new.ejs" (
    echo ERROR: blog-post_new.ejs not found!
    echo Deployment cannot continue.
    pause
    exit /b 1
)

echo All required files found. Proceeding with deployment.
echo.

echo Checking database structure...
echo.
echo IMPORTANT: Before proceeding, please ensure you have:
echo 1. Backed up your database
echo 2. Verified the SQL migrations are compatible with your environment
echo.
echo Required migrations:
echo - blog_content_relationships_migration.sql (adds SEO fields and content relationships)
echo - blog_url_structure_migration.sql (adds URL path generation for new URL structure)
echo - blog_analytics_enhancement.sql (adds analytics tracking fields)
echo.

set /p runMigrations="Do you want to run the database migrations first? (y/n): "
if /i "%runMigrations%"=="y" (
    echo Please run these SQL files in pgAdmin or your database tool:
    echo 1. c:\Users\Micha\OneDrive\Documents\my-marketplace-project\migrations\blog_content_relationships_migration.sql
    echo 2. c:\Users\Micha\OneDrive\Documents\my-marketplace-project\migrations\blog_url_structure_migration.sql
    echo 3. c:\Users\Micha\OneDrive\Documents\my-marketplace-project\migrations\blog_analytics_enhancement.sql
    echo.
    echo After running the migrations, press any key to continue with the code deployment.
    pause
)

echo Backing up current files...
copy "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\controllers\blogController.js" "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\controllers\blogController.js.bak"
copy "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\routes\blogRoutes.js" "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\routes\blogRoutes.js.bak"
copy "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\views\blog\blog-post.ejs" "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\views\blog\blog-post.ejs.bak"
copy "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\utils\n8nWorkflowService.js" "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\utils\n8nWorkflowService.js.bak"
copy "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\config\n8nConfig.js" "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\config\n8nConfig.js.bak"

echo Replacing blog controller and routes with programmatic versions...
copy "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\controllers\blogController_new.js" "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\controllers\blogController.js"
copy "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\routes\blogRoutes_new.js" "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\routes\blogRoutes.js"
copy "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\views\blog\blog-post_new.ejs" "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\views\blog\blog-post.ejs"

echo Verifying services for programmatic blog architecture...
if exist "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\services\programmaticContentService.js" (
    echo [√] Found programmaticContentService.js
) else (
    echo [X] programmaticContentService.js is missing. Deployment may fail.
    pause
)

if exist "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\services\blogService.js" (
    echo [√] Found blogService.js
) else (
    echo [X] blogService.js is missing. Deployment may fail.
    pause
)

echo Updating routes to remove n8n dependencies...
powershell -Command "(Get-Content 'c:\Users\Micha\OneDrive\Documents\my-marketplace-project\routes\blogApprovalRoutes.js') -replace 'import n8nWorkflowService from ''../utils/n8nWorkflowService.js'';', 'import blogService from ''../services/blogService.js'';' -replace 'await n8nWorkflowService', 'await blogService' | Set-Content 'c:\Users\Micha\OneDrive\Documents\my-marketplace-project\routes\blogApprovalRoutes.js'"
powershell -Command "(Get-Content 'c:\Users\Micha\OneDrive\Documents\my-marketplace-project\routes\blogApiRoutes.js') -replace 'import n8nWorkflowService from ''../utils/n8nWorkflowService.js'';', 'import blogService from ''../services/blogService.js'';' -replace 'await n8nWorkflowService', 'await blogService' | Set-Content 'c:\Users\Micha\OneDrive\Documents\my-marketplace-project\routes\blogApiRoutes.js'"

echo Deployment complete!
echo Blog system has been updated to use the programmatic content strategy.
echo N8N workflow dependencies have been removed and replaced with native blogService.
echo New URL structure: /blog/[category]/[article-slug]
echo.

echo Running verification checks...
echo.
echo Verifying files:
if exist "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\controllers\blogController.js" (
    echo [√] blogController.js - OK
) else (
    echo [X] blogController.js - MISSING
)

if exist "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\routes\blogRoutes.js" (
    echo [√] blogRoutes.js - OK
) else (
    echo [X] blogRoutes.js - MISSING
)

if exist "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\services\blogService.js" (
    echo [√] blogService.js - OK
) else (
    echo [X] blogService.js - MISSING
)

if exist "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\views\blog\blog-post.ejs" (
    echo [√] blog-post.ejs - OK
) else (
    echo [X] blog-post.ejs - MISSING
)

echo.
echo Verification complete.
echo.
echo Please restart the server to apply changes.
pause
