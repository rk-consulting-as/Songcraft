'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { useV2Toast } from '@/components/v2/V2Toast'
import { v2ApiFetch, formatV2ApiError } from '@/lib/v2/apiClient'
import { buildLoginUrl } from '@/lib/v2/authReturn'
import type { V2RsvpStatus, V2SessionRsvpCounts } from '@/lib/v2/types'

type Props = {
  sessionId: string
  initialStatus?: V2RsvpStatus | null
  initialCounts?: V2SessionRsvpCounts
  demoMode?: boolean
  sessionEnded?: boolean
  joinedCount?: number
  returnPath?: string
}

export default function V2SessionRsvpCard({
  sessionId,
  initialStatus = null,
  initialCounts = { going: 0, interested: 0, total: 0 },
  demoMode,
  sessionEnded,
  joinedCount = 0,
  returnPath,
}: Props) {
  const router = useRouter()
  const { showToast } = useV2Toast()
  const [status, setStatus] = useState<V2RsvpStatus | null>(initialStatus)
  const [counts, setCounts] = useState(initialCounts)
  const [busy, setBusy] = useState(false)

  const setRsvp = async (next: 'going' | 'interested') => {
    if (demoMode) {
      showToast('RSVP when community tables are seeded')
      return
    }
    setBusy(true)
    try {
      const res = await v2ApiFetch<{ counts: V2SessionRsvpCounts }>(`/api/v2/community/sessions/${sessionId}/rsvp`, {
        method: 'POST',
        body: JSON.stringify({ status: next }),
      })
      setStatus(next)
      setCounts(res.counts)
      showToast(next === 'going' ? "You're going!" : 'Marked as interested')
      router.refresh()
    } catch (e) {
      const msg = formatV2ApiError(e)
      if (msg.includes('not_authenticated') || msg.includes('401')) {
        showToast('Sign in to RSVP')
      } else {
        showToast(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  const cancel = async () => {
    if (demoMode) return
    setBusy(true)
    try {
      const res = await v2ApiFetch<{ counts: V2SessionRsvpCounts }>(`/api/v2/community/sessions/${sessionId}/rsvp`, { method: 'DELETE' })
      setStatus(null)
      setCounts(res.counts)
      showToast('RSVP cancelled')
      router.refresh()
    } catch (e) {
      const msg = formatV2ApiError(e)
      if (msg.includes('not_authenticated') || msg.includes('401')) {
        showToast('Sign in to RSVP')
      } else {
        showToast(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  if (sessionEnded) {
    return (
      <div className="v2-card v2-rsvp-card">
        <h4 style={{ margin: '0 0 8px' }}>Session completed</h4>
        <p className="v2-meta" style={{ margin: 0 }}>{joinedCount} listeners participated in this room.</p>
      </div>
    )
  }

  return (
    <div className="v2-card v2-rsvp-card">
      <h4 style={{ margin: '0 0 8px' }}>RSVP</h4>
      <p className="v2-meta" style={{ margin: '0 0 12px' }}>Let the host know if you plan to join this listening event.</p>

      <div className="v2-rsvp-stats">
        <span className="v2-tag hot">{counts.going} Going</span>
        <span className="v2-tag">{counts.interested} Interested</span>
        {joinedCount > 0 && <span className="v2-tag">{joinedCount} joined live</span>}
      </div>

      <div className="v2-rsvp-actions">
        {returnPath && (
          <Link href={buildLoginUrl(returnPath)} className="v2-btn sm secondary">Sign in to RSVP</Link>
        )}
        <button
          type="button"
          className={`v2-btn sm${status === 'going' ? ' hot' : ' secondary'}`}
          disabled={busy}
          onClick={() => setRsvp('going')}
        >
          Going
        </button>
        <button
          type="button"
          className={`v2-btn sm${status === 'interested' ? ' hot' : ' secondary'}`}
          disabled={busy}
          onClick={() => setRsvp('interested')}
        >
          Interested
        </button>
        {status && (
          <button type="button" className="v2-btn sm secondary" disabled={busy} onClick={cancel}>
            Cancel RSVP
          </button>
        )}
      </div>
    </div>
  )
}
