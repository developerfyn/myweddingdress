-- Add credit columns to subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS monthly_tryon_limit INT DEFAULT 5;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS monthly_3d_limit INT DEFAULT 0;

-- Set limits based on existing plan
-- Free plan: 5 try-ons, 0 3D generations
-- Quarterly plan: 150 try-ons, 10 3D generations (feels "unlimited")
UPDATE subscriptions
SET
  monthly_tryon_limit = CASE
    WHEN plan = 'quarterly' THEN 150
    ELSE 5
  END,
  monthly_3d_limit = CASE
    WHEN plan = 'quarterly' THEN 10
    ELSE 0
  END;

-- Create trigger to automatically set limits when plan changes
CREATE OR REPLACE FUNCTION set_subscription_limits()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.plan = 'free' THEN
    NEW.monthly_tryon_limit := 5;
    NEW.monthly_3d_limit := 0;
  ELSIF NEW.plan = 'quarterly' THEN
    NEW.monthly_tryon_limit := 150;
    NEW.monthly_3d_limit := 10;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_limits_on_plan_change ON subscriptions;
CREATE TRIGGER set_limits_on_plan_change
  BEFORE INSERT OR UPDATE OF plan ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_subscription_limits();

-- Function to check if user can perform action (combines subscription + usage check)
CREATE OR REPLACE FUNCTION can_user_perform_action(
  p_user_id UUID,
  p_action VARCHAR
)
RETURNS TABLE (
  allowed BOOLEAN,
  reason TEXT,
  credits_used INT,
  credits_limit INT,
  plan VARCHAR
) AS $$
DECLARE
  v_subscription RECORD;
  v_used INT;
  v_limit INT;
BEGIN
  -- Get user's subscription
  SELECT s.plan, s.monthly_tryon_limit, s.monthly_3d_limit, s.status
  INTO v_subscription
  FROM subscriptions s
  WHERE s.user_id = p_user_id;

  -- No subscription found
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false::BOOLEAN,
      'No subscription found'::TEXT,
      0::INT,
      0::INT,
      'none'::VARCHAR;
    RETURN;
  END IF;

  -- Subscription not active
  IF v_subscription.status != 'active' THEN
    RETURN QUERY SELECT
      false::BOOLEAN,
      'Subscription is not active'::TEXT,
      0::INT,
      0::INT,
      v_subscription.plan;
    RETURN;
  END IF;

  -- Get limit based on action
  IF p_action = 'tryon' THEN
    v_limit := v_subscription.monthly_tryon_limit;
  ELSIF p_action = '3d_generation' THEN
    v_limit := v_subscription.monthly_3d_limit;
  ELSE
    RETURN QUERY SELECT
      false::BOOLEAN,
      'Invalid action'::TEXT,
      0::INT,
      0::INT,
      v_subscription.plan;
    RETURN;
  END IF;

  -- Count usage this month
  SELECT COUNT(*)::INT INTO v_used
  FROM usage_logs
  WHERE user_id = p_user_id
    AND action = p_action
    AND status = 'success'
    AND created_at >= date_trunc('month', NOW());

  -- Check if within limit
  IF v_used >= v_limit THEN
    RETURN QUERY SELECT
      false::BOOLEAN,
      format('Monthly limit reached (%s/%s)', v_used, v_limit)::TEXT,
      v_used,
      v_limit,
      v_subscription.plan;
  ELSE
    RETURN QUERY SELECT
      true::BOOLEAN,
      'OK'::TEXT,
      v_used,
      v_limit,
      v_subscription.plan;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION can_user_perform_action TO authenticated;
