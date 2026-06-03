'use client'

import { useEffect } from 'react'
import { trackPublicEvent, type PublicAnalyticsEventType } from '@/lib/publicAnalytics'

export default function PublicAnalyticsTracker({
  artistId,
  songId,
  storyId,
  eventType,
}: {
  artistId?: string | null
  songId?: string | null
  storyId?: string | null
  eventType: PublicAnalyticsEventType
}) {
  useEffect(() => {
    trackPublicEvent({
      artist_id: artistId || null,
      song_id: songId || null,
      story_id: storyId || null,
      event_type: eventType,
    })
  }, [artistId, songId, storyId, eventType])

  return null
}
