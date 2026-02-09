'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Suspense } from 'react';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message') || 'An error occurred during authentication';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50 px-4">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <Link href="/" className="inline-block mb-8">
          <span className="font-serif text-2xl font-semibold italic">
            <span className="text-pink-400">My</span>{' '}
            <span className="bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">
              Wedding Dress
            </span>
          </span>
        </Link>

        {/* Error Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>

          <h1 className="font-serif text-2xl font-semibold text-foreground mb-2">
            Authentication Failed
          </h1>

          <p className="text-muted-foreground mb-6">
            {decodeURIComponent(message)}
          </p>

          <div className="space-y-3">
            <Button asChild className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
              <Link href="/login">Try Again</Link>
            </Button>

            <Button variant="outline" asChild className="w-full">
              <Link href="/" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <p className="text-sm text-muted-foreground mt-6">
          Having trouble?{' '}
          <Link href="/contact" className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent hover:underline">
            Contact Support
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full" />
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}
