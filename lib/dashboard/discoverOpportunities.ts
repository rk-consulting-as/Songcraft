export type DiscoverOpportunity = {
  id: string
  kind: 'campaign' | 'artist' | 'collaboration'
  title: string
  description: string
  href: string
}

export type PublicCampaignRow = {
  id: string
  title: string
  genre?: string | null
  mood?: string | null
  memberCount?: number
  artistName?: string | null
}

export function buildDiscoverOpportunities(
  userGenres: string[],
  publicCampaigns: PublicCampaignRow[],
  ownCampaignIds: Set<string>,
  tx: Record<string, string>,
): DiscoverOpportunity[] {
  const genres = userGenres.map(g => g.toLowerCase().trim()).filter(Boolean)
  const ops: DiscoverOpportunity[] = []

  const genreMatch = publicCampaigns
    .filter(c => !ownCampaignIds.has(c.id))
    .filter(c => {
      if (!genres.length || !c.genre) return true
      const cg = c.genre.toLowerCase()
      return genres.some(g => cg.includes(g) || g.includes(cg.split(',')[0]?.trim() || ''))
    })
    .sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0))

  if (genreMatch[0]) {
    const c = genreMatch[0]
    ops.push({
      id: `disc-campaign-${c.id}`,
      kind: 'campaign',
      title: tx.adaptDiscoverSuggestedCampaign,
      description: c.title + (c.artistName ? ` · ${c.artistName}` : ''),
      href: `/playlist-campaigns/${c.id}`,
    })
  }

  if (genreMatch[1]) {
    const c = genreMatch[1]
    ops.push({
      id: `disc-collab-${c.id}`,
      kind: 'collaboration',
      title: tx.adaptDiscoverSuggestedCollab,
      description: c.genre ? `${c.genre} · ${c.title}` : c.title,
      href: `/playlist-campaigns/${c.id}`,
    })
  }

  const genreQuery = genres[0] ? `?genre=${encodeURIComponent(genres[0])}` : ''
  ops.push({
    id: 'disc-artists',
    kind: 'artist',
    title: tx.adaptDiscoverSuggestedArtist,
    description: tx.adaptDiscoverSuggestedArtistDesc,
    href: `/discover${genreQuery}`,
  })

  return ops.slice(0, 3)
}
