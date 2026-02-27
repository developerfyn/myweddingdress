import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { validatePhotoForTryOn, type PhotoValidationResult } from '@/lib/photo-validation-vision';

export async function POST(request: NextRequest) {
  const requestId = `validate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Authenticate user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    // Validate image format
    if (!image.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid image format. Please upload a valid image.' },
        { status: 400 }
      );
    }

    console.log(`[${requestId}] Validating photo for user ${user.id.substring(0, 8)}...`);

    // Run validation
    const result: PhotoValidationResult = await validatePhotoForTryOn(image);

    console.log(`[${requestId}] Validation result:`, {
      valid: result.valid,
      reason: result.reason,
      details: result.details,
    });

    return NextResponse.json({
      valid: result.valid,
      reason: result.reason,
      details: result.details,
    });

  } catch (error) {
    console.error(`[${requestId}] Validation error:`, error);

    // Check if it's a Google API key error
    if (error instanceof Error && (error.message.includes('API key') || error.message.includes('credentials'))) {
      return NextResponse.json(
        { error: 'Photo validation service not configured' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to validate photo. Please try again.' },
      { status: 500 }
    );
  }
}
