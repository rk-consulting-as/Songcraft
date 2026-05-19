'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { t, useLang } from '@/lib/i18n'
import type { DiscoverCatalog } from '@/lib/discover/types'
import type { DiscoverCreatorCardData } from '@/lib/creatorIdentity/types'
import DiscoverCreatorCard from './DiscoverCreatorCard'
import DiscoverReleaseCard from './DiscoverReleaseCard'
import DiscoverAcquisitionHero from '@/components/platform/DiscoverAcquisitionHero'
import CreatorAcquisitionCta from '@/components/platform/CreatorAcquisitionCta'
import ViaToneBranding from '@/components/platform/ViaToneBranding'

type FilterMode = 'trending' | 'newest' | 'active' | 'genre'

export default function DiscoverEcosystemPage() {
  const lang = useLang()
  const tx = t[lang] as Record<string, string>
  const [catalog, setCatalog] = useState<DiscoverCatalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterMode>('trending')
  const [genre, setGenre] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/discover/catalog')
        if (!res.ok) throw new Error('catalog failed')
        const data = await res.json()
        if (!cancelled) setCatalog(data)
      } catch {
        if (!cancelled) setCatalog(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const accent = '#d4a843'

  const levelLabel = (c: DiscoverCreatorCardData) => tx[c.levelLabelKey] || c.levelLabelKey

  const allCreators = useMemo(() => {
    if (!catalog) return []
    const map = new Map<string, DiscoverCreatorCardData>()
    for (const c of [...catalog.trending, ...catalog.featured, ...catalog.recentlyActive]) {
      map.set(c.id, c)
    }
    return Array.from(map.values())
  }, [catalog])

  const filteredCreators = useMemo(() => {
    let list = [...allCreators]
    if (genre) {
      list = list.filter(c => (c.genre || '').toLowerCase().includes(genre.toLowerCase()))
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.genre || '').toLowerCase().includes(q)
      )
    }
    switch (filter) {
      case 'newest':
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      case 'active':
        return list.sort((a, b) => b.trendingScore - a.trendingScore)
      case 'genre':
        return list.sort((a, b) => (a.genre || '').localeCompare(b.genre || ''))
      default:
        return list.sort((a, b) => b.trendingScore - a.trendingScore)
    }
  }, [allCreators, filter, genre, search])

  const filterChip = (active: boolean) => ({
    padding: '6px 14px',
    fontSize: 12,
    borderRadius: 8,
    border: active ? `1px solid ${accent}` : '1px solid rgba(180,140,80,0.2)',
    background: active ? `${accent}18` : 'rgba(255,255,255,0.02)',
    color: active ? accent : '#8a7a60',
    cursor: 'pointer' as const,
  })

  return (
    <div className="discover-ecosystem" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)',
      color: '#e8e0d0',
    }}>
      <header className="discover-ecosystem-header" style={{
        borderBottom: '1px solid rgba(180,140,80,0.2)',
        padding: '14px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 10,
      }}>
        <Link href="/" style={{ color: accent, textDecoration: 'none', fontSize: 14, letterSpacing: 2 }}>VIATONE</Link>
        <nav style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/charts" style={{ color: '#8a7a60', textDecoration: 'none', fontSize: 13 }}>{tx.chartsNav || 'Charts'}</Link>
          <Link href="/creators" style={{ color: '#8a7a60', textDecoration: 'none', fontSize: 13 }}>{tx.discoverCollaborators}</Link>
          <Link href="/dashboard" style={{ color: '#8a7a60', textDecoration: 'none', fontSize: 13 }}>{tx.dashboard}</Link>
        </nav>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 24px 80px' }}>
        <DiscoverAcquisitionHero />

        <div className="card" style={{ marginBottom: 24, padding: 16 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tx.discoverSearchArtists}
            style={{ width: '100%', boxSizing: 'border-box', marginBottom: 12 }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {([
              ['trending', 'discoverFilterTrending'],
              ['newest', 'discoverFilterNewest'],
              ['active', 'discoverFilterActive'],
              ['genre', 'discoverFilterGenre'],
            ] as [FilterMode, string][]).map(([f, key]) => (
              <button key={f} type="button" onClick={() => setFilter(f)} style={filterChip(filter === f)}>
                {tx[key] || f}
              </button>
            ))}
          </div>
          {catalog && catalog.genres.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setGenre('')} style={filterChip(!genre)}>{tx.discoverAllGenres}</button>
              {catalog.genres.map(g => (
                <button key={g.genre} type="button" onClick={() => setGenre(g.genre)} style={filterChip(genre === g.genre)}>
                  {g.genre} ({g.count})
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#6a5a40', padding: 40 }}>{tx.loading}</p>
        ) : !catalog ? (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <p style={{ color: '#8a7a60' }}>{tx.discoverLoadError}</p>
          </div>
        ) : (
          <>
            {catalog.spotlight.length > 0 && (
              <DiscoverSection title={tx.discoverSectionSpotlight}>
                <div className="discover-grid discover-grid--creators">
                  {catalog.spotlight.map(c => (
                    <DiscoverCreatorCard key={`s-${c.id}`} creator={c} levelLabel={levelLabel(c)} tx={tx} accent={accent} />
                  ))}
                </div>
              </DiscoverSection>
            )}

            <CreatorAcquisitionCta variant="inline" accent={accent} />

            {catalog.trending.length > 0 && filter === 'trending' && (
              <DiscoverSection title={tx.discoverSectionTrending}>
                <div className="discover-grid discover-grid--creators">
                  {catalog.trending.map(c => (
                    <DiscoverCreatorCard key={c.id} creator={c} levelLabel={levelLabel(c)} tx={tx} accent={accent} />
                  ))}
                </div>
              </DiscoverSection>
            )}

            {catalog.newReleases.length > 0 && (
              <DiscoverSection title={tx.discoverSectionNewReleases}>
                <div className="discover-grid discover-grid--releases">
                  {catalog.newReleases.slice(0, 8).map(r => (
                    <DiscoverReleaseCard key={r.id} release={r} tx={tx} accent={accent} />
                  ))}
                </div>
              </DiscoverSection>
            )}

            {catalog.featured.length > 0 && (
              <DiscoverSection title={tx.discoverSectionFeatured}>
                <div className="discover-grid discover-grid--creators">
                  {catalog.featured.map(c => (
                    <DiscoverCreatorCard key={`f-${c.id}`} creator={c} levelLabel={levelLabel(c)} tx={tx} accent={accent} />
                  ))}
                </div>
              </DiscoverSection>
            )}

            {catalog.recentlyActive.length > 0 && (
              <DiscoverSection title={tx.discoverSectionActive}>
                <div className="discover-grid discover-grid--creators">
                  {catalog.recentlyActive.map(c => (
                    <DiscoverCreatorCard key={`a-${c.id}`} creator={c} levelLabel={levelLabel(c)} tx={tx} accent={accent} />
                  ))}
                </div>
              </DiscoverSection>
            )}

            {catalog.epks.length > 0 && (
              <DiscoverSection title={tx.discoverSectionEpks}>
                <div className="discover-grid discover-grid--epks">
                  {catalog.epks.map(e => (
                    <Link key={e.artistId} href={e.href} className="card discover-epk-card" style={{ textDecoration: 'none', padding: 14 }}>
                      {e.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.imageUrl} alt="" className="discover-epk-card__img" />
                      )}
                      <h3 style={{ margin: '8px 0 4px', color: '#e8e0d0', fontSize: 14 }}>{e.artistName}</h3>
                      {e.genre && <p style={{ margin: 0, color: '#8a7a60', fontSize: 12 }}>{e.genre}</p>}
                      <span style={{ color: accent, fontSize: 12, marginTop: 8, display: 'inline-block' }}>{tx.discoverViewEpk} →</span>
                    </Link>
                  ))}
                </div>
              </DiscoverSection>
            )}

            {filteredCreators.length > 0 && filter !== 'trending' && (
              <DiscoverSection title={tx.discoverSectionBrowse}>
                <div className="discover-grid discover-grid--creators">
                  {filteredCreators.map(c => (
                    <DiscoverCreatorCard key={`b-${c.id}`} creator={c} levelLabel={levelLabel(c)} tx={tx} accent={accent} />
                  ))}
                </div>
              </DiscoverSection>
            )}
          </>
        )}

        <CreatorAcquisitionCta variant="card" accent={accent} />
        <CreatorAcquisitionCta variant="footer" accent={accent} />
        <ViaToneBranding variant="footer" accent={accent} href="/login" />
      </div>
    </div>
  )
}

function DiscoverSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 className="discover-section-title">{title}</h2>
      {children}
    </section>
  )
}
