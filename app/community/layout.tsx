import type { Metadata } from 'next'
import './v2-community.css'
import V2Shell from '@/components/v2/V2Shell'

export const metadata: Metadata = {
  title: 'Community',
  description: 'ViaTone 2.0 — music community HQ for circles, sessions and release support.',
}

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return <V2Shell>{children}</V2Shell>
}
