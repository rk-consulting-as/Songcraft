export type SmartInsightCard = {
  id: string
  label: string
  value: string
  meta?: string
  href?: string
}

export type SmartInsightsInput = {
  artists: { id: string; name: string }[]
  songs: { id: string; title: string; artist_id: string; internal_play_count?: number | null; created_at?: string }[]
  campaigns: { id: string; title: string; memberCount?: number }[]
  newestSubscriber: { email: string } | null
  newestStory: { id: string; title: string; artist_id: string } | null
  artistViewCounts?: Record<string, number>
  tx: Record<string, string>
}

export function buildSmartInsights(input: SmartInsightsInput): SmartInsightCard[] {
  const { artists, songs, campaigns, newestSubscriber, newestStory, artistViewCounts, tx } = input
  const cards: SmartInsightCard[] = []

  let mostViewedArtist: { id: string; name: string; views: number } | null = null
  for (const a of artists) {
    const plays = artistViewCounts?.[a.id] ?? songs
      .filter(s => s.artist_id === a.id)
      .reduce((sum, s) => sum + (s.internal_play_count || 0), 0)
    if (!mostViewedArtist || plays > mostViewedArtist.views) {
      mostViewedArtist = { id: a.id, name: a.name, views: plays }
    }
  }
  if (mostViewedArtist && mostViewedArtist.views > 0) {
    cards.push({
      id: 'si-artist',
      label: tx.adaptInsightMostViewedArtist,
      value: mostViewedArtist.name,
      meta: `▶ ${mostViewedArtist.views.toLocaleString()}`,
      href: `/artist/${mostViewedArtist.id}`,
    })
  }

  const sortedSongs = [...songs].sort((a, b) => (b.internal_play_count || 0) - (a.internal_play_count || 0))
  const topSong = sortedSongs.find(s => (s.internal_play_count || 0) > 0)
  if (topSong) {
    cards.push({
      id: 'si-song',
      label: tx.adaptInsightFastestGrowingSong,
      value: topSong.title,
      meta: `▶ ${(topSong.internal_play_count || 0).toLocaleString()}`,
      href: `/song/${topSong.id}`,
    })
  }

  const activeCampaign = [...campaigns].sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0))[0]
  if (activeCampaign) {
    cards.push({
      id: 'si-campaign',
      label: tx.adaptInsightMostActiveCampaign,
      value: activeCampaign.title,
      href: `/playlist-campaigns/${activeCampaign.id}`,
    })
  }

  if (newestSubscriber) {
    cards.push({
      id: 'si-subscriber',
      label: tx.cmdNewestSubscriber,
      value: newestSubscriber.email,
    })
  }

  if (newestStory) {
    cards.push({
      id: 'si-story',
      label: tx.cmdNewestStory,
      value: newestStory.title,
      href: `/artist/${newestStory.artist_id}#brand-stories`,
    })
  }

  return cards
}
