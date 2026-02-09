import React from "react"
import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/components/auth-provider'
import { TryOnGenerationProvider } from '@/components/tryon-generation-provider'
import { VideoGenerationProvider } from '@/components/video-generation-provider'
import { PostHogProvider } from '@/components/posthog-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'My Wedding Dress - Virtual Try-On',
  description: 'Try on 500+ designer wedding gowns virtually. Find your dream dress.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <AuthProvider>
          <TryOnGenerationProvider>
            <VideoGenerationProvider>
              <PostHogProvider>
                {children}
              </PostHogProvider>
            </VideoGenerationProvider>
          </TryOnGenerationProvider>
        </AuthProvider>
        <Toaster position="top-center" />
        <Analytics />
      </body>
    </html>
  )
}
