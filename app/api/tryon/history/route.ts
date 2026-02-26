import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  const requestId = `history-${Date.now()}`;

  console.log(`[${requestId}] 📜 Fetching try-on history...`);

  try {
    const supabase = await createServerSupabaseClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log(`[${requestId}] ❌ Authentication failed`);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log(`[${requestId}] ✅ User authenticated: ${user.email}`);

    // Rate limit: 30 requests per minute
    const rateLimit = checkRateLimit(user.id, 'tryon_history', 30, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.resetInSeconds) } }
      );
    }

    // Get and validate pagination params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50') || 50, 1), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0') || 0, 0);

    // Fetch try-on history from cache table
    const { data: history, error: historyError, count } = await supabase
      .from('tryon_cache')
      .select('id, dress_id, person_image_hash, result_base64, result_url, created_at, access_count, last_accessed_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (historyError) {
      console.log(`[${requestId}] ❌ Failed to fetch history: ${historyError.message}`);
      return NextResponse.json(
        { error: 'Failed to fetch history' },
        { status: 500 }
      );
    }

    // Get unique dress_ids to fetch gown names
    const dressIds = [...new Set((history || []).map(h => h.dress_id).filter(Boolean))];

    // Fetch gown names for the dress_ids
    let gownMap: Record<string, { name: string; image_url: string }> = {};
    if (dressIds.length > 0) {
      const { data: gowns } = await supabase
        .from('gowns')
        .select('id, name, image_url')
        .in('id', dressIds);

      if (gowns) {
        gownMap = gowns.reduce((acc, gown) => {
          acc[gown.id] = { name: gown.name, image_url: gown.image_url };
          return acc;
        }, {} as Record<string, { name: string; image_url: string }>);
      }
    }

    // Enrich history with gown names and use proxy URLs for secure access
    const enrichedHistory = (history || []).map(item => {
      // Use proxy URL for all images - never expose storage URLs to client
      // The proxy verifies ownership before serving the image
      const proxyUrl = `/api/tryon-image?id=${item.id}`;

      return {
        ...item,
        result_url: proxyUrl,
        gown_name: gownMap[item.dress_id]?.name || null,
        gown_image_url: gownMap[item.dress_id]?.image_url || null,
      };
    });

    console.log(`[${requestId}] ✅ Found ${history?.length || 0} history items (total: ${count})`);

    return NextResponse.json({
      success: true,
      history: enrichedHistory,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.log(`[${requestId}] ❌ Error: ${error instanceof Error ? error.message : error}`);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete a history item
export async function DELETE(request: NextRequest) {
  const requestId = `history-delete-${Date.now()}`;

  try {
    const supabase = await createServerSupabaseClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limit: 20 deletes per minute
    const rateLimit = checkRateLimit(user.id, 'tryon_history_delete', 20, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.resetInSeconds) } }
      );
    }

    let id: string;
    try {
      ({ id } = await request.json());
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Missing id' },
        { status: 400 }
      );
    }

    console.log(`[${requestId}] 🗑️ Deleting history item: ${id}`);

    // Delete the cache entry (RLS ensures user can only delete their own)
    const { error: deleteError } = await supabase
      .from('tryon_cache')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.log(`[${requestId}] ❌ Failed to delete: ${deleteError.message}`);
      return NextResponse.json(
        { error: 'Failed to delete' },
        { status: 500 }
      );
    }

    console.log(`[${requestId}] ✅ Deleted successfully`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log(`[${requestId}] ❌ Error: ${error instanceof Error ? error.message : error}`);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
