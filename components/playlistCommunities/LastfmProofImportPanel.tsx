'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  detectLastfmActivity,
  submitLastfmImportProof,
  type LastfmActivitySuggestion,
} from '@/lib/playlistCommunities/client'
import { formatDateYmd } from '@/lib/playlistCommunities/participationBoard'
import ActivityProofDisclaimer from './ActivityProofDisclaimer'
import { t, useLang } from '@/lib/i18n'

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
  const [suggestions, setSuggestions] = useState<LastfmActivitySuggestion[]>([])
  const [scrobbleCount, setScrobbleCount] = useState(0)
  const [campaignsScanned, setCampaignsScanned] = useState(0)
  const [scanning, setScanning] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scanned, setScanned] = useState(false)
  const initialScanDone = useRef(false)

  useEffect(() => {
    ;(async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data } = await sb.from('profiles').select('lastfm_username').eq('id', user.id).maybeSingle()
      if (data?.lastfm_username) setUsername(data.lastfm_username)
    })()
  }, [])

  const runDetect = useCallback(async () => {
    if (!username.trim()) {
      setError(tx.lastfmErrorUsername)
      return
    }
    setScanning(true)
    setError(null)
    setSuggestions([])
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (user && username.trim()) {
        await sb.from('profiles').update({ lastfm_username: username.trim() }).eq('id', user.id)
      }
      const res = await detectLastfmActivity({
        lastfm_username: username.trim(),
        from_date: fromDate,
        to_date: toDate,
        campaign_id: campaignId,
      })
      setSuggestions(res?.suggestions || [])
      setScrobbleCount(res?.scrobbleCount ?? 0)
      setCampaignsScanned(res?.campaignsScanned ?? 0)
      setScanned(true)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed'
      setError(mapError(msg, tx))
    } finally {
      setScanning(false)
    }
  }, [username, fromDate, toDate, campaignId, tx])

  useEffect(() => {
    if (!username.trim() || initialScanDone.current) return
    initialScanDone.current = true
    runDetect()
  }, [username, runDetect])

  const approveSuggestion = async (s: LastfmActivitySuggestion) => {
    setApprovingId(s.campaignId)
    setError(null)
    try {
      await submitLastfmImportProof(s.campaignId, {
        lastfm_username: username.trim(),
        from_date: s.fromDate,
        to_date: s.toDate,
        activity_date: s.activityDate,
      })
      setSuggestions(prev => prev.filter(x => x.campaignId !== s.campaignId))
      if (s.campaignId === campaignId) onSubmitted()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed'
      setError(mapError(msg, tx))
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <div className="lastfm-proof-import">
      <p className="lastfm-proof-import__intro">{tx.lastfmAutoIntro}</p>
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

      <button type="button" className="btn-outline" disabled={scanning || !username.trim()} onClick={runDetect}>
        {scanning ? tx.lastfmScanning : tx.lastfmScanButton}
      </button>

      {scanned && !scanning && (
        <p className="lastfm-proof-import__scan-meta">
          {tx.lastfmScanMeta
            .replace('{scrobbles}', String(scrobbleCount))
            .replace('{campaigns}', String(campaignsScanned))}
        </p>
      )}

      {suggestions.length > 0 && (
        <div className="lastfm-suggestions">
          <h4 className="lastfm-suggestions__title">{tx.lastfmDetectedTitle}</h4>
          <p className="lastfm-suggestions__subtitle">{tx.lastfmDetectedSubtitle}</p>
          <ul className="lastfm-suggestions__list">
            {suggestions.map(s => (
              <li
                key={s.campaignId}
                className={`lastfm-suggestion-card card${s.campaignId === campaignId ? ' lastfm-suggestion-card--current' : ''}`}
              >
                <div className="lastfm-suggestion-card__top">
                  {s.playlistImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.playlistImageUrl} alt="" className="lastfm-suggestion-card__cover" />
                  ) : (
                    <div className="lastfm-suggestion-card__cover lastfm-suggestion-card__cover--empty">♫</div>
                  )}
                  <div className="lastfm-suggestion-card__meta">
                    <p className="lastfm-suggestion-card__headline">{s.headline}</p>
                    <p className="lastfm-suggestion-card__playlist">{s.playlistTitle}</p>
                    {s.sessionLabel && (
                      <p className="lastfm-suggestion-card__session">{tx.lastfmSessionLabel}: {s.sessionLabel}</p>
                    )}
                  </div>
                </div>
                <div className="lastfm-suggestion-card__stats">
                  <span>{tx.lastfmMatchedTracks.replace('{n}', String(s.matchedCount)).replace('{total}', String(s.playlistTrackCount))}</span>
                  <span>{tx.lastfmCompletion.replace('{pct}', String(s.completionPercent))}</span>
                  <span className={`ai-confidence ai-confidence--${s.confidence}`}>
                    {tx[`aiConfidence_${s.confidence}`] || s.confidence}
                  </span>
                  {s.clusterCount > 0 && (
                    <span>{tx.lastfmClusterCount.replace('{n}', String(s.clusterCount))}</span>
                  )}
                </div>
                <p className="lastfm-suggestion-card__explanation">{s.explanation}</p>
                <button
                  type="button"
                  className="btn-gold lastfm-suggestion-card__approve"
                  disabled={!!approvingId}
                  onClick={() => approveSuggestion(s)}
                >
                  {approvingId === s.campaignId ? tx.loading : tx.lastfmApproveSuggestion}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {scanned && !scanning && suggestions.length === 0 && !error && (
        <p className="lastfm-proof-import__empty">{tx.lastfmNoSuggestions}</p>
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
