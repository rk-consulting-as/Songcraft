'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useV2Toast } from '@/components/v2/V2Toast'
import { v2ApiFetch } from '@/lib/v2/apiClient'

type Props = {
  roomSlug: string
  initialListened?: boolean
  demoMode?: boolean
}

export default function V2PlaylistListenButton({ roomSlug, initialListened, demoMode }: Props) {
  const router = useRouter()
  const { showToast } = useV2Toast()
  const [listened, setListened] = useState(!!initialListened)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const confirm = async () => {
    if (demoMode) {
      showToast('Playlist participation needs seeded data')
      return
    }
    setBusy(true)
    try {
      await v2ApiFetch(`/api/v2/community/playlists/${roomSlug}/participation`, {
        method: 'PATCH',
        body: JSON.stringify({ listened: true, note: note.trim() || undefined }),
      })
      setListened(true)
      showToast('Listening participation saved')
      router.refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  if (listened) {
    return <p className="v2-meta">You confirmed listening in this room.</p>
  }

  return (
    <div className="v2-card" style={{ marginBottom: 16 }}>
      <p className="v2-meta" style={{ marginTop: 0 }}>Confirm you listened in this playlist room round.</p>
      <input
        type="text"
        className="v2-input"
        placeholder="Optional short note"
        value={note}
        maxLength={200}
        onChange={e => setNote(e.target.value)}
        style={{ width: '100%', marginBottom: 12 }}
      />
      <button type="button" className="v2-btn hot sm" disabled={busy} onClick={confirm}>
        I listened in this room
      </button>
    </div>
  )
}
