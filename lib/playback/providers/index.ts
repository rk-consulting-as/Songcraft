import type { PlaybackProvider } from '../PlaybackProviders'
import { defaultMatchTracks, scoreTrackMatch } from '../PlaybackProviders'
import { SpotifyProvider } from './spotify/SpotifyProvider'
import type {
  PlaybackConfidence,
  PlaybackEvidenceInput,
  PlaybackProviderContext,
} from '../types'
import { scoreEvidenceRow, scoreToConfidence } from '../PlaybackScoring'

function manualProvider(id: 'manual', displayName: string): PlaybackProvider {
  return {
    id,
    displayName,
    isConfigured: true,
    async sync() {},
    async startPlayback() {},
    async finishPlayback(ctx) {
      return [{
        provider: id,
        evidenceType: 'manual_confirm',
        trackTitle: 'Manual listening confirmation',
        observedAt: ctx.endedAt || new Date().toISOString(),
        metadata: { contextType: ctx.contextType, contextId: ctx.contextId },
      }]
    },
    async collectEvidence(ctx) {
      return this.finishPlayback(ctx)
    },
    async matchTracks(snapshotTracks, candidates) {
      return defaultMatchTracks(snapshotTracks, candidates, id)
    },
    calculateConfidence(e) {
      return scoreToConfidence(scoreEvidenceRow(e))
    },
  }
}

export const ManualProvider: PlaybackProvider = manualProvider('manual', 'Manual Participation')

export { SpotifyProvider }

export const YoutubeProvider: PlaybackProvider = {
  id: 'youtube',
  displayName: 'YouTube',
  isConfigured: false,
  async sync() {},
  async startPlayback() {},
  async finishPlayback() {
    // Future: YouTube watch history API
    return []
  },
  async collectEvidence() {
    return []
  },
  async matchTracks(snapshotTracks, candidates) {
    return defaultMatchTracks(snapshotTracks, candidates, 'youtube')
  },
  calculateConfidence(e) {
    return scoreToConfidence(scoreEvidenceRow({ ...e, provider: 'youtube' }))
  },
}

export const LastFmProvider: PlaybackProvider = {
  id: 'lastfm',
  displayName: 'Last.fm',
  isConfigured: !!process.env.LASTFM_API_KEY,
  async sync() {},
  async startPlayback() {},
  async finishPlayback(ctx) {
    // Phase 6B+: bridge lib/lastfm/client.ts for scrobble evidence
    // Kept separate from campaign proof flow
    if (!ctx.snapshot) return []
    return []
  },
  async collectEvidence(ctx) {
    return this.finishPlayback(ctx)
  },
  async matchTracks(snapshotTracks, candidates) {
    return defaultMatchTracks(snapshotTracks, candidates, 'lastfm')
  },
  calculateConfidence(e) {
    return scoreToConfidence(scoreEvidenceRow({ ...e, provider: 'lastfm' }))
  },
}

export const ViaToneProvider: PlaybackProvider = {
  id: 'viatone',
  displayName: 'ViaTone Stream Engine',
  isConfigured: true,
  async sync() {},
  async startPlayback() {},
  async finishPlayback(ctx) {
    // Evidence collected server-side from v2_session_play_logs + participation
    return []
  },
  async collectEvidence() {
    return []
  },
  async matchTracks(snapshotTracks, candidates) {
    return defaultMatchTracks(snapshotTracks, candidates, 'viatone')
  },
  calculateConfidence(e) {
    return scoreToConfidence(scoreEvidenceRow({ ...e, provider: 'viatone' }))
  },
}

/** Placeholder providers for future integrations */
function placeholderProvider(
  id: PlaybackProvider['id'],
  displayName: string,
): PlaybackProvider {
  return {
    id,
    displayName,
    isConfigured: false,
    async sync() {},
    async startPlayback() {},
    async finishPlayback() { return [] },
    async collectEvidence() { return [] },
    async matchTracks(snapshotTracks, candidates) {
      return defaultMatchTracks(snapshotTracks, candidates, id)
    },
    calculateConfidence(e) {
      return scoreToConfidence(scoreEvidenceRow({ ...e, provider: id }))
    },
  }
}

export const AppleMusicProvider = placeholderProvider('apple', 'Apple Music')
export const TidalProvider = placeholderProvider('tidal', 'Tidal')
export const DeezerProvider = placeholderProvider('deezer', 'Deezer')
export const SoundCloudProvider = placeholderProvider('soundcloud', 'SoundCloud')
export const AmazonMusicProvider = placeholderProvider('amazon', 'Amazon Music')

export const ALL_PLAYBACK_PROVIDERS: PlaybackProvider[] = [
  SpotifyProvider,
  YoutubeProvider,
  LastFmProvider,
  ViaToneProvider,
  ManualProvider,
  AppleMusicProvider,
  TidalProvider,
  DeezerProvider,
  SoundCloudProvider,
  AmazonMusicProvider,
]

export function getProviderRegistry(): Record<string, PlaybackProvider> {
  return Object.fromEntries(ALL_PLAYBACK_PROVIDERS.map(p => [p.id, p]))
}

/** Collect ViaTone Stream Engine evidence from v2 tables (service role). */
export async function collectViaToneStreamEvidence(
  sb: import('@supabase/supabase-js').SupabaseClient,
  ctx: PlaybackProviderContext,
): Promise<PlaybackEvidenceInput[]> {
  if (!ctx.contextId || ctx.contextType !== 'v2_session') return []

  const since = ctx.startedAt
  const until = ctx.endedAt || new Date().toISOString()

  const [{ data: logs }, { data: participation }] = await Promise.all([
    sb
      .from('v2_session_play_logs')
      .select('id, played_at, v2_session_songs(position, title, artist_name)')
      .eq('session_id', ctx.contextId)
      .gte('played_at', since)
      .lte('played_at', until),
    sb
      .from('v2_session_participation')
      .select('user_id, listened_at')
      .eq('session_id', ctx.contextId)
      .eq('user_id', ctx.userId)
      .not('listened_at', 'is', null),
  ])

  const out: PlaybackEvidenceInput[] = []

  for (const log of logs || []) {
    const song = (log as { v2_session_songs?: { position?: number; title?: string; artist_name?: string } }).v2_session_songs
    out.push({
      provider: 'viatone',
      evidenceType: 'stream_engine',
      trackPosition: song?.position,
      trackTitle: song?.title,
      trackArtist: song?.artist_name,
      observedAt: log.played_at as string,
      metadata: { playLogId: log.id },
    })
  }

  if (participation?.length) {
    out.push({
      provider: 'viatone',
      evidenceType: 'participation_confirm',
      observedAt: (participation[0] as { listened_at: string }).listened_at,
      metadata: { userId: ctx.userId },
    })
  }

  return out
}
