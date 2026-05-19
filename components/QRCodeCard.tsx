'use client'

import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { t, useLang, type Lang } from '@/lib/i18n'
import { saveDataUrlToMediaLibrary } from '@/lib/mediaLibrary/saveToLibrary'
import { trackMediaUsage } from '@/lib/mediaLibrary/usage'

export default function QRCodeCard({
  path,
  title,
  accent = '#d4a843',
  artistId,
  songId,
  saveLabel,
}: {
  path: string
  title: string
  accent?: string
  artistId?: string
  songId?: string
  saveLabel?: string
}) {
  const [lang] = useState<Lang>(() => useLang())
  const tx = t[lang]
  const [dataUrl, setDataUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fullUrl = useMemo(() => {
    const base = typeof window === 'undefined'
      ? path
      : path.startsWith('http') ? path : `${window.location.origin}${path}`
    try {
      const url = new URL(base, typeof window === 'undefined' ? 'http://localhost:3000' : window.location.origin)
      url.searchParams.set('src', 'qr')
      if (typeof window === 'undefined' && !path.startsWith('http')) return `${url.pathname}${url.search}`
      return url.toString()
    } catch {
      return base.includes('?') ? `${base}&src=qr` : `${base}?src=qr`
    }
  }, [path])

  useEffect(() => {
    QRCode.toDataURL(fullUrl, {
      width: 512,
      margin: 2,
      color: { dark: '#0a0a0f', light: '#ffffff' },
    }).then(setDataUrl).catch(() => setDataUrl(''))
  }, [fullUrl])

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {}
  }

  const saveToLibrary = async () => {
    if (!dataUrl || !artistId) return
    setSaving(true)
    const { asset, error } = await saveDataUrlToMediaLibrary(dataUrl, {
      type: 'qr_export',
      title: saveLabel || title || 'QR export',
      artistId,
      songId,
      visibility: 'private',
    })
    if (asset) {
      await trackMediaUsage(asset.id, ['used_in_campaign'], { artistId })
      setSaved(true)
    } else if (error) {
      setSaved(false)
    }
    setSaving(false)
  }

  return (
    <div className="card" style={{ borderColor: `${accent}33`, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
          <h3 style={{ color: accent, fontSize: 14, fontWeight: 'normal', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 6px' }}>
            {tx.qrTitle}
          </h3>
          <p style={{ color: '#8a7a60', fontSize: 12, lineHeight: 1.5, margin: '0 0 10px' }}>
            {title}
          </p>
          <p style={{ color: '#5a4a30', fontSize: 11, wordBreak: 'break-all', margin: 0 }}>
            {fullUrl}
          </p>
        </div>

        {dataUrl && (
          <img
            src={dataUrl}
            alt={tx.qrTitle}
            style={{ width: 128, height: 128, borderRadius: 8, background: '#fff', padding: 8, flexShrink: 0 }}
          />
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
        <button type="button" className="btn-outline" onClick={copyUrl} style={{ padding: '7px 14px', fontSize: 12 }}>
          {copied ? tx.copied : tx.qrCopyUrl}
        </button>
        {dataUrl && (
          <a
            href={dataUrl}
            download="viatone-qr.png"
            className="btn-outline"
            style={{ padding: '7px 14px', fontSize: 12, textDecoration: 'none' }}
          >
            {tx.qrDownload}
          </a>
        )}
        {dataUrl && artistId && (
          <button type="button" className="btn-outline" disabled={saving || saved} onClick={saveToLibrary} style={{ padding: '7px 14px', fontSize: 12 }}>
            {saved ? tx.mediaQrSaved : saving ? tx.saving : tx.mediaQrSaveToLibrary}
          </button>
        )}
      </div>
    </div>
  )
}
