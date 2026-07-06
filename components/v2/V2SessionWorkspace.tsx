'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import V2QueuePanel from '@/components/v2/V2QueuePanel'
import { useV2Toast } from '@/components/v2/V2Toast'
import { v2ApiFetch } from '@/lib/v2/apiClient'
import type { V2SessionSongRow, V2SubmissionStatus } from '@/lib/v2/types'

type Props = {
  sessionId: string
  queue: V2SessionSongRow[]
  isHost?: boolean
  demoMode?: boolean
  userJoined?: boolean
}

export default function V2SessionWorkspace({ sessionId, queue, isHost, demoMode, userJoined }: Props) {
  const router = useRouter()
  const { showToast } = useV2Toast()
  const [rows, setRows] = useState(queue)
  const [busy, setBusy] = useState(false)

  const approvedQueue = rows.filter(r => r.status === 'approved').map(r => ({
    position: r.position,
    title: r.title,
    artistName: r.artistName,
    duration: r.duration || '',
    isNowPlaying: r.isNowPlaying,
  }))

  const joinSession = async () => {
    if (demoMode) { showToast('Join when session is live in database'); return }
    setBusy(true)
    try {
      await v2ApiFetch(`/api/v2/community/sessions/${sessionId}/members`, { method: 'POST' })
      showToast('Joined session')
      router.refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Log in to join')
    } finally {
      setBusy(false)
    }
  }

  const setStatus = async (rowId: string, status: V2SubmissionStatus) => {
    setBusy(true)
    try {
      await v2ApiFetch(`/api/v2/community/sessions/${sessionId}/songs`, {
        method: 'PATCH',
        body: JSON.stringify({ row_id: rowId, status }),
      })
      setRows(prev => prev.map(r => r.id === rowId ? { ...r, status } : r))
      showToast(status === 'approved' ? 'Approved' : 'Removed')
      router.refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Host action failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="v2-hero-actions" style={{ marginBottom: 16 }}>
        {!userJoined && (
          <button type="button" className="v2-btn hot" onClick={joinSession} disabled={busy}>Join session</button>
        )}
        {userJoined && <span className="v2-tag">You joined</span>}
      </div>

      <div className="v2-card">
        {approvedQueue.length > 0 ? (
          <V2QueuePanel tracks={approvedQueue} />
        ) : (
          <p className="v2-meta">
            {/* TODO: Aigent4U Stream Engine — live queue sync */}
            Queue empty — approved submissions appear here. Stream Engine coming soon.
          </p>
        )}
      </div>

      {isHost && rows.some(r => r.status === 'pending') && (
        <div className="v2-card" style={{ marginTop: 16 }}>
          <h4 style={{ margin: '0 0 12px' }}>Pending submissions (host)</h4>
          {rows.filter(r => r.status === 'pending').map(r => (
            <div key={r.id} className="v2-track">
              <span className="num">♪</span>
              <div><b>{r.title}</b><span>{r.artistName}</span></div>
              <div className="v2-hero-actions">
                <button type="button" className="v2-btn sm hot" disabled={busy} onClick={() => setStatus(r.id, 'approved')}>Approve</button>
                <button type="button" className="v2-btn sm secondary" disabled={busy} onClick={() => setStatus(r.id, 'removed')}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
