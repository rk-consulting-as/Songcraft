export type PublicMediaLink = { platform: string; url: string; label?: string }

export type SongListenSource = {
  spotify_url?: string | null
  suno_url?: string | null
  media_links?: PublicMediaLink[] | null
}

/** Merge top-level Spotify/Suno URLs with stored media_links for public listen grids. */
export function buildSongListenLinks(song: SongListenSource): PublicMediaLink[] {
  const out: PublicMediaLink[] = []
  const seen = new Set<string>()
  const push = (link: PublicMediaLink) => {
    const url = (link.url || '').trim()
    if (!url || seen.has(url)) return
    seen.add(url)
    out.push({ platform: link.platform, url, label: link.label })
  }
  if (song.spotify_url?.trim()) {
    push({ platform: 'spotify', url: song.spotify_url.trim(), label: 'Spotify' })
  }
  if (song.suno_url?.trim()) {
    push({ platform: 'suno', url: song.suno_url.trim(), label: 'Suno' })
  }
  if (Array.isArray(song.media_links)) {
    for (const ml of song.media_links) {
      if (ml?.url) push(ml)
    }
  }
  return out
}

export function songHasListenLinks(song: SongListenSource): boolean {
  return buildSongListenLinks(song).length > 0
}
