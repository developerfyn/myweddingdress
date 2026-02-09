import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { deductCredits, refundCredits, logUsageSuccess, logUsageFailure, CREDIT_COSTS } from '@/lib/usage-tracking';
import { checkTryOnRateLimit, checkGlobalRateLimit } from '@/lib/rate-limiter';
import { validateBase64Image } from '@/lib/image-validation';
import { verifyRequestFromHeaders } from '@/lib/request-verification';
import { checkTryonCache, saveTryonCache } from '@/lib/tryon-cache';
import { performAbuseCheck, logAbuse, getClientIp, tryAutoBlock } from '@/lib/abuse-detection';
// import { preprocessPersonImage } from '@/lib/image-preprocessing'; // Disabled - was causing ghosting artifacts

// Helper to format duration
function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Helper to get image size in KB
function getBase64Size(base64: string): string {
  const sizeInBytes = (base64.length * 3) / 4;
  return `${(sizeInBytes / 1024).toFixed(2)}KB`;
}

// Helper to poll for prediction status
async function pollForResult(
  predictionId: string,
  apiKey: string,
  requestId: string,
  maxAttempts = 60,
  intervalMs = 2000
 
): Promise<{ success: boolean; output?: string[]; error?: string }> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const statusResponse = await fetch(
      `https://api.fashn.ai/v1/status/${predictionId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    const statusData = await statusResponse.json();
    const status = statusData.status;

    console.log(
      `[${requestId}]    📡 Poll #${attempt}: status = ${status}`
    );

    if (status === 'completed') {
      return { success: true, output: statusData.output };
    }

    if (status === 'failed') {
      return { success: false, error: statusData.error || 'Generation failed' };
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return { success: false, error: 'Timeout waiting for result' };
}

export async function POST(request: NextRequest) {
  const requestId = `tryon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = performance.now();

  console.log('\n' + '='.repeat(60));
  console.log(`[${requestId}] 🎨 FASHN TRY-ON REQUEST STARTED`);
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
        { error: 'Unauthorized. Please log in to use the try-on feature.' },
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
        endpoint: 'tryon',
      });
      return NextResponse.json(
        { error: abuseCheck.reason },
        { status: 403 }
      );
    }
    if (abuseCheck.abuseScore && abuseCheck.abuseScore >= 50) {
      console.log(`[${requestId}] ⚠️ High abuse score detected: ${abuseCheck.abuseScore}`);
    }
    console.log(`[${requestId}] ✅ Step 0.05: Abuse check passed (score: ${abuseCheck.abuseScore || 0})`);

    // Step 0.1: Verify request signature (CSRF protection)
    const signatureCheck = verifyRequestFromHeaders(request, userId);
    if (!signatureCheck.valid) {
      console.log(`[${requestId}] ❌ Request signature invalid: ${signatureCheck.error}`);
      // Log as potential CSRF attack
      await logAbuse(supabase, userId, clientIp, 'invalid_signature', 'high', {
        requestId,
        endpoint: 'tryon',
        error: signatureCheck.error,
      });
      await tryAutoBlock(supabase, userId);
      return NextResponse.json(
        { error: 'Invalid request signature' },
        { status: 403 }
      );
    }
    // Log if request is unsigned (for monitoring)
    const hasSignature = request.headers.get('X-Request-Signature');
    if (!hasSignature) {
      console.log(`[${requestId}] ⚠️ Request unsigned (CSRF protection not enabled on client)`);
    } else {
      console.log(`[${requestId}] ✅ Step 0.1: Request signature verified`);
    }

    // Step 0.25: Check rate limits
    console.log(`[${requestId}] ⏱️ Step 0.25: Checking rate limits...`);

    // Global rate limit (circuit breaker)
    const globalLimit = checkGlobalRateLimit();
    if (!globalLimit.allowed) {
      console.log(`[${requestId}] ❌ Global rate limit exceeded`);
      return NextResponse.json(
        { error: 'Service is busy. Please try again in a moment.' },
        {
          status: 503,
          headers: { 'Retry-After': String(globalLimit.resetInSeconds) }
        }
      );
    }

    // Per-user rate limit
    const userLimit = checkTryOnRateLimit(userId);
    if (!userLimit.allowed) {
      console.log(`[${requestId}] ❌ User rate limit exceeded (${userLimit.limit} per minute)`);
      // Log as abuse
      await logAbuse(supabase, userId, clientIp, 'rate_limit_exceeded', 'medium', {
        requestId,
        endpoint: 'tryon',
        limit: userLimit.limit,
      });
      // Check if should auto-block
      await tryAutoBlock(supabase, userId);
      return NextResponse.json(
        {
          error: `Too many requests. Please wait ${userLimit.resetInSeconds} seconds.`,
          retryAfter: userLimit.resetInSeconds,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(userLimit.resetInSeconds) }
        }
      );
    }

    console.log(`[${requestId}] ✅ Step 0.25: Rate limit OK (${userLimit.remaining}/${userLimit.limit} remaining)`);

    // Step 0.5: Deduct credits (atomic operation)
    console.log(`[${requestId}] 💳 Step 0.5: Deducting credits (${CREDIT_COSTS.tryon} credits for try-on)...`);

    // Dev bypass for testing (only in development)
    const devBypass = request.headers.get('X-Dev-Bypass-Credits') === 'true' && process.env.NODE_ENV !== 'production';

    if (devBypass) {
      console.log(`[${requestId}] ⚠️ DEV BYPASS: Skipping credit deduction (dev tools simulation)`);
    } else {
      const deductResult = await deductCredits(supabase, userId, 'tryon', requestId);

      if (!deductResult.success) {
        console.log(`[${requestId}] ❌ Credit deduction failed: ${deductResult.error_message}`);
        // Log as potential abuse if they keep trying after exhaustion
        await logAbuse(supabase, userId, clientIp, 'credit_exhaustion_attempt', 'low', {
          requestId,
          endpoint: 'tryon',
          error: deductResult.error_message,
          remaining_balance: deductResult.new_balance,
        });
        return NextResponse.json(
          {
            error: deductResult.error_message,
            credits_remaining: deductResult.new_balance,
          },
          { status: 429 }
        );
      }

      creditsDeducted = true;
      console.log(`[${requestId}] ✅ Step 0.5: Credits deducted (${CREDIT_COSTS.tryon} credits, new balance: ${deductResult.new_balance})`);
    }

    // Step 1: Parse request
    const parseStart = performance.now();
    let personImage: string, garmentImage: string, dressId: string | undefined, photoIndex: number | undefined;
    try {
      ({ personImage, garmentImage, dressId, photoIndex } = await request.json());
    } catch {
      // Refund credits on parse error
      if (creditsDeducted) {
        await refundCredits(supabase, userId, 'tryon', requestId);
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

    if (!personImage || !garmentImage) {
      console.log(`[${requestId}] ❌ Error: Missing images`);
      console.log(`[${requestId}]    - personImage: ${personImage ? 'provided' : 'MISSING'}`);
      console.log(`[${requestId}]    - garmentImage: ${garmentImage ? 'provided' : 'MISSING'}`);
      // Refund credits on missing images
      if (creditsDeducted) {
        await refundCredits(supabase, userId, 'tryon', requestId);
        await logUsageFailure(supabase, requestId, 'Missing images', performance.now() - startTime);
        console.log(`[${requestId}] 💸 Credits refunded due to missing images`);
      }
      return NextResponse.json(
        { error: 'Both personImage and garmentImage are required' },
        { status: 400 }
      );
    }

    // Step 1.5: Validate images
    console.log(`[${requestId}] 🖼️ Step 1.5: Validating images...`);
    const personValidation = validateBase64Image(personImage, 'Person image');
    if (!personValidation.valid) {
      console.log(`[${requestId}] ❌ Person image validation failed: ${personValidation.error}`);
      // Log as potential abuse (could be someone trying to send malformed data)
      await logAbuse(supabase, userId, clientIp, 'invalid_image', 'low', {
        requestId,
        endpoint: 'tryon',
        imageType: 'person',
        error: personValidation.error,
      });
      // Refund credits on validation failure
      if (creditsDeducted) {
        await refundCredits(supabase, userId, 'tryon', requestId);
        await logUsageFailure(supabase, requestId, personValidation.error || 'Invalid person image', performance.now() - startTime);
        console.log(`[${requestId}] 💸 Credits refunded due to image validation failure`);
      }
      return NextResponse.json(
        { error: personValidation.error },
        { status: 400 }
      );
    }

    const garmentValidation = validateBase64Image(garmentImage, 'Garment image');
    if (!garmentValidation.valid) {
      console.log(`[${requestId}] ❌ Garment image validation failed: ${garmentValidation.error}`);
      await logAbuse(supabase, userId, clientIp, 'invalid_image', 'low', {
        requestId,
        endpoint: 'tryon',
        imageType: 'garment',
        error: garmentValidation.error,
      });
      // Refund credits on validation failure
      if (creditsDeducted) {
        await refundCredits(supabase, userId, 'tryon', requestId);
        await logUsageFailure(supabase, requestId, garmentValidation.error || 'Invalid garment image', performance.now() - startTime);
        console.log(`[${requestId}] 💸 Credits refunded due to image validation failure`);
      }
      return NextResponse.json(
        { error: garmentValidation.error },
        { status: 400 }
      );
    }
    console.log(`[${requestId}] ✅ Step 1.5: Images validated`);
    console.log(`[${requestId}]    - Person: ${personValidation.format}, ${((personValidation.sizeBytes || 0) / 1024).toFixed(1)}KB${personValidation.width ? `, ${personValidation.width}x${personValidation.height}` : ''}`);
    console.log(`[${requestId}]    - Garment: ${garmentValidation.format}, ${((garmentValidation.sizeBytes || 0) / 1024).toFixed(1)}KB${garmentValidation.width ? `, ${garmentValidation.width}x${garmentValidation.height}` : ''}`);

    // Step 1.6: Skipping image preprocessing (disabled - was causing ghosting artifacts)
    // FASHN API will handle the image as-is
    console.log(`[${requestId}] ℹ️ Step 1.6: Using original person image (preprocessing disabled)`);

    // Note: PRO dress validation removed - all gowns are now free
    // Usage limits are controlled via credit system instead

    // Step 1.8: Check cache (uses dress_id for catalog dresses, garment hash for custom uploads)
    console.log(`[${requestId}] 💾 Step 1.8: Checking cache...`);
    console.log(`[${requestId}]    - Key: ${dressId ? `dress_id="${dressId}"` : 'garment_hash (custom upload)'}`);
    const cacheResult = await checkTryonCache(supabase, userId, personImage, dressId ?? null, garmentImage);

    if (cacheResult?.found) {
      const cacheTime = performance.now() - startTime;
      console.log(`[${requestId}] ✅ CACHE HIT! Processing cached result...`);

      let cachedImage: string | null = null;

      // Check if result_url is a storage path (prefixed with "storage:")
      if (cacheResult.result_url?.startsWith('storage:')) {
        const storagePath = cacheResult.result_url.substring(8); // Remove "storage:" prefix
        console.log(`[${requestId}]    - Source: storage path, generating fresh signed URL`);

        // Generate fresh signed URL for the stored image
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('tryon-results')
          .createSignedUrl(storagePath, 3600); // 1 hour expiry

        if (signedUrlError || !signedUrlData?.signedUrl) {
          console.log(`[${requestId}] ⚠️ Failed to generate signed URL for cached result, treating as cache miss`);
          // Fall through to API call
        } else {
          cachedImage = signedUrlData.signedUrl;
        }
      } else if (cacheResult.result_base64) {
        console.log(`[${requestId}]    - Source: base64`);
        cachedImage = cacheResult.result_base64;
      } else if (cacheResult.result_url) {
        // Legacy: direct URL (old public URLs or signed URLs)
        console.log(`[${requestId}]    - Source: legacy URL`);
        cachedImage = cacheResult.result_url;
      }

      if (cachedImage) {
        console.log(`[${requestId}] ⏱️  Cache lookup: ${formatDuration(cacheTime)}`);

        // Refund credits on cache hit since no API call was made
        if (creditsDeducted) {
          await refundCredits(supabase, userId, 'tryon', requestId);
          console.log(`[${requestId}] 💸 Credits refunded (cache hit)`);
        }
        console.log(`[${requestId}] 💰 Cost: 0 credits (cached - saved 2 credits / $0.075)`);
        console.log('-'.repeat(60) + '\n');

        return NextResponse.json({
          success: true,
          image: cachedImage,
          cached: true,
          cacheId: cacheResult.cache_id,
          timing: {
            total: cacheTime,
            apiCall: 0,
            breakdown: {
              parse: parseTime,
              cacheHit: cacheTime - parseTime,
            },
          },
        });
      }
    }
    console.log(`[${requestId}] ℹ️ Step 1.8: Cache miss, proceeding with API call`);

    // Usage is already logged by deduct_credits function
    console.log(`[${requestId}] 📝 Usage logged via deduct_credits (request_id: ${requestId})`)

    // Log image sizes
    console.log(`[${requestId}] 📊 Image sizes:`);
    console.log(`[${requestId}]    - Person image: ${getBase64Size(personImage)}`);
    console.log(`[${requestId}]    - Garment image: ${getBase64Size(garmentImage)}`);

    const apiKey = process.env.FASHN_API_KEY;
    if (!apiKey) {
      console.log(`[${requestId}] ❌ Error: FASHN_API_KEY not configured`);
      // Refund credits on server configuration error
      if (creditsDeducted) {
        await refundCredits(supabase, userId, 'tryon', requestId);
        await logUsageFailure(supabase, requestId, 'FASHN_API_KEY not configured', performance.now() - startTime);
        console.log(`[${requestId}] 💸 Credits refunded due to server error`);
      }
      return NextResponse.json(
        { error: 'FASHN API key not configured' },
        { status: 500 }
      );
    }
    console.log(`[${requestId}] ✅ Step 2: API key verified`);

    // Step 3: Call FASHN API
    console.log(`[${requestId}] 🚀 Step 3: Calling FASHN API...`);
    console.log(`[${requestId}]    - Model: tryon-v1.6`);
    console.log(`[${requestId}]    - Mode: quality`);
    console.log(`[${requestId}]    - Category: one-pieces`);
    console.log(`[${requestId}]    - Return base64: true (60 min FASHN retention vs 72hr CDN)`);
    const apiStart = performance.now();

    const fashnResponse = await fetch('https://api.fashn.ai/v1/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model_name: 'tryon-v1.6',
        inputs: {
          model_image: personImage, // Use original image (preprocessing disabled)
          garment_image: garmentImage,
          category: 'one-pieces', // Wedding dresses are one-pieces
          mode: 'quality',
          output_format: 'png',
          return_base64: true, // Return base64 for privacy (FASHN keeps only 60 min vs 72hr CDN)
        },
      }),
    });

    const initTime = performance.now() - apiStart;
    console.log(`[${requestId}] ✅ Step 3: Initial request completed in ${formatDuration(initTime)}`);

    if (!fashnResponse.ok) {
      const errorText = await fashnResponse.text();
      console.log(`[${requestId}] ❌ FASHN API error: ${fashnResponse.status}`);
      console.log(`[${requestId}]    ${errorText}`);

      // Refund credits on failure
      if (creditsDeducted) {
        console.log(`[${requestId}] 💰 Refunding ${CREDIT_COSTS.tryon} credits due to API error...`);
        await refundCredits(supabase, userId, 'tryon', requestId);
      }

      // Update usage log with failed status
      await logUsageFailure(supabase, requestId, `FASHN API error: ${errorText}`, performance.now() - startTime);

      return NextResponse.json(
        { error: `FASHN API error: ${errorText}` },
        { status: fashnResponse.status }
      );
    }

    const initData = await fashnResponse.json();
    const predictionId = initData.id;
    console.log(`[${requestId}] 📋 Prediction ID: ${predictionId}`);

    // Step 4: Poll for result
    console.log(`[${requestId}] ⏳ Step 4: Polling for result...`);
    const pollStart = performance.now();

    const result = await pollForResult(predictionId, apiKey, requestId);

    const pollTime = performance.now() - pollStart;
    const apiTime = performance.now() - apiStart;

    if (!result.success) {
      console.log(`[${requestId}] ❌ Try-on failed: ${result.error}`);

      // Refund credits on failure
      if (creditsDeducted) {
        console.log(`[${requestId}] 💰 Refunding ${CREDIT_COSTS.tryon} credits due to generation failure...`);
        await refundCredits(supabase, userId, 'tryon', requestId);
      }

      // Update usage log with failed status
      await logUsageFailure(supabase, requestId, result.error || 'Try-on failed', performance.now() - startTime);

      return NextResponse.json(
        { error: result.error || 'Try-on failed' },
        { status: 500 }
      );
    }

    // Step 5: Process the result image (base64 from FASHN)
    console.log(`[${requestId}] 🔄 Step 5: Processing result image...`);
    const fetchStart = performance.now();

    const imageOutput = result.output?.[0];
    if (!imageOutput) {
      console.log(`[${requestId}] ❌ No output image received`);
      // Refund credits on missing output
      if (creditsDeducted) {
        await refundCredits(supabase, userId, 'tryon', requestId);
        await logUsageFailure(supabase, requestId, 'No output image received', performance.now() - startTime);
        console.log(`[${requestId}] 💸 Credits refunded due to missing output`);
      }
      return NextResponse.json(
        { error: 'No output image received' },
        { status: 500 }
      );
    }

    // With return_base64: true, output is base64 string (may have data URI prefix)
    let imageBuffer: Buffer;
    if (imageOutput.startsWith('data:')) {
      // Has data URI prefix - extract base64 part
      const base64Data = imageOutput.split(',')[1];
      imageBuffer = Buffer.from(base64Data, 'base64');
      console.log(`[${requestId}]    - Received base64 with data URI (${(imageBuffer.length / 1024).toFixed(1)}KB)`);
    } else if (imageOutput.startsWith('http')) {
      // Fallback: URL (shouldn't happen with return_base64: true, but handle just in case)
      console.log(`[${requestId}]    - Received URL, fetching: ${imageOutput.substring(0, 60)}...`);
      const imageResponse = await fetch(imageOutput);
      imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    } else {
      // Raw base64 string
      imageBuffer = Buffer.from(imageOutput, 'base64');
      console.log(`[${requestId}]    - Received raw base64 (${(imageBuffer.length / 1024).toFixed(1)}KB)`);
    }

    // Upload result to Supabase Storage (tryon-results bucket - private)
    const resultFileName = `${userId}/${requestId}.png`;
    console.log(`[${requestId}] 📤 Uploading result to private Supabase Storage...`);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('tryon-results')
      .upload(resultFileName, Buffer.from(imageBuffer), {
        contentType: 'image/png',
        cacheControl: '604800', // 7 days
        upsert: false,
      });

    let resultUrl: string;
    let storagePath: string | null = null;
    if (uploadError) {
      console.log(`[${requestId}] ⚠️ Storage upload failed: ${uploadError.message}, falling back to base64`);
      // Fall back to base64 if upload fails
      resultUrl = `data:image/png;base64,${Buffer.from(imageBuffer).toString('base64')}`;
    } else {
      storagePath = uploadData.path;
      // Generate signed URL (valid for 1 hour) for private bucket access
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('tryon-results')
        .createSignedUrl(uploadData.path, 3600); // 1 hour expiry

      if (signedUrlError || !signedUrlData?.signedUrl) {
        console.log(`[${requestId}] ⚠️ Signed URL generation failed, falling back to base64`);
        resultUrl = `data:image/png;base64,${Buffer.from(imageBuffer).toString('base64')}`;
      } else {
        resultUrl = signedUrlData.signedUrl;
        console.log(`[${requestId}] ✅ Result uploaded with signed URL (1hr expiry): ${resultUrl.substring(0, 60)}...`);
      }
    }

    const fetchTime = performance.now() - fetchStart;
    const totalTime = performance.now() - startTime;

    console.log(`[${requestId}] ✅ Step 5: Image fetched and uploaded in ${formatDuration(fetchTime)}`);

    console.log('\n' + '-'.repeat(60));
    console.log(`[${requestId}] ✅ FASHN TRY-ON COMPLETE`);
    console.log(`[${requestId}] ⏱️  TOTAL TIME: ${formatDuration(totalTime)}`);
    console.log(`[${requestId}] 📈 Breakdown:`);
    console.log(`[${requestId}]    - Parse request: ${formatDuration(parseTime)}`);
    console.log(`[${requestId}]    - FASHN API total: ${formatDuration(apiTime)} ⭐`);
    console.log(`[${requestId}]      - Initial request: ${formatDuration(initTime)}`);
    console.log(`[${requestId}]      - Polling: ${formatDuration(pollTime)}`);
    console.log(`[${requestId}]    - Fetch + upload result: ${formatDuration(fetchTime)}`);
    console.log(`[${requestId}] 💰 Cost: 2 credits (~$0.075)`);
    console.log('-'.repeat(60) + '\n');

    // Update usage log with success status
    await logUsageSuccess(supabase, requestId, totalTime);
    console.log(`[${requestId}] 📝 Usage log updated (success)`);

    // Save to cache for future requests (uses dress_id as key for catalog dresses)
    // Store the storage path (prefixed with "storage:") so we can generate fresh signed URLs on retrieval
    console.log(`[${requestId}] 💾 Saving result to cache...`);
    console.log(`[${requestId}]    - Key: ${dressId ? `dress_id="${dressId}"` : 'garment_hash (custom upload)'}`);

    // If we have a storage path, save it with prefix; otherwise save the result URL (for base64 fallback)
    const cacheUrl = storagePath ? `storage:${storagePath}` : resultUrl;
    const cacheSaveResult = await saveTryonCache(
      supabase,
      userId,
      personImage,
      dressId || null,
      garmentImage,
      cacheUrl,
      null
    );
    if (cacheSaveResult.success) {
      console.log(`[${requestId}] ✅ Result cached for 7 days (id: ${cacheSaveResult.cache_id})`);
    } else {
      console.log(`[${requestId}] ⚠️ Failed to cache result`);
    }

    return NextResponse.json({
      success: true,
      image: resultUrl,
      cached: false,
      timing: {
        total: totalTime,
        apiCall: apiTime,
        breakdown: {
          parse: parseTime,
          fashnApi: apiTime,
          initRequest: initTime,
          polling: pollTime,
          fetchResult: fetchTime,
        },
      },
    });
  } catch (error) {
    const totalTime = performance.now() - startTime;
    console.log('\n' + '!'.repeat(60));
    console.log(`[${requestId}] ❌ TRY-ON ERROR`);
    console.log(`[${requestId}] ⏱️  Time elapsed: ${formatDuration(totalTime)}`);
    console.log(`[${requestId}] 🔴 Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
    console.log(`[${requestId}] 🔴 Error message: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.log(`[${requestId}] 📜 Stack trace:`);
      console.log(
        error.stack
          .split('\n')
          .slice(0, 5)
          .map((line) => `[${requestId}]    ${line}`)
          .join('\n')
      );
    }
    console.log('!'.repeat(60) + '\n');

    // Refund credits on error (if they were deducted)
    if (creditsDeducted && userId) {
      try {
        console.log(`[${requestId}] 💰 Refunding credits due to error...`);
        await refundCredits(supabase, userId, 'tryon', requestId);
        await logUsageFailure(supabase, requestId, error instanceof Error ? error.message : 'Unknown error', totalTime);
        console.log(`[${requestId}] 💸 Credits refunded due to error`);
      } catch (refundError) {
        console.log(`[${requestId}] ⚠️ Failed to refund credits: ${refundError}`);
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Try-on failed' },
      { status: 500 }
    );
  }
}
