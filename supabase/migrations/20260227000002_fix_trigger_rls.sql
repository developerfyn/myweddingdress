-- Fix trigger RLS bypass issue
-- The handle_new_user trigger needs to insert into subscriptions and profiles
-- even with RLS enabled

-- Method 1: Make the trigger function explicitly set role for RLS bypass
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile (using ON CONFLICT to handle race conditions)
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
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure function is owned by postgres (superuser) for RLS bypass
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.handle_new_user TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user TO postgres;

-- Also add INSERT policy for service_role on subscriptions (belt and suspenders)
DROP POLICY IF EXISTS "Service role can insert subscriptions" ON subscriptions;
CREATE POLICY "Service role can insert subscriptions"
  ON subscriptions FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Add INSERT policy for profiles table if RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Also allow the trigger (which runs as postgres) to insert
DROP POLICY IF EXISTS "Postgres can insert profiles" ON profiles;
CREATE POLICY "Postgres can insert profiles"
  ON profiles FOR INSERT
  TO postgres
  WITH CHECK (true);

DROP POLICY IF EXISTS "Postgres can insert subscriptions" ON subscriptions;
CREATE POLICY "Postgres can insert subscriptions"
  ON subscriptions FOR INSERT
  TO postgres
  WITH CHECK (true);
