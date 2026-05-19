'use client'

import { t, useLang } from '@/lib/i18n'

export default function PlaylistCommunityDisclaimer({ compact }: { compact?: boolean }) {
  const tx = t[useLang()] as Record<string, string>
  return (
    <p
      className="playlist-community-disclaimer"
      style={{
        margin: compact ? '12px 0 0' : '16px 0',
        padding: compact ? '10px 12px' : '12px 14px',
        borderRadius: 8,
        border: '1px solid rgba(180, 140, 80, 0.2)',
        background: 'rgba(212, 168, 67, 0.06)',
        color: '#8a7a60',
        fontSize: 12,
        lineHeight: 1.55,
      }}
    >
      {tx.playlistCommunitySafetyDisclaimer}
    </p>
  )
}
