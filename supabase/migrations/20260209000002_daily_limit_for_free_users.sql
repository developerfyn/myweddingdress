-- Update can_user_perform_action to check DAILY usage for free users
-- Free users: 1 try-on per DAY
-- Quarterly users: Still monthly limits (150 try-ons, 10 videos, etc.)

-- Update subscription limits for free plan (1 daily try-on)
UPDATE subscriptions
SET monthly_tryon_limit = 1
WHERE plan = 'free';

-- Update the trigger to set correct limits
CREATE OR REPLACE FUNCTION set_subscription_limits()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.plan = 'free' THEN
    NEW.monthly_tryon_limit := 1;  -- 1 per day (enforced in RPC as daily)
    NEW.monthly_3d_limit := 0;
  ELSIF NEW.plan = 'quarterly' THEN
    NEW.monthly_tryon_limit := 150;
    NEW.monthly_3d_limit := 10;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated function: Free users checked DAILY, quarterly users checked MONTHLY
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
  v_period_start TIMESTAMPTZ;
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
  ELSIF p_action = 'video_generation' THEN
    -- Video generation uses same limit as 3d for now
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

  -- Determine the period start based on plan
  -- Free users: daily limit (start of today)
  -- Quarterly users: monthly limit (start of month)
  IF v_subscription.plan = 'free' THEN
    v_period_start := date_trunc('day', NOW());
  ELSE
    v_period_start := date_trunc('month', NOW());
  END IF;

  -- Count usage in the period
  SELECT COUNT(*)::INT INTO v_used
  FROM usage_logs
  WHERE user_id = p_user_id
    AND action = p_action
    AND status = 'success'
    AND created_at >= v_period_start;

  -- Check if within limit
  IF v_used >= v_limit THEN
    IF v_subscription.plan = 'free' THEN
      RETURN QUERY SELECT
        false::BOOLEAN,
        format('Daily limit reached (%s/%s). Try again tomorrow or upgrade to PRO!', v_used, v_limit)::TEXT,
        v_used,
        v_limit,
        v_subscription.plan;
    ELSE
      RETURN QUERY SELECT
        false::BOOLEAN,
        format('Monthly limit reached (%s/%s)', v_used, v_limit)::TEXT,
        v_used,
        v_limit,
        v_subscription.plan;
    END IF;
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
