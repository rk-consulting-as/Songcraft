'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useV2Toast } from '@/components/v2/V2Toast'
import { v2ApiFetch } from '@/lib/v2/apiClient'
import type { V2PlaylistRoomActivity } from '@/lib/v2/types'

type Props = {
  roomSlug: string
  roomId: string
  isHost?: boolean
  demoMode?: boolean
  activity: V2PlaylistRoomActivity
}

export default function V2PlaylistRoomEngine({ roomSlug, roomId, isHost, demoMode, activity }: Props) {
  const router = useRouter()
  const { showToast } = useV2Toast()
  const [busy, setBusy] = useState(false)

  const call = async (action: string, extra?: Record<string, unknown>) => {
    if (demoMode) { showToast('Playlist room engine needs seeded data'); return }
    setBusy(true)
    try {
      await v2ApiFetch(`/api/v2/community/playlists/${roomSlug}/engine`, {
        method: 'POST',
        body: JSON.stringify({ action, ...extra }),
      })
      showToast('Updated')
      router.refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="v2-tagrow" style={{ marginBottom: 12 }}>
        <span className={`v2-tag${activity.roundStatus === 'active' ? ' hot' : ''}`}>
          Round {activity.roundStatus}
        </span>
        <span className="v2-tag">{activity.listenedCount} played</span>
        <span className="v2-tag">Stream Engine Beta</span>
      </div>

      {isHost && (
        <div className="v2-hero-actions" style={{ marginBottom: 16 }}>
          {activity.roundStatus === 'active' ? (
            <button type="button" className="v2-btn hot sm" disabled={busy} onClick={() => call('complete_round')}>
              Complete listening round
            </button>
          ) : (
            <button type="button" className="v2-btn secondary sm" disabled={busy} onClick={() => call('start_round')}>
              Start new round
            </button>
          )}
        </div>
      )}

      <section className="v2-section" style={{ marginTop: 0, paddingTop: 0 }}>
        <h4 style={{ margin: '0 0 8px' }}>Recent submissions</h4>
        <div className="v2-card">
          {activity.recentSubmissions.length === 0 && <p className="v2-meta">No pending submissions.</p>}
          {activity.recentSubmissions.map(s => (
            <div key={s.id} className="v2-track">
              <span className="num">♪</span>
              <div><b>{s.title}</b><span>{s.artistName}</span></div>
              {isHost && (
                <button type="button" className="v2-btn sm secondary" disabled={busy} onClick={() => call('mark_played', { item_id: s.id })}>
                  Mark played
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {activity.lastPlayed.length > 0 && (
        <section className="v2-section">
          <h4 style={{ margin: '0 0 8px' }}>Last played</h4>
          <div className="v2-card">
            {activity.lastPlayed.map(s => (
              <div key={s.id} className="v2-track">
                <span className="num">▶</span>
                <div><b>{s.title}</b><span>{s.artistName}</span></div>
                <span className="v2-meta">{new Date(s.playedAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {activity.linkedSessions.length > 0 && (
        <section className="v2-section">
          <h4 style={{ margin: '0 0 8px' }}>Linked sessions</h4>
          <div className="v2-card">
            {activity.linkedSessions.map(s => (
              <div key={s.id} className="v2-track">
                <span className="num">◎</span>
                <div><b>{s.title}</b><span>{s.status}</span></div>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="v2-meta">
        {/* TODO: Aigent4U Stream Engine — automated playlist rotation */}
        Manual host playback · full automation coming via Aigent4U.
      </p>
    </>
  )
}
