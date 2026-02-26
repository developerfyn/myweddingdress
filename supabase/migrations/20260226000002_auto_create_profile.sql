-- Auto-create profile for new users
-- This ensures every user has a profile record

-- Update the handle_new_user function to also create a profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, created_at)
  VALUES (NEW.id, NEW.email, NOW())
  ON CONFLICT (id) DO NOTHING;

  -- Create free subscription
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
    4,  -- Free users get 4 credits per day
    4,
    date_trunc('day', NOW()),
    'UTC'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create profiles for any existing users who don't have one
INSERT INTO public.profiles (id, email, created_at)
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user TO service_role;
