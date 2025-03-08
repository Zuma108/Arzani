-- First, backup existing data if the images column exists
CREATE TABLE IF NOT EXISTS businesses_backup AS 
SELECT * FROM businesses;

-- Alter the images column to be a text array if it's not already
ALTER TABLE businesses 
ALTER COLUMN images TYPE text[] USING 
  CASE 
    WHEN images IS NULL THEN '{}'::text[]
    WHEN images = '' THEN '{}'::text[]
    ELSE ARRAY[images]
  END;

-- Add constraint for maximum number of images
ALTER TABLE businesses
ADD CONSTRAINT check_images_length 
CHECK (array_length(images, 1) <= 5);
