/**
 * Abuse detection utilities
 * Server-side detection and prevention of API abuse
 */

import { SupabaseClient } from '@supabase/supabase-js';

export type AbuseSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AbuseType =
  | 'rate_limit_exceeded'
  | 'invalid_signature'
  | 'burst_requests'
  | 'credit_exhaustion_attempt'
  | 'invalid_image'
  | 'suspicious_pattern'
  | 'blocked_user_attempt';

export interface AbuseCheckResult {
  blocked: boolean;
  reason?: string;
  abuseScore?: number;
}

/**
 * Check if a user is blocked
 */
export async function isUserBlocked(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_user_blocked', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error checking user block status:', error.message);
      return true; // Fail closed — block on error to prevent abuse
    }

    return data === true;
  } catch (error) {
    console.error('Exception checking user block status:', error);
    return true; // Fail closed
  }
}

/**
 * Check if an IP is blocked
 */
export async function isIpBlocked(
  supabase: SupabaseClient,
  ipAddress: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_ip_blocked', {
      p_ip_address: ipAddress,
    });

    if (error) {
      console.error('Error checking IP block status:', error.message);
      return true; // Fail closed — block on error
    }

    return data === true;
  } catch (error) {
    console.error('Exception checking IP block status:', error);
    return true; // Fail closed
  }
}

/**
 * Log an abuse incident
 */
export async function logAbuse(
  supabase: SupabaseClient,
  userId: string | null,
  ipAddress: string | null,
  abuseType: AbuseType,
  severity: AbuseSeverity,
  details: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await supabase.rpc('log_abuse', {
      p_user_id: userId,
      p_ip_address: ipAddress,
      p_abuse_type: abuseType,
      p_severity: severity,
      p_details: details,
    });

    if (error) {
      console.error('Error logging abuse:', error.message);
    }
  } catch (error) {
    console.error('Exception logging abuse:', error);
  }
}

/**
 * Get a user's current abuse score
 */
export async function getAbuseScore(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_abuse_score', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error getting abuse score:', error.message);
      return 0;
    }

    return data || 0;
  } catch (error) {
    console.error('Exception getting abuse score:', error);
    return 0;
  }
}

/**
 * Check for burst activity
 */
export async function checkBurstActivity(
  supabase: SupabaseClient,
  userId: string,
  windowSeconds: number = 10,
  maxRequests: number = 5
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_burst_activity', {
      p_user_id: userId,
      p_window_seconds: windowSeconds,
      p_max_requests: maxRequests,
    });

    if (error) {
      console.error('Error checking burst activity:', error.message);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Exception checking burst activity:', error);
    return false;
  }
}

/**
 * Attempt to auto-block an abuser
 */
export async function tryAutoBlock(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('auto_block_abuser', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error auto-blocking user:', error.message);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Exception auto-blocking user:', error);
    return false;
  }
}

/**
 * Comprehensive abuse check for API requests
 */
export async function performAbuseCheck(
  supabase: SupabaseClient,
  userId: string,
  ipAddress: string | null
): Promise<AbuseCheckResult> {
  // Check if user is blocked
  const userBlocked = await isUserBlocked(supabase, userId);
  if (userBlocked) {
    return {
      blocked: true,
      reason: 'Account temporarily suspended due to suspicious activity',
    };
  }

  // Check if IP is blocked (if available)
  if (ipAddress) {
    const ipBlocked = await isIpBlocked(supabase, ipAddress);
    if (ipBlocked) {
      return {
        blocked: true,
        reason: 'Access denied',
      };
    }
  }

  // Get abuse score
  const abuseScore = await getAbuseScore(supabase, userId);

  // If score is high but not blocked yet, flag it
  if (abuseScore >= 50) {
    return {
      blocked: false,
      abuseScore,
      reason: 'High abuse score detected',
    };
  }

  return {
    blocked: false,
    abuseScore,
  };
}

/**
 * Extract IP address from request
 */
export function getClientIp(request: Request): string | null {
  // Check common headers for forwarded IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Cloudflare
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return null;
}
