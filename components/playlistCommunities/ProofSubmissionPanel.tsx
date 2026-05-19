'use client'

import { useState } from 'react'
import { submitCampaignActivityProof } from '@/lib/playlistCommunities/client'
import type { ActivityProofLimits } from '@/lib/playlistCommunities/activityLimits'
import type { CampaignActivityLog } from '@/lib/playlistCommunities/activityTypes'
import { formatDateYmd } from '@/lib/playlistCommunities/participationBoard'
import ActivityProofDisclaimer from './ActivityProofDisclaimer'
import { t, useLang } from '@/lib/i18n'

type Props = {
  campaignId: string
  myLogs: CampaignActivityLog[]
  limits: ActivityProofLimits
  activeDaysPerWeek?: number | null
  onSubmitted: () => void
}

export default function ProofSubmissionPanel({
  campaignId,
  myLogs,
  limits,
  activeDaysPerWeek,
  onSubmitted,
}: Props) {
  const tx = t[useLang()] as Record<string, string>
  const today = formatDateYmd(new Date())
  const todayLog = myLogs.find(l => l.activity_date === today)

  const [proofType, setProofType] = useState<'text' | 'image' | 'csv'>('text')
  const [proofText, setProofText] = useState('')
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [activityDate, setActivityDate] = useState(today)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const todayStatusKey = todayLog
    ? `activityStatus_${todayLog.status}`
    : 'activityStatus_none'

  const handleSubmit = async () => {
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.set('proof_type', proofType)
      form.set('activity_date', activityDate)
      const combined = [proofText.trim(), note.trim()].filter(Boolean).join('\n\n—\n')
      if (combined) form.set('proof_text', combined)
      if (file && (proofType === 'image' || proofType === 'csv')) form.set('file', file)
      await submitCampaignActivityProof(campaignId, form)
      setProofText('')
      setNote('')
      setFile(null)
      onSubmitted()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="proof-submission-panel card">
      <h3 className="proof-submission-panel__title">{tx.activityProofSubmitTitle}</h3>
      <p className="proof-submission-panel__today">
        {tx.activityProofTodayStatus}: <strong>{tx[todayStatusKey] || todayStatusKey}</strong>
      </p>
      {activeDaysPerWeek != null && (
        <p className="proof-submission-panel__expect">{tx.activityProofExpectations.replace('{n}', String(activeDaysPerWeek))}</p>
      )}
      <ActivityProofDisclaimer compact />

      <label className="playlist-join-label">{tx.activityProofDate}</label>
      <input type="date" className="input" value={activityDate} onChange={e => setActivityDate(e.target.value)} max={today} />

      <div className="proof-type-tabs" role="tablist">
        <button type="button" className={proofType === 'text' ? 'proof-type-tabs__active' : ''} onClick={() => setProofType('text')}>
          {tx.activityProofTypeText}
        </button>
        <button
          type="button"
          className={proofType === 'image' ? 'proof-type-tabs__active' : ''}
          onClick={() => setProofType('image')}
          disabled={!limits.canUploadImage}
          title={!limits.canUploadImage ? tx.activityProofProImage : undefined}
        >
          {tx.activityProofTypeImage}
        </button>
        <button
          type="button"
          className={proofType === 'csv' ? 'proof-type-tabs__active' : ''}
          onClick={() => setProofType('csv')}
          disabled={!limits.canUploadCsv}
          title={!limits.canUploadCsv ? tx.activityProofProCsv : undefined}
        >
          {tx.activityProofTypeCsv}
        </button>
      </div>

      {proofType === 'text' && (
        <textarea
          className="input"
          rows={4}
          value={proofText}
          onChange={e => setProofText(e.target.value)}
          placeholder={tx.activityProofTextPlaceholder}
        />
      )}
      {(proofType === 'image' || proofType === 'csv') && (
        <input
          type="file"
          className="input"
          accept={proofType === 'image' ? 'image/*' : '.csv,text/csv'}
          onChange={e => setFile(e.target.files?.[0] || null)}
        />
      )}

      <label className="playlist-join-label">{tx.activityProofNote}</label>
      <textarea className="input" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder={tx.activityProofNotePlaceholder} />

      <button type="button" className="btn-gold" style={{ marginTop: 10 }} disabled={busy} onClick={handleSubmit}>
        {busy ? tx.loading : tx.activityProofSubmitButton}
      </button>
      {error && <p className="playlist-campaign-error">{error}</p>}

      {myLogs.length > 0 && (
        <div className="proof-history">
          <h4>{tx.activityProofHistory}</h4>
          <ul>
            {myLogs.slice(0, 14).map(log => (
              <li key={log.id}>
                <span>{log.activity_date}</span>
                <span>{tx[`activityStatus_${log.status}`] || log.status}</span>
                {log.proof_type !== 'text' && <span className="proof-history__type">{log.proof_type}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
