@echo off
REM Deploy Enhanced Blog Interlinking System Script

echo =====================================
echo  ENHANCED BLOG INTERLINKING DEPLOYMENT
echo =====================================
echo.

REM Verify all required files exist
echo Verifying required files...

if not exist "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\enhance-blog-interlinking.js" (
    echo ERROR: enhance-blog-interlinking.js not found!
    exit /b 1
)

if not exist "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\blog-interlinking-migration.sql" (
    echo ERROR: blog-interlinking-migration.sql not found!
    exit /b 1
)

if not exist "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\views\blog\partials\enhanced-interlinking.ejs" (
    echo ERROR: enhanced-interlinking.ejs not found!
    exit /b 1
)

if not exist "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\enhanced-blog-controller.js" (
    echo ERROR: enhanced-blog-controller.js not found!
    exit /b 1
)

if not exist "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\blog-content\enhanced-blog-post-template.js" (
    echo ERROR: enhanced-blog-post-template.js not found!
    exit /b 1
)

echo All required files verified!
echo.

REM Backup existing files
echo Creating backups of existing files...

if exist "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\controllers\blogController_new.js" (
    copy "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\controllers\blogController_new.js" "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\controllers\blogController_new.js.bak"
    echo Backed up blogController_new.js
) else (
    echo WARNING: blogController_new.js not found, no backup created
)

if exist "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\views\blog\blog-post_new.ejs" (
    copy "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\views\blog\blog-post_new.ejs" "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\views\blog\blog-post_new.ejs.bak"
    echo Backed up blog-post_new.ejs
) else (
    echo WARNING: blog-post_new.ejs not found, no backup created
)

echo Backups created!
echo.

REM Update blogController_new.js with the enhanced version
echo Updating blogController_new.js...

REM First read the content of enhanced-blog-controller.js
type "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\enhanced-blog-controller.js" > "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\controllers\blogController_new.js.new"

REM Then replace the existing file
move /y "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\controllers\blogController_new.js.new" "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\controllers\blogController_new.js"
echo blogController_new.js updated!
echo.

REM Update blog-post_new.ejs to include the enhanced interlinking partial
echo Updating blog-post_new.ejs...

REM Append the include directive to the blog-post_new.ejs file
echo. >> "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\views\blog\blog-post_new.ejs"
echo ^<%- include('./partials/enhanced-interlinking') %^> >> "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\views\blog\blog-post_new.ejs"
echo blog-post_new.ejs updated!
echo.

REM Run the database migration
echo Running database migration...
echo Note: Please ensure your PostgreSQL credentials are correctly configured.

REM Prompt for database credentials
set /p DB_USER=Enter your PostgreSQL username: 
set /p DB_PASSWORD=Enter your PostgreSQL password: 
set /p DB_NAME=Enter your database name: 

REM Run the SQL migration file
psql -U %DB_USER% -d %DB_NAME% -f "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\blog-interlinking-migration.sql"

echo Database migration completed!
echo.

REM Run the analysis script
echo Running blog interlinking analysis...
node "c:\Users\Micha\OneDrive\Documents\my-marketplace-project\enhance-blog-interlinking.js"
echo Analysis completed!
echo.

echo =====================================
echo  DEPLOYMENT COMPLETE!
echo =====================================
echo.
echo Next steps:
echo 1. Review the analysis report for any orphaned content
echo 2. Use the enhanced-blog-post-template.js as a reference for new blog posts
echo 3. Check the admin metrics on blog posts to monitor link equity
echo.
echo For detailed implementation information, refer to:
echo c:\Users\Micha\OneDrive\Documents\my-marketplace-project\ENHANCED_BLOG_INTERLINKING_IMPLEMENTATION_GUIDE.md
echo.
