'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Song = {
  id: string
  title: string
  lyrics_text?: string | null
  suno_audio_url?: string | null
  spotify_url?: string | null
  cover_image_url?: string | null
  spotify_cover_url?: string | null
  isrc?: string | null
  spotify_album?: string | null
  spotify_release_date?: string | null
  artists?: { name: string; genre?: string | null } | null
}

/**
 * Pre-publish modal for the song owner. Validates required metadata, generates a
 * metadata bundle (TXT), and sends the user to DistroKid via the configured
 * affiliate URL. Logs the click for analytics.
 */
export default function DistributionModal({
  open,
  onClose,
  song,
}: {
  open: boolean
  onClose: () => void
  song: Song
}) {
  const [affiliateUrl, setAffiliateUrl] = useState<string>('https://distrokid.com/')
  const [commissionUsd, setCommissionUsd] = useState<number>(7)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase.from('system_settings').select('value').eq('key', 'affiliate.distrokid').maybeSingle()
      .then(({ data }) => {
        const v = (data as any)?.value
        if (v?.url) setAffiliateUrl(v.url)
        if (typeof v?.commission_estimate_usd === 'number') setCommissionUsd(v.commission_estimate_usd)
      })
  }, [open])

  if (!open) return null

  // Build checklist
  const cover = song.cover_image_url || song.spotify_cover_url
  const audio = song.suno_audio_url
  const artistName = song.artists?.name || ''
  const checklist = [
    { key: 'title',  ok: !!song.title?.trim(),         label: 'Title',                hint: 'Required for any release' },
    { key: 'artist', ok: !!artistName.trim(),          label: 'Artist name',          hint: 'Must match across releases' },
    { key: 'audio',  ok: !!audio,                      label: 'Audio file (MP3/WAV)', hint: 'Upload via Suno tab or external link' },
    { key: 'cover',  ok: !!cover,                      label: 'Cover art',            hint: 'DistroKid needs ≥ 3000×3000 px JPG/PNG' },
    { key: 'isrc',   ok: !!song.isrc,                  label: 'ISRC code',            hint: 'Optional — DistroKid can generate one' },
  ]
  const allRequired = checklist.filter(c => c.key !== 'isrc').every(c => c.ok)

  const downloadMetadata = () => {
    const lines = [
      `Songcraft — Release metadata`,
      `Generated: ${new Date().toLocaleString()}`,
      ``,
      `TITLE:        ${song.title || '—'}`,
      `ARTIST:       ${artistName || '—'}`,
      `ALBUM:        ${song.spotify_album || '—'}`,
      `RELEASE DATE: ${song.spotify_release_date || '(today)'}`,
      `GENRE:        ${song.artists?.genre || '—'}`,
      `ISRC:         ${song.isrc || '(auto-generate)'}`,
      ``,
      `AUDIO URL:    ${audio || '—'}`,
      `COVER URL:    ${cover || '—'}`,
      ``,
      `LYRICS:`,
      song.lyrics_text || '(no lyrics provided)',
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(song.title || 'song').replace(/[^a-z0-9]+/gi, '_')}_metadata.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const goToDistroKid = async () => {
    setBusy(true)
    // Log the click for analytics
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('affiliate_clicks').insert({
        user_id: user?.id || null,
        partner: 'distrokid',
        song_id: song.id,
        ref_url: affiliateUrl,
      })
      // Also mark the song as exported (so owner sees status)
      if (user) {
        await supabase.from('songs')
          .update({
            distribution_status: 'exported',
            distribution_partner: 'distrokid',
            distribution_url: affiliateUrl,
            distribution_exported_at: new Date().toISOString(),
          })
          .eq('id', song.id)
          .eq('user_id', user.id)
      }
    } catch (e) { console.warn('[DistributionModal] click log failed:', e) }
    setBusy(false)
    // Open in new tab so user keeps Songcraft open
    window.open(affiliateUrl, '_blank', 'noopener,noreferrer')
  }

  const accent = '#d4a843'

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div className="card" style={{
        width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
        borderColor: 'rgba(212,168,67,0.4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, color: accent, fontSize: 18, fontWeight: 'normal' }}>
              📤 Publish to streaming platforms
            </h3>
            <p style={{ color: '#8a7a60', fontSize: 12, margin: '4px 0 0' }}>
              Spotify, Apple Music, YouTube Music, TikTok, Instagram, Deezer + 100+ more via DistroKid.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6a5a40', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        {/* Checklist */}
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ color: '#8a7a60', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 8px' }}>
            Pre-publish checklist
          </h4>
          {checklist.map(item => (
            <div key={item.key} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 6,
              marginBottom: 4,
            }}>
              <span style={{ fontSize: 16, color: item.ok ? '#7bc87b' : '#5a4a30' }}>
                {item.ok ? '✓' : '○'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ color: item.ok ? '#e8e0d0' : '#a09080', fontSize: 13, fontWeight: 500 }}>
                  {item.label}{item.key === 'isrc' && <span style={{ color: '#5a4a30', fontWeight: 'normal' }}> (optional)</span>}
                </div>
                <div style={{ color: '#6a5a40', fontSize: 11 }}>{item.hint}</div>
              </div>
            </div>
          ))}
          {!allRequired && (
            <div style={{
              background: 'rgba(192,80,80,0.08)',
              border: '1px solid rgba(192,80,80,0.3)',
              borderRadius: 6,
              padding: '8px 12px',
              marginTop: 10,
              color: '#c05050',
              fontSize: 12,
            }}>
              ⚠️ You can still proceed, but DistroKid will reject the upload until all required items are filled in.
            </div>
          )}
        </div>

        {/* DistroKid info */}
        <div style={{
          background: 'rgba(212,168,67,0.06)',
          border: '1px solid rgba(212,168,67,0.25)',
          borderRadius: 8,
          padding: 14,
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1ed760', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>♪</div>
            <div>
              <div style={{ color: '#e8e0d0', fontSize: 15, fontWeight: 600 }}>DistroKid</div>
              <div style={{ color: '#8a7a60', fontSize: 11 }}>$22.99/year — unlimited uploads</div>
            </div>
          </div>
          <ul style={{ color: '#a09080', fontSize: 12, paddingLeft: 18, margin: '8px 0 0', lineHeight: 1.6 }}>
            <li>Live on Spotify in 1–2 days, others in 3–7 days</li>
            <li>You keep 100% of your royalties</li>
            <li>Includes ISRC + UPC generation</li>
            <li>Songcraft is a DistroKid affiliate — using this link helps support the platform</li>
          </ul>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={downloadMetadata}
            className="btn-outline"
            style={{ padding: '10px 16px', textAlign: 'left' }}
          >
            📝 Download metadata as TXT (copy into DistroKid)
          </button>
          <button
            onClick={goToDistroKid}
            disabled={busy}
            className="btn-gold"
            style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {busy ? '⏳ Opening DistroKid...' : '🚀 Continue to DistroKid →'}
          </button>
        </div>

        <p style={{ color: '#5a4a30', fontSize: 11, marginTop: 14, lineHeight: 1.5 }}>
          DistroKid is an external service. Songcraft only forwards you — your contract and royalties are between you and DistroKid.
        </p>
      </div>
    </div>
  )
}
