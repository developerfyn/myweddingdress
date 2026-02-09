import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getUserCredits, updateUserTimezone } from '@/lib/usage-tracking';

/**
 * GET /api/credits
 * Fetch user's current credit state
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get credits
    const credits = await getUserCredits(supabase, user.id);

    if (!credits) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch credits' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      credits,
    });
  } catch (error) {
    console.error('[API/credits] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/credits
 * Update user's timezone
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { timezone } = body;

    if (!timezone) {
      return NextResponse.json(
        { success: false, error: 'Timezone is required' },
        { status: 400 }
      );
    }

    // Validate timezone
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid timezone' },
        { status: 400 }
      );
    }

    // Update timezone
    const updated = await updateUserTimezone(supabase, user.id, timezone);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Failed to update timezone' },
        { status: 500 }
      );
    }

    // Fetch updated credits
    const credits = await getUserCredits(supabase, user.id);

    return NextResponse.json({
      success: true,
      credits,
    });
  } catch (error) {
    console.error('[API/credits] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
