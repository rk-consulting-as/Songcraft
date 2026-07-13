'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useV2Toast } from '@/components/v2/V2Toast'
import { v2ApiFetch, formatV2ApiError } from '@/lib/v2/apiClient'
import { V2_ROUTES } from '@/lib/v2/routes'
import type { V2HostPendingSubmission } from '@/lib/v2/types'

type Props = {
  submissions: V2HostPendingSubmission[]
}

export default function V2HostPendingPanel({ submissions }: Props) {
  const router = useRouter()
  const { showToast } = useV2Toast()
  const [busy, setBusy] = useState<string | null>(null)

  const review = async (submission: V2HostPendingSubmission, status: 'approved' | 'removed' | 'shortlisted' | 'rejected') => {
    setBusy(submission.id)
    try {
      if (submission.targetType === 'playlist_room' && submission.roomSlug) {
        const mapped = status === 'approved' ? 'shortlisted' : status === 'removed' ? 'rejected' : status
        await v2ApiFetch(`/api/v2/community/playlists/${submission.roomSlug}/items/${submission.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: mapped }),
        })
      } else if (submission.sessionId) {
        await v2ApiFetch(`/api/v2/community/sessions/${submission.sessionId}/songs`, {
          method: 'PATCH',
          body: JSON.stringify({ row_id: submission.id, status: status === 'shortlisted' ? 'approved' : status }),
        })
      }
      showToast('Updated')
      router.refresh()
    } catch (e) {
      showToast(formatV2ApiError(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="v2-card">
      {submissions.length === 0 && <p className="v2-meta">No pending submissions.</p>}
      {submissions.map(s => (
        <div key={s.id} className="v2-track">
          <span className="num">♪</span>
          <div>
            <b>{s.title}</b>
            <span>{s.artistName} · {s.targetType === 'playlist_room' ? s.roomName : s.sessionTitle}</span>
          </div>
          <button type="button" className="v2-btn sm hot" disabled={busy === s.id} onClick={() => review(s, s.targetType === 'playlist_room' ? 'shortlisted' : 'approved')}>
            {s.targetType === 'playlist_room' ? 'Shortlist' : 'Approve'}
          </button>
          <button type="button" className="v2-btn sm secondary" disabled={busy === s.id} onClick={() => review(s, 'removed')}>Decline</button>
          {s.targetType === 'playlist_room' && s.roomSlug ? (
            <Link href={V2_ROUTES.playlistRoom(s.roomSlug)} className="v2-btn sm secondary">Curator Workspace</Link>
          ) : s.sessionId ? (
            <Link href={V2_ROUTES.session(s.sessionId)} className="v2-btn sm secondary">Open</Link>
          ) : null}
        </div>
      ))}
    </div>
  )
}
