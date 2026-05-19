'use client'

import { useEffect, useState } from 'react'
import { fetchCampaigns } from '@/lib/playlistCommunities/client'
import type { CampaignCardData } from '@/lib/playlistCommunities/types'
import PlaylistCommunityHints from './PlaylistCommunityHints'

export default function PlaylistCommunityDashboardBanner({ artistId }: { artistId?: string }) {
  const [owned, setOwned] = useState<CampaignCardData[]>([])
  const [joinedCount, setJoinedCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [o, j] = await Promise.all([
          fetchCampaigns({ artistId, scope: 'owned' }),
          fetchCampaigns({ scope: 'joined' }),
        ])
        if (!cancelled) {
          setOwned((o?.campaigns || []) as CampaignCardData[])
          setJoinedCount((j?.campaigns || []).length)
        }
      } catch {
        /* ignore */
      }
    })()
    return () => { cancelled = true }
  }, [artistId])

  if (!owned.length && joinedCount === 0) return null
  return <PlaylistCommunityHints ownedCampaigns={owned} joinedCount={joinedCount} artistId={artistId} />
}
