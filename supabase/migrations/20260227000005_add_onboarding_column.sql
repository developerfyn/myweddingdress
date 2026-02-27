-- Add has_completed_onboarding column to subscriptions table
-- This was referenced in get_user_credits but never created

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false;

-- Create complete_onboarding function if it doesn't exist
CREATE OR REPLACE FUNCTION complete_onboarding(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE subscriptions
  SET has_completed_onboarding = true
  WHERE user_id = p_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION complete_onboarding TO authenticated;
