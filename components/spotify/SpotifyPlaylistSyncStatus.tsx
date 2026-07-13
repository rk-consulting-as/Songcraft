'use client'

import type { V2CuratorLinkedPlaylist } from '@/lib/v2/types'

const LABELS: Record<string, string> = {
  connected: 'Connected',
  manual: 'Manual metadata',
  syncing: 'Syncing…',
  synced: 'Synced',
  stale: 'Stale — sync again',
  needs_reconnect: 'Reconnect Spotify',
  forbidden: 'Access forbidden',
  failed: 'Sync failed',
  sync_unavailable: 'Sync unavailable',
  needs_configuration: 'Needs configuration',
}

type Props = {
  playlist: V2CuratorLinkedPlaylist
  onSync?: () => void
  syncing?: boolean
}

export default function SpotifyPlaylistSyncStatus({ playlist, onSync, syncing }: Props) {
  const label = LABELS[playlist.syncStatus] || playlist.syncStatus
  const canSync = playlist.platform === 'spotify' && ['synced', 'stale', 'connected', 'failed', 'manual', 'connected'].includes(playlist.syncStatus)

  return (
    <div className="v2-spotify-sync-status">
      <div className="v2-tagrow">
        <span className="v2-tag" style={{ color: playlist.syncStatus === 'synced' ? '#1ed760' : undefined }}>{label}</span>
        {playlist.lastSyncedAt && (
          <span className="v2-tag">Last sync {new Date(playlist.lastSyncedAt).toLocaleString()}</span>
        )}
      </div>
      {playlist.lastSyncError && (
        <p className="v2-meta" style={{ color: '#c05050', marginTop: 6 }}>
          {playlist.syncStatus === 'forbidden'
            ? 'Spotify could not read this playlist with your account. You can keep the manual link or try a playlist you own.'
            : playlist.lastSyncError}
        </p>
      )}
      {onSync && canSync && (
        <button type="button" className="v2-btn sm" style={{ marginTop: 8 }} disabled={syncing} onClick={onSync}>
          {syncing ? 'Syncing…' : 'Sync now'}
        </button>
      )}
    </div>
  )
}
