/**
 * Server-side request verification
 * Verifies signed requests to prevent CSRF attacks
 */

import crypto from 'crypto';

const SECRET = process.env.REQUEST_SIGNING_SECRET;
if (!SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('REQUEST_SIGNING_SECRET must be set in production');
}
const SIGNING_SECRET = SECRET || 'dev-only-secret-' + process.env.NEXT_PUBLIC_SUPABASE_URL;
const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

export interface VerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * Verify a signed request (server-side)
 */
export function verifySignedRequest(
  token: string | null,
  timestamp: string | null,
  signature: string | null,
  userId: string
): VerificationResult {
  // If no signing headers provided, skip verification (backwards compatibility)
  // In production, you may want to require signing
  if (!token && !timestamp && !signature) {
    return { valid: true };
  }

  // If partially provided, reject
  if (!token || !timestamp || !signature) {
    return {
      valid: false,
      error: 'Incomplete request signature',
    };
  }

  // Check timestamp freshness
  const requestTime = parseInt(timestamp, 10);
  if (isNaN(requestTime)) {
    return {
      valid: false,
      error: 'Invalid timestamp',
    };
  }

  const age = Date.now() - requestTime;
  if (age > MAX_AGE_MS) {
    return {
      valid: false,
      error: 'Request expired',
    };
  }

  if (age < 0) {
    return {
      valid: false,
      error: 'Invalid timestamp (future)',
    };
  }

  // Compute expected signature
  const data = `${token}:${timestamp}:${userId}`;
  const expectedSignature = crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(data)
    .digest('hex');

  // Timing-safe comparison
  try {
    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (sigBuffer.length !== expectedBuffer.length) {
      return {
        valid: false,
        error: 'Invalid signature',
      };
    }

    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return {
        valid: false,
        error: 'Invalid signature',
      };
    }
  } catch {
    return {
      valid: false,
      error: 'Invalid signature format',
    };
  }

  return { valid: true };
}

/**
 * Extract signing headers from a request
 */
export function getSigningHeaders(request: Request): {
  token: string | null;
  timestamp: string | null;
  signature: string | null;
} {
  return {
    token: request.headers.get('X-Request-Token'),
    timestamp: request.headers.get('X-Request-Timestamp'),
    signature: request.headers.get('X-Request-Signature'),
  };
}

/**
 * Verify request from headers (convenience function)
 */
export function verifyRequestFromHeaders(
  request: Request,
  userId: string
): VerificationResult {
  const { token, timestamp, signature } = getSigningHeaders(request);
  return verifySignedRequest(token, timestamp, signature, userId);
}
