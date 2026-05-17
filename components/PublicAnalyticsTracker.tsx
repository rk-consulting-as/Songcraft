'use client'

import { useEffect } from 'react'
import { trackPublicEvent, type PublicAnalyticsEventType } from '@/lib/publicAnalytics'

export default function PublicAnalyticsTracker({
  artistId,
  songId,
  eventType,
}: {
  artistId?: string | null
  songId?: string | null
  eventType: PublicAnalyticsEventType
}) {
  useEffect(() => {
    trackPublicEvent({
      artist_id: artistId || null,
      song_id: songId || null,
      event_type: eventType,
    })
  }, [artistId, songId, eventType])

  return null
}
