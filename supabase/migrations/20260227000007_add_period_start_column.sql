-- Add missing period_start column to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS period_start TIMESTAMPTZ DEFAULT NOW();

-- Update existing rows to have a period_start
UPDATE subscriptions
SET period_start = COALESCE(created_at, NOW())
WHERE period_start IS NULL;
