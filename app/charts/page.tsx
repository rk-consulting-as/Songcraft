'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import EmbedPlayer from '@/components/EmbedPlayer'
import { t, useLang, type Lang } from '@/lib/i18n'

type ChartRow = {
  id: string
  title: string
  cover_image_url: string | null
  spotify_cover_url: string | null
  suno_audio_url: string | null
  spotify_url: string | null
  suno_url: string | null
  media_links: any
  internal_play_count: number
  embed_click_count: number
  artist_id: string
  artists: { name: string; page_enabled: boolean; page_slug: string | null }
  user_id: string
  // From join
  user_display_name?: string | null
  user_referral_code?: string | null
}

type Window = 'week' | 'all'

export default function ChartsPage() {
  const [lang, setLangState] = useState<Lang>('en')
  const [rows, setRows] = useState<ChartRow[]>([])
  const [loading, setLoading] = useState(true)
  const [windowMode, setWindowMode] = useState<Window>('week')

  useEffect(() => { setLangState(useLang()); load() }, [windowMode])
  const tx = t[lang]

  const load = async () => {
    setLoading(true)
    const supabase = createClient()

    if (windowMode === 'all') {
      // All-time chart: ordered by internal_play_count desc.
      const { data } = await supabase
        .from('songs')
        .select('id, title, cover_image_url, spotify_cover_url, suno_audio_url, spotify_url, suno_url, media_links, internal_play_count, embed_click_count, artist_id, user_id, artists(name, page_enabled, page_slug)')
        .order('internal_play_count', { ascending: false })
        .order('embed_click_count', { ascending: false })
        .limit(100)
      const filtered = (data as any[] || []).filter(r => r.artists?.page_enabled && (r.internal_play_count > 0 || r.embed_click_count > 0))
      await enrichWithProfiles(filtered)
      setRows(filtered as ChartRow[])
    } else {
      // Weekly chart: aggregate from song_plays in last 7 days.
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: plays } = await supabase
        .from('song_plays')
        .select('song_id, source, completed')
        .gte('created_at', since)
        .limit(5000)
      const counts: Record<string, number> = {}
      for (const p of (plays as any[]) || []) {
        const weight = p.source === 'internal' && p.completed ? 3 : 1
        counts[p.song_id] = (counts[p.song_id] || 0) + weight
      }
      const sortedIds = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50)
        .map(([id]) => id)
      if (sortedIds.length === 0) { setRows([]); setLoading(false); return }
      const { data: songs } = await supabase
        .from('songs')
        .select('id, title, cover_image_url, spotify_cover_url, suno_audio_url, spotify_url, suno_url, media_links, internal_play_count, embed_click_count, artist_id, user_id, artists(name, page_enabled, page_slug)')
        .in('id', sortedIds)
      const map: Record<string, any> = {}
      for (const s of (songs as any[]) || []) map[s.id] = s
      const ordered = sortedIds.map(id => map[id]).filter(Boolean).filter(r => r.artists?.page_enabled) as any[]
      await enrichWithProfiles(ordered)
      setRows(ordered as ChartRow[])
    }
    setLoading(false)
  }

  const enrichWithProfiles = async (songRows: any[]) => {
    if (songRows.length === 0) return
    const supabase = createClient()
    const userIds = Array.from(new Set(songRows.map(s => s.user_id).filter(Boolean)))
    if (userIds.length === 0) return
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, referral_code')
      .in('id', userIds)
    const profMap: Record<string, any> = {}
    for (const p of (profiles as any[]) || []) profMap[p.id] = p
    for (const s of songRows) {
      s.user_display_name = profMap[s.user_id]?.display_name || null
      s.user_referral_code = profMap[s.user_id]?.referral_code || null
    }
  }

  const accent = '#d4a843'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)',
      color: '#e8e0d0',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        borderBottom: '1px solid rgba(180,140,80,0.2)',
        padding: '14px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <Link href="/" style={{ color: accent, textDecoration: 'none', fontSize: 14, letterSpacing: 2 }}>
          SONGCRAFT
        </Link>
        <div style={{ display: 'flex', gap: 14 }}>
          <Link href="/discover" style={{ color: '#8a7a60', textDecoration: 'none', fontSize: 13 }}>{tx.discoverNavLink}</Link>
          <Link href="/dashboard" style={{ color: '#8a7a60', textDecoration: 'none', fontSize: 13 }}>{tx.dashboard}</Link>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ color: accent, fontSize: 32, fontWeight: 700, letterSpacing: '-0.01em', margin: 0 }}>
            📈 {tx.chartsTitle}
          </h1>
          <p style={{ color: '#a09080', fontSize: 15, marginTop: 10 }}>
            {tx.chartsSubtitle}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 20, justifyContent: 'center', borderBottom: '1px solid rgba(180,140,80,0.15)' }}>
          <TabBtn active={windowMode === 'week'} onClick={() => setWindowMode('week')}>📅 {tx.chartsThisWeek}</TabBtn>
          <TabBtn active={windowMode === 'all'} onClick={() => setWindowMode('all')}>🏆 {tx.chartsAllTime}</TabBtn>
        </div>

        {loading ? (
          <div style={{ color: '#6a5a40', textAlign: 'center', padding: 40 }}>{tx.loading}</div>
        ) : rows.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🎶</div>
            <p style={{ color: '#8a7a60' }}>{tx.chartsEmpty}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rows.map((song, i) => (
              <div key={song.id} className="card" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{
                  width: 38,
                  fontSize: 20,
                  fontWeight: 800,
                  color: i < 3 ? accent : '#5a4a30',
                  textAlign: 'center',
                  flexShrink: 0,
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <div style={{ color: '#e8e0d0', fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {song.title}
                  </div>
                  <div style={{ color: '#8a7a60', fontSize: 12, marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {song.artists?.page_slug ? (
                      <Link href={`/p/${song.artists.page_slug}`} style={{ color: '#a09080', textDecoration: 'none' }}>
                        🎤 {song.artists.name}
                      </Link>
                    ) : (
                      <span>🎤 {song.artists?.name}</span>
                    )}
                    {song.user_referral_code && (
                      <Link href={`/u/${song.user_referral_code}`} style={{ color: '#6a5a40', textDecoration: 'none' }}>
                        · {song.user_display_name}
                      </Link>
                    )}
                  </div>
                </div>
                <div style={{ flex: '1 1 280px', minWidth: 260, maxWidth: 380 }}>
                  <EmbedPlayer
                    song={{
                      id: song.id,
                      title: song.title,
                      cover_image_url: song.cover_image_url,
                      spotify_cover_url: song.spotify_cover_url,
                      suno_audio_url: song.suno_audio_url,
                      spotify_url: song.spotify_url,
                      suno_url: song.suno_url,
                      media_links: song.media_links,
                      artist_name: song.artists?.name,
                    }}
                    compact
                  />
                </div>
                <div style={{ color: '#6a5a40', fontSize: 11, display: 'flex', gap: 10, flexShrink: 0 }}>
                  {song.internal_play_count > 0 && <span>▶ {song.internal_play_count.toLocaleString()}</span>}
                  {song.embed_click_count > 0 && <span>🔗 {song.embed_click_count.toLocaleString()}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid #d4a843' : '2px solid transparent',
        color: active ? '#d4a843' : '#8a7a60',
        padding: '10px 18px',
        cursor: 'pointer',
        fontSize: 13,
        transition: 'color 0.2s, border-color 0.2s',
      }}
    >
      {children}
    </button>
  )
}
