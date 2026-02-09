-- Create usage_logs table for tracking API usage
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  action VARCHAR(50) NOT NULL,
  credits_used DECIMAL(10,4) NOT NULL DEFAULT 1,
  dress_id VARCHAR(100),
  photo_index INT,
  request_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  processing_time_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage_logs(user_id, created_at DESC);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_usage_action_date ON usage_logs(action, created_at DESC);

-- Enable Row Level Security
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own usage
CREATE POLICY "Users can view own usage" ON usage_logs
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Service role can insert (API routes use service role)
CREATE POLICY "Service role can insert usage" ON usage_logs
  FOR INSERT WITH CHECK (true);

-- RLS Policy: Service role can update status
CREATE POLICY "Service role can update usage" ON usage_logs
  FOR UPDATE USING (true);
