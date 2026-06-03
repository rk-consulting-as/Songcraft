'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { t, useLang, type Lang } from '@/lib/i18n'
import AnalyticsChart from '@/components/AnalyticsChart'

type Summary = {
  days: number
  kpis: { plays: number; clicks: number; comments: number; reactions: number; followers: number; songs: number }
  daily: { date: string; plays: number; clicks: number; comments: number; reactions: number }[]
  topSongs: any[]
  platformBreakdown: Record<string, number>
  sourceBreakdown: Record<string, number>
  engagementRate: number
  clickThroughRate: number
  bestDay: { date: string; plays: number; clicks: number; comments: number; reactions: number } | null
  artists: { id: string; name: string }[]
}

const PLATFORM_LABELS: Record<string, string> = {
  spotify: 'Spotify',
  youtube: 'YouTube',
  apple_music: 'Apple Music',
  soundcloud: 'SoundCloud',
  suno: 'Suno',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
  twitter: 'X / Twitter',
  website: 'Website',
  other: 'Other',
}

const SOURCE_LABELS: Record<string, string> = {
  internal: 'Internal',
  spotify_embed: 'Spotify embed',
  youtube_embed: 'YouTube embed',
  soundcloud_embed: 'SoundCloud embed',
  apple_embed: 'Apple embed',
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [lang, setLang] = useState<Lang>('en')
  const [days, setDays] = useState(30)
  const [artistFilter, setArtistFilter] = useState<string>('')
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => { setLang(useLang()) }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true); setErr(null)
      try {
        const sb = createClient()
        const { data: { session } } = await sb.auth.getSession()
        if (!session?.access_token) { router.push('/login'); return }
        const params = new URLSearchParams()
        params.set('days', String(days))
        if (artistFilter) params.set('artist_id', artistFilter)
        const r = await fetch(`/api/analytics/summary?${params.toString()}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const j = await r.json()
        if (cancelled) return
        if (!r.ok) setErr(j?.message || 'Failed')
        else setData(j)
        setLoading(false)
      } catch (e: any) {
        if (!cancelled) { setErr(e?.message || 'Failed'); setLoading(false) }
      }
    }
    load()
    return () => { cancelled = true }
  }, [days, artistFilter, router])

  const tx = t[lang]
  const accent = '#d4a843'

  const dates = data?.daily.map(d => d.date) || []
  const series = [
    { key: 'plays',     label: lang === 'no' ? 'Avspillinger' : 'Plays',      color: '#d4a843', data: data?.daily.map(d => d.plays) || [] },
    { key: 'clicks',    label: lang === 'no' ? 'Lenkeklikk'    : 'Link clicks', color: '#1ed760', data: data?.daily.map(d => d.clicks) || [] },
    { key: 'comments',  label: lang === 'no' ? 'Kommentarer'   : 'Comments',   color: '#7090d0', data: data?.daily.map(d => d.comments) || [] },
    { key: 'reactions', label: lang === 'no' ? 'Reaksjoner'    : 'Reactions',  color: '#d070a0', data: data?.daily.map(d => d.reactions) || [] },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)',
      color: '#e8e0d0',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{ borderBottom: '1px solid rgba(180,140,80,0.2)', padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/dashboard" style={{ color: '#6a5a40', textDecoration: 'none', fontSize: 13 }}>
          ← {lang === 'no' ? 'Tilbake til dashbord' : 'Back to dashboard'}
        </Link>
        <Link href="/" style={{ color: accent, textDecoration: 'none', fontSize: 14, letterSpacing: 2 }}>VIATONE</Link>
        <span style={{ width: 80 }} />
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 80px' }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-0.01em' }}>
          📊 {tx.analyticsLabelAccount}
        </h1>
        <p style={{ color: '#8a7a60', fontSize: 14, marginTop: 6 }}>
          {tx.analyticsLabelAccountHelp}
        </p>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 22, alignItems: 'center' }}>
          <div style={{ display: 'inline-flex', gap: 4, background: 'rgba(255,255,255,0.04)', padding: 4, borderRadius: 8, border: `1px solid ${accent}25` }}>
            {[7, 30, 90, 365].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                style={{
                  background: days === d ? accent : 'transparent',
                  color: days === d ? '#0a0a0f' : '#a09080',
                  border: 'none', padding: '6px 14px', borderRadius: 5,
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}
              >
                {d === 365 ? (lang === 'no' ? '1 år' : '1 year') : `${d}d`}
              </button>
            ))}
          </div>

          {data && data.artists.length > 1 && (
            <select
              value={artistFilter}
              onChange={e => setArtistFilter(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.04)', color: '#e8e0d0', border: `1px solid ${accent}25`, borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
            >
              <option value="">{lang === 'no' ? 'Alle artister' : 'All artists'}</option>
              {data.artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}
        </div>

        {loading && <p style={{ color: '#8a7a60', marginTop: 32 }}>{lang === 'no' ? 'Laster…' : 'Loading…'}</p>}
        {err && <p style={{ color: '#e07070', marginTop: 32 }}>{err}</p>}

        {!loading && !err && data && (
          <>
            {/* KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginTop: 26 }}>
              {[
                { label: lang === 'no' ? 'Avspillinger'   : 'Plays',       value: data.kpis.plays,     icon: '▶' },
                { label: lang === 'no' ? 'Lenkeklikk'     : 'Link clicks', value: data.kpis.clicks,    icon: '🔗' },
                { label: lang === 'no' ? 'Kommentarer'    : 'Comments',    value: data.kpis.comments,  icon: '💬' },
                { label: lang === 'no' ? 'Reaksjoner'     : 'Reactions',   value: data.kpis.reactions, icon: '👍' },
                { label: lang === 'no' ? 'Nye følgere'    : 'New followers', value: data.kpis.followers, icon: '★' },
                { label: lang === 'no' ? 'Låter'          : 'Songs',       value: data.kpis.songs,     icon: '🎵' },
              ].map(k => (
                <div key={k.label} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${accent}25`,
                  borderRadius: 10,
                  padding: '14px 16px',
                }}>
                  <div style={{ color: '#8a7a60', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>{k.icon} {k.label}</div>
                  <div style={{ color: '#e8e0d0', fontSize: 26, fontWeight: 700, marginTop: 6 }}>{k.value.toLocaleString()}</div>
                </div>
              ))}
            </div>

            {/* Insights row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 16 }}>
              <div style={{ background: 'rgba(212,168,67,0.06)', border: `1px solid ${accent}40`, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ color: '#8a7a60', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>
                  {lang === 'no' ? 'Engasjementsrate' : 'Engagement rate'}
                </div>
                <div style={{ color: accent, fontSize: 22, fontWeight: 700, marginTop: 6 }}>{data.engagementRate}%</div>
                <div style={{ color: '#6a5a40', fontSize: 11, marginTop: 2 }}>
                  {lang === 'no' ? '(kommentarer + reaksjoner) / avspillinger' : '(comments + reactions) / plays'}
                </div>
              </div>
              <div style={{ background: 'rgba(30,215,96,0.06)', border: '1px solid #1ed76040', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ color: '#8a7a60', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>
                  {lang === 'no' ? 'Klikkrate' : 'Click-through rate'}
                </div>
                <div style={{ color: '#1ed760', fontSize: 22, fontWeight: 700, marginTop: 6 }}>{data.clickThroughRate}%</div>
                <div style={{ color: '#6a5a40', fontSize: 11, marginTop: 2 }}>
                  {lang === 'no' ? 'lenkeklikk / avspillinger' : 'link clicks / plays'}
                </div>
              </div>
              {data.bestDay && (
                <div style={{ background: 'rgba(112,144,208,0.06)', border: '1px solid #7090d040', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ color: '#8a7a60', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>
                    {lang === 'no' ? 'Beste dag' : 'Best day'}
                  </div>
                  <div style={{ color: '#7090d0', fontSize: 16, fontWeight: 600, marginTop: 6 }}>
                    {new Date(data.bestDay.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
                  </div>
                  <div style={{ color: '#6a5a40', fontSize: 11, marginTop: 2 }}>
                    {data.bestDay.plays} {lang === 'no' ? 'plays' : 'plays'}, {data.bestDay.clicks} {lang === 'no' ? 'klikk' : 'clicks'}
                  </div>
                </div>
              )}
            </div>

            {/* Daily chart */}
            <div style={{ marginTop: 26 }}>
              <h2 style={{ color: accent, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 'normal', margin: '0 0 12px' }}>
                {lang === 'no' ? `Aktivitet siste ${days} dager` : `Activity last ${days} days`}
              </h2>
              <AnalyticsChart dates={dates} series={series} />
            </div>

            {/* Top songs */}
            {data.topSongs.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <h2 style={{ color: accent, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 'normal', margin: '0 0 12px' }}>
                  {lang === 'no' ? 'Topp låter' : 'Top songs'}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {data.topSongs.map((s, i) => {
                    const thumb = s.spotify_cover_url || s.cover_image_url
                    return (
                      <Link key={s.id} href={`/song/${s.id}`} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                        background: 'rgba(255,255,255,0.03)', border: `1px solid ${accent}20`, borderRadius: 8,
                        textDecoration: 'none', color: '#e8e0d0',
                      }}>
                        <span style={{ color: accent, fontWeight: 700, minWidth: 28, textAlign: 'center', fontSize: 14 }}>#{i + 1}</span>
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt="" style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: 4, background: `${accent}11`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🎵</div>
                        )}
                        <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14 }}>
                          {s.title}
                        </div>
                        <div style={{ color: '#8a7a60', fontSize: 11, display: 'flex', gap: 12, flexShrink: 0 }}>
                          {s.plays > 0 && <span>▶ {s.plays}</span>}
                          {s.clicks > 0 && <span>🔗 {s.clicks}</span>}
                          {s.comments > 0 && <span>💬 {s.comments}</span>}
                          {s.reactions > 0 && <span>👍 {s.reactions}</span>}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Platform + source breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 28 }}>
              {Object.keys(data.platformBreakdown).length > 0 && (
                <div>
                  <h2 style={{ color: accent, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 'normal', margin: '0 0 12px' }}>
                    {lang === 'no' ? 'Klikk per plattform' : 'Clicks by platform'}
                  </h2>
                  <BreakdownBars data={data.platformBreakdown} labels={PLATFORM_LABELS} accent="#1ed760" />
                </div>
              )}
              {Object.keys(data.sourceBreakdown).length > 0 && (
                <div>
                  <h2 style={{ color: accent, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 'normal', margin: '0 0 12px' }}>
                    {lang === 'no' ? 'Avspillinger per kilde' : 'Plays by source'}
                  </h2>
                  <BreakdownBars data={data.sourceBreakdown} labels={SOURCE_LABELS} accent={accent} />
                </div>
              )}
            </div>

            {data.kpis.plays === 0 && data.kpis.clicks === 0 && (
              <div style={{ marginTop: 32, padding: 20, background: 'rgba(255,255,255,0.03)', border: `1px dashed ${accent}40`, borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🌱</div>
                <p style={{ color: '#a09080', margin: 0 }}>
                  {lang === 'no'
                    ? 'Ingen aktivitet ennå i valgt periode. Del lenkene dine for å begynne å samle data!'
                    : 'No activity yet in the selected period. Share your links to start collecting data!'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function BreakdownBars({ data, labels, accent }: { data: Record<string, number>; labels: Record<string, string>; accent: string }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0)
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1])
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${accent}25`, borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sorted.map(([k, v]) => {
        const pct = total > 0 ? (v / total) * 100 : 0
        return (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ minWidth: 110, fontSize: 13, color: '#c8c0b0' }}>{labels[k] || k}</div>
            <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: accent }} />
            </div>
            <div style={{ minWidth: 60, textAlign: 'right', fontSize: 13, color: '#a09080' }}>
              {v.toLocaleString()} <span style={{ color: '#5a4a30', fontSize: 11 }}>({pct.toFixed(0)}%)</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
