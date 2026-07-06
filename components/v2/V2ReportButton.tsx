'use client'

import { useState } from 'react'
import { useV2Toast } from '@/components/v2/V2Toast'
import { v2ApiFetch } from '@/lib/v2/apiClient'

type Props = {
  targetType: 'circle' | 'session' | 'song' | 'playlist_room'
  targetId: string
}

export default function V2ReportButton({ targetType, targetId }: Props) {
  const { showToast } = useV2Toast()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    try {
      await v2ApiFetch('/api/v2/community/reports', {
        method: 'POST',
        body: JSON.stringify({ target_type: targetType, target_id: targetId, reason }),
      })
      showToast('Report submitted — moderators will review')
      setOpen(false)
      setReason('')
    } catch {
      showToast('Log in to report content')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button type="button" className="v2-btn secondary sm" onClick={() => setOpen(true)}>
        Report
      </button>
    )
  }

  return (
    <div className="v2-card" style={{ marginTop: 12 }}>
      <p className="v2-meta">Tell us what&apos;s wrong (placeholder moderation).</p>
      <textarea className="v2-textarea" rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason…" />
      <div className="v2-hero-actions" style={{ marginTop: 8 }}>
        <button type="button" className="v2-btn sm hot" onClick={submit} disabled={busy}>Send report</button>
        <button type="button" className="v2-btn sm secondary" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  )
}
