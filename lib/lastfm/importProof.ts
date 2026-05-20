import { extractSpotifyPlaylistId } from '@/lib/playlistCommunities/spotifyPlaylist'
import { fetchLastfmRecentTracks, lastfmApiKey } from './client'
import { analyzeLastfmPlaylistActivity } from './matchScrobbles'
import { fetchSpotifyPlaylistTracks } from './playlistTracks'

const MAX_RANGE_DAYS = 31

export function parseDateRange(fromDate: string, toDate: string): { from: Date; to: Date; error?: string } {
  const from = new Date(`${fromDate}T00:00:00.000Z`)
  const to = new Date(`${toDate}T23:59:59.999Z`)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { from, to, error: 'invalid_date_range' }
  }
  if (from > to) return { from, to, error: 'invalid_date_range' }
  const days = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)
  if (days > MAX_RANGE_DAYS) return { from, to, error: 'date_range_too_long' }
  return { from, to }
}

export async function runLastfmImportAnalysis(opts: {
  lastfmUsername: string
  fromDate: string
  toDate: string
  playlistSpotifyUrl: string | null
  playlistSpotifyId: string | null
}) {
  const apiKey = lastfmApiKey()
  if (!apiKey) throw new Error('lastfm_not_configured')

  const { from, to, error: rangeErr } = parseDateRange(opts.fromDate, opts.toDate)
  if (rangeErr) throw new Error(rangeErr)

  const playlistId =
    opts.playlistSpotifyId || extractSpotifyPlaylistId(opts.playlistSpotifyUrl || '')
  if (!playlistId) throw new Error('playlist_spotify_missing')

  const [playlistTracks, scrobbles] = await Promise.all([
    fetchSpotifyPlaylistTracks(playlistId),
    fetchLastfmRecentTracks({
      username: opts.lastfmUsername.trim(),
      from,
      to,
      apiKey,
    }),
  ])

  if (!playlistTracks.length) throw new Error('playlist_tracks_empty')

  const analysis = analyzeLastfmPlaylistActivity(playlistTracks, scrobbles, {
    username: opts.lastfmUsername.trim(),
    fromDate: opts.fromDate,
    toDate: opts.toDate,
  })

  return {
    analysis,
    scrobbleCount: scrobbles.length,
    playlistTrackCount: playlistTracks.length,
  }
}
