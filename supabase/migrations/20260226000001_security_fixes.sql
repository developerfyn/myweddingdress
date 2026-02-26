-- Security Fixes Migration
-- Addresses critical vulnerabilities identified in security audit

-- ============================================
-- 1. ENABLE RLS ON SUBSCRIPTIONS TABLE (CRITICAL)
-- ============================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only read their own subscription
CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- No direct UPDATE policy for users
-- ALL updates must go through SECURITY DEFINER functions (update_user_timezone, deduct_credits, etc.)
-- or service role (Stripe webhook)
-- This prevents users from modifying credits_balance, plan, status directly

-- Note: We intentionally do NOT create an UPDATE policy for authenticated users.
-- The SECURITY DEFINER functions bypass RLS and can still update the table.

-- No INSERT policy for users - subscriptions are created by:
-- 1. handle_new_user() trigger (SECURITY DEFINER)
-- 2. Stripe webhook (service role)

-- No DELETE policy for users - subscriptions should never be deleted by users

-- ============================================
-- 2. FIX SECURITY DEFINER VIEWS (ERROR)
-- ============================================

-- Drop and recreate views with security_invoker = on
-- This makes views respect RLS policies of underlying tables

-- Fix daily_usage_summary view
DROP VIEW IF EXISTS daily_usage_summary;
CREATE VIEW daily_usage_summary
  WITH (security_invoker = on) AS
SELECT
  date_trunc('day', created_at)::DATE as date,
  action,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status = 'success') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(DISTINCT user_id) as unique_users,
  COALESCE(SUM(credits_used) FILTER (WHERE status = 'success'), 0) as credits_consumed,
  AVG(processing_time_ms) FILTER (WHERE status = 'success') as avg_processing_ms
FROM usage_logs
GROUP BY date_trunc('day', created_at)::DATE, action
ORDER BY date DESC, action;

-- Fix user_usage_summary view
DROP VIEW IF EXISTS user_usage_summary;
CREATE VIEW user_usage_summary
  WITH (security_invoker = on) AS
SELECT
  user_id,
  action,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status = 'success') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COALESCE(SUM(credits_used) FILTER (WHERE status = 'success'), 0) as credits_consumed,
  MAX(created_at) as last_request_at
FROM usage_logs
WHERE created_at >= date_trunc('month', NOW())
GROUP BY user_id, action;

-- Fix abuse_summary view
DROP VIEW IF EXISTS abuse_summary;
CREATE VIEW abuse_summary
  WITH (security_invoker = on) AS
SELECT
  user_id,
  COUNT(*) as total_incidents,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
  COUNT(*) FILTER (WHERE severity = 'high') as high_count,
  COUNT(*) FILTER (WHERE severity = 'medium') as medium_count,
  COUNT(*) FILTER (WHERE severity = 'low') as low_count,
  MAX(created_at) as last_incident_at
FROM abuse_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY user_id;

-- Revoke direct access to admin views from authenticated users
-- These views are for admin/service role only
REVOKE ALL ON daily_usage_summary FROM authenticated;
REVOKE ALL ON abuse_summary FROM authenticated;

-- user_usage_summary can be accessed by authenticated users
-- but with security_invoker=on, they'll only see their own data due to RLS
GRANT SELECT ON user_usage_summary TO authenticated;

-- ============================================
-- 3. EXTEND ABUSE SCORE WINDOW (MODERATE)
-- ============================================

-- Update abuse score function to look at 7 days instead of 24 hours
CREATE OR REPLACE FUNCTION get_abuse_score(p_user_id UUID)
RETURNS INT AS $$
DECLARE
  v_score INT := 0;
BEGIN
  -- Calculate abuse score based on last 7 days (was 24 hours)
  SELECT COALESCE(SUM(
    CASE severity
      WHEN 'critical' THEN 100
      WHEN 'high' THEN 25
      WHEN 'medium' THEN 5
      WHEN 'low' THEN 1
      ELSE 0
    END
  ), 0) INTO v_score
  FROM abuse_logs
  WHERE user_id = p_user_id
    AND created_at >= NOW() - INTERVAL '7 days';  -- Extended from 24 hours

  RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. ADD COMMENT DOCUMENTATION
-- ============================================

COMMENT ON POLICY "Users can read own subscription" ON subscriptions IS
  'Users can only view their own subscription data. No UPDATE/INSERT/DELETE allowed - use SECURITY DEFINER functions.';

COMMENT ON VIEW daily_usage_summary IS
  'Admin view for platform-wide daily usage analytics. Requires service role access.';

COMMENT ON VIEW user_usage_summary IS
  'User view for their own monthly usage. RLS enforced via security_invoker.';

COMMENT ON VIEW abuse_summary IS
  'Admin view for abuse monitoring. Requires service role access.';
