'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useV2Toast } from '@/components/v2/V2Toast'
import { v2ApiFetch } from '@/lib/v2/apiClient'
import type { V2FeedbackReaction, V2SongFeedback } from '@/lib/v2/types'

const REACTIONS: { key: V2FeedbackReaction; label: string }[] = [
  { key: 'fire', label: '🔥' },
  { key: 'love', label: '❤️' },
  { key: 'idea', label: '💡' },
  { key: 'clap', label: '👏' },
]

type Props = {
  songId: string
  initialFeedback: V2SongFeedback[]
  circleId?: string
  sessionId?: string
  isOwner?: boolean
  demoMode?: boolean
}

export default function V2FeedbackPanel({ songId, initialFeedback, circleId, sessionId, isOwner, demoMode }: Props) {
  const router = useRouter()
  const { showToast } = useV2Toast()
  const [items, setItems] = useState(initialFeedback)
  const [body, setBody] = useState('')
  const [rating, setRating] = useState(4)
  const [reaction, setReaction] = useState<V2FeedbackReaction | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (demoMode) {
      showToast('Feedback saves when using real song IDs')
      return
    }
    if (!body.trim() && !reaction) {
      showToast('Add a comment or reaction')
      return
    }
    setBusy(true)
    try {
      await v2ApiFetch('/api/v2/community/feedback', {
        method: 'POST',
        body: JSON.stringify({ song_id: songId, body, rating, reaction, circle_id: circleId, session_id: sessionId }),
      })
      const res = await v2ApiFetch<{ feedback: V2SongFeedback[] }>(`/api/v2/community/feedback?song_id=${songId}`)
      setItems(res.feedback)
      setBody('')
      setReaction(null)
      showToast('Feedback sent')
      router.refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Log in to leave feedback')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="v2-card">
      {isOwner && (
        <p className="v2-meta" style={{ marginBottom: 12 }}>
          {items.length} feedback note{items.length === 1 ? '' : 's'} received
        </p>
      )}
      <div className="v2-feedback-list">
        {items.length === 0 && <p className="v2-meta">No feedback yet — be the first.</p>}
        {items.map(f => (
          <article key={f.id} className="v2-feedback-item">
            <div className="v2-minirow">
              <b>{f.fromUserName}</b>
              <span className="v2-meta">{new Date(f.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="v2-tagrow">
              {f.reaction && <span className="v2-tag">{REACTIONS.find(r => r.key === f.reaction)?.label || f.reaction}</span>}
              {f.rating && <span className="v2-tag">{f.rating}/5</span>}
            </div>
            {f.body && <p className="v2-meta" style={{ marginTop: 8 }}>{f.body}</p>}
          </article>
        ))}
      </div>
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="v2-meta" style={{ marginBottom: 8 }}>Leave feedback</p>
        <div className="v2-hero-actions" style={{ marginBottom: 10 }}>
          {REACTIONS.map(r => (
            <button
              key={r.key}
              type="button"
              className={`v2-btn sm secondary${reaction === r.key ? ' hot' : ''}`}
              onClick={() => setReaction(reaction === r.key ? null : r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <textarea className="v2-textarea" rows={3} placeholder="Production notes, hook ideas, vibe…" value={body} onChange={e => setBody(e.target.value)} />
        <div className="v2-minirow" style={{ marginTop: 10 }}>
          <label className="v2-meta">
            Rating{' '}
            <input type="range" min={1} max={5} value={rating} onChange={e => setRating(Number(e.target.value))} />
            {rating}/5
          </label>
          <button type="button" className="v2-btn hot sm" onClick={submit} disabled={busy}>{busy ? '…' : 'Post'}</button>
        </div>
      </div>
    </div>
  )
}
