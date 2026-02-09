-- Improve try-on cache to use dress_id instead of garment_image_hash
-- This provides more reliable cache hits for catalog dresses

-- Add new index for dress_id based lookups (more efficient for catalog dresses)
CREATE INDEX IF NOT EXISTS idx_tryon_cache_dress_lookup
  ON tryon_cache(user_id, person_image_hash, dress_id);

-- Update the unique constraint to support both lookup methods
-- We keep the original for backwards compatibility with any existing cached items
-- New entries with dress_id will use the dress_id based lookup

-- Create improved cache lookup function that prefers dress_id
CREATE OR REPLACE FUNCTION get_cached_tryon_v2(
  p_user_id UUID,
  p_person_hash VARCHAR,
  p_dress_id VARCHAR DEFAULT NULL,
  p_garment_hash VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  found BOOLEAN,
  result_url TEXT,
  result_base64 TEXT,
  cache_id UUID
) AS $$
DECLARE
  v_cache RECORD;
BEGIN
  -- First, try to find by dress_id (more reliable for catalog dresses)
  IF p_dress_id IS NOT NULL AND p_dress_id != '' THEN
    SELECT tc.result_url, tc.result_base64, tc.id
    INTO v_cache
    FROM tryon_cache tc
    WHERE tc.user_id = p_user_id
      AND tc.person_image_hash = p_person_hash
      AND tc.dress_id = p_dress_id
      AND tc.expires_at > NOW()
    ORDER BY tc.created_at DESC
    LIMIT 1;

    IF FOUND THEN
      -- Update access count and timestamp
      UPDATE tryon_cache
      SET access_count = access_count + 1,
          last_accessed_at = NOW()
      WHERE id = v_cache.id;

      RETURN QUERY SELECT
        true::BOOLEAN,
        v_cache.result_url,
        v_cache.result_base64,
        v_cache.id;
      RETURN;
    END IF;
  END IF;

  -- Fallback: try to find by garment_image_hash (for custom uploads or legacy entries)
  IF p_garment_hash IS NOT NULL AND p_garment_hash != '' THEN
    SELECT tc.result_url, tc.result_base64, tc.id
    INTO v_cache
    FROM tryon_cache tc
    WHERE tc.user_id = p_user_id
      AND tc.person_image_hash = p_person_hash
      AND tc.garment_image_hash = p_garment_hash
      AND tc.expires_at > NOW()
    ORDER BY tc.created_at DESC
    LIMIT 1;

    IF FOUND THEN
      -- Update access count and timestamp
      UPDATE tryon_cache
      SET access_count = access_count + 1,
          last_accessed_at = NOW()
      WHERE id = v_cache.id;

      RETURN QUERY SELECT
        true::BOOLEAN,
        v_cache.result_url,
        v_cache.result_base64,
        v_cache.id;
      RETURN;
    END IF;
  END IF;

  -- No cache found
  RETURN QUERY SELECT
    false::BOOLEAN,
    NULL::TEXT,
    NULL::TEXT,
    NULL::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create improved cache save function
CREATE OR REPLACE FUNCTION save_tryon_cache_v2(
  p_user_id UUID,
  p_person_hash VARCHAR,
  p_dress_id VARCHAR,
  p_garment_hash VARCHAR,
  p_result_url TEXT,
  p_result_base64 TEXT
)
RETURNS UUID AS $$
DECLARE
  v_cache_id UUID;
BEGIN
  -- For catalog dresses (with dress_id), use dress_id as the unique key
  -- For custom uploads (without dress_id), use garment_hash
  IF p_dress_id IS NOT NULL AND p_dress_id != '' THEN
    -- Upsert based on dress_id
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
      COALESCE(p_garment_hash, ''),
      p_dress_id,
      p_result_url,
      p_result_base64,
      NOW() + INTERVAL '7 days'
    )
    ON CONFLICT (user_id, person_image_hash, garment_image_hash)
    DO UPDATE SET
      result_url = EXCLUDED.result_url,
      result_base64 = EXCLUDED.result_base64,
      dress_id = EXCLUDED.dress_id,
      expires_at = NOW() + INTERVAL '7 days',
      access_count = tryon_cache.access_count + 1,
      last_accessed_at = NOW()
    RETURNING id INTO v_cache_id;
  ELSE
    -- Upsert based on garment_hash (custom uploads)
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
      '',
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
      last_accessed_at = NOW()
    RETURNING id INTO v_cache_id;
  END IF;

  RETURN v_cache_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_cached_tryon_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION save_tryon_cache_v2 TO authenticated;

-- Add comment explaining the caching strategy
COMMENT ON TABLE tryon_cache IS 'Caches try-on results to avoid duplicate API calls. Uses dress_id for catalog dresses (reliable) or garment_image_hash for custom uploads (fallback).';
COMMENT ON FUNCTION get_cached_tryon_v2 IS 'Looks up cached try-on result. Prefers dress_id lookup for catalog dresses, falls back to garment_hash for custom uploads.';
COMMENT ON FUNCTION save_tryon_cache_v2 IS 'Saves try-on result to cache. Uses dress_id as key for catalog dresses, garment_hash for custom uploads.';
