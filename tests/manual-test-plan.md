# Manual Test Plan for Profile Functionality

## Prerequisites
- Server is running locally on port 5000
- Test user account is available
- Web browser with developer tools enabled

## Test Cases

### 1. Profile Page Loading

**Steps:**
1. Log in with valid credentials
2. Navigate to http://localhost:5000/profile
3. Verify the page loads without errors

**Expected Results:**
- Profile page displays with correct username
- Profile picture is visible (default or user's)
- Page layout is correct with no visual issues

**Check Developer Console:**
- No JavaScript errors
- No 404 errors for resources

### 2. Profile API

**Steps:**
1. While logged in, open browser developer tools
2. Go to the Network tab
3. Navigate to http://localhost:5000/profile
4. Look for an API call to '/api/profile'

**Expected Results:**
- API call should return 200 status code
- Response should contain user data (id, username, email, profile_picture)
- No error messages in console

### 3. Profile Picture Upload

**Steps:**
1. Navigate to the profile page
2. Click on the "Choose File" button in the update profile form
3. Select a valid image file (JPG/PNG under 5MB)
4. Click the "Upload" button
5. Watch for the page to reload or update

**Expected Results:**
- File selector opens when "Choose File" is clicked
- After upload, the page should show the new profile picture
- No error messages displayed

**Check Developer Console:**
- POST request to '/api/profile/upload-picture'
- Request includes the file data
- Response has 200 status code with success message

### 4. Error Handling

**Steps:**
1. Try uploading an invalid file type (e.g., .txt or .pdf)
2. Try uploading a file larger than 5MB
3. Attempt to access the profile page when not logged in

**Expected Results:**
- Invalid file type: Error message shown
- Large file: Error about file size
- Not logged in: Redirect to login page

### 5. Authentication & Token Handling

**Steps:**
1. Log in and navigate to profile page
2. In developer tools, delete the 'token' from localStorage
3. Refresh the page

**Expected Results:**
- After token is deleted, refreshing should redirect to login page

### 6. Sign Out Functionality

**Steps:**
1. Navigate to profile page
2. Click the "Sign Out" button
3. Verify you're redirected to the login page

**Expected Results:**
- Clicking "Sign Out" redirects to login page
- Token is removed from localStorage
- Attempting to access protected resources after sign out fails

## Bug Reporting

For any bugs found during testing, please report:

1. Test case number and name
2. Steps to reproduce
3. Expected vs. actual behavior
4. Browser/environment details
5. Screenshots (if applicable)
6. Console errors (if any)
