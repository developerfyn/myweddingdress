/**
 * Utilities for handling user photos with signed URLs
 *
 * User photos are stored in a private Supabase Storage bucket.
 * We generate signed URLs (valid for 1 hour) for secure, temporary access.
 */

import { SupabaseClient } from '@supabase/supabase-js';

// Signed URL expiry time in seconds (1 hour)
const SIGNED_URL_EXPIRY = 3600;

export interface UserPhoto {
  id: string;
  storage_path: string;
  signed_url?: string;
  created_at: string;
}

/**
 * Generate a signed URL for a user photo
 * @param supabase - Supabase client
 * @param storagePath - Path in the user-photos bucket (e.g., "user_id/filename.jpg")
 * @returns Signed URL or null if failed
 */
export async function generateSignedUrl(
  supabase: SupabaseClient,
  storagePath: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('user-photos')
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

    if (error) {
      console.error('[PhotoUtils] Failed to generate signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('[PhotoUtils] Error generating signed URL:', err);
    return null;
  }
}

/**
 * Generate signed URLs for multiple photos
 * @param supabase - Supabase client
 * @param storagePaths - Array of storage paths
 * @returns Array of signed URLs (null entries for failures)
 */
export async function generateSignedUrls(
  supabase: SupabaseClient,
  storagePaths: string[]
): Promise<(string | null)[]> {
  if (storagePaths.length === 0) return [];

  try {
    const { data, error } = await supabase.storage
      .from('user-photos')
      .createSignedUrls(storagePaths, SIGNED_URL_EXPIRY);

    if (error) {
      console.error('[PhotoUtils] Failed to generate signed URLs:', error);
      return storagePaths.map(() => null);
    }

    return data.map((item) => item.signedUrl);
  } catch (err) {
    console.error('[PhotoUtils] Error generating signed URLs:', err);
    return storagePaths.map(() => null);
  }
}

/**
 * Fetch user photos with signed URLs
 * @param supabase - Supabase client
 * @param userId - User ID
 * @returns Array of photos with signed URLs
 */
export async function fetchUserPhotosWithSignedUrls(
  supabase: SupabaseClient,
  userId: string
): Promise<UserPhoto[]> {
  try {
    // Fetch photos from database
    const { data: photos, error: fetchError } = await supabase
      .from('user_photos')
      .select('id, storage_path, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('[PhotoUtils] Failed to fetch photos:', fetchError);
      return [];
    }

    if (!photos || photos.length === 0) {
      return [];
    }

    // Generate signed URLs for all photos
    const storagePaths = photos.map((p) => p.storage_path);
    const signedUrls = await generateSignedUrls(supabase, storagePaths);

    // Combine photos with signed URLs
    return photos.map((photo, index) => ({
      ...photo,
      signed_url: signedUrls[index] || undefined,
    }));
  } catch (err) {
    console.error('[PhotoUtils] Error fetching photos:', err);
    return [];
  }
}

/**
 * Delete a user photo by storage path
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param storagePath - Storage path of the photo
 * @returns Success boolean
 */
export async function deleteUserPhoto(
  supabase: SupabaseClient,
  userId: string,
  storagePath: string
): Promise<boolean> {
  try {
    // Delete from database
    const { error: dbError } = await supabase
      .from('user_photos')
      .delete()
      .eq('user_id', userId)
      .eq('storage_path', storagePath);

    if (dbError) {
      console.error('[PhotoUtils] Failed to delete from database:', dbError);
      return false;
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('user-photos')
      .remove([storagePath]);

    if (storageError) {
      console.error('[PhotoUtils] Failed to delete from storage:', storageError);
      // Database entry already deleted, log but don't fail
    }

    return true;
  } catch (err) {
    console.error('[PhotoUtils] Error deleting photo:', err);
    return false;
  }
}
