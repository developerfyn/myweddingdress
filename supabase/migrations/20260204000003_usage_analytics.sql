-- Helper function to get user's usage count for current month
CREATE OR REPLACE FUNCTION get_user_monthly_usage(p_user_id UUID, p_action VARCHAR DEFAULT NULL)
RETURNS TABLE (
  total_requests BIGINT,
  successful_requests BIGINT,
  failed_requests BIGINT,
  total_credits DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_requests,
    COUNT(*) FILTER (WHERE status = 'success')::BIGINT as successful_requests,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_requests,
    COALESCE(SUM(credits_used) FILTER (WHERE status = 'success'), 0) as total_credits
  FROM usage_logs
  WHERE user_id = p_user_id
    AND created_at >= date_trunc('month', NOW())
    AND (p_action IS NULL OR action = p_action);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has remaining credits
CREATE OR REPLACE FUNCTION check_user_credits(
  p_user_id UUID,
  p_action VARCHAR,
  p_monthly_limit INT
)
RETURNS TABLE (
  has_credits BOOLEAN,
  credits_used BIGINT,
  credits_remaining INT
) AS $$
DECLARE
  v_used BIGINT;
BEGIN
  SELECT COUNT(*)::BIGINT INTO v_used
  FROM usage_logs
  WHERE user_id = p_user_id
    AND action = p_action
    AND status = 'success'
    AND created_at >= date_trunc('month', NOW());

  RETURN QUERY
  SELECT
    (v_used < p_monthly_limit) as has_credits,
    v_used as credits_used,
    GREATEST(0, p_monthly_limit - v_used::INT) as credits_remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for daily usage summary (admin analytics)
CREATE OR REPLACE VIEW daily_usage_summary AS
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

-- View for user usage summary
CREATE OR REPLACE VIEW user_usage_summary AS
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

-- Grant access to authenticated users for the functions
GRANT EXECUTE ON FUNCTION get_user_monthly_usage TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_credits TO authenticated;
