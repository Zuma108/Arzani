ALTER TABLE business_history 
ADD COLUMN user_agent VARCHAR(255),
ADD COLUMN action_type VARCHAR(50);

-- Update the UNIQUE constraint to include action_type
ALTER TABLE business_history 
DROP CONSTRAINT IF EXISTS unique_recent_view;

CREATE UNIQUE INDEX idx_unique_view 
ON business_history (user_id, business_id, viewed_at);
