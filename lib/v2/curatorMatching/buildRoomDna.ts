import type { CuratorPlaylistDna } from './curatorMatchTypes'

export function parseRoomDna(raw: unknown): CuratorPlaylistDna {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  return {
    genres: Array.isArray(o.genres) ? o.genres.map(String) : undefined,
    moods: Array.isArray(o.moods) ? o.moods.map(String) : undefined,
    energyLevel: typeof o.energyLevel === 'string' ? o.energyLevel as CuratorPlaylistDna['energyLevel'] : undefined,
    tempoMin: typeof o.tempoMin === 'number' ? o.tempoMin : undefined,
    tempoMax: typeof o.tempoMax === 'number' ? o.tempoMax : undefined,
    vocalPreference: typeof o.vocalPreference === 'string' ? o.vocalPreference as CuratorPlaylistDna['vocalPreference'] : undefined,
    instrumentation: Array.isArray(o.instrumentation) ? o.instrumentation.map(String) : undefined,
    lyricalThemes: Array.isArray(o.lyricalThemes) ? o.lyricalThemes.map(String) : undefined,
    productionStyle: Array.isArray(o.productionStyle) ? o.productionStyle.map(String) : undefined,
    languagePreference: Array.isArray(o.languagePreference) ? o.languagePreference.map(String) : undefined,
    explicitContent: typeof o.explicitContent === 'string' ? o.explicitContent as CuratorPlaylistDna['explicitContent'] : undefined,
    acceptedAiIdentity: Array.isArray(o.acceptedAiIdentity) ? o.acceptedAiIdentity as CuratorPlaylistDna['acceptedAiIdentity'] : undefined,
    curatorDirection: typeof o.curatorDirection === 'string' ? o.curatorDirection : undefined,
    avoid: Array.isArray(o.avoid) ? o.avoid.map(String) : undefined,
  }
}

export function roomDnaFromMeta(roomMeta: Record<string, unknown> | null | undefined): CuratorPlaylistDna {
  return parseRoomDna(roomMeta?.dna)
}
