import type { SupabaseClient } from '@supabase/supabase-js'
import type { PlaybackProvider } from '../../PlaybackProviders'
import { defaultMatchTracks, scoreTrackMatch } from '../../PlaybackProviders'
import type { PlaybackEvidenceInput, PlaybackProviderContext } from '../../types'
import { scoreEvidenceRow, scoreToConfidence } from '../../PlaybackScoring'
import { isSpotifyOAuthEnabled } from '@/lib/spotify/config'
import { getSpotifyConnectionSafe } from '@/lib/spotify/connections'
import { syncAndMatchSpotifySession } from '@/lib/spotify/evidence'
import { v2ServiceClient } from '@/lib/v2/apiAuth'

function serviceSb(): SupabaseClient {
  return v2ServiceClient()
}

export function createSpotifyProvider(): PlaybackProvider {
  const configured = isSpotifyOAuthEnabled()
  return {
    id: 'spotify',
    displayName: 'Spotify',
    isConfigured: configured,

    async sync() {},

    async startPlayback() {},

    async finishPlayback(ctx: PlaybackProviderContext): Promise<PlaybackEvidenceInput[]> {
      if (!this.isConfigured || !ctx.userId || !ctx.sessionId) return []
      const sb = serviceSb()
      const conn = await getSpotifyConnectionSafe(sb, ctx.userId)
      if (!conn.connected) return []

      await syncAndMatchSpotifySession(sb, ctx.userId, ctx.sessionId)
      return []
    },

    async collectEvidence(ctx: PlaybackProviderContext): Promise<PlaybackEvidenceInput[]> {
      return this.finishPlayback(ctx)
    },

    async matchTracks(snapshotTracks, candidates) {
      return defaultMatchTracks(snapshotTracks, candidates, 'spotify')
    },

    calculateConfidence(e) {
      const meta = e.metadata || {}
      const matchScore = Number(meta.matchScore || 0)
      const base = scoreEvidenceRow({ ...e, provider: 'spotify' })
      const boosted = matchScore >= 0.95 ? Math.max(base, 0.85) : base
      return scoreToConfidence(boosted)
    },
  }
}

export const SpotifyProvider = createSpotifyProvider()
