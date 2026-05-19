'use client'

import type { QualityCheckItem } from '@/lib/playlistCommunities/qualityChecklist'
import { qualityScore } from '@/lib/playlistCommunities/qualityChecklist'
import { t, useLang } from '@/lib/i18n'

export default function CampaignQualityChecklist({ items }: { items: QualityCheckItem[] }) {
  const tx = t[useLang()] as Record<string, string>
  const score = qualityScore(items)

  return (
    <div className="playlist-quality-checklist card">
      <div className="playlist-quality-checklist__header">
        <h3 className="playlist-quality-checklist__title">{tx.playlistQualityTitle}</h3>
        <span className="playlist-quality-checklist__score">{score}%</span>
      </div>
      <ul className="playlist-quality-checklist__list">
        {items.map(item => (
          <li key={item.id} className={item.done ? 'is-done' : ''}>
            <span className="playlist-quality-check__mark" aria-hidden>{item.done ? '✓' : '○'}</span>
            <span>{tx[item.labelKey]}{item.optional ? ` (${tx.optional})` : ''}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
