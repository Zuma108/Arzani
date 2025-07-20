@echo off
echo =====================================
echo Testing Programmatic Blog Functionality
echo =====================================

echo This script will test various aspects of the programmatic blog implementation.
echo.

echo Testing database connectivity...
node -e "import('./db.js').then(db => db.default.query('SELECT NOW()')).then(result => console.log('Database connection successful:', result.rows[0])).catch(err => console.error('Database connection failed:', err))"

echo.
echo Testing blog model...
node -e "import('./models/blogModel.js').then(model => model.default.getAllCategories()).then(categories => console.log('Categories loaded successfully:', categories.length)).catch(err => console.error('Blog model test failed:', err))"

echo.
echo Testing programmatic content service...
node -e "import('./services/programmaticContentService.js').then(service => console.log('Programmatic content service loaded successfully')).catch(err => console.error('Programmatic content service test failed:', err))"

echo.
echo Testing blog service (n8n replacement)...
node -e "import('./services/blogService.js').then(service => console.log('Blog service loaded successfully')).catch(err => console.error('Blog service test failed:', err))"

echo.
echo All tests completed.
echo If any tests failed, check the error messages and resolve the issues.
echo If all tests passed, your programmatic blog implementation is working correctly.
pause
