import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const authError = requestUrl.searchParams.get('error');
  const authErrorDescription = requestUrl.searchParams.get('error_description');
  const rawNext = requestUrl.searchParams.get('next') ?? '/try-on';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/try-on';

  console.log('[Callback] Server-side auth callback');
  console.log('[Callback] code:', code ? `${code.slice(0, 8)}...` : null);
  console.log('[Callback] token_hash:', token_hash ? `${token_hash.slice(0, 8)}...` : null);
  console.log('[Callback] type:', type);
  console.log('[Callback] error:', authError);
  console.log('[Callback] error_description:', authErrorDescription);
  console.log('[Callback] Full URL:', requestUrl.toString());

  // Handle errors from Supabase
  if (authError) {
    console.error('[Callback] Supabase returned error:', authError, authErrorDescription);
    return NextResponse.redirect(
      new URL(`/auth/error?message=${encodeURIComponent(authErrorDescription || authError)}`, request.url)
    );
  }

  // Handle email confirmation with token_hash (newer Supabase versions)
  if (token_hash && type) {
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

    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'signup' | 'email' | 'recovery' | 'invite' | 'magiclink',
    });

    if (error) {
      console.error('[Callback] verifyOtp failed:', error.message);
      return NextResponse.redirect(
        new URL(`/auth/error?message=${encodeURIComponent(error.message)}`, request.url)
      );
    }

    console.log('[Callback] verifyOtp SUCCESS — user:', data.user?.email);
    return response;
  }

  if (!code) {
    console.error('[Callback] No code or token_hash in URL');
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

  const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error('[Callback] Exchange failed:', exchangeError.message);
    return NextResponse.redirect(
      new URL(`/auth/error?message=${encodeURIComponent(exchangeError.message)}`, request.url)
    );
  }

  console.log('[Callback] Exchange SUCCESS — user:', sessionData.session?.user?.email);

  return response;
}
