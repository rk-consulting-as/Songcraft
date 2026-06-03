import type { SongStudioArea } from './routes'
import { SONG_STUDIO_AREAS } from './routes'

export type SongStudioAreaMeta = {
  area: SongStudioArea
  icon: string
  labelKey: string
  descKey: string
}

export const SONG_STUDIO_AREA_META: SongStudioAreaMeta[] = SONG_STUDIO_AREAS.map(area => {
  const meta: Record<SongStudioArea, Omit<SongStudioAreaMeta, 'area'>> = {
    overview: { icon: '⌂', labelKey: 'songStudioOverview', descKey: 'songStudioOverviewDesc' },
    write: { icon: '✎', labelKey: 'songStudioWrite', descKey: 'songStudioAreaWriteDesc' },
    produce: { icon: '♫', labelKey: 'songStudioProduce', descKey: 'songStudioAreaProduceDesc' },
    promote: { icon: '📣', labelKey: 'songStudioPromote', descKey: 'songStudioAreaPromoteDesc' },
    release: { icon: '↗', labelKey: 'songStudioRelease', descKey: 'songStudioAreaReleaseDesc' },
    publish: { icon: '🌐', labelKey: 'songStudioPublish', descKey: 'songStudioAreaPublishDesc' },
    settings: { icon: '⚙', labelKey: 'songStudioSettings', descKey: 'songStudioSettingsDesc' },
  }
  return { area, ...meta[area] }
})

export function adjacentSongStudioArea(area: SongStudioArea, direction: 1 | -1): SongStudioArea {
  const idx = SONG_STUDIO_AREAS.indexOf(area)
  const next = (idx + direction + SONG_STUDIO_AREAS.length) % SONG_STUDIO_AREAS.length
  return SONG_STUDIO_AREAS[next]
}

export const SONG_STUDIO_SHEET_OPEN_EVENT = 'songcraft:open-song-studio-sheet'
