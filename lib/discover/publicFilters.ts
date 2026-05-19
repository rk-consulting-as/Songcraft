/** Public artist eligible for discover surfaces. */
export function isPublicDiscoverArtist(artist: {
  page_enabled?: boolean | null
  page_slug?: string | null
  admin_hidden?: boolean | null
}): boolean {
  return !!(artist.page_enabled && artist.page_slug && !artist.admin_hidden)
}

/** Public song eligible for discover / public surfaces. */
export function isPublicDiscoverSong(song: {
  public_hidden?: boolean | null
  admin_hidden?: boolean | null
}, artist: { admin_hidden?: boolean | null; page_enabled?: boolean | null }): boolean {
  if (song.public_hidden || song.admin_hidden) return false
  if (artist.admin_hidden || !artist.page_enabled) return false
  return true
}
