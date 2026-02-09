import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const rawNext = requestUrl.searchParams.get('next') ?? '/try-on';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/try-on';

  console.log('[Callback] Server-side auth callback, code:', code ? `${code.slice(0, 8)}...` : null);

  if (!code) {
    console.error('[Callback] No code in URL');
    return NextResponse.redirect(new URL('/auth/error?message=No+authorization+code', request.url));
  }

  // Create the redirect response FIRST so cookies get set on it
  const redirectUrl = new URL(next, request.url);
  const response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, { ...options, httpOnly: false });
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[Callback] Exchange failed:', error.message);
    return NextResponse.redirect(
      new URL(`/auth/error?message=${encodeURIComponent(error.message)}`, request.url)
    );
  }

  console.log('[Callback] Exchange SUCCESS — user:', data.session?.user?.email);

  return response;
}
