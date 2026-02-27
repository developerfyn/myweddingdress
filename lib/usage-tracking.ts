import { SupabaseClient } from '@supabase/supabase-js';

// ============================================
// CREDIT COSTS
// ============================================

/**
 * Credit cost per action
 */
export const CREDIT_COSTS = {
  tryon: 2,
  video_generation: 8,
} as const;

/**
 * Credit allocations per plan
 */
export const CREDIT_ALLOCATIONS = {
  free: {
    daily: 4, // 4 credits per day (2 try-ons)
    canGenerateVideo: false,
  },
  quarterly: {
    monthly: 400, // 400 credits per quarter (resets monthly)
    canGenerateVideo: true,
  },
} as const;

// ============================================
// TYPES
// ============================================

export interface UserCredits {
  credits_balance: number;
  credits_purchased: number;
  plan: 'free' | 'quarterly' | 'none';
  is_free_tier: boolean;
  period_start: string;
  timezone: string;
  can_generate_video: boolean;
  reset_time: string;
  has_completed_onboarding: boolean;
}

export interface DeductCreditsResult {
  success: boolean;
  new_balance: number;
  error_message: string | null;
}

export interface RefundCreditsResult {
  success: boolean;
  new_balance: number;
}

export interface UsageLogEntry {
  user_id: string;
  action: 'tryon' | 'video_generation';
  credits_used?: number;
  dress_id?: string | null;
  photo_index?: number | null;
  request_id: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  error_message?: string | null;
  processing_time_ms?: number | null;
}

// ============================================
// CREDIT FUNCTIONS
// ============================================

/**
 * Get user's current credit state
 */
interface GetUserCreditsResponse {
  credits_balance: number;
  credits_purchased: number;
  plan: string;
  is_free_tier: boolean;
  period_start: string;
  timezone: string;
  can_generate_video: boolean;
  reset_time: string;
  has_completed_onboarding: boolean;
}

export async function getUserCredits(
  supabase: SupabaseClient,
  userId: string
): Promise<UserCredits | null> {
  const { data, error } = await supabase
    .rpc('get_user_credits', { p_user_id: userId })
    .single<GetUserCreditsResponse>();

  if (error) {
    console.error('[Credits] Failed to get user credits:', error.message, error.code, error.details, error.hint);
    return null;
  }

  return {
    credits_balance: Number(data.credits_balance),
    credits_purchased: Number(data.credits_purchased),
    plan: data.plan as UserCredits['plan'],
    is_free_tier: Boolean(data.is_free_tier),
    period_start: data.period_start,
    timezone: data.timezone,
    can_generate_video: Boolean(data.can_generate_video),
    reset_time: data.reset_time,
    has_completed_onboarding: Boolean(data.has_completed_onboarding),
  };
}

interface DeductCreditsResponse {
  success: boolean;
  new_balance: number;
  error_message: string | null;
}

/**
 * Deduct credits for an action (atomic operation)
 * Returns success/failure and new balance
 */
export async function deductCredits(
  supabase: SupabaseClient,
  userId: string,
  action: 'tryon' | 'video_generation',
  requestId?: string
): Promise<DeductCreditsResult> {
  const { data, error } = await supabase
    .rpc('deduct_credits', {
      p_user_id: userId,
      p_action: action,
      p_request_id: requestId || null,
    })
    .single<DeductCreditsResponse>();

  if (error) {
    console.error('[Credits] Failed to deduct credits:', error.message);
    return {
      success: false,
      new_balance: 0,
      error_message: error.message,
    };
  }

  return {
    success: Boolean(data.success),
    new_balance: Number(data.new_balance),
    error_message: data.error_message || null,
  };
}

interface RefundCreditsResponse {
  success: boolean;
  new_balance: number;
}

/**
 * Refund credits for a failed action
 */
export async function refundCredits(
  supabase: SupabaseClient,
  userId: string,
  action: 'tryon' | 'video_generation',
  requestId?: string
): Promise<RefundCreditsResult> {
  const { data, error } = await supabase
    .rpc('refund_credits', {
      p_user_id: userId,
      p_action: action,
      p_request_id: requestId || null,
    })
    .single<RefundCreditsResponse>();

  if (error) {
    console.error('[Credits] Failed to refund credits:', error.message);
    return {
      success: false,
      new_balance: 0,
    };
  }

  return {
    success: Boolean(data.success),
    new_balance: Number(data.new_balance),
  };
}

/**
 * Update user's timezone
 */
export async function updateUserTimezone(
  supabase: SupabaseClient,
  userId: string,
  timezone: string
): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('update_user_timezone', {
      p_user_id: userId,
      p_timezone: timezone,
    })
    .single();

  if (error) {
    console.error('[Credits] Failed to update timezone:', error.message);
    return false;
  }

  return Boolean(data);
}

/**
 * Mark onboarding as complete
 */
export async function completeOnboarding(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('complete_onboarding', {
      p_user_id: userId,
    })
    .single();

  if (error) {
    console.error('[Credits] Failed to complete onboarding:', error.message);
    return false;
  }

  return Boolean(data);
}

// ============================================
// USAGE LOGGING (for analytics/history)
// ============================================

/**
 * Update usage entry with success status
 */
export async function logUsageSuccess(
  supabase: SupabaseClient,
  requestId: string,
  processingTimeMs: number
): Promise<void> {
  const { error } = await supabase
    .from('usage_logs')
    .update({
      status: 'success',
      processing_time_ms: Math.round(processingTimeMs),
    })
    .eq('request_id', requestId);

  if (error) {
    console.error('[UsageTracking] Failed to log usage success:', error.message);
  }
}

/**
 * Update usage entry with failed status
 */
export async function logUsageFailure(
  supabase: SupabaseClient,
  requestId: string,
  errorMessage: string,
  processingTimeMs: number
): Promise<void> {
  const { error } = await supabase
    .from('usage_logs')
    .update({
      status: 'failed',
      error_message: errorMessage,
      processing_time_ms: Math.round(processingTimeMs),
    })
    .eq('request_id', requestId);

  if (error) {
    console.error('[UsageTracking] Failed to log usage failure:', error.message);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if user can perform an action based on their credits
 */
export function canPerformAction(
  credits: UserCredits,
  action: 'tryon' | 'video_generation'
): { allowed: boolean; reason: string } {
  const cost = CREDIT_COSTS[action];

  // Check video generation for free users
  if (action === 'video_generation' && !credits.can_generate_video) {
    return {
      allowed: false,
      reason: 'Video generation requires a paid subscription',
    };
  }

  // Check sufficient credits
  if (credits.credits_balance < cost) {
    if (credits.is_free_tier) {
      return {
        allowed: false,
        reason: 'Daily limit reached. Try again tomorrow or upgrade to PRO!',
      };
    } else {
      return {
        allowed: false,
        reason: 'Insufficient credits',
      };
    }
  }

  return { allowed: true, reason: 'OK' };
}

/**
 * Format reset time for display
 */
export function formatResetTime(resetTime: string, isFreeTier: boolean): string {
  const reset = new Date(resetTime);
  const now = new Date();
  const diffMs = reset.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'Refreshing...';
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (isFreeTier) {
    // For free users, show hours until midnight
    if (diffHours > 0) {
      return `Resets in ${diffHours}h ${diffMinutes}m`;
    }
    return `Resets in ${diffMinutes}m`;
  } else {
    // For paid users, show date
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `Resets ${reset.toLocaleDateString(undefined, options)}`;
  }
}

// ============================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================

/** @deprecated Use CREDIT_COSTS instead */
export const CREDIT_LIMITS = {
  free: {
    tryon: 1,
    '3d_generation': 0,
    video_generation: 0,
  },
  quarterly: {
    tryon: 150,
    '3d_generation': 10,
    video_generation: 10,
  },
} as const;

/** @deprecated Use getUserCredits instead */
export async function canUserPerformAction(
  supabase: SupabaseClient,
  userId: string,
  action: 'tryon' | '3d_generation' | 'video_generation'
): Promise<{
  allowed: boolean;
  reason: string;
  credits_used: number;
  credits_limit: number;
  plan: string;
} | null> {
  const credits = await getUserCredits(supabase, userId);
  if (!credits) return null;

  const mappedAction = action === '3d_generation' ? 'tryon' : action as 'tryon' | 'video_generation';
  const result = canPerformAction(credits, mappedAction);

  return {
    allowed: result.allowed,
    reason: result.reason,
    credits_used: credits.credits_purchased - credits.credits_balance,
    credits_limit: credits.credits_purchased,
    plan: credits.plan,
  };
}
