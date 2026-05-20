'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { previewLastfmImport, submitLastfmImportProof } from '@/lib/playlistCommunities/client'
import { formatDateYmd } from '@/lib/playlistCommunities/participationBoard'
import ActivityProofDisclaimer from './ActivityProofDisclaimer'
import { t, useLang } from '@/lib/i18n'

type Preview = {
  completionPercent: number
  confidence: string
  matchedCount: number
  scrobbleCount: number
  playlistTrackCount: number
  summaryText: string
  explanation: string
}

type Props = {
  campaignId: string
  onSubmitted: () => void
}

export default function LastfmProofImportPanel({ campaignId, onSubmitted }: Props) {
  const tx = t[useLang()] as Record<string, string>
  const today = formatDateYmd(new Date())
  const weekAgo = formatDateYmd(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))

  const [username, setUsername] = useState('')
  const [fromDate, setFromDate] = useState(weekAgo)
  const [toDate, setToDate] = useState(today)
  const [activityDate, setActivityDate] = useState(today)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data } = await sb.from('profiles').select('lastfm_username').eq('id', user.id).maybeSingle()
      if (data?.lastfm_username) setUsername(data.lastfm_username)
    })()
  }, [])

  const saveUsernameToProfile = async () => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user || !username.trim()) return
    await sb.from('profiles').update({ lastfm_username: username.trim() }).eq('id', user.id)
  }

  const runPreview = async () => {
    setBusy(true)
    setError(null)
    setPreview(null)
    try {
      await saveUsernameToProfile()
      const res = await previewLastfmImport(campaignId, {
        lastfm_username: username.trim(),
        from_date: fromDate,
        to_date: toDate,
      })
      if (!res?.analysis) throw new Error('preview_failed')
      setPreview(res.analysis)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed'
      setError(mapError(msg, tx))
    } finally {
      setBusy(false)
    }
  }

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await saveUsernameToProfile()
      await submitLastfmImportProof(campaignId, {
        lastfm_username: username.trim(),
        from_date: fromDate,
        to_date: toDate,
        activity_date: activityDate,
      })
      setPreview(null)
      onSubmitted()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed'
      setError(mapError(msg, tx))
    } finally {
      setBusy(false)
    }
  }

  const confidenceKey = preview ? `aiConfidence_${preview.confidence}` : null

  return (
    <div className="lastfm-proof-import">
      <p className="lastfm-proof-import__intro">{tx.lastfmProofIntro}</p>
      <p className="lastfm-proof-import__disclaimer">{tx.lastfmProofDisclaimer}</p>
      <ActivityProofDisclaimer compact />

      <label className="playlist-join-label">{tx.lastfmUsernameLabel}</label>
      <input
        className="input"
        value={username}
        onChange={e => setUsername(e.target.value)}
        placeholder={tx.lastfmUsernamePlaceholder}
        autoComplete="off"
      />
      <p className="lastfm-proof-import__hint">{tx.lastfmUsernameHint}</p>

      <div className="lastfm-proof-import__dates">
        <div>
          <label className="playlist-join-label">{tx.lastfmFromDate}</label>
          <input type="date" className="input" value={fromDate} max={toDate} onChange={e => setFromDate(e.target.value)} />
        </div>
        <div>
          <label className="playlist-join-label">{tx.lastfmToDate}</label>
          <input type="date" className="input" value={toDate} min={fromDate} max={today} onChange={e => setToDate(e.target.value)} />
        </div>
      </div>

      <label className="playlist-join-label">{tx.activityProofDate}</label>
      <input type="date" className="input" value={activityDate} max={today} onChange={e => setActivityDate(e.target.value)} />

      <div className="lastfm-proof-import__actions">
        <button type="button" className="btn-outline" disabled={busy || !username.trim()} onClick={runPreview}>
          {busy ? tx.loading : tx.lastfmPreviewButton}
        </button>
        <button type="button" className="btn-gold" disabled={busy || !username.trim() || !preview} onClick={submit}>
          {busy ? tx.loading : tx.lastfmSubmitButton}
        </button>
      </div>

      {preview && (
        <div className="lastfm-proof-preview card">
          <h4>{tx.lastfmPreviewTitle}</h4>
          <div className="lastfm-proof-preview__stats">
            <span>{tx.lastfmMatchedTracks.replace('{n}', String(preview.matchedCount)).replace('{total}', String(preview.playlistTrackCount))}</span>
            <span>{tx.lastfmCompletion.replace('{pct}', String(preview.completionPercent))}</span>
            <span>{tx.lastfmScrobbleCount.replace('{n}', String(preview.scrobbleCount))}</span>
            {confidenceKey && (
              <span className={`ai-confidence ai-confidence--${preview.confidence}`}>
                {tx[confidenceKey] || preview.confidence}
              </span>
            )}
          </div>
          <pre className="lastfm-proof-preview__summary">{preview.summaryText}</pre>
        </div>
      )}

      {error && <p className="playlist-campaign-error">{error}</p>}
    </div>
  )
}

function mapError(msg: string, tx: Record<string, string>): string {
  const keys: Record<string, string> = {
    lastfm_not_configured: 'lastfmErrorNotConfigured',
    lastfm_username_required: 'lastfmErrorUsername',
    date_range_required: 'lastfmErrorDates',
    invalid_date_range: 'lastfmErrorDates',
    date_range_too_long: 'lastfmErrorRangeTooLong',
    playlist_spotify_missing: 'lastfmErrorNoPlaylist',
    playlist_tracks_empty: 'lastfmErrorEmptyPlaylist',
    'User not found': 'lastfmErrorUserNotFound',
  }
  for (const [pattern, key] of Object.entries(keys)) {
    if (msg.includes(pattern)) return tx[key] || msg
  }
  return msg
}
