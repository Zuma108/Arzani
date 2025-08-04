# populate-and-verify-blog-content.ps1
# This script populates the database with sample programmatic blog content and verifies the relationships.

Write-Host "=== PROGRAMMATIC BLOG CONTENT SETUP ===" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node -v
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
}
catch {
    Write-Host "Error: Node.js is not installed or not in PATH. Please install Node.js and try again." -ForegroundColor Red
    exit 1
}

# Step 1: Confirm before proceeding
Write-Host "This script will populate your database with sample programmatic blog content." -ForegroundColor Yellow
Write-Host "It will create 6 pillar posts (one for each category) and 18 supporting posts." -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Do you want to continue? (y/n)"

if ($confirm -ne "y") {
    Write-Host "Operation cancelled." -ForegroundColor Red
    exit 0
}

# Step 2: Run the migrations first
Write-Host ""
Write-Host "Step 1: Running database migrations for blog tables..." -ForegroundColor Cyan
Write-Host ""
node run-blog-migrations.js

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to run blog migrations." -ForegroundColor Red
    exit 1
}

# Step 3: Populate the database with sample content
Write-Host ""
Write-Host "Step 2: Populating database with sample programmatic blog content..." -ForegroundColor Cyan
Write-Host ""
node populate-sample-blog-content.js

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to populate sample blog content." -ForegroundColor Red
    exit 1
}

# Step 4: Verify the content relationships
Write-Host ""
Write-Host "Step 3: Verifying programmatic blog content relationships..." -ForegroundColor Cyan
Write-Host ""
node verify-programmatic-blog-content.js

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to verify blog content relationships." -ForegroundColor Red
    exit 1
}

# Step 5: Test programmatic SEO features
Write-Host ""
Write-Host "Step 4: Testing programmatic SEO features..." -ForegroundColor Cyan
Write-Host ""
node test-programmatic-seo-features.js

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to test programmatic SEO features." -ForegroundColor Red
    exit 1
}

# Step 4: Completion
Write-Host ""
Write-Host "=== SETUP COMPLETED SUCCESSFULLY ===" -ForegroundColor Green
Write-Host ""
Write-Host "The database has been populated with sample programmatic blog content." -ForegroundColor Green
Write-Host "You can now test the programmatic SEO features using the following scripts:" -ForegroundColor Green
Write-Host "- test-programmatic-blog.js" -ForegroundColor Yellow
Write-Host "- test-programmatic-seo.js" -ForegroundColor Yellow
Write-Host ""
Write-Host "To view the blog posts on your site, start your application and navigate to the blog section." -ForegroundColor Green
