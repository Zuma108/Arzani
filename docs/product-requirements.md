
# Allow up to 5 Business Images

## Overview
We want our PostgreSQL `businesses` table to accept multiple images for each listing. Each file will be uploaded through our form and stored in an array column (`images`).

## Steps:

1. **Database Migration**  
   - Run SQL to ensure a `text[]` column exists for `images`:

     ```sql
     ALTER TABLE businesses
     ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';
     ```

   - Verify this column is used in `INSERT` or `UPDATE` statements to store up to 5 filenames.

2. **Back-end Configuration**  
   - In `businessRoutes.js`, confirm that `upload.array('images', 5)` is set.  
   - Ensure we insert `req.files.map(file => file.filename)` into the `images` array column.

3. **Front-end Form**  
   - Check the file upload limit is max 5 in `post-business.js` (Dropzone config).
   - Validate user input to avoid attempting more than 5 uploads.

4. **Testing & Verification**  
   - Verify listings with multiple images appear correctly.  
   - Ensure no errors if fewer than 5 images are provided.