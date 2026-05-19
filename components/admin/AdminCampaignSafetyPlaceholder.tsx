'use client'

import { t, useLang } from '@/lib/i18n'

export default function AdminCampaignSafetyPlaceholder() {
  const tx = t[useLang()] as Record<string, string>

  return (
    <section className="admin-campaign-safety card" style={{ marginTop: 24 }}>
      <h3 style={{ margin: '0 0 8px', color: '#d4a843', fontSize: 14, letterSpacing: 1, textTransform: 'uppercase' }}>
        {tx.adminCampaignSafetyTitle}
      </h3>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: '#8a7a60', lineHeight: 1.55 }}>
        {tx.adminCampaignSafetyDesc}
      </p>
      <ul className="admin-campaign-safety__list">
        <li>
          <strong>{tx.adminCampaignReported}</strong>
          <span>{tx.adminCampaignReportedPlaceholder}</span>
        </li>
        <li>
          <strong>{tx.adminCampaignSuspiciousProof}</strong>
          <span>{tx.adminCampaignSuspiciousProofPlaceholder}</span>
        </li>
        <li>
          <strong>{tx.adminCampaignModerationQueue}</strong>
          <span>{tx.adminCampaignModerationQueuePlaceholder}</span>
        </li>
      </ul>
      <p className="admin-campaign-safety__note">{tx.adminCampaignSafetyNote}</p>
    </section>
  )
}
