'use client'

import { t, useLang } from '@/lib/i18n'

export default function CommunityQualityBlurb({ compact }: { compact?: boolean }) {
  const tx = t[useLang()] as Record<string, string>
  return (
    <div className={`playlist-quality-blurb${compact ? ' playlist-quality-blurb--compact' : ''}`}>
      <p>{tx.playlistQualityBlurbCollaboration}</p>
      <ul>
        <li>{tx.playlistQualityBlurbDiscovery}</li>
        <li>{tx.playlistQualityBlurbReleaseSupport}</li>
        <li>{tx.playlistQualityBlurbParticipation}</li>
      </ul>
    </div>
  )
}
