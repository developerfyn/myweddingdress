-- =============================================
-- STRIPE + CREDITS SCHEMA FOR MYWEDDINGDRESS
-- Run this in Supabase SQL Editor
-- =============================================

-- Add stripe_customer_id to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Drop existing subscriptions table if it has wrong schema
DROP TABLE IF EXISTS subscriptions CASCADE;

-- Create subscriptions table with correct schema
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  credits_balance INTEGER NOT NULL DEFAULT 2,
  credits_purchased INTEGER NOT NULL DEFAULT 2,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Service role full access" ON subscriptions;

-- Users can read their own subscriptions
CREATE POLICY "Users can read own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own timezone
CREATE POLICY "Users can update own timezone" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- FUNCTION: Auto-create subscription on signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status, credits_balance, credits_purchased)
  VALUES (NEW.id, 'free', 'active', 2, 2)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create subscription when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- =============================================
-- FUNCTION: Get user credits
-- =============================================
CREATE OR REPLACE FUNCTION get_user_credits(p_user_id UUID)
RETURNS TABLE (
  credits_balance INTEGER,
  credits_purchased INTEGER,
  plan TEXT,
  is_free_tier BOOLEAN,
  period_start TEXT,
  timezone TEXT,
  can_generate_video BOOLEAN,
  reset_time TEXT
) AS $$
DECLARE
  v_sub RECORD;
  v_reset_time TIMESTAMPTZ;
  v_tz TEXT;
BEGIN
  -- Get subscription
  SELECT * INTO v_sub FROM subscriptions WHERE user_id = p_user_id;

  -- If no subscription, create one
  IF v_sub IS NULL THEN
    INSERT INTO subscriptions (user_id, plan, status, credits_balance, credits_purchased)
    VALUES (p_user_id, 'free', 'active', 2, 2)
    RETURNING * INTO v_sub;
  END IF;

  v_tz := COALESCE(v_sub.timezone, 'America/New_York');

  -- Calculate reset time based on plan
  IF v_sub.plan = 'free' THEN
    -- Free users: reset at midnight in their timezone
    v_reset_time := (DATE_TRUNC('day', NOW() AT TIME ZONE v_tz) + INTERVAL '1 day') AT TIME ZONE v_tz;

    -- Check if we need to reset daily credits
    IF v_sub.current_period_start IS NULL OR
       DATE_TRUNC('day', v_sub.current_period_start AT TIME ZONE v_tz) < DATE_TRUNC('day', NOW() AT TIME ZONE v_tz) THEN
      -- Reset daily credits
      UPDATE subscriptions
      SET credits_balance = 2,
          credits_purchased = 2,
          current_period_start = NOW()
      WHERE user_id = p_user_id
      RETURNING * INTO v_sub;
    END IF;
  ELSE
    -- Paid users: reset at period end
    v_reset_time := COALESCE(v_sub.current_period_end, NOW() + INTERVAL '3 months');
  END IF;

  RETURN QUERY SELECT
    v_sub.credits_balance,
    v_sub.credits_purchased,
    v_sub.plan,
    (v_sub.plan = 'free')::BOOLEAN,
    COALESCE(v_sub.current_period_start::TEXT, NOW()::TEXT),
    v_tz,
    (v_sub.plan != 'free')::BOOLEAN,
    v_reset_time::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: Deduct credits
-- =============================================
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id UUID,
  p_action TEXT,
  p_request_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_balance INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_cost INTEGER;
  v_sub RECORD;
  v_new_balance INTEGER;
BEGIN
  -- Get credit cost
  IF p_action = 'tryon' THEN
    v_cost := 2;
  ELSIF p_action = 'video_generation' THEN
    v_cost := 8;
  ELSE
    RETURN QUERY SELECT FALSE, 0, 'Invalid action'::TEXT;
    RETURN;
  END IF;

  -- Get and lock subscription row
  SELECT * INTO v_sub FROM subscriptions WHERE user_id = p_user_id FOR UPDATE;

  IF v_sub IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'No subscription found'::TEXT;
    RETURN;
  END IF;

  -- Check video generation permission
  IF p_action = 'video_generation' AND v_sub.plan = 'free' THEN
    RETURN QUERY SELECT FALSE, v_sub.credits_balance, 'Video generation requires PRO subscription'::TEXT;
    RETURN;
  END IF;

  -- Check sufficient credits
  IF v_sub.credits_balance < v_cost THEN
    IF v_sub.plan = 'free' THEN
      RETURN QUERY SELECT FALSE, v_sub.credits_balance, 'Daily limit reached. Try again tomorrow or upgrade to PRO!'::TEXT;
    ELSE
      RETURN QUERY SELECT FALSE, v_sub.credits_balance, 'Insufficient credits'::TEXT;
    END IF;
    RETURN;
  END IF;

  -- Deduct credits
  v_new_balance := v_sub.credits_balance - v_cost;
  UPDATE subscriptions SET credits_balance = v_new_balance, updated_at = NOW() WHERE user_id = p_user_id;

  -- Log usage if request_id provided
  IF p_request_id IS NOT NULL THEN
    INSERT INTO usage_logs (user_id, action, credits_used, request_id, status)
    VALUES (p_user_id, p_action, v_cost, p_request_id, 'pending')
    ON CONFLICT (request_id) DO NOTHING;
  END IF;

  RETURN QUERY SELECT TRUE, v_new_balance, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: Refund credits
-- =============================================
CREATE OR REPLACE FUNCTION refund_credits(
  p_user_id UUID,
  p_action TEXT,
  p_request_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_balance INTEGER
) AS $$
DECLARE
  v_cost INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get credit cost
  IF p_action = 'tryon' THEN
    v_cost := 2;
  ELSIF p_action = 'video_generation' THEN
    v_cost := 8;
  ELSE
    RETURN QUERY SELECT FALSE, 0;
    RETURN;
  END IF;

  -- Refund credits
  UPDATE subscriptions
  SET credits_balance = credits_balance + v_cost, updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING credits_balance INTO v_new_balance;

  -- Update usage log if request_id provided
  IF p_request_id IS NOT NULL THEN
    UPDATE usage_logs SET status = 'refunded' WHERE request_id = p_request_id;
  END IF;

  RETURN QUERY SELECT TRUE, COALESCE(v_new_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: Update user timezone
-- =============================================
CREATE OR REPLACE FUNCTION update_user_timezone(
  p_user_id UUID,
  p_timezone TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE subscriptions SET timezone = p_timezone, updated_at = NOW() WHERE user_id = p_user_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Usage logs table (if not exists)
-- =============================================
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  credits_used INTEGER,
  dress_id TEXT,
  photo_index INTEGER,
  request_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_request_id ON usage_logs(request_id);

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own usage logs" ON usage_logs;
CREATE POLICY "Users can read own usage logs" ON usage_logs
  FOR SELECT USING (auth.uid() = user_id);

-- =============================================
-- Create subscriptions for existing users
-- =============================================
INSERT INTO subscriptions (user_id, plan, status, credits_balance, credits_purchased)
SELECT id, 'free', 'active', 2, 2 FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
