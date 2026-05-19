'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { DiscoverCatalog } from '@/lib/discover/types'
import { t, useLang } from '@/lib/i18n'

export default function DashboardDiscoverHighlights() {
  const lang = useLang()
  const tx = t[lang] as Record<string, string>
  const [catalog, setCatalog] = useState<DiscoverCatalog | null>(null)

  useEffect(() => {
    fetch('/api/discover/catalog')
      .then(r => r.ok ? r.json() : null)
      .then(data => setCatalog(data))
      .catch(() => setCatalog(null))
  }, [])

  if (!catalog || (catalog.trending.length === 0 && catalog.newReleases.length === 0)) return null

  const accent = '#d4a843'
  const trending = catalog.trending.slice(0, 3)
  const releases = catalog.newReleases.slice(0, 3)

  return (
    <div className="card" style={{ marginBottom: 24, borderColor: 'rgba(180,140,80,0.2)', padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, color: accent, fontWeight: 'normal', fontSize: 16 }}>{tx.dashboardDiscoverTitle}</h2>
        <Link href="/discover" style={{ color: '#8a7a60', fontSize: 13, textDecoration: 'none' }}>{tx.dashboardDiscoverCta} →</Link>
      </div>

      {trending.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', color: '#8a7a60', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>{tx.dashboardDiscoverTrending}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {trending.map(c => (
              <Link key={c.id} href={`/p/${c.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#e8e0d0', fontSize: 13 }}>
                {c.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.imageUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                )}
                <span>{c.name}</span>
                <span style={{ color: '#6a5a40', fontSize: 11, marginLeft: 'auto' }}>{tx[c.levelLabelKey] || ''}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {releases.length > 0 && (
        <div>
          <p style={{ margin: '0 0 8px', color: '#8a7a60', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>{tx.dashboardDiscoverReleases}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {releases.map(r => (
              <Link key={r.id} href={r.href} style={{ textDecoration: 'none', color: '#c8b8a0', fontSize: 13 }}>
                {r.title} · <span style={{ color: accent }}>{r.artistName}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
