import { fal } from '@fal-ai/client';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { deductCredits, refundCredits, logUsageSuccess, logUsageFailure, CREDIT_COSTS } from '@/lib/usage-tracking';
import { checkVideoGenerationRateLimit, checkGlobalRateLimit } from '@/lib/rate-limiter';
import { validateBase64Image } from '@/lib/image-validation';
import { verifyRequestFromHeaders } from '@/lib/request-verification';
import { performAbuseCheck, logAbuse, getClientIp, tryAutoBlock } from '@/lib/abuse-detection';

// Configure FAL.ai client
fal.config({
  credentials: process.env.FAL_KEY,
});

// Bridal fitting room video prompt for wedding dress try-on
const VIDEO_PROMPT = `The model in the image performs a slow, elegant 360-degree turn in place in a bridal fitting room, showcasing every angle of the wedding dress. She turns steadily and gracefully, revealing the front, side profile, back details, and returning to face the camera. The dress fabric flows and catches the light as she turns.

The setting is a warm bridal fitting room with soft curtains, a large mirror visible in the background, and warm ambient lighting. The mood is intimate and personal, like a private bridal appointment.

Lighting is soft and warm, flattering skin tones. The model's expression is natural and joyful — a genuine smile, like she just found her dress. The camera is static and steady at waist height, framing the full body and dress.`;

const NEGATIVE_PROMPT = 'blur, distort, low quality, exaggerated movement, face morphing, face change, cartoon, anime, disfigured, deformed, stiff, robotic, multiple people';

// Helper to format duration
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Helper to get image size in KB
function getBase64Size(base64: string): string {
  const padding = (base64.match(/=+$/) || [''])[0].length;
  const sizeInBytes = (base64.length * 3) / 4 - padding;
  return `${(sizeInBytes / 1024).toFixed(2)}KB`;
}

export async function POST(request: NextRequest) {
  const requestId = `vid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = performance.now();

  console.log('\n' + '='.repeat(60));
  console.log(`[${requestId}] 🎬 VIDEO GENERATION REQUEST STARTED`);
  console.log(`[${requestId}] ⏰ Timestamp: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  // Initialize Supabase client for auth and logging
  const supabase = await createServerSupabaseClient();
  let userId: string | null = null;
  let creditsDeducted = false;

  try {
    // Step 0: Authenticate user
    console.log(`[${requestId}] 🔐 Step 0: Authenticating user...`);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log(`[${requestId}] ❌ Authentication failed: ${authError?.message || 'No user session'}`);
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to generate video.' },
        { status: 401 }
      );
    }

    userId = user.id;
    const clientIp = getClientIp(request);
    console.log(`[${requestId}] ✅ Step 0: User authenticated (${user.email})`);

    // Step 0.05: Check for abuse/blocks
    console.log(`[${requestId}] 🛡️ Step 0.05: Checking abuse status...`);
    const abuseCheck = await performAbuseCheck(supabase, userId, clientIp);
    if (abuseCheck.blocked) {
      console.log(`[${requestId}] ❌ User/IP blocked: ${abuseCheck.reason}`);
      await logAbuse(supabase, userId, clientIp, 'blocked_user_attempt', 'high', {
        requestId,
        endpoint: 'video_generation',
      });
      return NextResponse.json(
        { error: abuseCheck.reason },
        { status: 403 }
      );
    }
    console.log(`[${requestId}] ✅ Step 0.05: Abuse check passed (score: ${abuseCheck.abuseScore || 0})`);

    // Step 0.1: Verify request signature (CSRF protection)
    const signatureCheck = verifyRequestFromHeaders(request, userId);
    if (!signatureCheck.valid) {
      console.log(`[${requestId}] ❌ Request signature invalid: ${signatureCheck.error}`);
      await logAbuse(supabase, userId, clientIp, 'invalid_signature', 'high', {
        requestId,
        endpoint: 'video_generation',
        error: signatureCheck.error,
      });
      await tryAutoBlock(supabase, userId);
      return NextResponse.json(
        { error: 'Invalid request signature' },
        { status: 403 }
      );
    }
    const hasSignature = request.headers.get('X-Request-Signature');
    if (!hasSignature) {
      console.log(`[${requestId}] ⚠️ Request unsigned (CSRF protection not enabled on client)`);
    } else {
      console.log(`[${requestId}] ✅ Step 0.1: Request signature verified`);
    }

    // Step 0.25: Check rate limits
    console.log(`[${requestId}] ⏱️ Step 0.25: Checking rate limits...`);

    const globalLimit = checkGlobalRateLimit();
    if (!globalLimit.allowed) {
      console.log(`[${requestId}] ❌ Global rate limit exceeded`);
      return NextResponse.json(
        { error: 'Service is busy. Please try again in a moment.' },
        { status: 503, headers: { 'Retry-After': String(globalLimit.resetInSeconds) } }
      );
    }

    const userLimit = checkVideoGenerationRateLimit(userId);
    if (!userLimit.allowed) {
      console.log(`[${requestId}] ❌ User rate limit exceeded (${userLimit.limit} per minute)`);
      await logAbuse(supabase, userId, clientIp, 'rate_limit_exceeded', 'medium', {
        requestId,
        endpoint: 'video_generation',
        limit: userLimit.limit,
      });
      await tryAutoBlock(supabase, userId);
      return NextResponse.json(
        {
          error: `Too many requests. Please wait ${userLimit.resetInSeconds} seconds.`,
          retryAfter: userLimit.resetInSeconds,
        },
        { status: 429, headers: { 'Retry-After': String(userLimit.resetInSeconds) } }
      );
    }

    console.log(`[${requestId}] ✅ Step 0.25: Rate limit OK (${userLimit.remaining}/${userLimit.limit} remaining)`);

    // Step 0.5: Deduct credits (atomic operation)
    console.log(`[${requestId}] 💳 Step 0.5: Deducting credits...`);

    const devBypass = request.headers.get('X-Dev-Bypass-Credits') === 'true' && process.env.NODE_ENV !== 'production';
    if (devBypass) {
      console.log(`[${requestId}] ⚠️ DEV BYPASS: Skipping credit deduction (dev tools simulation)`);
    }

    if (!devBypass) {
      const deductResult = await deductCredits(supabase, userId, 'video_generation', requestId);

      if (!deductResult.success) {
        console.log(`[${requestId}] ❌ Credit deduction failed: ${deductResult.error_message}`);
        return NextResponse.json(
          {
            error: deductResult.error_message || 'Insufficient credits',
            credits_remaining: deductResult.new_balance,
          },
          { status: 429 }
        );
      }

      creditsDeducted = true;
      console.log(`[${requestId}] ✅ Step 0.5: ${CREDIT_COSTS.video_generation} credits deducted (${deductResult.new_balance} remaining)`);
    }

    // Step 1: Parse request
    const parseStart = performance.now();
    let image: string;
    try {
      ({ image } = await request.json());
    } catch {
      // Refund credits on parse error
      if (creditsDeducted) {
        await refundCredits(supabase, userId, 'video_generation', requestId);
        await logUsageFailure(supabase, requestId, 'Invalid request body', performance.now() - startTime);
        console.log(`[${requestId}] 💸 Credits refunded due to parse error`);
      }
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    const parseTime = performance.now() - parseStart;
    console.log(`[${requestId}] ✅ Step 1: Request parsed in ${formatDuration(parseTime)}`);

    if (!image) {
      console.log(`[${requestId}] ❌ Error: No image provided`);
      // Refund credits on missing image
      if (creditsDeducted) {
        await refundCredits(supabase, userId, 'video_generation', requestId);
        await logUsageFailure(supabase, requestId, 'Image is required', performance.now() - startTime);
        console.log(`[${requestId}] 💸 Credits refunded due to missing image`);
      }
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    // Step 1.4: Handle proxy URLs - convert to base64
    let processedImage = image;
    if (image.startsWith('/api/tryon-image')) {
      console.log(`[${requestId}] 🔄 Step 1.4: Fetching image from proxy URL...`);
      try {
        // Build absolute URL for server-side fetch
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://myweddingdress.app';
        const absoluteUrl = `${baseUrl}${image}`;

        // Forward cookies for authentication
        const cookieHeader = request.headers.get('cookie') || '';

        const proxyResponse = await fetch(absoluteUrl, {
          headers: {
            'Cookie': cookieHeader,
          },
        });

        if (!proxyResponse.ok) {
          throw new Error(`Proxy fetch failed: ${proxyResponse.status}`);
        }

        const imageBuffer = await proxyResponse.arrayBuffer();
        const contentType = proxyResponse.headers.get('content-type') || 'image/png';
        processedImage = `data:${contentType};base64,${Buffer.from(imageBuffer).toString('base64')}`;
        console.log(`[${requestId}] ✅ Step 1.4: Image fetched and converted to base64 (${(imageBuffer.byteLength / 1024).toFixed(1)}KB)`);
      } catch (err) {
        console.log(`[${requestId}] ❌ Failed to fetch proxy image: ${err}`);
        if (creditsDeducted) {
          await refundCredits(supabase, userId, 'video_generation', requestId);
          await logUsageFailure(supabase, requestId, 'Failed to fetch try-on image', performance.now() - startTime);
          console.log(`[${requestId}] 💸 Credits refunded due to proxy fetch failure`);
        }
        return NextResponse.json(
          { error: 'Failed to fetch try-on image. Please try again.' },
          { status: 400 }
        );
      }
    }

    // Step 1.5: Validate image
    console.log(`[${requestId}] 🖼️ Step 1.5: Validating image...`);
    const imageValidation = validateBase64Image(processedImage, 'Input image');
    if (!imageValidation.valid) {
      console.log(`[${requestId}] ❌ Image validation failed: ${imageValidation.error}`);
      // Refund credits on validation failure
      if (creditsDeducted) {
        await refundCredits(supabase, userId, 'video_generation', requestId);
        await logUsageFailure(supabase, requestId, imageValidation.error || 'Image validation failed', performance.now() - startTime);
        console.log(`[${requestId}] 💸 Credits refunded due to image validation failure`);
      }
      return NextResponse.json(
        { error: imageValidation.error },
        { status: 400 }
      );
    }
    console.log(`[${requestId}] ✅ Step 1.5: Image validated`);
    console.log(`[${requestId}]    - Format: ${imageValidation.format}, ${((imageValidation.sizeBytes || 0) / 1024).toFixed(1)}KB${imageValidation.width ? `, ${imageValidation.width}x${imageValidation.height}` : ''}`);

    // Step 2: Verify FAL.ai API key
    if (!process.env.FAL_KEY) {
      console.log(`[${requestId}] ❌ Error: FAL_KEY not configured`);
      // Refund credits on server configuration error
      if (creditsDeducted) {
        await refundCredits(supabase, userId, 'video_generation', requestId);
        await logUsageFailure(supabase, requestId, 'FAL_KEY not configured', performance.now() - startTime);
        console.log(`[${requestId}] 💸 Credits refunded due to server error`);
      }
      return NextResponse.json(
        { error: 'FAL.ai API key not configured' },
        { status: 500 }
      );
    }
    console.log(`[${requestId}] ✅ Step 2: FAL.ai API key verified`);

    // Step 2.5: Upload image to FAL.ai storage
    console.log(`[${requestId}] 📤 Step 2.5: Uploading image to FAL.ai storage...`);
    const uploadStart = performance.now();

    // Convert base64 data URI to blob for upload
    const base64Data = processedImage.split(',')[1];
    const mimeType = processedImage.match(/data:([^;]+);/)?.[1] || 'image/png';
    const binaryData = Buffer.from(base64Data, 'base64');
    const blob = new Blob([binaryData], { type: mimeType });
    const file = new File([blob], 'tryon-image.png', { type: mimeType });

    const imageUrl = await fal.storage.upload(file);
    const uploadTime = performance.now() - uploadStart;
    console.log(`[${requestId}] ✅ Step 2.5: Image uploaded in ${formatDuration(uploadTime)}`);
    console.log(`[${requestId}]    - FAL URL: ${imageUrl.substring(0, 80)}...`);

    // Step 3: Configure Kling model
    const modelId = 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video';
    console.log(`[${requestId}] 📋 Step 3: Model configuration:`);
    console.log(`[${requestId}]    - Model: Kling 2.5 Turbo Pro (via FAL.ai)`);
    console.log(`[${requestId}]    - Duration: 5 seconds`);
    console.log(`[${requestId}]    - Aspect ratio: matches input image`);
    console.log(`[${requestId}]    - Estimated cost: ~$0.35`);

    // Step 4: Call Kling via FAL.ai
    console.log(`[${requestId}] 🚀 Step 4: Calling Kling 2.5 Turbo Pro via FAL.ai...`);
    console.log(`[${requestId}]    ⏳ This typically takes 2-3 minutes...`);
    const apiStart = performance.now();

    // Log progress updates
    const progressInterval = setInterval(() => {
      const elapsed = performance.now() - apiStart;
      console.log(`[${requestId}]    ⏳ Still processing... ${formatDuration(elapsed)} elapsed`);
    }, 10000);

    let result;
    try {
      result = await fal.subscribe(modelId, {
        input: {
          prompt: VIDEO_PROMPT,
          image_url: imageUrl,
          duration: '5',
          negative_prompt: NEGATIVE_PROMPT,
          cfg_scale: 0.5,
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === 'IN_QUEUE') {
            console.log(`[${requestId}]    📋 Status: In queue...`);
          } else if (update.status === 'IN_PROGRESS') {
            console.log(`[${requestId}]    🔄 Status: Processing...`);
          }
        },
      });
    } finally {
      clearInterval(progressInterval);
    }
    const apiTime = performance.now() - apiStart;
    console.log(`[${requestId}] ✅ Step 4: Kling completed in ${formatDuration(apiTime)}`);

    // Step 5: Process output
    // FAL.ai returns { video: { url: string, ... } }
    const processStart = performance.now();
    console.log(`[${requestId}] 🔍 Step 5: Processing output...`);

    const data = result.data;
    console.log(`[${requestId}]    - Result data keys: ${Object.keys(data).join(', ')}`);

    // Extract video URL - typed output is { video: File } where File has .url
    let videoUrl: string | null = null;

    if (data.video && typeof data.video === 'object' && 'url' in data.video) {
      videoUrl = (data.video as any).url;
      console.log(`[${requestId}]    - Found video.url`);
    }

    const processTime = performance.now() - processStart;

    if (videoUrl && typeof videoUrl === 'string') {
      const totalTime = performance.now() - startTime;

      console.log(`[${requestId}] ✅ Step 5: Output processed in ${formatDuration(processTime)}`);
      console.log(`[${requestId}]    - Video URL: ${videoUrl.substring(0, 80)}...`);

      console.log('\n' + '-'.repeat(60));
      console.log(`[${requestId}] ✅ VIDEO GENERATION COMPLETE`);
      console.log(`[${requestId}] ⏱️  TOTAL TIME: ${formatDuration(totalTime)}`);
      console.log(`[${requestId}] 📈 Breakdown:`);
      console.log(`[${requestId}]    - Parse request: ${formatDuration(parseTime)}`);
      console.log(`[${requestId}]    - Upload image: ${formatDuration(uploadTime)}`);
      console.log(`[${requestId}]    - Kling API: ${formatDuration(apiTime)} ⭐`);
      console.log(`[${requestId}]    - Process output: ${formatDuration(processTime)}`);
      console.log(`[${requestId}] 💰 Cost: ${CREDIT_COSTS.video_generation} credits (~$0.35)`);
      console.log('-'.repeat(60) + '\n');

      // Update usage log with success status
      if (creditsDeducted) {
        await logUsageSuccess(supabase, requestId, totalTime);
        console.log(`[${requestId}] 📝 Usage logged as success`);
      }

      return NextResponse.json({
        success: true,
        videoUrl,
        timing: {
          total: totalTime,
          apiCall: apiTime,
          breakdown: {
            parse: parseTime,
            upload: uploadTime,
            klingApi: apiTime,
            process: processTime,
          },
        },
      });
    }

    // Failed to extract video URL
    const totalTime = performance.now() - startTime;
    console.log(`[${requestId}] ❌ VIDEO GENERATION FAILED: Could not find video URL in output`);
    console.log(`[${requestId}]    - Raw output: ${JSON.stringify(data).substring(0, 500)}`);
    console.log(`[${requestId}] ⏱️  Time elapsed: ${formatDuration(totalTime)}`);

    // Refund credits on API failure
    if (creditsDeducted) {
      await refundCredits(supabase, userId, 'video_generation', requestId);
      await logUsageFailure(supabase, requestId, 'Could not extract video URL from response', totalTime);
      console.log(`[${requestId}] 💸 Credits refunded due to generation failure`);
    }

    return NextResponse.json(
      { error: 'Failed to generate video. Please try again.' },
      { status: 500 }
    );

  } catch (error) {
    const totalTime = performance.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.log('\n' + '!'.repeat(60));
    console.log(`[${requestId}] ❌ VIDEO GENERATION ERROR`);
    console.log(`[${requestId}] ⏱️  Time elapsed: ${formatDuration(totalTime)}`);
    console.log(`[${requestId}] 🔴 Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
    console.log(`[${requestId}] 🔴 Error message: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      console.log(`[${requestId}] 📜 Stack trace:`);
      console.log(error.stack.split('\n').slice(0, 5).map(line => `[${requestId}]    ${line}`).join('\n'));
    }
    console.log('!'.repeat(60) + '\n');

    // Refund credits on any error after deduction
    if (creditsDeducted && userId) {
      try {
        await refundCredits(supabase, userId, 'video_generation', requestId);
        await logUsageFailure(supabase, requestId, errorMessage, totalTime);
        console.log(`[${requestId}] 💸 Credits refunded due to error`);
      } catch (refundError) {
        console.error(`[${requestId}] ⚠️ Failed to refund credits:`, refundError);
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
