import type { DashboardSongRow } from './types'

export type QuickWinItem = {
  id: string
  label: string
  href: string
  done: boolean
}

type ArtistRow = {
  id: string
  page_enabled?: boolean
  page_slug?: string | null
  page_settings?: Record<string, unknown> | null
  spotify_url?: string | null
}

export function buildQuickWins(
  artists: ArtistRow[],
  songs: DashboardSongRow[],
  publishedStoryCount: number,
  tx: Record<string, string>,
): QuickWinItem[] {
  const primary = artists[0]
  if (!primary) return []

  const primarySongs = songs.filter(s => s.artist_id === primary.id)
  const firstSong = primarySongs[0]

  const wins: QuickWinItem[] = [
    {
      id: 'qw-spotify',
      label: tx.adaptQuickWinSpotify,
      href: firstSong ? `/song/${firstSong.id}` : `/artist/${primary.id}`,
      done: primarySongs.some(s => !!s.spotify_url),
    },
    {
      id: 'qw-cover',
      label: tx.adaptQuickWinCover,
      href: firstSong ? `/song/${firstSong.id}` : `/artist/${primary.id}#songs`,
      done: primarySongs.some(s => !!(s.cover_image_url || s.spotify_cover_url)),
    },
    {
      id: 'qw-story',
      label: tx.adaptQuickWinStory,
      href: `/artist/${primary.id}#brand-stories`,
      done: publishedStoryCount > 0,
    },
    {
      id: 'qw-public',
      label: tx.adaptQuickWinPublicPage,
      href: `/artist/${primary.id}#brand-sharing`,
      done: !!(primary.page_enabled && primary.page_slug),
    },
  ]

  return wins.filter(w => !w.done).slice(0, 4)
}
