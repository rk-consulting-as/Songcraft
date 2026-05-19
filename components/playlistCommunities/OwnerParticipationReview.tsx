'use client'

import { useState } from 'react'
import {
  reviewCampaignActivityLog,
  runCampaignActivityAiReview,
} from '@/lib/playlistCommunities/client'
import type { CampaignActivityLog } from '@/lib/playlistCommunities/activityTypes'
import type { ActivityProofLimits } from '@/lib/playlistCommunities/activityLimits'
import { t, useLang } from '@/lib/i18n'

type Props = {
  campaignId: string
  logs: CampaignActivityLog[]
  limits: ActivityProofLimits & { canUseAiReview: boolean }
  onUpdated: () => void
}

export default function OwnerParticipationReview({ campaignId, logs, limits, onUpdated }: Props) {
  const tx = t[useLang()] as Record<string, string>
  const pending = logs.filter(l => l.status === 'submitted' || l.status === 'pending')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  const review = async (logId: string, status: string) => {
    setBusyId(logId)
    try {
      await reviewCampaignActivityLog(campaignId, logId, {
        status,
        owner_note: notes[logId] || undefined,
      })
      onUpdated()
    } finally {
      setBusyId(null)
    }
  }

  const runAi = async (logId: string) => {
    setBusyId(logId)
    try {
      await runCampaignActivityAiReview(campaignId, logId)
      onUpdated()
    } finally {
      setBusyId(null)
    }
  }

  if (!pending.length) {
    return <p className="owner-review-empty">{tx.ownerReviewNonePending}</p>
  }

  return (
    <ul className="owner-participation-review">
      {pending.map(log => (
        <li key={log.id} className="owner-review-card card">
          <div className="owner-review-card__head">
            <span>{log.activity_date}</span>
            <span className="owner-review-card__type">{log.proof_type}</span>
          </div>
          {log.proof_text && <p className="owner-review-card__text">{log.proof_text}</p>}
          {log.proofAssetUrl && (
            <a href={log.proofAssetUrl} target="_blank" rel="noopener noreferrer" className="owner-review-card__asset">
              {tx.activityProofViewFile}
            </a>
          )}
          {log.ai_summary && (
            <div className="owner-review-ai">
              <strong>{tx.activityProofAiSummary}</strong>
              <span className={`ai-confidence ai-confidence--${log.ai_confidence || 'unclear'}`}>
                {tx[`aiConfidence_${log.ai_confidence || 'unclear'}`]}
              </span>
              <p>{log.ai_summary}</p>
              <p className="owner-review-ai__disclaimer">{tx.activityProofAiDisclaimer}</p>
            </div>
          )}
          <textarea
            className="input"
            rows={2}
            placeholder={tx.ownerReviewNotePlaceholder}
            value={notes[log.id] || ''}
            onChange={e => setNotes(prev => ({ ...prev, [log.id]: e.target.value }))}
          />
          <div className="owner-review-card__actions">
            <button type="button" className="btn-gold" disabled={busyId === log.id} onClick={() => review(log.id, 'approved')}>
              {tx.activityProofApprove}
            </button>
            <button type="button" className="btn-outline" disabled={busyId === log.id} onClick={() => review(log.id, 'rejected')}>
              {tx.activityProofReject}
            </button>
            <button type="button" className="btn-outline" disabled={busyId === log.id} onClick={() => review(log.id, 'missed')}>
              {tx.activityProofMarkMissed}
            </button>
            {limits.canUseAiReview && (
              <button type="button" className="btn-outline" disabled={busyId === log.id} onClick={() => runAi(log.id)}>
                {tx.activityProofAiReview}
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
