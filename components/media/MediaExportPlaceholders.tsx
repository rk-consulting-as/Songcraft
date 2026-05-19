'use client'

import { t, useLang } from '@/lib/i18n'

const PACKS = ['epk', 'press', 'social', 'qr'] as const

export default function MediaExportPlaceholders() {
  const lang = useLang()
  const tx = t[lang]

  const labels: Record<(typeof PACKS)[number], { title: string; desc: string }> = {
    epk: { title: tx.mediaExportEpk, desc: tx.mediaExportEpkDesc },
    press: { title: tx.mediaExportPress, desc: tx.mediaExportPressDesc },
    social: { title: tx.mediaExportSocial, desc: tx.mediaExportSocialDesc },
    qr: { title: tx.mediaExportQr, desc: tx.mediaExportQrDesc },
  }

  return (
    <div className="media-export-grid">
      {PACKS.map(key => (
        <div
          key={key}
          className="media-export-card"
          aria-disabled
        >
          <span className="media-export-badge">{tx.mediaExportComingSoon}</span>
          <h4>{labels[key].title}</h4>
          <p>{labels[key].desc}</p>
        </div>
      ))}
    </div>
  )
}
