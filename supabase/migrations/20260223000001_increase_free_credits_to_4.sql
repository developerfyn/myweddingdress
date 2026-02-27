-- Increase free user daily credits from 2 to 4 (2 try-ons per day)
-- Updated: 2026-02-23

-- ============================================
-- 1. UPDATE EXISTING FREE USERS
-- ============================================

-- Give existing free users 4 credits if they currently have 2 or less
UPDATE subscriptions
SET
  credits_balance = 4,
  credits_purchased = 4
WHERE
  plan = 'free'
  AND status = 'active'
  AND credits_balance <= 2;

-- ============================================
-- 2. UPDATE DAILY RESET FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION reset_daily_free_credits()
RETURNS void AS $$
BEGIN
  -- Reset free users who haven't been reset today (in their timezone)
  UPDATE subscriptions
  SET
    credits_balance = 4,
    credits_purchased = 4,
    period_start = date_trunc('day', NOW() AT TIME ZONE COALESCE(timezone, 'UTC')) AT TIME ZONE COALESCE(timezone, 'UTC')
  WHERE
    plan = 'free'
    AND status = 'active'
    AND period_start < date_trunc('day', NOW() AT TIME ZONE COALESCE(timezone, 'UTC')) AT TIME ZONE COALESCE(timezone, 'UTC');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. UPDATE SUBSCRIPTION UPGRADE/DOWNGRADE TRIGGER
-- ============================================

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
    NEW.credits_balance := 4;
    NEW.credits_purchased := 4;
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
      NEW.credits_balance := 4;
      NEW.credits_purchased := 4;
      NEW.period_start := date_trunc('day', NOW());
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION reset_daily_free_credits IS 'Daily cron job to reset free users to 4 credits (2 try-ons)';
