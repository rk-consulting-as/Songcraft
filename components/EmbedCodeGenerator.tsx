'use client'

import { useEffect, useMemo, useState } from 'react'
import { t, useLang, type Lang } from '@/lib/i18n'

export default function EmbedCodeGenerator({
  songId,
  title,
  canRemoveBranding = false,
}: {
  songId: string
  title: string
  canRemoveBranding?: boolean
}) {
  const [lang, setLang] = useState<Lang>('en')
  const tx = t[lang]
  const [width, setWidth] = useState('100%')
  const [height, setHeight] = useState('420')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [showBranding, setShowBranding] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setLang(useLang())
  }, [])

  const embedUrl = useMemo(() => {
    const branding = canRemoveBranding && !showBranding ? '&branding=0' : ''
    const path = `/embed/song/${songId}?source=embed&theme=${theme}${branding}`
    if (typeof window === 'undefined') return path
    return `${window.location.origin}${path}`
  }, [canRemoveBranding, showBranding, songId, theme])

  const code = `<iframe src="${embedUrl}" title="${title.replace(/"/g, '&quot;')} - ViaTone" width="${width}" height="${height}" style="border:0;border-radius:14px;max-width:100%;" loading="lazy" allow="clipboard-write"></iframe>`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {}
  }

  return (
    <div className="card" style={{ borderColor: 'rgba(112,144,208,0.28)' }}>
      <h3 style={{ margin: '0 0 6px', color: '#7090d0', fontWeight: 'normal', fontSize: 15 }}>
        {tx.embedGeneratorTitle}
      </h3>
      <p style={{ color: '#8a7a60', fontSize: 12, margin: '0 0 14px', lineHeight: 1.5 }}>
        {tx.embedGeneratorDesc}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px', gap: 8, marginBottom: 10 }}>
        <select value={theme} onChange={e => setTheme(e.target.value as 'dark' | 'light')}>
          <option value="dark">{tx.embedThemeDark}</option>
          <option value="light">{tx.embedThemeLight}</option>
        </select>
        <input value={width} onChange={e => setWidth(e.target.value)} aria-label={tx.embedWidth} />
        <input value={height} onChange={e => setHeight(e.target.value)} aria-label={tx.embedHeight} />
      </div>

      {canRemoveBranding && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8a7a60', fontSize: 12, marginBottom: 10 }}>
          <input type="checkbox" checked={!showBranding} onChange={e => setShowBranding(!e.target.checked)} />
          {tx.embedRemoveBranding}
        </label>
      )}

      <textarea value={code} readOnly rows={5} style={{ fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', marginBottom: 10 }} />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn-gold" onClick={copy}>
          {copied ? tx.copied : tx.embedCopyCode}
        </button>
        <a href={embedUrl} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ textDecoration: 'none' }}>
          {tx.embedPreview}
        </a>
      </div>
    </div>
  )
}
