'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import V2QueuePanel from '@/components/v2/V2QueuePanel'
import { useV2Toast } from '@/components/v2/V2Toast'
import { v2ApiFetch } from '@/lib/v2/apiClient'
import type {
  V2SessionParticipant,
  V2SessionPlayLog,
  V2SessionRecap,
  V2SessionSongRow,
  V2SessionStatus,
  V2SubmissionStatus,
} from '@/lib/v2/types'

type Props = {
  sessionId: string
  sessionStatus: V2SessionStatus
  queue: V2SessionSongRow[]
  playLogs: V2SessionPlayLog[]
  participants: V2SessionParticipant[]
  hostNotes: string[]
  recap?: V2SessionRecap | null
  isHost?: boolean
  demoMode?: boolean
  userJoined?: boolean
  userListened?: boolean
}

export default function V2StreamEnginePanel({
  sessionId,
  sessionStatus,
  queue,
  playLogs,
  participants,
  hostNotes,
  recap,
  isHost,
  demoMode,
  userJoined,
  userListened,
}: Props) {
  const router = useRouter()
  const { showToast } = useV2Toast()
  const [rows, setRows] = useState(queue)
  const [notes, setNotes] = useState(hostNotes)
  const [noteDraft, setNoteDraft] = useState('')
  const [partNote, setPartNote] = useState('')
  const [busy, setBusy] = useState(false)

  const isLive = sessionStatus === 'live'
  const isCompleted = sessionStatus === 'ended'
  const approved = rows.filter(r => r.status === 'approved' && !r.playedAt)
  const current = rows.find(r => r.isNowPlaying) || approved[0]
  const upNext = approved.filter(r => r.id !== current?.id).slice(0, 5)
  const playedCount = rows.filter(r => r.playedAt).length
  const totalApproved = rows.filter(r => r.status === 'approved').length

  const engineCall = async (action: string, extra?: Record<string, unknown>) => {
    if (demoMode) { showToast('Stream Engine beta requires seeded sessions'); return }
    setBusy(true)
    try {
      await v2ApiFetch(`/api/v2/community/sessions/${sessionId}/engine`, {
        method: 'POST',
        body: JSON.stringify({ action, ...extra }),
      })
      showToast('Updated')
      router.refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  const joinSession = async () => {
    if (demoMode) { showToast('Join when session is in database'); return }
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

  const markParticipation = async () => {
    setBusy(true)
    try {
      await v2ApiFetch(`/api/v2/community/sessions/${sessionId}/members`, {
        method: 'PATCH',
        body: JSON.stringify({ listened: true, note: partNote }),
      })
      showToast('Participation saved')
      router.refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Join session first')
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
    } catch {
      showToast('Only the host can manage this session.')
    } finally {
      setBusy(false)
    }
  }

  if (isCompleted && recap) {
    return (
      <div className="v2-card v2-recap">
        <div className="v2-eyebrow">Session recap · Powered by Aigent4U</div>
        <h3 style={{ margin: '8px 0 16px' }}>{recap.title}</h3>
        <div className="v2-grid cols-3" style={{ marginBottom: 16 }}>
          <div className="v2-stat"><strong>{recap.songsPlayed.length}</strong><span>songs played</span></div>
          <div className="v2-stat"><strong>{recap.participantCount}</strong><span>participants</span></div>
          <div className="v2-stat"><strong>{recap.feedbackCount}</strong><span>feedback</span></div>
        </div>
        {recap.songsPlayed.length > 0 && (
          <>
            <h4 style={{ margin: '0 0 8px' }}>Play log</h4>
            {recap.songsPlayed.map(log => (
              <div key={log.id} className="v2-track">
                <span className="num">▶</span>
                <div><b>{log.title}</b><span>{log.artistName}</span></div>
                <span className="v2-meta">{new Date(log.playedAt).toLocaleTimeString()}</span>
              </div>
            ))}
          </>
        )}
        {recap.topSupporters.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h4 style={{ margin: '0 0 8px' }}>Most active supporters</h4>
            {recap.topSupporters.map(s => (
              <div key={s.name} className="v2-track"><span className="num">★</span><div><b>{s.name}</b></div><span>{s.count}</span></div>
            ))}
          </div>
        )}
        {recap.hostNotes.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h4 style={{ margin: '0 0 8px' }}>Host notes</h4>
            {recap.hostNotes.map((n, i) => <p key={i} className="v2-meta">{n}</p>)}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="v2-engine-header">
        {isLive && <span className="v2-live-badge">LIVE · Stream Engine Beta</span>}
        {!isLive && !isCompleted && <span className="v2-tag">Upcoming</span>}
        {!isHost && !demoMode && (
          <p className="v2-permission-hint">Only the host can manage this session. Join below to participate as a listener.</p>
        )}
        {isHost && !isCompleted && (
          <div className="v2-hero-actions" style={{ marginTop: 12 }}>
            {!isLive && (
              <button type="button" className="v2-btn hot sm" disabled={busy} onClick={() => engineCall('start')}>Start session</button>
            )}
            {isLive && (
              <>
                <button type="button" className="v2-btn hot sm" disabled={busy} onClick={() => engineCall('mark_played', { row_id: current?.id })}>Mark played</button>
                <button type="button" className="v2-btn secondary sm" disabled={busy} onClick={() => engineCall('skip', { row_id: current?.id })}>Skip</button>
                {upNext[0] && (
                  <button type="button" className="v2-btn secondary sm" disabled={busy} onClick={() => engineCall('bump_next', { row_id: upNext[0].id })}>Bump next</button>
                )}
                <button type="button" className="v2-btn secondary sm" disabled={busy} onClick={() => engineCall('end')}>End session</button>
              </>
            )}
          </div>
        )}
      </div>

      {isLive && current && (
        <div className="v2-card v2-now-playing" style={{ marginBottom: 16 }}>
          <div className="v2-eyebrow">Now playing</div>
          <h3 style={{ margin: '4px 0' }}>{current.title}</h3>
          <p className="v2-meta">{current.artistName}{current.submittedByName ? ` · submitted by ${current.submittedByName}` : ''}</p>
          <p className="v2-meta">{playedCount} / {totalApproved} in queue</p>
        </div>
      )}

      {isLive && upNext.length > 0 && (
        <div className="v2-card" style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 8px' }}>Up next</h4>
          <V2QueuePanel tracks={upNext.map((r, i) => ({
            position: i + 1,
            title: r.title,
            artistName: r.artistName,
            duration: r.duration || '',
          }))} />
        </div>
      )}

      {!isLive && !isCompleted && (
        <div className="v2-hero-actions" style={{ marginBottom: 16 }}>
          {!userJoined && <button type="button" className="v2-btn hot" onClick={joinSession} disabled={busy}>I joined this session</button>}
          {userJoined && <span className="v2-tag">You joined</span>}
        </div>
      )}

      {(isLive || isCompleted) && userJoined && !userListened && (
        <div className="v2-card" style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 8px' }}>Your participation</h4>
          <button type="button" className="v2-btn hot sm" disabled={busy} onClick={markParticipation}>I listened</button>
          <input className="v2-select" placeholder="Short note (optional)" value={partNote} onChange={e => setPartNote(e.target.value)} style={{ marginTop: 8 }} />
        </div>
      )}

      <div className="v2-card">
        {approved.length > 0 && !isLive ? (
          <V2QueuePanel tracks={approved.map(r => ({
            position: r.position,
            title: r.title,
            artistName: r.artistName,
            duration: r.duration || '',
            isNowPlaying: r.isNowPlaying,
          }))} />
        ) : !isLive && (
          <p className="v2-meta">Queue empty — approve submissions or wait for host to go live.</p>
        )}
        {isLive && playLogs.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <h4 style={{ margin: '0 0 8px' }}>Play log</h4>
            {playLogs.slice(0, 5).map(log => (
              <div key={log.id} className="v2-track"><span className="num">▶</span><div><b>{log.title}</b><span>{log.artistName}</span></div></div>
            ))}
          </div>
        )}
      </div>

      {isHost && rows.some(r => r.status === 'pending') && (
        <div className="v2-card" style={{ marginTop: 16 }}>
          <h4 style={{ margin: '0 0 12px' }}>Pending submissions</h4>
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

      {participants.length > 0 && (
        <div className="v2-card" style={{ marginTop: 16 }}>
          <h4 style={{ margin: '0 0 8px' }}>Participants ({participants.length})</h4>
          {participants.slice(0, 8).map(p => (
            <div key={p.id} className="v2-track">
              <span className="num">{p.listenedAt ? '👂' : '👤'}</span>
              <div><b>{p.displayName}</b>{p.note && <span>{p.note}</span>}</div>
            </div>
          ))}
        </div>
      )}

      {isHost && isLive && (
        <div className="v2-card" style={{ marginTop: 16 }}>
          <h4 style={{ margin: '0 0 8px' }}>Session note</h4>
          <div className="v2-hero-actions">
            <input className="v2-select" value={noteDraft} onChange={e => setNoteDraft(e.target.value)} placeholder="Host note for recap…" />
            <button type="button" className="v2-btn sm hot" disabled={busy || !noteDraft.trim()} onClick={async () => {
              await engineCall('add_note', { note: noteDraft })
              setNotes(prev => [...prev, noteDraft])
              setNoteDraft('')
            }}>Add</button>
          </div>
          {notes.map((n, i) => <p key={i} className="v2-meta" style={{ marginTop: 8 }}>{n}</p>)}
        </div>
      )}
    </>
  )
}
