'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { trackCommunityClientEvent } from '@/lib/v2/communityAnalyticsClient'

type Props = {
  entityType: 'circle' | 'session' | 'playlist_room' | 'host' | 'explore'
  entityId?: string
}

/** Fire community_public_view and invite landing once per page load. */
export default function V2CommunityAnalyticsTracker({ entityType, entityId }: Props) {
  const searchParams = useSearchParams()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const ref = searchParams.get('ref') || undefined
    trackCommunityClientEvent({
      eventType: 'community_public_view',
      entityType,
      entityId,
      ref,
      source: ref ? 'invite' : undefined,
    })

    if (ref) {
      trackCommunityClientEvent({
        eventType: 'community_invite_landing',
        entityType,
        entityId,
        ref,
        source: 'invite',
      })
    }
  }, [entityType, entityId, searchParams])

  return null
}
