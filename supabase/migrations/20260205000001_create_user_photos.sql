-- Create user_photos table to track uploaded photos
CREATE TABLE IF NOT EXISTS user_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for fast lookups by user
CREATE INDEX idx_user_photos_user_id ON user_photos(user_id);

-- Unique constraint to prevent duplicate paths
CREATE UNIQUE INDEX idx_user_photos_storage_path ON user_photos(storage_path);

-- Enable RLS
ALTER TABLE user_photos ENABLE ROW LEVEL SECURITY;

-- Users can only see their own photos
CREATE POLICY "Users can view own photos"
  ON user_photos FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own photos
CREATE POLICY "Users can insert own photos"
  ON user_photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own photos
CREATE POLICY "Users can delete own photos"
  ON user_photos FOR DELETE
  USING (auth.uid() = user_id);
