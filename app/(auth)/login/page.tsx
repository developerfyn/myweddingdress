'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

// Google Icon Component
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

// Apple Icon Component
const AppleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Validate redirect target — only allow relative paths to prevent open redirect
  const rawRedirect = searchParams.get('redirect') || '/try-on';
  const redirectTo = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/try-on';
  const { user, isLoading: authLoading } = useAuth();

  // Redirect to app if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(redirectTo);
    }
  }, [authLoading, user, router, redirectTo]);

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    // Honeypot field - should always be empty (bots fill it, humans don't see it)
    company: '',
  });

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`;
    console.log('[Login] Google sign-in initiated');
    console.log('[Login] Callback URL:', callbackUrl);
    console.log('[Login] Redirect target after auth:', redirectTo);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
        },
      });
      console.log('[Login] signInWithOAuth response:', { data, error });
      if (error) {
        console.error('[Login] OAuth error:', error.message, error);
        setError(error.message);
      }
    } catch (err) {
      console.error('[Login] OAuth exception:', err);
      setError('Failed to sign in with Google');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsAppleLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      });
      if (error) setError(error.message);
    } catch (err) {
      setError('Failed to sign in with Apple');
    } finally {
      setIsAppleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Honeypot check - if filled, it's a bot
    if (formData.company) {
      // Silently reject but show generic error to confuse bots
      console.log('[Login] Honeypot triggered - bot detected');
      setError('Invalid credentials');
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        setError(signInError.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Image/Branding */}
      <div className="hidden lg:flex flex-1 relative bg-primary">
        {/* Decorative Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/90 via-primary to-purple-600/90" />

        {/* Glassmorphism Cards */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-10 w-64 h-80 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 transform rotate-6" />
          <div className="absolute top-32 right-20 w-64 h-80 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 transform -rotate-3" />
          <div className="absolute bottom-20 left-10 w-48 h-48 rounded-full bg-white/10 backdrop-blur-sm border border-white/20" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <h2 className="font-serif text-4xl font-semibold mb-6 leading-tight">
            Welcome back<br />
          </h2>
          <p className="text-white/80 text-lg leading-relaxed max-w-md">
            Continue your journey to finding the perfect wedding dress.
            Your favorites and try-ons are waiting for you.
          </p>

          {/* Testimonial */}
          <div className="mt-12 p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 max-w-md">
            <p className="text-white/90 italic mb-4">
              &ldquo;I found my dream dress in just 3 days! The virtual try-on
              was so accurate, it looked exactly the same in the boutique.&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-sm font-medium">
                SM
              </div>
              <div>
                <p className="font-medium">Sarah Mitchell</p>
                <p className="text-white/60 text-sm">Married June 2024</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link href="/" className="inline-block mb-8">
            <span className="font-serif text-2xl font-semibold italic">
              <span className="text-pink-400">My</span>{' '}
              <span className="bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">Wedding Dress</span>
            </span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="font-serif text-3xl font-semibold text-foreground mb-2">
              Sign in to your account
            </h1>
            <p className="text-muted-foreground">
              Welcome back! Please enter your details.
            </p>
          </div>

          {/* Social Sign-In Buttons */}
          <div className="space-y-3 mb-6">
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-xl text-base gap-3 bg-white hover:bg-gray-50 hover:text-foreground"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              Continue with Google
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-xl text-base gap-3 bg-black text-white hover:bg-gray-900 border-black"
              onClick={handleAppleSignIn}
              disabled={isAppleLoading}
            >
              {isAppleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <AppleIcon />
              )}
              Continue with Apple
            </Button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gradient-to-br from-pink-50 via-white to-purple-50 text-muted-foreground">
                or sign in with email
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Honeypot field - hidden from humans, catches bots */}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label htmlFor="company">Company</label>
              <input
                type="text"
                id="company"
                name="company"
                tabIndex={-1}
                autoComplete="off"
                value={formData.company}
                onChange={(e) =>
                  setFormData({ ...formData, company: e.target.value })
                }
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="jane@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                className="h-12 rounded-xl"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  className="h-12 rounded-xl pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full h-12 rounded-xl text-base bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 border-0"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-muted-foreground mt-8">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50">
          <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
