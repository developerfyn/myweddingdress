import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limiter';

// Extract IP for rate limiting unauthenticated requests
function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
         request.headers.get('x-real-ip') ||
         request.headers.get('cf-connecting-ip') ||
         'unknown';
}

export async function GET(request: NextRequest) {
  // Rate limit by IP: 60 requests per minute (session checks happen frequently)
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, 'auth_session', 60, 60000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.resetInSeconds) } }
    );
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // read-only in this context
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  console.log('[API /auth/session]', user ? `user=${user.email}` : 'no user');

  if (error || !user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata,
      created_at: user.created_at,
    },
  });
}
