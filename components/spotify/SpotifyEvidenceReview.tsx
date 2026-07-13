'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useV2Toast } from '@/components/v2/V2Toast'
import { v2ApiFetch } from '@/lib/v2/apiClient'
import { SPOTIFY_POLICY_COPY } from '@/lib/spotify/config'
import SpotifyEvidenceDetails from './SpotifyEvidenceDetails'

export type SpotifyEvidencePending = {
  id: string
  sessionId?: string
  status: string
  matches: Array<{
    snapshotTitle: string
    snapshotArtist: string
    trackTitle: string
    trackArtist: string
    playedAt: string
    matchType: string
    matchScore: number
  }>
  coverage: number
  confidence: string
  windowStart?: string
  windowEnd?: string
}

type Props = {
  pending: SpotifyEvidencePending
  onDone?: () => void
}

export default function SpotifyEvidenceReview({ pending, onDone }: Props) {
  const router = useRouter()
  const { showToast } = useV2Toast()
  const [busy, setBusy] = useState(false)

  if (!pending.matches.length || pending.status !== 'pending_review') return null

  const act = async (action: 'submit' | 'keep_private' | 'dismiss') => {
    setBusy(true)
    try {
      await v2ApiFetch('/api/v2/integrations/spotify/evidence', {
        method: 'POST',
        body: JSON.stringify({ pending_id: pending.id, action }),
      })
      const msg = action === 'submit' ? 'Playback evidence submitted' : action === 'keep_private' ? 'Kept private' : 'Dismissed'
      showToast(msg)
      onDone?.()
      router.refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="v2-card v2-spotify-evidence-review">
      <div className="v2-eyebrow">Spotify listening match detected</div>
      <h4 style={{ margin: '8px 0' }}>Review before sharing with hosts</h4>
      <p className="v2-meta">
        Coverage {Math.round(pending.coverage * 100)}% · Confidence {pending.confidence}
        {pending.windowStart && ` · ${new Date(pending.windowStart).toLocaleString()} – ${pending.windowEnd ? new Date(pending.windowEnd).toLocaleString() : 'now'}`}
      </p>
      <SpotifyEvidenceDetails matches={pending.matches} />
      <p className="v2-meta" style={{ marginTop: 12, fontSize: 12 }}>{SPOTIFY_POLICY_COPY}</p>
      <div className="v2-hero-actions" style={{ marginTop: 12, flexWrap: 'wrap' }}>
        <button type="button" className="v2-btn hot sm" disabled={busy} onClick={() => act('submit')}>Submit Playback Evidence</button>
        <button type="button" className="v2-btn secondary sm" disabled={busy} onClick={() => act('keep_private')}>Keep private</button>
        <button type="button" className="v2-btn sm" disabled={busy} onClick={() => act('dismiss')}>Dismiss</button>
      </div>
    </div>
  )
}
