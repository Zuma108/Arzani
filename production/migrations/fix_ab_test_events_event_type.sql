-- Migration: Fix AB Test Events - Add default value for event_type and handle null values
-- Date: 2025-07-20
-- Issue: event_type column is receiving null values but has NOT NULL constraint

-- Step 1: Allow NULL values temporarily to update existing records
ALTER TABLE ab_test_events 
ALTER COLUMN event_type DROP NOT NULL;

-- Step 2: Update any existing records with NULL event_type to a default value
UPDATE ab_test_events 
SET event_type = 'page_view' 
WHERE event_type IS NULL;

-- Step 3: Add a default value for event_type column
ALTER TABLE ab_test_events 
ALTER COLUMN event_type SET DEFAULT 'page_view';

-- Step 4: Re-add the NOT NULL constraint
ALTER TABLE ab_test_events 
ALTER COLUMN event_type SET NOT NULL;

-- Step 5: Add a check constraint to ensure only valid event types
ALTER TABLE ab_test_events 
ADD CONSTRAINT check_event_type 
CHECK (event_type IN (
    'page_view', 
    'button_click', 
    'form_submit', 
    'scroll', 
    'time_spent', 
    'conversion', 
    'engagement',
    'user_action',
    'navigation'
));

-- Step 6: Create an index on event_type for better query performance
CREATE INDEX IF NOT EXISTS idx_ab_test_events_event_type 
ON ab_test_events(event_type);

-- Step 7: Create an index on variant for better analytics performance
CREATE INDEX IF NOT EXISTS idx_ab_test_events_variant 
ON ab_test_events(variant);

-- Step 8: Create a composite index for common analytics queries
CREATE INDEX IF NOT EXISTS idx_ab_test_events_analytics 
ON ab_test_events(variant, event_type, timestamp);

-- Step 9: Create a function to validate and normalize event types
CREATE OR REPLACE FUNCTION normalize_event_type(input_type TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Return default if input is null or empty
    IF input_type IS NULL OR trim(input_type) = '' THEN
        RETURN 'page_view';
    END IF;
    
    -- Normalize common variations
    CASE lower(trim(input_type))
        WHEN 'click', 'button_click', 'btn_click' THEN
            RETURN 'button_click';
        WHEN 'submit', 'form_submit', 'form_submission' THEN
            RETURN 'form_submit';
        WHEN 'view', 'page_view', 'pageview' THEN
            RETURN 'page_view';
        WHEN 'scroll', 'scrolling' THEN
            RETURN 'scroll';
        WHEN 'time', 'time_spent', 'duration' THEN
            RETURN 'time_spent';
        WHEN 'convert', 'conversion' THEN
            RETURN 'conversion';
        WHEN 'engage', 'engagement' THEN
            RETURN 'engagement';
        WHEN 'action', 'user_action' THEN
            RETURN 'user_action';
        WHEN 'navigate', 'navigation' THEN
            RETURN 'navigation';
        ELSE
            -- If it's a valid event type, return as is
            IF input_type IN ('page_view', 'button_click', 'form_submit', 'scroll', 'time_spent', 'conversion', 'engagement', 'user_action', 'navigation') THEN
                RETURN input_type;
            ELSE
                -- Default to page_view for unknown types
                RETURN 'page_view';
            END IF;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add a comment to document this fix
COMMENT ON COLUMN ab_test_events.event_type IS 
'Type of A/B test event. Default is page_view. Valid values: page_view, button_click, form_submit, scroll, time_spent, conversion, engagement, user_action, navigation';

COMMENT ON FUNCTION normalize_event_type(TEXT) IS 
'Normalizes and validates A/B test event types, returns page_view as default for invalid inputs';
