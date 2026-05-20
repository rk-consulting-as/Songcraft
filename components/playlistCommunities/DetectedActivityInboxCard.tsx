'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  approveActivitySuggestion,
  fetchActivitySuggestions,
  ignoreActivitySuggestion,
} from '@/lib/playlistCommunities/client'
import type { ActivitySuggestion } from '@/lib/passiveParticipation/types'
import { t, useLang } from '@/lib/i18n'

export default function DetectedActivityInboxCard() {
  const tx = t[useLang()] as Record<string, string>
  const [items, setItems] = useState<ActivitySuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchActivitySuggestions()
      setItems(data?.suggestions || [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const approve = async (id: string) => {
    setBusyId(id)
    try {
      await approveActivitySuggestion(id)
      setItems(prev => prev.filter(s => s.id !== id))
    } finally {
      setBusyId(null)
    }
  }

  const ignore = async (id: string) => {
    setBusyId(id)
    try {
      await ignoreActivitySuggestion(id)
      setItems(prev => prev.filter(s => s.id !== id))
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return null
  if (items.length === 0) return null

  return (
    <div className="card detected-activity-inbox">
      <h2 className="detected-activity-inbox__title">{tx.detectedActivityTitle}</h2>
      <p className="detected-activity-inbox__intro">{tx.detectedActivityIntro}</p>
      <p className="detected-activity-inbox__compliance">{tx.passiveParticipationCompliance}</p>
      <ul className="detected-activity-inbox__list">
        {items.slice(0, 5).map(s => (
          <li key={s.id} className="detected-activity-inbox__item">
            <div className="detected-activity-inbox__item-top">
              {s.playlistImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.playlistImageUrl} alt="" className="detected-activity-inbox__cover" />
              ) : (
                <div className="detected-activity-inbox__cover detected-activity-inbox__cover--empty">♫</div>
              )}
              <div>
                <p className="detected-activity-inbox__headline">{tx.detectedActivityLikely}</p>
                <p className="detected-activity-inbox__campaign">{s.campaignTitle}</p>
                <p className="detected-activity-inbox__meta">
                  {tx.lastfmCompletion.replace('{pct}', String(s.playlist_coverage_percent))}
                  {' · '}
                  <span className={`ai-confidence ai-confidence--${s.confidence}`}>
                    {tx[`aiConfidence_${s.confidence}`]}
                  </span>
                </p>
              </div>
            </div>
            <div className="detected-activity-inbox__actions">
              <button
                type="button"
                className="btn-gold"
                disabled={!!busyId}
                onClick={() => approve(s.id)}
              >
                {busyId === s.id ? tx.loading : tx.detectedActivityApprove}
              </button>
              <button type="button" className="btn-outline" disabled={!!busyId} onClick={() => ignore(s.id)}>
                {tx.detectedActivityIgnore}
              </button>
              <Link href={`/playlist-campaigns/${s.campaign_id}`} className="btn-outline" style={{ fontSize: 11, textDecoration: 'none' }}>
                {tx.playlistCommunityView}
              </Link>
            </div>
          </li>
        ))}
      </ul>
      {items.length > 5 && (
        <p style={{ fontSize: 12, color: '#8a7a60', margin: '12px 0 0' }}>
          +{items.length - 5} {tx.detectedActivityMore}
        </p>
      )}
    </div>
  )
}
