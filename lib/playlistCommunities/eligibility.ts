export type SongEligibilityInput = {
  spotify_url?: string | null
  suno_url?: string | null
  media_links?: Record<string, unknown> | null
  public_hidden?: boolean | null
  status?: string | null
}

export type EligibilityWarning = {
  key: string
  messageKey: string
}

export function getSongEligibilityWarnings(song: SongEligibilityInput | null | undefined): EligibilityWarning[] {
  if (!song) return [{ key: 'noSong', messageKey: 'playlistCommunityWarnSelectSong' }]
  const warnings: EligibilityWarning[] = []
  const hasStreamLink =
    !!song.spotify_url ||
    !!song.suno_url ||
    (song.media_links && Object.values(song.media_links).some(v => typeof v === 'string' && v.length > 0))
  if (!hasStreamLink) {
    warnings.push({ key: 'noSpotify', messageKey: 'playlistCommunityWarnSpotifyLink' })
  }
  if (song.public_hidden !== false) {
    warnings.push({ key: 'noPublicPage', messageKey: 'playlistCommunityWarnPublicSong' })
  }
  return warnings
}
