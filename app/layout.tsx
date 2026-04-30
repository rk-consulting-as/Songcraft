import type { Metadata } from 'next'
import './globals.css'
import DynamicFavicon from '@/components/DynamicFavicon'

export const metadata: Metadata = {
  title: 'Songcraft',
  description: 'AI Music Creation Studio',
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
        {children}
      </body>
    </html>
  )
}
