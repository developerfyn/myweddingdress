-- Fix: Change paid user reset from monthly to quarterly (3 months)

-- Update get_user_credits to calculate quarterly reset time
CREATE OR REPLACE FUNCTION get_user_credits(p_user_id UUID)
RETURNS TABLE (
  credits_balance INT,
  credits_purchased INT,
  plan VARCHAR,
  is_free_tier BOOLEAN,
  period_start TIMESTAMPTZ,
  timezone VARCHAR,
  can_generate_video BOOLEAN,
  reset_time TIMESTAMPTZ
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
    -- No subscription - return zeros
    RETURN QUERY SELECT
      0::INT,
      0::INT,
      'none'::VARCHAR,
      true::BOOLEAN,
      NOW()::TIMESTAMPTZ,
      'UTC'::VARCHAR,
      false::BOOLEAN,
      (date_trunc('day', NOW()) + INTERVAL '1 day')::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- Calculate reset time based on plan
  IF v_subscription.plan = 'free' THEN
    -- Free users: next midnight in their timezone
    v_reset_time := (date_trunc('day', NOW() AT TIME ZONE COALESCE(v_subscription.timezone, 'UTC')) + INTERVAL '1 day') AT TIME ZONE COALESCE(v_subscription.timezone, 'UTC');
  ELSE
    -- Paid users: next quarter (3 months) from period_start
    v_reset_time := v_subscription.period_start + INTERVAL '3 months';
  END IF;

  RETURN QUERY SELECT
    v_subscription.credits_balance::INT,
    v_subscription.credits_purchased::INT,
    v_subscription.plan::VARCHAR,
    (v_subscription.plan = 'free')::BOOLEAN,
    v_subscription.period_start::TIMESTAMPTZ,
    COALESCE(v_subscription.timezone, 'UTC')::VARCHAR,
    (v_subscription.plan != 'free')::BOOLEAN,
    v_reset_time::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rename and update quarterly reset function
DROP FUNCTION IF EXISTS reset_monthly_paid_credits();

CREATE OR REPLACE FUNCTION reset_quarterly_paid_credits()
RETURNS void AS $$
BEGIN
  -- Reset paid users whose quarter has elapsed (add 400 credits, unused rollover)
  UPDATE subscriptions
  SET
    credits_balance = credits_balance + 400,
    credits_purchased = 400,
    period_start = period_start + INTERVAL '3 months'
  WHERE
    plan = 'quarterly'
    AND status = 'active'
    AND period_start + INTERVAL '3 months' <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
