-- Fix: Ensure 4 credits everywhere for free users
-- The get_user_credits fallback was creating subscriptions with 2 credits

-- Drop and recreate function to change return type
DROP FUNCTION IF EXISTS get_user_credits(UUID);

-- Update get_user_credits to use 4 credits in fallback
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
    -- Create subscription with 4 credits (not 2!)
    INSERT INTO subscriptions (user_id, plan, status, credits_balance, credits_purchased, period_start, timezone)
    VALUES (p_user_id, 'free', 'active', 4, 4, date_trunc('day', NOW()), 'UTC')
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update handle_subscription_upgrade to use 4 credits
CREATE OR REPLACE FUNCTION handle_subscription_upgrade()
RETURNS TRIGGER AS $$
BEGIN
  -- If upgrading from free to paid
  IF OLD.plan = 'free' AND NEW.plan = 'quarterly' THEN
    NEW.credits_balance := 400;
    NEW.credits_purchased := 400;
    NEW.period_start := NOW();
  END IF;

  -- If downgrading from paid to free
  IF OLD.plan = 'quarterly' AND NEW.plan = 'free' THEN
    NEW.credits_balance := 4;  -- Changed from 2 to 4
    NEW.credits_purchased := 4;
    NEW.period_start := date_trunc('day', NOW() AT TIME ZONE COALESCE(NEW.timezone, 'UTC')) AT TIME ZONE COALESCE(NEW.timezone, 'UTC');
  END IF;

  -- If subscription becomes inactive
  IF NEW.status != 'active' AND OLD.status = 'active' THEN
    NEW.credits_balance := 0;
  END IF;

  -- If subscription becomes active again
  IF NEW.status = 'active' AND OLD.status != 'active' THEN
    IF NEW.plan = 'quarterly' THEN
      NEW.credits_balance := 400;
      NEW.credits_purchased := 400;
      NEW.period_start := NOW();
    ELSE
      NEW.credits_balance := 4;  -- Changed from 2 to 4
      NEW.credits_purchased := 4;
      NEW.period_start := date_trunc('day', NOW());
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update existing free users who have less than 4 credits
UPDATE subscriptions
SET credits_balance = 4, credits_purchased = 4
WHERE plan = 'free' AND status = 'active' AND credits_balance < 4;
