'use client'

import { useEffect, useState } from 'react'
import { fetchCampaigns, fetchParticipationSummary } from '@/lib/playlistCommunities/client'
import type { CampaignCardData } from '@/lib/playlistCommunities/types'
import type { UserParticipationSummary } from '@/lib/playlistCommunities/participationSummary'
import PlaylistCommunityHints from './PlaylistCommunityHints'
import CampaignActivityDashboardCard from './CampaignActivityDashboardCard'

export default function PlaylistCommunityDashboardBanner({ artistId }: { artistId?: string }) {
  const [owned, setOwned] = useState<CampaignCardData[]>([])
  const [joinedCount, setJoinedCount] = useState(0)
  const [summary, setSummary] = useState<UserParticipationSummary | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [o, j, p] = await Promise.all([
          fetchCampaigns({ artistId, scope: 'owned' }),
          fetchCampaigns({ scope: 'joined' }),
          fetchParticipationSummary(),
        ])
        if (!cancelled) {
          setOwned((o?.campaigns || []) as CampaignCardData[])
          setJoinedCount((j?.campaigns || []).length)
          setSummary(p?.summary || null)
        }
      } catch {
        /* ignore */
      }
    })()
    return () => { cancelled = true }
  }, [artistId])

  if (!owned.length && joinedCount === 0 && !summary?.activityProofSubmitCount) return null

  return (
    <div className="playlist-dashboard-participation" style={{ marginBottom: 24 }}>
      <CampaignActivityDashboardCard />
      <PlaylistCommunityHints
        ownedCampaigns={owned}
        joinedCount={joinedCount}
        artistId={artistId}
        participationSummary={summary}
      />
    </div>
  )
}
