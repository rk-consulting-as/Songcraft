'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useV2Toast } from '@/components/v2/V2Toast'
import { v2ApiFetch } from '@/lib/v2/apiClient'
import type { V2Song } from '@/lib/v2/types'

type Target =
  | { type: 'circle'; slug: string; label: string }
  | { type: 'session'; id: string; label: string }
  | { type: 'playlist'; slug: string; label: string }

type Props = {
  target: Target
  songs: V2Song[]
  demoMode?: boolean
  showPitch?: boolean
}

export default function V2SubmitSongPanel({ target, songs, demoMode, showPitch }: Props) {
  const router = useRouter()
  const { showToast } = useV2Toast()
  const [songId, setSongId] = useState(songs[0]?.legacySongId || songs[0]?.id || '')
  const [pitch, setPitch] = useState('')
  const [busy, setBusy] = useState(false)

  const endpoint = target.type === 'circle'
    ? `/api/v2/community/circles/${target.slug}/songs`
    : target.type === 'session'
      ? `/api/v2/community/sessions/${target.id}/songs`
      : `/api/v2/community/playlists/${target.slug}/songs`

  const submit = async () => {
    if (!songId) {
      showToast('Select a song first')
      return
    }
    if (demoMode) {
      showToast('Submit when community tables are seeded')
      return
    }
    setBusy(true)
    try {
      await v2ApiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          song_id: songId,
          pitch: showPitch && target.type === 'playlist' ? pitch.trim() || undefined : undefined,
        }),
      })
      showToast(`Submitted to ${target.label}`)
      router.refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Submission failed — log in and use your own songs')
    } finally {
      setBusy(false)
    }
  }

  if (!songs.length) {
    return (
      <p className="v2-meta">
        You need at least one song before submitting. Add songs in{' '}
        <a href="/dashboard" style={{ color: 'var(--v2-brand2)' }}>Legacy Studio</a>, then come back to submit here.
      </p>
    )
  }

  return (
    <div className="v2-submit-panel">
      <label className="v2-meta" htmlFor={`submit-song-${target.type}`}>Your song</label>
      <select
        id={`submit-song-${target.type}`}
        className="v2-select"
        value={songId}
        onChange={e => setSongId(e.target.value)}
      >
        {songs.map(s => (
          <option key={s.id} value={s.legacySongId || s.id}>{s.title} — {s.artistName}</option>
        ))}
      </select>
      {showPitch && target.type === 'playlist' && (
        <textarea
          className="v2-input"
          rows={3}
          placeholder="Short pitch for the curator (optional)"
          value={pitch}
          onChange={e => setPitch(e.target.value)}
          maxLength={500}
          style={{ width: '100%', marginTop: 8 }}
        />
      )}
      <button type="button" className="v2-btn hot sm" style={{ marginTop: 12 }} onClick={submit} disabled={busy}>
        {busy ? 'Submitting…' : `Submit to ${target.label}`}
      </button>
    </div>
  )
}
