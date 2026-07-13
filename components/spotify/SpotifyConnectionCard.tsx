'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useV2Toast } from '@/components/v2/V2Toast'
import { v2ApiFetch } from '@/lib/v2/apiClient'
import { SPOTIFY_CONNECT_EXPLAINER, SPOTIFY_POLICY_COPY } from '@/lib/spotify/config'
import type { SpotifyConnectionSafe } from '@/lib/spotify/config'

type StatusResponse = {
  enabled: boolean
  appStatus: string
  connection: SpotifyConnectionSafe
  stats: { connected: boolean; submittedMatches: number; lastSyncAt?: string }
}

type Props = {
  returnTo?: string
  compact?: boolean
}

export default function SpotifyConnectionCard({ returnTo, compact }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const { showToast } = useV2Toast()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await v2ApiFetch<StatusResponse>('/api/v2/integrations/spotify/status')
      setStatus(data)
    } catch {
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (params.get('spotify_connected')) showToast('Spotify connected')
    if (params.get('spotify_error')) showToast(`Spotify: ${params.get('spotify_error')}`)
  }, [params, showToast])

  const connect = () => {
    const q = returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : ''
    window.location.href = `/api/v2/integrations/spotify/connect${q}`
  }

  const disconnect = async () => {
    setBusy(true)
    try {
      await v2ApiFetch('/api/v2/integrations/spotify/disconnect', { method: 'POST' })
      showToast('Spotify disconnected')
      await load()
      router.refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Disconnect failed')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="v2-card"><p className="v2-meta">Loading Spotify status…</p></div>

  if (!status?.enabled) {
    return <SpotifySetupRequiredState appStatus={status?.appStatus || 'not_configured'} />
  }

  const conn = status.connection

  return (
    <div className="v2-card v2-spotify-connection">
      <div className="v2-tagrow">
        <span className="v2-tag" style={{ color: '#1ed760' }}>Spotify</span>
        <span className="v2-tag">{conn.connected ? 'Connected' : conn.connectionStatus}</span>
      </div>
      {!compact && <p className="v2-meta" style={{ marginTop: 8 }}>{SPOTIFY_CONNECT_EXPLAINER}</p>}
      {conn.connected ? (
        <>
          <h4 style={{ margin: '12px 0 4px' }}>{conn.displayName || 'Spotify account'}</h4>
          <p className="v2-meta">
            Last sync: {conn.lastSyncAt ? new Date(conn.lastSyncAt).toLocaleString() : '—'} ·
            Submitted matches: {status.stats.submittedMatches}
          </p>
          {conn.lastError && <p className="v2-meta" style={{ color: '#c05050' }}>{conn.lastError}</p>}
          <div className="v2-hero-actions" style={{ marginTop: 12 }}>
            <button type="button" className="v2-btn secondary sm" disabled={busy} onClick={connect}>Reconnect</button>
            <button type="button" className="v2-btn sm" disabled={busy} onClick={disconnect}>Disconnect</button>
          </div>
        </>
      ) : (
        <>
          <p className="v2-meta" style={{ marginTop: 8 }}>
            Connect to sync playlists and compare Recently Played with listening sessions.
          </p>
          <button type="button" className="v2-btn hot sm" style={{ marginTop: 12 }} onClick={connect}>
            Connect Spotify
          </button>
        </>
      )}
      {!compact && (
        <p className="v2-meta" style={{ marginTop: 12, fontSize: 12 }}>{SPOTIFY_POLICY_COPY}</p>
      )}
    </div>
  )
}

function SpotifySetupRequiredState({ appStatus }: { appStatus: string }) {
  return (
    <div className="v2-card">
      <div className="v2-eyebrow">Spotify</div>
      <h4 style={{ margin: '8px 0' }}>Spotify connection unavailable</h4>
      <p className="v2-meta">
        {appStatus === 'not_configured'
          ? 'Spotify OAuth is not configured on this environment.'
          : 'Redirect URI or app settings need attention. See docs/SPOTIFY_SETUP.md.'}
      </p>
    </div>
  )
}

export { SpotifySetupRequiredState }
