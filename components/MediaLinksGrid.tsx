'use client'
import TrackableLink from './TrackableLink'

type MediaLink = { platform?: string; url: string; label?: string }

const PLATFORM_META: Record<string, { icon: string; bg: string; label: string; targetType: string }> = {
  spotify:     { icon: '🟢', bg: '#1db95422',  label: 'Spotify',     targetType: 'spotify' },
  youtube:     { icon: '▶️', bg: '#ff000022',   label: 'YouTube',     targetType: 'youtube' },
  'apple music': { icon: '🍎', bg: '#fa233b22', label: 'Apple Music', targetType: 'apple_music' },
  applemusic:  { icon: '🍎', bg: '#fa233b22',  label: 'Apple Music', targetType: 'apple_music' },
  soundcloud:  { icon: '🔊', bg: '#ff550022',  label: 'SoundCloud',  targetType: 'soundcloud' },
  suno:        { icon: '🎵', bg: '#7c3aed22',  label: 'Suno',        targetType: 'suno' },
  tiktok:      { icon: '🎶', bg: '#00f2ea22',  label: 'TikTok',      targetType: 'tiktok' },
  instagram:   { icon: '📷', bg: '#e1306c22',  label: 'Instagram',   targetType: 'instagram' },
  facebook:    { icon: '👥', bg: '#1877f222',  label: 'Facebook',    targetType: 'facebook' },
  twitter:     { icon: '𝕏',  bg: '#00000044',  label: 'X / Twitter', targetType: 'twitter' },
  'x/twitter': { icon: '𝕏',  bg: '#00000044',  label: 'X / Twitter', targetType: 'twitter' },
  other:       { icon: '🔗', bg: '#88888822',  label: 'Other',       targetType: 'website' },
  website:     { icon: '🌐', bg: '#88888822',  label: 'Website',     targetType: 'website' },
}

function detectFromUrl(url: string): keyof typeof PLATFORM_META {
  const u = url.toLowerCase()
  if (u.includes('spotify.com'))      return 'spotify'
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube'
  if (u.includes('music.apple.com'))  return 'apple music'
  if (u.includes('soundcloud.com'))   return 'soundcloud'
  if (u.includes('suno.com'))         return 'suno'
  if (u.includes('tiktok.com'))       return 'tiktok'
  if (u.includes('instagram.com'))    return 'instagram'
  if (u.includes('facebook.com'))     return 'facebook'
  if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter'
  return 'other'
}

export default function MediaLinksGrid({
  links,
  songId,
  artistId,
  sourcePage,
  accent = '#d4a843',
  onLinkClick,
}: {
  links: MediaLink[]
  songId?: string
  artistId?: string
  sourcePage?: string
  accent?: string
  /** Fired after outbound link tracking (e.g. story_song_click). */
  onLinkClick?: (targetType: string) => void
}) {
  if (!links?.length) return null

  // De-dup by URL
  const seen = new Set<string>()
  const cleaned = links.filter((l) => {
    if (!l?.url) return false
    if (seen.has(l.url)) return false
    seen.add(l.url)
    return true
  })

  if (!cleaned.length) return null

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: 10,
    }}>
      {cleaned.map((link, i) => {
        const key = (link.platform || detectFromUrl(link.url)).toLowerCase()
        const meta = PLATFORM_META[key] || PLATFORM_META.other
        return (
          <TrackableLink
            key={i}
            href={link.url}
            songId={songId}
            artistId={artistId}
            targetType={meta.targetType}
            sourcePage={sourcePage}
            onClick={() => onLinkClick?.(meta.targetType)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              background: meta.bg,
              border: `1px solid ${accent}30`,
              borderRadius: 10,
              color: '#e8e0d0',
              textDecoration: 'none',
              fontSize: 14,
              transition: 'transform 0.15s, border-color 0.15s',
            }}
            title={link.label || meta.label}
          >
            <span style={{ fontSize: 20 }}>{meta.icon}</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {link.label || meta.label}
            </span>
            <span style={{ color: '#8a7a60', fontSize: 11 }}>↗</span>
          </TrackableLink>
        )
      })}
    </div>
  )
}
