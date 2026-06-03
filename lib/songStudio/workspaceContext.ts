import { SONG_STUDIO_AREA_META } from './areaMeta'
import type { SongStudioRoute } from './routes'

export function getSongStudioAreaLabel(route: SongStudioRoute, tx: Record<string, string>): string {
  const meta = SONG_STUDIO_AREA_META.find(item => item.area === route.area)
  return meta ? (tx[meta.labelKey] || meta.labelKey) : route.area
}

export function getSongStudioSubSectionLabel(route: SongStudioRoute, tx: Record<string, string>): string | null {
  if (route.area === 'overview' || route.area === 'settings') return null
  if (route.area === 'write') {
    if (route.writePanel === 'backstory') return tx.backstory
    if (route.writePanel === 'dna') return tx.songDnaTab
    return tx.lyrics
  }
  if (route.area === 'produce') {
    if (route.producePanel === 'cover') return tx.cover
    if (route.producePanel === 'canvas') return tx.canvas
    return tx.sunoTitle
  }
  if (route.area === 'promote') {
    return route.promotePanel === 'assets' ? tx.songStudioPromoteAssetsTitle : tx.captionsTitle
  }
  if (route.area === 'release') {
    return route.releasePanel === 'distribution' ? tx.distributionTitle : tx.campaignTitle
  }
  if (route.area === 'publish') {
    return route.publishPanel === 'publish' ? tx.publishTitle : tx.mediaTitle
  }
  return null
}
