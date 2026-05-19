export type ArtistWorkspaceTab =
  | 'overview'
  | 'songs'
  | 'campaigns'
  | 'fanhub'
  | 'analytics'
  | 'epk'
  | 'public'
  | 'events'
  | 'settings'

export const ARTIST_WORKSPACE_TABS: ArtistWorkspaceTab[] = [
  'overview',
  'songs',
  'campaigns',
  'fanhub',
  'analytics',
  'epk',
  'public',
  'events',
  'settings',
]

export function isArtistWorkspaceTab(value: string): value is ArtistWorkspaceTab {
  return (ARTIST_WORKSPACE_TABS as string[]).includes(value)
}

export function tabFromHash(hash: string): ArtistWorkspaceTab | null {
  const id = hash.replace(/^#/, '').trim()
  return isArtistWorkspaceTab(id) ? id : null
}
