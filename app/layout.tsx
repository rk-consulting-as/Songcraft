import type { Metadata, Viewport } from 'next'
import './globals.css'
import DynamicFavicon from '@/components/DynamicFavicon'
import ChatDock from '@/components/ChatDock'
import MobileBottomNav from '@/components/MobileBottomNav'
import PWARegister from '@/components/PWARegister'
import BetaLaunchKit from '@/components/BetaLaunchKit'

export const metadata: Metadata = {
  title: 'Songcraft',
  description: 'AI Music Creation Studio',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Songcraft',
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
    <html lang="no">
      <body>
        <DynamicFavicon />
        <PWARegister />
        {children}
        <BetaLaunchKit />
        <MobileBottomNav />
        <ChatDock />
      </body>
    </html>
  )
}
