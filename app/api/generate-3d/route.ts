import Replicate from 'replicate';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { canUserPerformAction } from '@/lib/usage-tracking';
import { check3DGenerationRateLimit, checkGlobalRateLimit } from '@/lib/rate-limiter';
import { validateBase64Image } from '@/lib/image-validation';
import { verifyRequestFromHeaders } from '@/lib/request-verification';
import { performAbuseCheck, logAbuse, getClientIp, tryAutoBlock } from '@/lib/abuse-detection';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Helper to format duration
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Helper to get image size in KB
function getBase64Size(base64: string): string {
  const padding = (base64.match(/=+$/) || [''])[0].length;
  const sizeInBytes = (base64.length * 3) / 4 - padding;
  return `${(sizeInBytes / 1024).toFixed(2)}KB`;
}

export async function POST(request: NextRequest) {
  const requestId = `3d-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = performance.now();

  console.log('\n' + '='.repeat(60));
  console.log(`[${requestId}] 🧊 3D GENERATION REQUEST STARTED`);
  console.log(`[${requestId}] ⏰ Timestamp: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  // Initialize Supabase client for auth and logging
  const supabase = await createServerSupabaseClient();
  let userId: string | null = null;
  let usageLogId: string | null = null;

  try {
    // Step 0: Authenticate user
    console.log(`[${requestId}] 🔐 Step 0: Authenticating user...`);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log(`[${requestId}] ❌ Authentication failed: ${authError?.message || 'No user session'}`);
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to use the 3D generation feature.' },
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
        endpoint: '3d_generation',
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
      await logAbuse(supabase, userId, clientIp, 'invalid_signature', 'high', {
        requestId,
        endpoint: '3d_generation',
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
    const userLimit = check3DGenerationRateLimit(userId);
    if (!userLimit.allowed) {
      console.log(`[${requestId}] ❌ User rate limit exceeded (${userLimit.limit} per minute)`);
      await logAbuse(supabase, userId, clientIp, 'rate_limit_exceeded', 'medium', {
        requestId,
        endpoint: '3d_generation',
        limit: userLimit.limit,
      });
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

    // Step 0.5: Check credits
    console.log(`[${requestId}] 💳 Step 0.5: Checking credits...`);

    // Dev bypass for testing (only in development)
    const devBypass = request.headers.get('X-Dev-Bypass-Credits') === 'true' && process.env.NODE_ENV !== 'production';
    if (devBypass) {
      console.log(`[${requestId}] ⚠️ DEV BYPASS: Skipping credit check (dev tools simulation)`);
    }

    const permission = await canUserPerformAction(supabase, userId, '3d_generation');

    if (!permission) {
      console.log(`[${requestId}] ❌ Failed to check credits`);
      return NextResponse.json(
        { error: 'Failed to verify subscription. Please try again.' },
        { status: 500 }
      );
    }

    if (!permission.allowed && !devBypass) {
      console.log(`[${requestId}] ❌ Credit check failed: ${permission.reason}`);
      console.log(`[${requestId}]    - Plan: ${permission.plan}`);
      console.log(`[${requestId}]    - Used: ${permission.credits_used}/${permission.credits_limit}`);
      await logAbuse(supabase, userId, clientIp, 'credit_exhaustion_attempt', 'low', {
        requestId,
        endpoint: '3d_generation',
        plan: permission.plan,
        credits_used: permission.credits_used,
        credits_limit: permission.credits_limit,
      });
      return NextResponse.json(
        {
          error: permission.reason,
          credits_used: permission.credits_used,
          credits_limit: permission.credits_limit,
          plan: permission.plan,
        },
        { status: 429 }
      );
    }

    console.log(`[${requestId}] ✅ Step 0.5: Credits OK (${permission.credits_used}/${permission.credits_limit} used, plan: ${permission.plan}${devBypass ? ', DEV BYPASS' : ''})`);

    // Step 1: Parse request
    const parseStart = performance.now();
    let image: string;
    try {
      ({ image } = await request.json());
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    const parseTime = performance.now() - parseStart;
    console.log(`[${requestId}] ✅ Step 1: Request parsed in ${formatDuration(parseTime)}`);

    if (!image) {
      console.log(`[${requestId}] ❌ Error: No image provided`);
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    // Step 1.5: Validate image
    console.log(`[${requestId}] 🖼️ Step 1.5: Validating image...`);
    const imageValidation = validateBase64Image(image, 'Input image');
    if (!imageValidation.valid) {
      console.log(`[${requestId}] ❌ Image validation failed: ${imageValidation.error}`);
      await logAbuse(supabase, userId, clientIp, 'invalid_image', 'low', {
        requestId,
        endpoint: '3d_generation',
        error: imageValidation.error,
      });
      return NextResponse.json(
        { error: imageValidation.error },
        { status: 400 }
      );
    }
    console.log(`[${requestId}] ✅ Step 1.5: Image validated`);
    console.log(`[${requestId}]    - Format: ${imageValidation.format}, ${((imageValidation.sizeBytes || 0) / 1024).toFixed(1)}KB${imageValidation.width ? `, ${imageValidation.width}x${imageValidation.height}` : ''}`);

    // Log usage (pending status)
    const { data: usageLog, error: logError } = await supabase
      .from('usage_logs')
      .insert({
        user_id: userId,
        action: '3d_generation',
        credits_used: 1,
        request_id: requestId,
        status: 'pending',
      })
      .select('id')
      .single();

    if (logError) {
      console.log(`[${requestId}] ⚠️ Failed to log usage: ${logError.message}`);
    } else {
      usageLogId = usageLog.id;
      console.log(`[${requestId}] 📝 Usage logged (ID: ${usageLogId})`);
    }

    // Log image info
    console.log(`[${requestId}] 📊 Input image:`);
    console.log(`[${requestId}]    - Size: ${getBase64Size(image)}`);
    console.log(`[${requestId}]    - Type: ${image.substring(0, 30)}...`);

    if (!process.env.REPLICATE_API_TOKEN) {
      console.log(`[${requestId}] ❌ Error: REPLICATE_API_TOKEN not configured`);
      return NextResponse.json(
        { error: 'Replicate API token not configured' },
        { status: 500 }
      );
    }
    console.log(`[${requestId}] ✅ Step 2: API token verified`);

    // Step 3: Configure model - Using TRELLIS (replacement for TripoSR)
    const modelConfig = {
      model: 'firtoz/trellis',
      version: 'e8f6c45206993f297372f5436b90350817bd9b4a0d52d2a76df50c1c8afa2b3c',
    };

    console.log(`[${requestId}] 📋 Step 3: Model configuration:`);
    console.log(`[${requestId}]    - Model: ${modelConfig.model}`);
    console.log(`[${requestId}]    - GPU: A100 (80GB)`);
    console.log(`[${requestId}]    - Cost: ~$0.0014/sec`);

    // Step 4: Call Replicate API
    console.log(`[${requestId}] 🚀 Step 4: Calling TRELLIS on Replicate...`);
    console.log(`[${requestId}]    ⏳ This typically takes 30-60 seconds...`);
    const apiStart = performance.now();

    // Log progress updates
    const progressInterval = setInterval(() => {
      const elapsed = performance.now() - apiStart;
      console.log(`[${requestId}]    ⏳ Still processing... ${formatDuration(elapsed)} elapsed`);
    }, 10000);

    let output;
    try {
      output = await replicate.run(
        `${modelConfig.model}:${modelConfig.version}` as `${string}/${string}:${string}`,
        {
          input: {
            images: [image],
            generate_model: true,
            generate_color: true,
          },
        }
      );
    } finally {
      clearInterval(progressInterval);
    }
    const apiTime = performance.now() - apiStart;
    console.log(`[${requestId}] ✅ Step 4: TRELLIS completed in ${formatDuration(apiTime)}`);

    // Step 5: Process output
    const processStart = performance.now();
    console.log(`[${requestId}] 🔍 Step 5: Processing output...`);
    console.log(`[${requestId}]    - Output type: ${typeof output}`);

    let modelUrl: string | null = null;

    // TRELLIS returns an object with model_file property
    if (output && typeof output === 'object') {
      console.log(`[${requestId}]    - Output keys: ${Object.keys(output as object).join(', ')}`);

      // Check for model_file (GLB)
      if ('model_file' in (output as object)) {
        const modelFile = (output as any).model_file;
        // model_file can be a string URL or an object with url/href property
        if (typeof modelFile === 'string' && modelFile.length > 0) {
          modelUrl = modelFile;
          console.log(`[${requestId}]    - Found model_file as direct URL`);
        } else if (modelFile && typeof modelFile === 'object') {
          const keys = Object.keys(modelFile);
          console.log(`[${requestId}]    - model_file is object with keys: ${keys.length > 0 ? keys.join(', ') : '(empty object)'}`);

          if (keys.length === 0) {
            // TRELLIS returned empty model_file - generation failed
            console.log(`[${requestId}]    ⚠️ model_file is empty - TRELLIS failed to generate 3D model`);
          } else {
            modelUrl = modelFile.url || modelFile.href || modelFile.uri || null;
          }
        }
        console.log(`[${requestId}]    - Found model_file (GLB)`);
      }
      // Check for glb property
      else if ('glb' in (output as object)) {
        modelUrl = (output as any).glb;
        console.log(`[${requestId}]    - Found glb property`);
      }
      // Check if output is an array with URLs
      else if (Array.isArray(output)) {
        // Find the GLB file in the array
        for (const item of output) {
          if (typeof item === 'string' && item.includes('.glb')) {
            modelUrl = item;
            console.log(`[${requestId}]    - Found GLB URL in array`);
            break;
          }
        }
      }
    } else if (typeof output === 'string') {
      modelUrl = output;
      console.log(`[${requestId}]    - Output format: Direct URL string`);
    }

    const processTime = performance.now() - processStart;

    if (modelUrl && typeof modelUrl === 'string') {
      const totalTime = performance.now() - startTime;

      console.log(`[${requestId}] ✅ Step 5: Output processed in ${formatDuration(processTime)}`);
      console.log(`[${requestId}]    - Model URL: ${typeof modelUrl === 'string' ? modelUrl.substring(0, 80) : JSON.stringify(modelUrl)}...`);

      console.log('\n' + '-'.repeat(60));
      console.log(`[${requestId}] ✅ 3D GENERATION COMPLETE`);
      console.log(`[${requestId}] ⏱️  TOTAL TIME: ${formatDuration(totalTime)}`);
      console.log(`[${requestId}] 📈 Breakdown:`);
      console.log(`[${requestId}]    - Parse request: ${formatDuration(parseTime)}`);
      console.log(`[${requestId}]    - TRELLIS API: ${formatDuration(apiTime)} ⭐`);
      console.log(`[${requestId}]    - Process output: ${formatDuration(processTime)}`);
      console.log(`[${requestId}] 💰 Estimated cost: $${((apiTime / 1000) * 0.0014).toFixed(4)}`);
      console.log('-'.repeat(60) + '\n');

      // Update usage log with success status
      if (usageLogId) {
        await supabase
          .from('usage_logs')
          .update({
            status: 'success',
            processing_time_ms: Math.round(totalTime),
          })
          .eq('id', usageLogId);
        console.log(`[${requestId}] 📝 Usage log updated (success)`);
      }

      return NextResponse.json({
        success: true,
        modelUrl: modelUrl,
        timing: {
          total: totalTime,
          apiCall: apiTime,
          breakdown: {
            parse: parseTime,
            trellisApi: apiTime,
            process: processTime,
          }
        }
      });
    }

    const totalTime = performance.now() - startTime;

    // Check if TRELLIS returned empty data (common failure mode)
    const rawOutput = JSON.stringify(output);
    const isEmptyOutput = rawOutput.includes('"model_file":{}') || rawOutput.includes('"model_file":null');

    console.log(`[${requestId}] ❌ 3D GENERATION FAILED: Could not find GLB URL in output`);
    console.log(`[${requestId}]    - modelUrl value: ${JSON.stringify(modelUrl)}`);
    console.log(`[${requestId}]    - modelUrl type: ${typeof modelUrl}`);
    console.log(`[${requestId}]    - Empty output detected: ${isEmptyOutput}`);
    console.log(`[${requestId}]    - Raw output: ${rawOutput.substring(0, 500)}`);
    console.log(`[${requestId}] ⏱️  Time elapsed: ${formatDuration(totalTime)}`);

    // Determine user-friendly error message
    let userError: string;
    if (isEmptyOutput) {
      userError = 'Unable to create 3D model from this image. Try a different photo with clearer lighting and a single subject.';
    } else {
      userError = 'Failed to generate 3D model. Please try again.';
    }

    // Update usage log with failed status
    if (usageLogId) {
      await supabase
        .from('usage_logs')
        .update({
          status: 'failed',
          error_message: isEmptyOutput ? 'TRELLIS returned empty output' : 'Could not extract 3D model URL',
          processing_time_ms: Math.round(totalTime),
        })
        .eq('id', usageLogId);
    }

    return NextResponse.json(
      { error: userError },
      { status: 500 }
    );

  } catch (error) {
    const totalTime = performance.now() - startTime;
    console.log('\n' + '!'.repeat(60));
    console.log(`[${requestId}] ❌ 3D GENERATION ERROR`);
    console.log(`[${requestId}] ⏱️  Time elapsed: ${formatDuration(totalTime)}`);
    console.log(`[${requestId}] 🔴 Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
    console.log(`[${requestId}] 🔴 Error message: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.log(`[${requestId}] 📜 Stack trace:`);
      console.log(error.stack.split('\n').slice(0, 5).map(line => `[${requestId}]    ${line}`).join('\n'));
    }
    console.log('!'.repeat(60) + '\n');

    // Update usage log with failed status
    if (usageLogId) {
      await supabase
        .from('usage_logs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          processing_time_ms: Math.round(totalTime),
        })
        .eq('id', usageLogId);
      console.log(`[${requestId}] 📝 Usage log updated (failed)`);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '3D generation failed' },
      { status: 500 }
    );
  }
}
