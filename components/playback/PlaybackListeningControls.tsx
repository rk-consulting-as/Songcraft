'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import SpotifyEvidenceReview, { type SpotifyEvidencePending } from '@/components/spotify/SpotifyEvidenceReview'
import { useV2Toast } from '@/components/v2/V2Toast'
import { v2ApiFetch } from '@/lib/v2/apiClient'
import { PLAYBACK_LABELS } from '@/lib/playback/types'
import type { PlaybackPlatform } from '@/lib/playback/types'

type Props = {
  contextType: 'v2_session' | 'v2_playlist_room'
  contextId: string
  platform?: PlaybackPlatform
  demoMode?: boolean
  disabled?: boolean
}

export default function PlaybackListeningControls({
  contextType,
  contextId,
  platform = 'mixed',
  demoMode,
  disabled,
}: Props) {
  const router = useRouter()
  const { showToast } = useV2Toast()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [spotifyPending, setSpotifyPending] = useState<SpotifyEvidencePending | null>(null)

  const start = async () => {
    if (demoMode) {
      showToast('Apply playback migration to enable listening sessions')
      return
    }
    setBusy(true)
    try {
      const res = await v2ApiFetch<{ session: { id: string } }>('/api/v2/playback/sessions', {
        method: 'POST',
        body: JSON.stringify({
          platform,
          context_type: contextType,
          context_id: contextId,
        }),
      })
      setSessionId(res.session.id)
      showToast('Listening session started — open Spotify, listen, then finish when done')
      router.refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not start session')
    } finally {
      setBusy(false)
    }
  }

  const finish = async () => {
    if (!sessionId) return
    setBusy(true)
    try {
      await v2ApiFetch(`/api/v2/playback/sessions/${sessionId}`, {
        method: 'POST',
        body: JSON.stringify({ action: 'finish' }),
      })
      try {
        const spotify = await v2ApiFetch<{ pending: SpotifyEvidencePending | null }>(
          '/api/v2/integrations/spotify/sync-recently-played',
          { method: 'POST', body: JSON.stringify({ session_id: sessionId }) },
        )
        if (spotify.pending?.matches?.length) setSpotifyPending(spotify.pending)
      } catch {
        // Spotify not connected — session still finished
      }
      showToast('Session finished — review Spotify matches if detected')
      setSessionId(null)
      router.refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not finish session')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="v2-card v2-playback-card v2-playback-controls">
        <div className="v2-eyebrow">{PLAYBACK_LABELS.sessionParticipation}</div>
        <p className="v2-meta" style={{ margin: '8px 0 12px' }}>
          Start listening on Spotify or another app. ViaTone collects Spotify-sourced Playback Evidence from Recently Played — not official stream counts.
        </p>
        <div className="v2-hero-actions">
          {!sessionId ? (
            <button type="button" className="v2-btn hot sm" disabled={busy || disabled} onClick={start}>
              Start Listening
            </button>
          ) : (
            <button type="button" className="v2-btn secondary sm" disabled={busy} onClick={finish}>
              Finish Session
            </button>
          )}
        </div>
        {sessionId && (
          <p className="v2-meta" style={{ marginTop: 8 }}>Session active — finish when your listening is complete, then sync Recently Played.</p>
        )}
      </div>
      {spotifyPending && (
        <div style={{ marginTop: 12 }}>
          <SpotifyEvidenceReview pending={spotifyPending} onDone={() => setSpotifyPending(null)} />
        </div>
      )}
    </>
  )
}
