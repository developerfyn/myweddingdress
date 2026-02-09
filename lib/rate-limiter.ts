/**
 * In-memory rate limiter
 * For production with multiple servers, replace with Redis (Upstash)
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (per server instance)
const rateLimits = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupOldEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, entry] of rateLimits.entries()) {
    if (now > entry.resetAt) {
      rateLimits.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
  limit: number;
}

/**
 * Check and update rate limit for a user/action combination
 */
export function checkRateLimit(
  userId: string,
  action: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  cleanupOldEntries();

  const key = `${userId}:${action}`;
  const now = Date.now();
  const entry = rateLimits.get(key);

  // No existing entry or window expired - create new
  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: limit - 1,
      resetInSeconds: Math.ceil(windowMs / 1000),
      limit,
    };
  }

  // Within window - check limit
  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: Math.ceil((entry.resetAt - now) / 1000),
      limit,
    };
  }

  // Increment count
  entry.count++;
  return {
    allowed: true,
    remaining: limit - entry.count,
    resetInSeconds: Math.ceil((entry.resetAt - now) / 1000),
    limit,
  };
}

/**
 * Rate limit configurations
 */
export const RATE_LIMITS = {
  tryon: {
    limit: 10,        // 10 requests
    windowMs: 60000,  // per minute
  },
  '3d_generation': {
    limit: 3,         // 3 requests
    windowMs: 60000,  // per minute
  },
  video_generation: {
    limit: 3,         // 3 requests
    windowMs: 60000,  // per minute
  },
} as const;

/**
 * Check rate limit for try-on action
 */
export function checkTryOnRateLimit(userId: string): RateLimitResult {
  return checkRateLimit(
    userId,
    'tryon',
    RATE_LIMITS.tryon.limit,
    RATE_LIMITS.tryon.windowMs
  );
}

/**
 * Check rate limit for 3D generation action
 */
export function check3DGenerationRateLimit(userId: string): RateLimitResult {
  return checkRateLimit(
    userId,
    '3d_generation',
    RATE_LIMITS['3d_generation'].limit,
    RATE_LIMITS['3d_generation'].windowMs
  );
}

/**
 * Check rate limit for video generation action
 */
export function checkVideoGenerationRateLimit(userId: string): RateLimitResult {
  return checkRateLimit(
    userId,
    'video_generation',
    RATE_LIMITS.video_generation.limit,
    RATE_LIMITS.video_generation.windowMs
  );
}

/**
 * Global rate limit (circuit breaker) - all users combined
 */
let globalRequestCount = 0;
let globalResetAt = Date.now() + 60000;
const GLOBAL_LIMIT = 100; // 100 requests per minute total

export function checkGlobalRateLimit(): RateLimitResult {
  const now = Date.now();

  // Reset window if expired
  if (now > globalResetAt) {
    globalRequestCount = 1;
    globalResetAt = now + 60000;
    return {
      allowed: true,
      remaining: GLOBAL_LIMIT - 1,
      resetInSeconds: 60,
      limit: GLOBAL_LIMIT,
    };
  }

  // Check limit
  if (globalRequestCount >= GLOBAL_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: Math.ceil((globalResetAt - now) / 1000),
      limit: GLOBAL_LIMIT,
    };
  }

  globalRequestCount++;
  return {
    allowed: true,
    remaining: GLOBAL_LIMIT - globalRequestCount,
    resetInSeconds: Math.ceil((globalResetAt - now) / 1000),
    limit: GLOBAL_LIMIT,
  };
}
