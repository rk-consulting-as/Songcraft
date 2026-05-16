'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Stats = {
  total: number
  byType: Record<string, number>
  topUrls: { url: string; count: number; type: string }[]
  last30: number[]
}

const TYPE_LABELS: Record<string, string> = {
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

/**
 * Displays click stats for a song or artist.
 * Pass either songId or artistId.
 */
export default function ClickStats({
  songId,
  artistId,
  accent = '#d4a843',
  compact = false,
}: {
  songId?: string
  artistId?: string
  accent?: string
  compact?: boolean
}) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          if (!cancelled) { setErr('Not signed in'); setLoading(false) }
          return
        }
        const params = new URLSearchParams()
        if (songId) params.set('song_id', songId)
        if (artistId) params.set('artist_id', artistId)
        const r = await fetch(`/api/link/stats?${params.toString()}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const json = await r.json()
        if (!cancelled) {
          if (!r.ok) setErr(json?.message || 'Failed')
          else setStats(json)
          setLoading(false)
        }
      } catch (e: any) {
        if (!cancelled) { setErr(e?.message || 'Failed'); setLoading(false) }
      }
    }
    if (songId || artistId) load()
    return () => { cancelled = true }
  }, [songId, artistId])

  if (loading) {
    return <div style={{ color: '#8a7a60', fontSize: 13 }}>Loading click stats…</div>
  }
  if (err) {
    return <div style={{ color: '#8a7a60', fontSize: 13 }}>{err}</div>
  }
  if (!stats || stats.total === 0) {
    return (
      <div style={{ color: '#8a7a60', fontSize: 13, padding: 14, background: 'rgba(255,255,255,0.03)', border: `1px solid ${accent}25`, borderRadius: 8 }}>
        Ingen klikk registrert ennå. Når noen åpner en lenke fra den offentlige siden, vises det her.
      </div>
    )
  }

  const sortedTypes = Object.entries(stats.byType).sort((a, b) => b[1] - a[1])
  const max30 = Math.max(1, ...stats.last30)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Total */}
      <div style={{ display: 'flex', gap: 18, alignItems: 'baseline' }}>
        <div style={{ fontSize: 36, fontWeight: 700, color: accent, lineHeight: 1 }}>
          {stats.total.toLocaleString()}
        </div>
        <div style={{ color: '#8a7a60', fontSize: 13 }}>klikk totalt</div>
      </div>

      {!compact && (
        <>
          {/* By type */}
          <div>
            <div style={{ color: '#8a7a60', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Klikk per plattform</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sortedTypes.map(([type, count]) => {
                const pct = (count / stats.total) * 100
                return (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ minWidth: 90, fontSize: 13, color: '#c8c0b0' }}>{TYPE_LABELS[type] || type}</div>
                    <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: accent }} />
                    </div>
                    <div style={{ minWidth: 50, textAlign: 'right', fontSize: 13, color: '#a09080' }}>
                      {count.toLocaleString()}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Last 30 days mini-chart */}
          <div>
            <div style={{ color: '#8a7a60', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Siste 30 dager</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 60 }}>
              {stats.last30.map((n, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${Math.max(2, (n / max30) * 100)}%`,
                    background: n > 0 ? accent : 'rgba(255,255,255,0.05)',
                    borderRadius: 2,
                    minHeight: 2,
                  }}
                  title={`${30 - i}d ago: ${n} clicks`}
                />
              ))}
            </div>
          </div>

          {/* Top URLs */}
          {stats.topUrls.length > 0 && (
            <div>
              <div style={{ color: '#8a7a60', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Topp lenker</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {stats.topUrls.slice(0, 5).map((u, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#a09080' }}>
                    <span style={{ minWidth: 90, color: '#8a7a60' }}>{TYPE_LABELS[u.type] || u.type}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.url.replace(/^https?:\/\//, '').slice(0, 60)}
                    </span>
                    <span style={{ color: accent, minWidth: 40, textAlign: 'right' }}>{u.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
