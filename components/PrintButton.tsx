'use client'

import { t, useLang, type Lang } from '@/lib/i18n'
import { useEffect, useState } from 'react'

export default function PrintButton() {
  const [lang, setLang] = useState<Lang>('en')
  useEffect(() => setLang(useLang()), [])
  const tx = t[lang]
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print-hide"
      style={{
        background: 'transparent',
        border: '1px solid rgba(180,140,80,0.35)',
        color: '#d4a843',
        padding: '8px 14px',
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: 13,
      }}
    >
      {tx.epkPrint}
    </button>
  )
}
