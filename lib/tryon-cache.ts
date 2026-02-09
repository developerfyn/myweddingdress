/**
 * Try-on Cache System
 *
 * Server-side caching for try-on results to reduce API costs.
 *
 * CACHING STRATEGY:
 * - For catalog dresses: Uses dress_id (e.g., "vera-wang-romantic-1") as the key
 *   This is more reliable because the same dress always has the same ID.
 *
 * - For custom uploads: Uses SHA-256 hash of the garment image as fallback
 *   This handles cases where users upload their own dress images.
 *
 * - Person photos: Always uses SHA-256 hash since user photos don't have IDs
 *
 * Cache entries expire after 7 days and track access count for analytics.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export interface CacheResult {
  found: boolean;
  result_url: string | null;
  result_base64: string | null;
  cache_id?: string;
  storage_path?: string | null;
}

export interface CacheSaveResult {
  success: boolean;
  cache_id?: string;
}

/**
 * Generate a SHA-256 hash for an image (base64 string)
 * Used for person photos and custom garment uploads
 */
export function hashImage(imageBase64: string): string {
  // Remove data URL prefix if present (e.g., "data:image/png;base64,")
  const base64Data = imageBase64.includes(',')
    ? imageBase64.split(',')[1]
    : imageBase64;

  return crypto
    .createHash('sha256')
    .update(base64Data)
    .digest('hex');
}

/**
 * Check cache for existing try-on result
 *
 * Lookup priority:
 * 1. If dressId provided → lookup by (user_id, person_hash, dress_id)
 * 2. Fallback → lookup by (user_id, person_hash, garment_hash)
 *
 * @param supabase - Supabase client
 * @param userId - User's UUID
 * @param personImageBase64 - Base64 encoded person photo
 * @param dressId - Catalog dress ID (e.g., "vera-wang-romantic-1") - preferred
 * @param garmentImageBase64 - Base64 encoded garment image - fallback for custom uploads
 */
export async function checkTryonCache(
  supabase: SupabaseClient,
  userId: string,
  personImageBase64: string,
  dressId: string | null,
  garmentImageBase64?: string
): Promise<CacheResult | null> {
  try {
    const personHash = hashImage(personImageBase64);
    const garmentHash = garmentImageBase64 ? hashImage(garmentImageBase64) : null;

    const { data, error } = await supabase.rpc('get_cached_tryon_v2', {
      p_user_id: userId,
      p_person_hash: personHash,
      p_dress_id: dressId || null,
      p_garment_hash: garmentHash,
    });

    if (error) {
      console.error('Cache lookup error:', error.message);
      return null;
    }

    if (data && data.length > 0 && data[0].found) {
      return {
        found: true,
        result_url: data[0].result_url,
        result_base64: data[0].result_base64,
        cache_id: data[0].cache_id,
      };
    }

    return { found: false, result_url: null, result_base64: null };
  } catch (error) {
    console.error('Cache check failed:', error);
    return null;
  }
}

/**
 * Save try-on result to cache
 *
 * @param supabase - Supabase client
 * @param userId - User's UUID
 * @param personImageBase64 - Base64 encoded person photo
 * @param dressId - Catalog dress ID (preferred key for catalog dresses)
 * @param garmentImageBase64 - Base64 encoded garment image (key for custom uploads)
 * @param resultUrl - URL of the generated try-on result
 * @param resultBase64 - Base64 encoded result image
 */
export async function saveTryonCache(
  supabase: SupabaseClient,
  userId: string,
  personImageBase64: string,
  dressId: string | null,
  garmentImageBase64: string,
  resultUrl: string | null,
  resultBase64: string | null
): Promise<CacheSaveResult> {
  try {
    const personHash = hashImage(personImageBase64);
    const garmentHash = hashImage(garmentImageBase64);

    const { data, error } = await supabase.rpc('save_tryon_cache_v2', {
      p_user_id: userId,
      p_person_hash: personHash,
      p_dress_id: dressId || '',
      p_garment_hash: garmentHash,
      p_result_url: resultUrl,
      p_result_base64: resultBase64,
    });

    if (error) {
      console.error('Cache save error:', error.message);
      return { success: false };
    }

    return { success: true, cache_id: data };
  } catch (error) {
    console.error('Cache save failed:', error);
    return { success: false };
  }
}

/**
 * Get cache statistics for a user
 */
export async function getUserCacheStats(
  supabase: SupabaseClient,
  userId: string
): Promise<{ total: number; hits: number; savedCost: string } | null> {
  try {
    const { data, error } = await supabase
      .from('tryon_cache')
      .select('access_count')
      .eq('user_id', userId);

    if (error) {
      console.error('Cache stats error:', error.message);
      return null;
    }

    const total = data?.length || 0;
    // Hits = total accesses minus initial creation (access_count - 1 for each entry)
    const hits = data?.reduce((sum, row) => sum + Math.max(0, row.access_count - 1), 0) || 0;
    // Each cache hit saves $0.075 (FASHN API cost)
    const savedCost = `$${(hits * 0.075).toFixed(2)}`;

    return { total, hits, savedCost };
  } catch (error) {
    console.error('Cache stats failed:', error);
    return null;
  }
}

/**
 * Invalidate cache for a specific user (useful for testing or user requests)
 */
export async function invalidateUserCache(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('tryon_cache')
      .delete()
      .eq('user_id', userId)
      .select('id');

    if (error) {
      console.error('Cache invalidation error:', error.message);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('Cache invalidation failed:', error);
    return 0;
  }
}
