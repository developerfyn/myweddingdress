-- Create user_favorites table for syncing favorites across devices
CREATE TABLE IF NOT EXISTS user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gown_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Prevent duplicate favorites
  UNIQUE(user_id, gown_id)
);

-- Create index for fast lookups
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_gown_id ON user_favorites(gown_id);

-- Enable RLS
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Users can only see their own favorites
CREATE POLICY "Users can view own favorites"
ON user_favorites FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can add their own favorites
CREATE POLICY "Users can add own favorites"
ON user_favorites FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can remove their own favorites
CREATE POLICY "Users can delete own favorites"
ON user_favorites FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Also create history_favorites table for try-on result favorites
CREATE TABLE IF NOT EXISTS user_history_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  history_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(user_id, history_id)
);

CREATE INDEX idx_user_history_favorites_user_id ON user_history_favorites(user_id);

ALTER TABLE user_history_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history favorites"
ON user_history_favorites FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can add own history favorites"
ON user_history_favorites FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own history favorites"
ON user_history_favorites FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
