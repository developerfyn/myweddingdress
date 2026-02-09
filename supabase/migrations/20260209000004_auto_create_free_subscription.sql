-- Auto-create free subscription for new users
-- This ensures every user has a subscription record with credits

-- Function to create a free subscription for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (
    user_id,
    plan,
    status,
    credits_balance,
    credits_purchased,
    period_start,
    timezone
  ) VALUES (
    NEW.id,
    'free',
    'active',
    2,  -- Free users get 2 credits per day
    2,
    date_trunc('day', NOW()),
    'UTC'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create free subscriptions for any existing users who don't have one
INSERT INTO public.subscriptions (user_id, plan, status, credits_balance, credits_purchased, period_start, timezone)
SELECT
  u.id,
  'free',
  'active',
  2,
  2,
  date_trunc('day', NOW()),
  'UTC'
FROM auth.users u
LEFT JOIN public.subscriptions s ON s.user_id = u.id
WHERE s.user_id IS NULL;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.handle_new_user TO service_role;
