import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/rate-limiter';

/**
 * GET /api/tryon-image?id={cacheId}
 *
 * Secure proxy for try-on result images.
 * - Authenticates the user
 * - Verifies ownership (user must own the cache entry)
 * - Fetches image from private Supabase storage
 * - Streams image bytes to client
 *
 * The actual Supabase storage URL is never exposed to the client.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cacheId = searchParams.get('id');

    if (!cacheId) {
      return NextResponse.json(
        { error: 'Missing image id' },
        { status: 400 }
      );
    }

    // Authenticate user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch cache entry and verify ownership
    const { data: cacheEntry, error: cacheError } = await supabase
      .from('tryon_cache')
      .select('id, user_id, result_url, result_base64')
      .eq('id', cacheId)
      .single();

    if (cacheError || !cacheEntry) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // CRITICAL: Verify ownership
    if (cacheEntry.user_id !== user.id) {
      console.log(`[tryon-image] Access denied: user ${user.id} tried to access image owned by ${cacheEntry.user_id}`);
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Rate limit: 120 image requests per minute (generous for gallery browsing)
    const rateLimit = checkRateLimit(user.id, 'tryon_image', 120, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.resetInSeconds) } }
      );
    }

    // Get the image data
    let imageBuffer: Buffer | null = null;
    let contentType = 'image/png';

    // Check if result_url is a storage path
    if (cacheEntry.result_url?.startsWith('storage:')) {
      const storagePath = cacheEntry.result_url.substring(8); // Remove "storage:" prefix

      // Download from Supabase storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('tryon-results')
        .download(storagePath);

      if (downloadError || !fileData) {
        console.error(`[tryon-image] Failed to download from storage: ${downloadError?.message}`);
        return NextResponse.json(
          { error: 'Failed to retrieve image' },
          { status: 500 }
        );
      }

      imageBuffer = Buffer.from(await fileData.arrayBuffer());
    }
    // Check if we have base64 data
    else if (cacheEntry.result_base64) {
      const base64Data = cacheEntry.result_base64.includes(',')
        ? cacheEntry.result_base64.split(',')[1]
        : cacheEntry.result_base64;
      imageBuffer = Buffer.from(base64Data, 'base64');
    }
    // Legacy: direct URL (fetch it)
    else if (cacheEntry.result_url?.startsWith('http')) {
      try {
        const response = await fetch(cacheEntry.result_url);
        if (!response.ok) {
          throw new Error('Failed to fetch image');
        }
        imageBuffer = Buffer.from(await response.arrayBuffer());
        contentType = response.headers.get('content-type') || 'image/png';
      } catch (err) {
        console.error(`[tryon-image] Failed to fetch legacy URL: ${err}`);
        return NextResponse.json(
          { error: 'Failed to retrieve image' },
          { status: 500 }
        );
      }
    }

    if (!imageBuffer) {
      return NextResponse.json(
        { error: 'No image data available' },
        { status: 404 }
      );
    }

    // Return image with proper headers
    // Convert Buffer to Uint8Array for NextResponse compatibility
    return new NextResponse(new Uint8Array(imageBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': imageBuffer.length.toString(),
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour, but private (not shared caches)
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[tryon-image] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
