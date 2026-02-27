-- Fix get_user_credits to explicitly set search_path and bypass RLS
-- Also add GRANT to ensure proper permissions

DROP FUNCTION IF EXISTS get_user_credits(UUID);

CREATE OR REPLACE FUNCTION get_user_credits(p_user_id UUID)
RETURNS TABLE (
  credits_balance INT,
  credits_purchased INT,
  plan VARCHAR,
  is_free_tier BOOLEAN,
  period_start TIMESTAMPTZ,
  timezone VARCHAR,
  can_generate_video BOOLEAN,
  reset_time TIMESTAMPTZ,
  has_completed_onboarding BOOLEAN
) AS $$
DECLARE
  v_subscription RECORD;
  v_reset_time TIMESTAMPTZ;
BEGIN
  -- Get subscription
  SELECT s.*
  INTO v_subscription
  FROM subscriptions s
  WHERE s.user_id = p_user_id AND s.status = 'active';

  IF NOT FOUND THEN
    -- Create subscription with 4 credits
    INSERT INTO subscriptions (user_id, plan, status, credits_balance, credits_purchased, period_start, timezone, has_completed_onboarding)
    VALUES (p_user_id, 'free', 'active', 4, 4, date_trunc('day', NOW()), 'UTC', false)
    ON CONFLICT (user_id) DO UPDATE SET
      credits_balance = GREATEST(subscriptions.credits_balance, 4),
      credits_purchased = GREATEST(subscriptions.credits_purchased, 4)
    RETURNING * INTO v_subscription;
  END IF;

  -- Calculate reset time
  IF v_subscription.plan = 'free' THEN
    -- Free users: next midnight in their timezone
    v_reset_time := (date_trunc('day', NOW() AT TIME ZONE COALESCE(v_subscription.timezone, 'UTC')) + INTERVAL '1 day') AT TIME ZONE COALESCE(v_subscription.timezone, 'UTC');
  ELSE
    -- Paid users: 3 months from period_start
    v_reset_time := v_subscription.period_start + INTERVAL '3 months';
  END IF;

  RETURN QUERY SELECT
    v_subscription.credits_balance::INT,
    v_subscription.credits_purchased::INT,
    v_subscription.plan::VARCHAR,
    (v_subscription.plan = 'free')::BOOLEAN,
    v_subscription.period_start::TIMESTAMPTZ,
    COALESCE(v_subscription.timezone, 'UTC')::VARCHAR,
    (v_subscription.plan = 'quarterly')::BOOLEAN,
    v_reset_time::TIMESTAMPTZ,
    COALESCE(v_subscription.has_completed_onboarding, false)::BOOLEAN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Set owner to postgres for RLS bypass
ALTER FUNCTION get_user_credits(UUID) OWNER TO postgres;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_credits(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_credits(UUID) TO service_role;
