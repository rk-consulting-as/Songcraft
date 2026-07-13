import type { PlaybackConfidence } from '@/lib/playback/types'
import { PLAYBACK_LABELS } from '@/lib/playback/types'

export function confidenceLabel(level: PlaybackConfidence): string {
  return PLAYBACK_LABELS.confidence[level]
}

export function confidenceClass(level: PlaybackConfidence): string {
  return `v2-playback-confidence v2-playback-confidence--${level}`
}

export function formatCompletion(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function providerLabel(id: string): string {
  const map: Record<string, string> = {
    spotify: 'Spotify',
    youtube: 'YouTube',
    lastfm: 'Last.fm',
    viatone: 'ViaTone Stream',
    manual: 'Manual',
    apple: 'Apple Music',
    tidal: 'Tidal',
    deezer: 'Deezer',
    soundcloud: 'SoundCloud',
    amazon: 'Amazon Music',
  }
  return map[id] || id
}
