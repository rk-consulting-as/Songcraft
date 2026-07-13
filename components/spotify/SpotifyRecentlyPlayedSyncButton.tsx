'use client'

import { useState } from 'react'
import { useV2Toast } from '@/components/v2/V2Toast'
import { v2ApiFetch } from '@/lib/v2/apiClient'

type Props = {
  sessionId: string
  onPending?: (pending: unknown) => void
}

export default function SpotifyRecentlyPlayedSyncButton({ sessionId, onPending }: Props) {
  const { showToast } = useV2Toast()
  const [busy, setBusy] = useState(false)

  const sync = async () => {
    setBusy(true)
    try {
      const res = await v2ApiFetch<{ pending: unknown }>('/api/v2/integrations/spotify/sync-recently-played', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId }),
      })
      onPending?.(res.pending)
      showToast(res.pending ? 'Spotify listening activity synced' : 'No new matches found')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button type="button" className="v2-btn secondary sm" disabled={busy} onClick={sync}>
      {busy ? 'Syncing…' : 'Sync listening activity'}
    </button>
  )
}
