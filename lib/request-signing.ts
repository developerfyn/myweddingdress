/**
 * Request signing for CSRF protection
 * Adds an extra layer of security beyond Supabase auth
 */

// Use Web Crypto API for browser compatibility
const encoder = new TextEncoder();

/**
 * Generate a request token (client-side)
 */
export function generateRequestToken(): { token: string; timestamp: number } {
  const timestamp = Date.now();
  const token = crypto.randomUUID();
  return { token, timestamp };
}

/**
 * Sign a request (client-side)
 * Uses HMAC-SHA256 with the user's session ID as part of the secret
 */
export async function signRequest(
  token: string,
  timestamp: number,
  userId: string,
  secret: string
): Promise<string> {
  const data = `${token}:${timestamp}:${userId}`;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Create signed request headers (client-side helper)
 */
export async function createSignedHeaders(
  userId: string,
  secret: string
): Promise<Record<string, string>> {
  const { token, timestamp } = generateRequestToken();
  const signature = await signRequest(token, timestamp, userId, secret);

  return {
    'X-Request-Token': token,
    'X-Request-Timestamp': String(timestamp),
    'X-Request-Signature': signature,
  };
}
