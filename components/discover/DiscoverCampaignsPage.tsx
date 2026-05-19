'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { t, useLang } from '@/lib/i18n'
import { fetchDiscoverCampaigns } from '@/lib/playlistCommunities/client'
import type { CampaignCardData } from '@/lib/playlistCommunities/types'
import PlaylistCampaignCard from '@/components/playlistCommunities/PlaylistCampaignCard'
import PublicEmptyState from '@/components/public/PublicEmptyState'
import ViaToneBranding from '@/components/platform/ViaToneBranding'

type SortMode = 'newest' | 'trending'

export default function DiscoverCampaignsPage() {
  const tx = t[useLang()] as Record<string, string>
  const accent = '#d4a843'
  const [campaigns, setCampaigns] = useState<CampaignCardData[]>([])
  const [genres, setGenres] = useState<string[]>([])
  const [moods, setMoods] = useState<string[]>([])
  const [genre, setGenre] = useState('')
  const [mood, setMood] = useState('')
  const [commitment, setCommitment] = useState('')
  const [sort, setSort] = useState<SortMode>('newest')
  const [lookingForMembers, setLookingForMembers] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchDiscoverCampaigns({
        genre: genre || undefined,
        mood: mood || undefined,
        commitment: commitment || undefined,
        sort,
        lookingForMembers,
      })
      setCampaigns(
        (data.campaigns || []).map(c => ({
          ...c,
          commitment_level: (c.commitment_level || 'standard') as CampaignCardData['commitment_level'],
          status: (c.status || 'open') as CampaignCardData['status'],
          visibility: (c.visibility || 'public') as CampaignCardData['visibility'],
          playlist: c.playlist
            ? {
                title: c.playlist.title,
                image_url: c.playlist.image_url,
                spotify_url: c.playlist.spotify_url || '',
                owner_name: null,
              }
            : undefined,
          user_id: c.user_id || '',
          playlist_id: c.playlist_id || '',
          songs_per_member: c.songs_per_member ?? 1,
          admin_hidden: false,
          created_at: c.created_at || '',
          updated_at: c.updated_at || '',
        }))
      )
      setGenres(data.filters?.genres || [])
      setMoods(data.filters?.moods || [])
    } catch {
      setCampaigns([])
    } finally {
      setLoading(false)
    }
  }, [genre, mood, commitment, sort, lookingForMembers])

  useEffect(() => {
    load()
  }, [load])

  const chipClass = (active: boolean) => `discover-filter-chip${active ? ' is-active' : ''}`

  return (
    <div className="discover-ecosystem public-surface discover-campaigns-page" style={{ ['--pub-accent' as string]: accent }}>
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
          <Link href="/discover" style={{ color: '#8a7a60', textDecoration: 'none', fontSize: 13 }}>{tx.discoverEcosystemTitle}</Link>
          <Link href="/dashboard" style={{ color: '#8a7a60', textDecoration: 'none', fontSize: 13 }}>{tx.dashboard}</Link>
        </nav>
      </header>

      <div className="discover-ecosystem-main discover-campaigns-page__main">
        <div className="discover-campaigns-page__hero">
          <h1>{tx.discoverCampaignsTitle}</h1>
          <p>{tx.discoverCampaignsSubtitle}</p>
        </div>

        <div className="card discover-campaigns-filters">
          <div className="discover-filter-bar">
            <span className="discover-campaigns-filters__label">{tx.discoverCampaignsSort}</span>
            <button type="button" className={chipClass(sort === 'newest')} onClick={() => setSort('newest')}>{tx.discoverCampaignsSortNewest}</button>
            <button type="button" className={chipClass(sort === 'trending')} onClick={() => setSort('trending')}>{tx.discoverCampaignsSortTrending}</button>
          </div>
          <div className="discover-filter-bar" style={{ marginTop: 12 }}>
            <button type="button" className={chipClass(lookingForMembers)} onClick={() => setLookingForMembers(v => !v)}>
              {tx.discoverCampaignsFilterLooking}
            </button>
            <button type="button" className={chipClass(!commitment)} onClick={() => setCommitment('')}>{tx.discoverAllGenres}</button>
            {(['flexible', 'standard', 'dedicated'] as const).map(c => (
              <button key={c} type="button" className={chipClass(commitment === c)} onClick={() => setCommitment(c)}>
                {tx[`playlistCommitment${c.charAt(0).toUpperCase()}${c.slice(1)}`] || c}
              </button>
            ))}
          </div>
          {genres.length > 0 && (
            <div className="discover-filter-bar" style={{ marginTop: 12 }}>
              <button type="button" className={chipClass(!genre)} onClick={() => setGenre('')}>{tx.discoverAllGenres}</button>
              {genres.map(g => (
                <button key={g} type="button" className={chipClass(genre === g)} onClick={() => setGenre(g)}>{g}</button>
              ))}
            </div>
          )}
          {moods.length > 0 && (
            <div className="discover-filter-bar" style={{ marginTop: 12 }}>
              <button type="button" className={chipClass(!mood)} onClick={() => setMood('')}>{tx.discoverCampaignsAllMoods}</button>
              {moods.map(m => (
                <button key={m} type="button" className={chipClass(mood === m)} onClick={() => setMood(m)}>{m}</button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#6a5a40', padding: 40 }}>{tx.loading}</p>
        ) : campaigns.length === 0 ? (
          <PublicEmptyState icon="🎧" title={tx.playlistCommunityNoDiscover} description={tx.discoverCampaignsEmptyDesc} accent={accent} />
        ) : (
          <div className="discover-grid discover-grid--campaigns">
            {campaigns.map(c => (
              <PlaylistCampaignCard key={c.id} campaign={c} accent={accent} />
            ))}
          </div>
        )}

        <ViaToneBranding variant="footer" accent={accent} href="/login" />
      </div>
    </div>
  )
}
