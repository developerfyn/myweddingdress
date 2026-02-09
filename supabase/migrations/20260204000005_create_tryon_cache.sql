-- Create try-on cache table for storing results
CREATE TABLE IF NOT EXISTS tryon_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  person_image_hash VARCHAR(64) NOT NULL,
  garment_image_hash VARCHAR(64) NOT NULL,
  dress_id VARCHAR(100),
  result_url TEXT,
  result_base64 TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  access_count INT DEFAULT 1,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, person_image_hash, garment_image_hash)
);

-- Index for fast cache lookups
CREATE INDEX IF NOT EXISTS idx_tryon_cache_lookup
  ON tryon_cache(user_id, person_image_hash, garment_image_hash);

-- Index for cleanup of expired entries
CREATE INDEX IF NOT EXISTS idx_tryon_cache_expires
  ON tryon_cache(expires_at);

-- Enable RLS
ALTER TABLE tryon_cache ENABLE ROW LEVEL SECURITY;

-- Users can only access their own cache
CREATE POLICY "Users can access own cache" ON tryon_cache
  FOR ALL USING (auth.uid() = user_id);

-- Function to get cached result
CREATE OR REPLACE FUNCTION get_cached_tryon(
  p_user_id UUID,
  p_person_hash VARCHAR,
  p_garment_hash VARCHAR
)
RETURNS TABLE (
  found BOOLEAN,
  result_url TEXT,
  result_base64 TEXT
) AS $$
DECLARE
  v_cache RECORD;
BEGIN
  -- Look for valid cache entry
  SELECT tc.result_url, tc.result_base64, tc.id
  INTO v_cache
  FROM tryon_cache tc
  WHERE tc.user_id = p_user_id
    AND tc.person_image_hash = p_person_hash
    AND tc.garment_image_hash = p_garment_hash
    AND tc.expires_at > NOW();

  IF FOUND THEN
    -- Update access count and timestamp
    UPDATE tryon_cache
    SET access_count = access_count + 1,
        last_accessed_at = NOW()
    WHERE id = v_cache.id;

    RETURN QUERY SELECT
      true::BOOLEAN,
      v_cache.result_url,
      v_cache.result_base64;
  ELSE
    RETURN QUERY SELECT
      false::BOOLEAN,
      NULL::TEXT,
      NULL::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to save cache entry
CREATE OR REPLACE FUNCTION save_tryon_cache(
  p_user_id UUID,
  p_person_hash VARCHAR,
  p_garment_hash VARCHAR,
  p_dress_id VARCHAR,
  p_result_url TEXT,
  p_result_base64 TEXT
)
RETURNS void AS $$
BEGIN
  INSERT INTO tryon_cache (
    user_id,
    person_image_hash,
    garment_image_hash,
    dress_id,
    result_url,
    result_base64,
    expires_at
  ) VALUES (
    p_user_id,
    p_person_hash,
    p_garment_hash,
    p_dress_id,
    p_result_url,
    p_result_base64,
    NOW() + INTERVAL '7 days'
  )
  ON CONFLICT (user_id, person_image_hash, garment_image_hash)
  DO UPDATE SET
    result_url = EXCLUDED.result_url,
    result_base64 = EXCLUDED.result_base64,
    expires_at = NOW() + INTERVAL '7 days',
    access_count = tryon_cache.access_count + 1,
    last_accessed_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired cache entries (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM tryon_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_cached_tryon TO authenticated;
GRANT EXECUTE ON FUNCTION save_tryon_cache TO authenticated;
