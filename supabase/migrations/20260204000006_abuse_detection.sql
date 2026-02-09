-- Create abuse detection tables and functions

-- Table to track suspicious activity
CREATE TABLE IF NOT EXISTS abuse_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  ip_address VARCHAR(45),
  abuse_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) DEFAULT 'low', -- low, medium, high, critical
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying abuse by user
CREATE INDEX IF NOT EXISTS idx_abuse_logs_user_id ON abuse_logs(user_id);

-- Index for querying recent abuse
CREATE INDEX IF NOT EXISTS idx_abuse_logs_created_at ON abuse_logs(created_at DESC);

-- Index for severity analysis
CREATE INDEX IF NOT EXISTS idx_abuse_logs_severity ON abuse_logs(severity, created_at DESC);

-- Enable RLS
ALTER TABLE abuse_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view abuse logs (users cannot see their own)
CREATE POLICY "Only service role can access abuse logs" ON abuse_logs
  FOR ALL USING (false);

-- Table to track blocked users/IPs
CREATE TABLE IF NOT EXISTS blocked_entities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type VARCHAR(20) NOT NULL, -- 'user' or 'ip'
  entity_value VARCHAR(255) NOT NULL,
  reason TEXT,
  blocked_until TIMESTAMPTZ, -- NULL = permanent
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(entity_type, entity_value)
);

-- Index for quick blocking checks
CREATE INDEX IF NOT EXISTS idx_blocked_entities_lookup
  ON blocked_entities(entity_type, entity_value);

-- Enable RLS
ALTER TABLE blocked_entities ENABLE ROW LEVEL SECURITY;

-- Only service role can access blocked_entities
CREATE POLICY "Only service role can access blocked entities" ON blocked_entities
  FOR ALL USING (false);

-- Function to check if a user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocked_entities
    WHERE entity_type = 'user'
      AND entity_value = p_user_id::text
      AND (blocked_until IS NULL OR blocked_until > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if an IP is blocked
CREATE OR REPLACE FUNCTION is_ip_blocked(p_ip_address VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocked_entities
    WHERE entity_type = 'ip'
      AND entity_value = p_ip_address
      AND (blocked_until IS NULL OR blocked_until > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log abuse
CREATE OR REPLACE FUNCTION log_abuse(
  p_user_id UUID,
  p_ip_address VARCHAR,
  p_abuse_type VARCHAR,
  p_severity VARCHAR,
  p_details JSONB
)
RETURNS void AS $$
BEGIN
  INSERT INTO abuse_logs (user_id, ip_address, abuse_type, severity, details)
  VALUES (p_user_id, p_ip_address, p_abuse_type, p_severity, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's abuse score (higher = more suspicious)
CREATE OR REPLACE FUNCTION get_abuse_score(p_user_id UUID)
RETURNS INT AS $$
DECLARE
  score INT := 0;
BEGIN
  -- Count abuse incidents in last 24 hours with severity weights
  SELECT COALESCE(SUM(
    CASE severity
      WHEN 'critical' THEN 100
      WHEN 'high' THEN 25
      WHEN 'medium' THEN 5
      WHEN 'low' THEN 1
      ELSE 0
    END
  ), 0) INTO score
  FROM abuse_logs
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '24 hours';

  RETURN score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for rapid-fire requests (burst detection)
CREATE OR REPLACE FUNCTION check_burst_activity(
  p_user_id UUID,
  p_window_seconds INT DEFAULT 10,
  p_max_requests INT DEFAULT 5
)
RETURNS BOOLEAN AS $$
DECLARE
  request_count INT;
BEGIN
  SELECT COUNT(*) INTO request_count
  FROM usage_logs
  WHERE user_id = p_user_id
    AND created_at > NOW() - (p_window_seconds || ' seconds')::INTERVAL;

  RETURN request_count > p_max_requests;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-block users with high abuse scores
CREATE OR REPLACE FUNCTION auto_block_abuser(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  score INT;
BEGIN
  score := get_abuse_score(p_user_id);

  -- Auto-block if score >= 100 (critical abuse or accumulated high abuse)
  IF score >= 100 THEN
    INSERT INTO blocked_entities (entity_type, entity_value, reason, blocked_until)
    VALUES ('user', p_user_id::text, 'Auto-blocked: abuse score ' || score, NOW() + INTERVAL '24 hours')
    ON CONFLICT (entity_type, entity_value) DO UPDATE
    SET blocked_until = GREATEST(blocked_entities.blocked_until, NOW() + INTERVAL '24 hours'),
        reason = 'Auto-blocked: abuse score ' || score;
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for abuse summary (admin use)
CREATE OR REPLACE VIEW abuse_summary AS
SELECT
  user_id,
  COUNT(*) as total_incidents,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
  COUNT(*) FILTER (WHERE severity = 'high') as high_count,
  COUNT(*) FILTER (WHERE severity = 'medium') as medium_count,
  COUNT(*) FILTER (WHERE severity = 'low') as low_count,
  MAX(created_at) as last_incident,
  get_abuse_score(user_id) as current_score
FROM abuse_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id
ORDER BY current_score DESC;

-- Grant permissions
GRANT EXECUTE ON FUNCTION is_user_blocked TO authenticated;
GRANT EXECUTE ON FUNCTION is_ip_blocked TO authenticated;
GRANT EXECUTE ON FUNCTION log_abuse TO authenticated;
GRANT EXECUTE ON FUNCTION get_abuse_score TO authenticated;
GRANT EXECUTE ON FUNCTION check_burst_activity TO authenticated;
GRANT EXECUTE ON FUNCTION auto_block_abuser TO authenticated;
