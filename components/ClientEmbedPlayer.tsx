'use client'

import dynamic from 'next/dynamic'
import type { PlayableSong } from '@/components/EmbedPlayer'

// Lazy-loaded EmbedPlayer that NEVER server-renders. Use this in server components
// where direct import would cause the page to crash if EmbedPlayer fails during SSR.
const EmbedPlayer = dynamic(() => import('@/components/EmbedPlayer'), { ssr: false })

export default function ClientEmbedPlayer(props: {
  song: PlayableSong
  showCounter?: boolean
  compact?: boolean
}) {
  return <EmbedPlayer {...props} />
}
