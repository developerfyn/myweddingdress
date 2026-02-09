-- Fix RLS policies to be more secure
-- Users should only be able to insert/update their own records

-- Drop existing policies
DROP POLICY IF EXISTS "Service role can insert usage" ON usage_logs;
DROP POLICY IF EXISTS "Service role can update usage" ON usage_logs;

-- RLS Policy: Users can only insert their own usage records
CREATE POLICY "Users can insert own usage" ON usage_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only update their own usage records
CREATE POLICY "Users can update own usage" ON usage_logs
  FOR UPDATE USING (auth.uid() = user_id);

-- Add index for request_id lookups (for deduplication)
CREATE INDEX IF NOT EXISTS idx_usage_request_id ON usage_logs(request_id);

-- Add index for user credit counting
CREATE INDEX IF NOT EXISTS idx_usage_user_action_status ON usage_logs(user_id, action, status);
