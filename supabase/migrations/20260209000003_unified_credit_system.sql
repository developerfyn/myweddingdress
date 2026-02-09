-- Unified Credit System Migration
-- Replaces separate try-on/video limits with unified credits
-- Free: 2 credits/day, Paid: 400 credits/quarter

-- ============================================
-- 1. ADD NEW COLUMNS TO SUBSCRIPTIONS
-- ============================================

-- Credits currently available to use
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS credits_balance INT DEFAULT 0;

-- Total credits allocated this period (for display: "X of Y remaining")
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS credits_purchased INT DEFAULT 0;

-- When the current billing period started
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS period_start TIMESTAMPTZ DEFAULT NOW();

-- User's timezone for daily reset (free users)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';

-- ============================================
-- 2. MIGRATE EXISTING SUBSCRIPTIONS
-- ============================================

-- Set up existing paid users with 400 credits
UPDATE subscriptions
SET
  credits_balance = 400,
  credits_purchased = 400,
  period_start = COALESCE(updated_at, created_at, NOW())
WHERE plan = 'quarterly' AND status = 'active';

-- Free users start with 2 credits (daily allocation)
UPDATE subscriptions
SET
  credits_balance = 2,
  credits_purchased = 2,
  period_start = date_trunc('day', NOW())
WHERE plan = 'free';

-- ============================================
-- 3. CREDIT COST CONSTANTS (for reference)
-- ============================================
-- Try-on: 2 credits
-- Video: 8 credits
-- Free daily: 2 credits
-- Paid quarterly: 400 credits

-- ============================================
-- 4. GET USER CREDITS FUNCTION
-- ============================================

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
    (v_subscription.plan != 'free')::BOOLEAN,  -- Only paid users can generate video
    v_reset_time::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. DEDUCT CREDITS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id UUID,
  p_action VARCHAR,  -- 'tryon' or 'video_generation'
  p_request_id VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_balance INT,
  error_message TEXT
) AS $$
DECLARE
  v_subscription RECORD;
  v_cost INT;
  v_new_balance INT;
BEGIN
  -- Determine credit cost
  IF p_action = 'tryon' THEN
    v_cost := 2;
  ELSIF p_action = 'video_generation' THEN
    v_cost := 8;
  ELSE
    RETURN QUERY SELECT false::BOOLEAN, 0::INT, 'Invalid action'::TEXT;
    RETURN;
  END IF;

  -- Get subscription with lock
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false::BOOLEAN, 0::INT, 'No active subscription'::TEXT;
    RETURN;
  END IF;

  -- Check if free user trying to generate video
  IF v_subscription.plan = 'free' AND p_action = 'video_generation' THEN
    RETURN QUERY SELECT false::BOOLEAN, v_subscription.credits_balance::INT, 'Video generation requires a paid subscription'::TEXT;
    RETURN;
  END IF;

  -- Check sufficient balance
  IF v_subscription.credits_balance < v_cost THEN
    IF v_subscription.plan = 'free' THEN
      RETURN QUERY SELECT false::BOOLEAN, v_subscription.credits_balance::INT, 'Daily limit reached. Try again tomorrow or upgrade to PRO!'::TEXT;
    ELSE
      RETURN QUERY SELECT false::BOOLEAN, v_subscription.credits_balance::INT, 'Insufficient credits. Please wait for your monthly reset or purchase more.'::TEXT;
    END IF;
    RETURN;
  END IF;

  -- Deduct credits
  v_new_balance := v_subscription.credits_balance - v_cost;

  UPDATE subscriptions
  SET credits_balance = v_new_balance
  WHERE user_id = p_user_id;

  -- Log the usage
  INSERT INTO usage_logs (user_id, action, credits_used, request_id, status)
  VALUES (p_user_id, p_action, v_cost, p_request_id, 'pending');

  RETURN QUERY SELECT true::BOOLEAN, v_new_balance::INT, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. REFUND CREDITS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION refund_credits(
  p_user_id UUID,
  p_action VARCHAR,
  p_request_id VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_balance INT
) AS $$
DECLARE
  v_cost INT;
  v_new_balance INT;
BEGIN
  -- Determine credit cost to refund
  IF p_action = 'tryon' THEN
    v_cost := 2;
  ELSIF p_action = 'video_generation' THEN
    v_cost := 8;
  ELSE
    RETURN QUERY SELECT false::BOOLEAN, 0::INT;
    RETURN;
  END IF;

  -- Refund credits
  UPDATE subscriptions
  SET credits_balance = credits_balance + v_cost
  WHERE user_id = p_user_id AND status = 'active'
  RETURNING credits_balance INTO v_new_balance;

  -- Update usage log if request_id provided
  IF p_request_id IS NOT NULL THEN
    UPDATE usage_logs
    SET status = 'refunded'
    WHERE request_id = p_request_id AND user_id = p_user_id;
  END IF;

  RETURN QUERY SELECT true::BOOLEAN, COALESCE(v_new_balance, 0)::INT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. DAILY RESET FOR FREE USERS (cron job function)
-- ============================================

CREATE OR REPLACE FUNCTION reset_daily_free_credits()
RETURNS void AS $$
BEGIN
  -- Reset free users who haven't been reset today (in their timezone)
  UPDATE subscriptions
  SET
    credits_balance = 2,
    credits_purchased = 2,
    period_start = date_trunc('day', NOW() AT TIME ZONE COALESCE(timezone, 'UTC')) AT TIME ZONE COALESCE(timezone, 'UTC')
  WHERE
    plan = 'free'
    AND status = 'active'
    AND period_start < date_trunc('day', NOW() AT TIME ZONE COALESCE(timezone, 'UTC')) AT TIME ZONE COALESCE(timezone, 'UTC');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. QUARTERLY RESET FOR PAID USERS (cron job function)
-- ============================================

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

-- ============================================
-- 9. UPDATE USER TIMEZONE FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION update_user_timezone(
  p_user_id UUID,
  p_timezone VARCHAR
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE subscriptions
  SET timezone = p_timezone
  WHERE user_id = p_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. HANDLE SUBSCRIPTION CHANGES
-- ============================================

-- When user upgrades from free to paid
CREATE OR REPLACE FUNCTION handle_subscription_upgrade()
RETURNS TRIGGER AS $$
BEGIN
  -- If upgrading from free to paid
  IF OLD.plan = 'free' AND NEW.plan = 'quarterly' THEN
    NEW.credits_balance := 400;
    NEW.credits_purchased := 400;
    NEW.period_start := NOW();
  END IF;

  -- If downgrading from paid to free (subscription expired)
  IF OLD.plan = 'quarterly' AND NEW.plan = 'free' THEN
    NEW.credits_balance := 2;
    NEW.credits_purchased := 2;
    NEW.period_start := date_trunc('day', NOW() AT TIME ZONE COALESCE(NEW.timezone, 'UTC')) AT TIME ZONE COALESCE(NEW.timezone, 'UTC');
  END IF;

  -- If subscription becomes inactive, zero out credits
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
      NEW.credits_balance := 2;
      NEW.credits_purchased := 2;
      NEW.period_start := date_trunc('day', NOW());
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_subscription_changes ON subscriptions;
CREATE TRIGGER handle_subscription_changes
  BEFORE UPDATE OF plan, status ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION handle_subscription_upgrade();

-- ============================================
-- 11. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION get_user_credits TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_credits TO authenticated;
GRANT EXECUTE ON FUNCTION refund_credits TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_timezone TO authenticated;

-- ============================================
-- 12. DROP OLD COLUMNS (optional, can keep for backward compat)
-- ============================================
-- Keeping old columns for now in case of rollback need
-- ALTER TABLE subscriptions DROP COLUMN IF EXISTS monthly_tryon_limit;
-- ALTER TABLE subscriptions DROP COLUMN IF EXISTS monthly_3d_limit;

COMMENT ON COLUMN subscriptions.credits_balance IS 'Current available credits';
COMMENT ON COLUMN subscriptions.credits_purchased IS 'Total credits allocated this period';
COMMENT ON COLUMN subscriptions.period_start IS 'Start of current billing/reset period';
COMMENT ON COLUMN subscriptions.timezone IS 'User timezone for daily reset (free users)';
