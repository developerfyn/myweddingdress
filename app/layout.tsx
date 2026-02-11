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
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/icon.png', type: 'image/png', sizes: '1024x1024' },
    ],
    apple: [
      { url: '/apple-icon.png', type: 'image/png', sizes: '1024x1024' },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  width: 'device-width',
  initialScale: 1,
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
