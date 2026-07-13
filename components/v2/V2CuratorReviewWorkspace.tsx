'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useV2Toast } from '@/components/v2/V2Toast'
import { v2ApiFetch } from '@/lib/v2/apiClient'
import { V2_ROUTES } from '@/lib/v2/routes'
import type { V2CuratorSubmission, V2CuratorSubmissionStatus } from '@/lib/v2/types'
import { CURATOR_LABELS } from '@/lib/v2/types'
import V2CuratorAiMatchBadge from './V2CuratorAiMatchBadge'

type Props = {
  roomSlug: string
  submissions: V2CuratorSubmission[]
  isHost?: boolean
  demoMode?: boolean
}

const FILTERS: Array<{ id: 'all' | V2CuratorSubmissionStatus; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'reviewing', label: 'Reviewing' },
  { id: 'shortlisted', label: 'Shortlisted' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'rejected', label: 'Rejected' },
]

export default function V2CuratorReviewWorkspace({ roomSlug, submissions, isHost, demoMode }: Props) {
  const router = useRouter()
  const { showToast } = useV2Toast()
  const [filter, setFilter] = useState<typeof FILTERS[number]['id']>('pending')
  const [search, setSearch] = useState('')
  const [index, setIndex] = useState(0)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const filtered = useMemo(() => {
    let rows = submissions
    if (filter !== 'all') rows = rows.filter(s => s.status === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(s => s.title.toLowerCase().includes(q) || s.artistName.toLowerCase().includes(q))
    }
    return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [submissions, filter, search])

  const current = filtered[index] || filtered[0]

  const patch = async (status: V2CuratorSubmissionStatus) => {
    if (!current || demoMode) {
      showToast(demoMode ? 'Apply curator migration first' : 'No submission selected')
      return
    }
    setBusy(true)
    try {
      await v2ApiFetch(`/api/v2/community/playlists/${roomSlug}/items/${current.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          curator_note: note.trim() || undefined,
          curator_note_shared: status === 'rejected' || status === 'accepted',
        }),
      })
      showToast(`Marked as ${status.replace(/_/g, ' ')}`)
      setNote('')
      router.refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  if (!isHost) {
    const mine = submissions.filter(s => s.submittedBy)
    return (
      <div className="v2-card">
        <h4 style={{ margin: '0 0 8px' }}>Your submissions</h4>
        {mine.length === 0 ? (
          <p className="v2-meta">Submit a song to track curator review status here.</p>
        ) : (
          mine.map(s => (
            <div key={s.id} className="v2-track">
              <span className="num">♪</span>
              <div>
                <b>{s.title}</b>
                <span>{s.status.replace(/_/g, ' ')}</span>
                {s.curatorNoteShared && s.curatorNote && <span className="v2-meta">Note: {s.curatorNote}</span>}
              </div>
              {s.aiMatch && <V2CuratorAiMatchBadge match={s.aiMatch} compact />}
            </div>
          ))
        )}
      </div>
    )
  }

  return (
    <div className="v2-curator-review">
      <div className="v2-curator-review__toolbar">
        <div className="v2-tagrow">
          {FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              className={`v2-tag${filter === f.id ? ' hot' : ''}`}
              onClick={() => { setFilter(f.id); setIndex(0) }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          className="v2-input"
          placeholder="Search artist or song"
          value={search}
          onChange={e => { setSearch(e.target.value); setIndex(0) }}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="v2-meta">No submissions in this filter.</p>
      ) : (
        <>
          <div className="v2-curator-review__nav">
            <button type="button" className="v2-btn secondary sm" disabled={index <= 0} onClick={() => setIndex(i => i - 1)}>Previous</button>
            <span className="v2-meta">{index + 1} / {filtered.length}</span>
            <button type="button" className="v2-btn secondary sm" disabled={index >= filtered.length - 1} onClick={() => setIndex(i => i + 1)}>Next</button>
          </div>

          {current && (
            <article className="v2-card v2-curator-review__card">
              <div className="v2-eyebrow">{CURATOR_LABELS.review}</div>
              <h3 style={{ margin: '4px 0 8px' }}>{current.title}</h3>
              <p className="v2-meta">{current.artistName} · {current.status.replace(/_/g, ' ')}</p>
              {current.pitch && <p className="v2-meta" style={{ marginTop: 8 }}>Pitch: {current.pitch}</p>}
              {current.aiMatch && <V2CuratorAiMatchBadge match={current.aiMatch} />}
              <div className="v2-hero-actions" style={{ marginTop: 12 }}>
                {current.externalUrl && (
                  <a href={current.externalUrl} target="_blank" rel="noopener noreferrer" className="v2-btn secondary sm">Open streaming link ↗</a>
                )}
                {current.songId && (
                  <Link href={V2_ROUTES.song(current.songId)} className="v2-btn secondary sm">Song page</Link>
                )}
              </div>
              <textarea
                className="v2-input"
                rows={3}
                placeholder="Curator note (shareable on accept/reject)"
                value={note}
                onChange={e => setNote(e.target.value)}
                style={{ width: '100%', marginTop: 12 }}
              />
              <div className="v2-curator-review__actions">
                <button type="button" className="v2-btn secondary sm" disabled={busy} onClick={() => patch('reviewing')}>Start review</button>
                <button type="button" className="v2-btn sm" disabled={busy} onClick={() => patch('shortlisted')}>Shortlist</button>
                <button type="button" className="v2-btn hot sm" disabled={busy} onClick={() => patch('accepted')}>Accept</button>
                <button type="button" className="v2-btn secondary sm" disabled={busy} onClick={() => patch('rejected')}>Reject</button>
                <button type="button" className="v2-btn sm" disabled={busy} onClick={() => patch('added_to_playlist')}>Mark added externally</button>
              </div>
            </article>
          )}
        </>
      )}
    </div>
  )
}
