-- Remove the PRO/free distinction for gowns
-- All gowns are now accessible to all users (usage limits apply separately)

-- Set all gowns to non-PRO
UPDATE gowns SET is_pro = false;

-- Add a comment explaining the change
COMMENT ON COLUMN gowns.is_pro IS 'Deprecated: All gowns are now free. Usage limits are controlled separately via daily/monthly credits.';
