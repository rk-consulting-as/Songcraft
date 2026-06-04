import type { Metadata, Viewport } from 'next'
import './globals.css'
import './globals-workspace-layout.css'
import DynamicFavicon from '@/components/DynamicFavicon'
import ChatDock from '@/components/ChatDock'
import MobileBottomNav from '@/components/MobileBottomNav'
import PWARegister from '@/components/PWARegister'
import BetaLaunchKit from '@/components/BetaLaunchKit'
import AppNavigationShell from '@/components/navigation/AppNavigationShell'
import { BRAND_DESCRIPTION_SHORT, BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand'

export const metadata: Metadata = {
  title: { default: BRAND_NAME, template: `%s · ${BRAND_NAME}` },
  description: BRAND_DESCRIPTION_SHORT,
  applicationName: BRAND_NAME,
  manifest: '/manifest.webmanifest',
  openGraph: {
    siteName: BRAND_NAME,
    title: BRAND_NAME,
    description: BRAND_DESCRIPTION_SHORT,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: BRAND_NAME,
    description: BRAND_DESCRIPTION_SHORT,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: BRAND_NAME,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { url: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <DynamicFavicon />
        <PWARegister />
        <AppNavigationShell>{children}</AppNavigationShell>
        <BetaLaunchKit />
        <MobileBottomNav />
        <ChatDock />
      </body>
    </html>
  )
}
