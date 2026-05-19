export type TrendingEventCounts = {
  pageViews: number
  songViews: number
  linkClicks: number
  embedViews: number
  qrEvents: number
  newsletterSignups: number
}

/** Simple weighted score — higher = more trending. No private data exposed. */
export function computeTrendingScore(counts: TrendingEventCounts): number {
  return (
    counts.pageViews * 3 +
    counts.songViews * 2 +
    counts.linkClicks * 2 +
    counts.embedViews * 2 +
    counts.qrEvents * 1.5 +
    counts.newsletterSignups * 4
  )
}

export function aggregateAnalyticsEvents(
  events: { artist_id: string; event_type: string; source?: string | null }[]
): Record<string, TrendingEventCounts> {
  const map: Record<string, TrendingEventCounts> = {}

  const ensure = (artistId: string) => {
    if (!map[artistId]) {
      map[artistId] = { pageViews: 0, songViews: 0, linkClicks: 0, embedViews: 0, qrEvents: 0, newsletterSignups: 0 }
    }
    return map[artistId]
  }

  for (const e of events) {
    if (!e.artist_id) continue
    const c = ensure(e.artist_id)
    if (e.event_type === 'artist_page_view') c.pageViews += 1
    else if (e.event_type === 'song_page_view') c.songViews += 1
    else if (e.event_type === 'embed_view') c.embedViews += 1
    else if (e.event_type === 'newsletter_signup') c.newsletterSignups += 1
    if (e.source === 'qr') c.qrEvents += 1
  }

  return map
}

export function mergeLinkClicks(
  map: Record<string, TrendingEventCounts>,
  clicks: { artist_id: string; count: number }[]
) {
  for (const row of clicks) {
    if (!row.artist_id) continue
    if (!map[row.artist_id]) {
      map[row.artist_id] = { pageViews: 0, songViews: 0, linkClicks: 0, embedViews: 0, qrEvents: 0, newsletterSignups: 0 }
    }
    map[row.artist_id].linkClicks += row.count
  }
}
