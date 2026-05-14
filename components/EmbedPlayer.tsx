'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

/**
 * EmbedPlayer — auto-picks the right player for a song based on which URLs are present.
 *
 * Order of preference:
 *   1. Internal HTML5 audio (suno_audio_url or direct file) — tracks duration, awards points
 *   2. Spotify embed iframe — gives real Spotify streams, awards "embed click" points
 *   3. YouTube embed iframe
 *   4. SoundCloud widget
 *   5. Apple Music embed
 *
 * The user can also manually switch between available sources using the tab row.
 */

export interface PlayableSong {
  id: string
  title: string
  cover_image_url?: string | null
  spotify_cover_url?: string | null
  // Internal direct audio (e.g. Suno-generated MP3)
  suno_audio_url?: string | null
  // External links
  spotify_url?: string | null
  suno_url?: string | null
  // From media_links jsonb
  media_links?: Array<{ platform?: string; url: string; label?: string }> | null
  // Display
  artist_name?: string | null
}

type PlayerKind = 'internal' | 'spotify' | 'youtube' | 'soundcloud' | 'apple'

interface Source {
  kind: PlayerKind
  url: string
  label: string
  emoji: string
}

function deriveSources(song: PlayableSong): Source[] {
  const sources: Source[] = []

  if (song.suno_audio_url) {
    sources.push({ kind: 'internal', url: song.suno_audio_url, label: 'Songcraft', emoji: '🎼' })
  }

  if (song.spotify_url) {
    sources.push({ kind: 'spotify', url: song.spotify_url, label: 'Spotify', emoji: '🎵' })
  }

  // Scan media_links for YouTube / SoundCloud / Apple Music URLs
  for (const link of song.media_links || []) {
    if (!link?.url) continue
    const url = link.url.toLowerCase()
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      if (!sources.find(s => s.kind === 'youtube')) {
        sources.push({ kind: 'youtube', url: link.url, label: 'YouTube', emoji: '▶️' })
      }
    } else if (url.includes('soundcloud.com')) {
      if (!sources.find(s => s.kind === 'soundcloud')) {
        sources.push({ kind: 'soundcloud', url: link.url, label: 'SoundCloud', emoji: '☁️' })
      }
    } else if (url.includes('music.apple.com')) {
      if (!sources.find(s => s.kind === 'apple')) {
        sources.push({ kind: 'apple', url: link.url, label: 'Apple Music', emoji: '🍎' })
      }
    }
  }

  return sources
}

function parseSpotifyId(url: string): { type: 'track' | 'album' | 'playlist'; id: string } | null {
  const m = url.match(/spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/)
  if (!m) return null
  return { type: m[1] as any, id: m[2] }
}

function parseYouTubeId(url: string): string | null {
  // youtube.com/watch?v=XXXX or youtu.be/XXXX
  const watch = url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/)
  if (watch) return watch[1]
  const short = url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/)
  if (short) return short[1]
  return null
}

function parseAppleMusicEmbed(url: string): string | null {
  // Convert https://music.apple.com/no/album/... to https://embed.music.apple.com/no/album/...
  if (url.includes('embed.music.apple.com')) return url
  return url.replace('music.apple.com', 'embed.music.apple.com')
}

async function reportPlay(payload: {
  song_id: string
  source: 'internal' | 'spotify_embed' | 'youtube_embed' | 'soundcloud_embed' | 'apple_embed'
  duration_listened: number
  song_duration?: number
  completed: boolean
}): Promise<{ points_awarded?: number } | null> {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }
    const res = await fetch('/api/song/play', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    console.warn('[EmbedPlayer] reportPlay failed:', e)
    return null
  }
}

export default function EmbedPlayer({
  song,
  showCounter = true,
  compact = false,
}: {
  song: PlayableSong
  showCounter?: boolean
  compact?: boolean
}) {
  const sources = deriveSources(song)
  const [active, setActive] = useState<Source | null>(sources[0] || null)
  const [pointsToast, setPointsToast] = useState<number | null>(null)

  if (sources.length === 0) {
    return (
      <div style={{
        color: '#6a5a40',
        fontSize: 12,
        padding: 10,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(180,140,80,0.15)',
        borderRadius: 6,
        textAlign: 'center',
      }}>
        🔇 No playable sources yet
      </div>
    )
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(180,140,80,0.18)',
      borderRadius: 8,
      padding: compact ? 10 : 14,
      position: 'relative',
    }}>
      {/* Source tabs */}
      {sources.length > 1 && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
          {sources.map(s => (
            <button
              key={s.kind}
              onClick={() => setActive(s)}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                borderRadius: 4,
                border: active?.kind === s.kind ? '1px solid #d4a843' : '1px solid rgba(180,140,80,0.2)',
                background: active?.kind === s.kind ? 'rgba(212,168,67,0.12)' : 'transparent',
                color: active?.kind === s.kind ? '#d4a843' : '#8a7a60',
                cursor: 'pointer',
              }}
            >
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
      )}

      {active?.kind === 'internal' && (
        <InternalAudioPlayer
          song={song}
          audioUrl={active.url}
          onPointsAwarded={n => { setPointsToast(n); setTimeout(() => setPointsToast(null), 3000) }}
        />
      )}
      {active?.kind === 'spotify' && (
        <SpotifyEmbed url={active.url} songId={song.id}
          onPointsAwarded={n => { setPointsToast(n); setTimeout(() => setPointsToast(null), 3000) }}
        />
      )}
      {active?.kind === 'youtube' && (
        <YouTubeEmbed url={active.url} songId={song.id}
          onPointsAwarded={n => { setPointsToast(n); setTimeout(() => setPointsToast(null), 3000) }}
        />
      )}
      {active?.kind === 'soundcloud' && (
        <SoundCloudEmbed url={active.url} songId={song.id}
          onPointsAwarded={n => { setPointsToast(n); setTimeout(() => setPointsToast(null), 3000) }}
        />
      )}
      {active?.kind === 'apple' && (
        <AppleMusicEmbed url={active.url} songId={song.id}
          onPointsAwarded={n => { setPointsToast(n); setTimeout(() => setPointsToast(null), 3000) }}
        />
      )}

      {/* Points awarded toast */}
      {pointsToast && pointsToast > 0 && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          background: 'rgba(212,168,67,0.15)',
          color: '#d4a843',
          border: '1px solid rgba(212,168,67,0.4)',
          padding: '4px 10px',
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 600,
          animation: 'pointsFade 3s ease',
        }}>
          ✨ +{pointsToast} pts
        </div>
      )}
    </div>
  )
}

/* ---------- Internal HTML5 audio with duration tracking ---------- */

function InternalAudioPlayer({
  song,
  audioUrl,
  onPointsAwarded,
}: {
  song: PlayableSong
  audioUrl: string
  onPointsAwarded: (n: number) => void
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const reportedRef = useRef(false)
  const durationListenedRef = useRef(0)
  const lastTimeRef = useRef(0)
  const [duration, setDuration] = useState(0)

  // Report progress + maybe award points when:
  //   - song ends (completed = true)
  //   - or component unmounts after 30s+ listened
  const submit = async (completed: boolean) => {
    if (reportedRef.current) return
    if (durationListenedRef.current < 5) return
    reportedRef.current = true
    const res = await reportPlay({
      song_id: song.id,
      source: 'internal',
      duration_listened: Math.floor(durationListenedRef.current),
      song_duration: Math.floor(duration),
      completed,
    })
    if (res?.points_awarded && res.points_awarded > 0) {
      onPointsAwarded(res.points_awarded)
    }
  }

  useEffect(() => {
    return () => { submit(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleTimeUpdate = () => {
    if (!audioRef.current) return
    const now = audioRef.current.currentTime
    const delta = now - lastTimeRef.current
    // Only count forward movement up to 2s — discourages jumping ahead to fake duration
    if (delta > 0 && delta < 2) {
      durationListenedRef.current += delta
    }
    lastTimeRef.current = now
  }

  const handleEnded = () => { submit(true) }
  const handleLoadedMeta = () => {
    if (audioRef.current) setDuration(audioRef.current.duration || 0)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        {(song.cover_image_url || song.spotify_cover_url) && (
          <img
            src={song.cover_image_url || song.spotify_cover_url || ''}
            alt={song.title}
            style={{ width: 56, height: 56, borderRadius: 4, objectFit: 'cover' }}
          />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ color: '#e8e0d0', fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</div>
          {song.artist_name && (
            <div style={{ color: '#8a7a60', fontSize: 11, marginTop: 2 }}>{song.artist_name}</div>
          )}
        </div>
      </div>
      <audio
        ref={audioRef}
        src={audioUrl}
        controls
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMeta}
        style={{ width: '100%' }}
      />
    </div>
  )
}

/* ---------- Embed players ----------
   Cross-origin iframes (Spotify, YouTube, SoundCloud, Apple Music) swallow clicks
   without bubbling to the parent — so onClick on a wrapper div never fires when the
   user clicks the play button INSIDE the iframe. window.blur isn't reliable either.

   Solution: a transparent overlay that captures the FIRST click. When the user clicks
   the overlay, we register the play event + hide the overlay so subsequent clicks
   reach the iframe normally. Two-click experience the first time, perfect tracking.
*/

function ClickOverlayWrapper({
  songId,
  source,
  onPointsAwarded,
  children,
  hintText = '▶ Click to play & earn points',
}: {
  songId: string
  source: 'spotify_embed' | 'youtube_embed' | 'soundcloud_embed' | 'apple_embed'
  onPointsAwarded: (n: number) => void
  children: React.ReactNode
  hintText?: string
}) {
  const [activated, setActivated] = useState(false)

  const handleClick = async () => {
    if (activated) return
    setActivated(true)
    const res = await reportPlay({
      song_id: songId,
      source,
      duration_listened: 0,
      completed: false,
    })
    if (res?.points_awarded && res.points_awarded > 0) {
      onPointsAwarded(res.points_awarded)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      {children}
      {!activated && (
        <button
          onClick={handleClick}
          aria-label="Activate player to earn points"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(10,10,15,0.35)',
            border: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#d4a843',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 0.5,
            backdropFilter: 'blur(1px)',
            borderRadius: 6,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(10,10,15,0.5)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(10,10,15,0.35)' }}
        >
          {hintText}
        </button>
      )}
    </div>
  )
}

function SpotifyEmbed({ url, songId, onPointsAwarded }: { url: string; songId: string; onPointsAwarded: (n: number) => void }) {
  const parsed = parseSpotifyId(url)
  const embedUrl = parsed
    ? `https://open.spotify.com/embed/${parsed.type}/${parsed.id}?utm_source=generator`
    : url

  return (
    <ClickOverlayWrapper songId={songId} source="spotify_embed" onPointsAwarded={onPointsAwarded} hintText="🎵 Click to play on Spotify & earn points">
      <iframe
        src={embedUrl}
        width="100%"
        height="80"
        frameBorder={0}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        style={{ border: 0, borderRadius: 6, display: 'block' }}
      />
    </ClickOverlayWrapper>
  )
}

function YouTubeEmbed({ url, songId, onPointsAwarded }: { url: string; songId: string; onPointsAwarded: (n: number) => void }) {
  const videoId = parseYouTubeId(url)
  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : url

  return (
    <ClickOverlayWrapper songId={songId} source="youtube_embed" onPointsAwarded={onPointsAwarded} hintText="▶ Click to play on YouTube & earn points">
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 6 }}>
        <iframe
          src={embedUrl}
          frameBorder={0}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        />
      </div>
    </ClickOverlayWrapper>
  )
}

function SoundCloudEmbed({ url, songId, onPointsAwarded }: { url: string; songId: string; onPointsAwarded: (n: number) => void }) {
  const embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23d4a843&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false`

  return (
    <ClickOverlayWrapper songId={songId} source="soundcloud_embed" onPointsAwarded={onPointsAwarded} hintText="☁️ Click to play on SoundCloud & earn points">
      <iframe
        width="100%"
        height="120"
        scrolling="no"
        frameBorder={0}
        src={embedUrl}
        loading="lazy"
        style={{ border: 0, borderRadius: 6, display: 'block' }}
      />
    </ClickOverlayWrapper>
  )
}

function AppleMusicEmbed({ url, songId, onPointsAwarded }: { url: string; songId: string; onPointsAwarded: (n: number) => void }) {
  const embedUrl = parseAppleMusicEmbed(url)

  return (
    <ClickOverlayWrapper songId={songId} source="apple_embed" onPointsAwarded={onPointsAwarded} hintText="🍎 Click to play on Apple Music & earn points">
      <iframe
        src={embedUrl || url}
        height="175"
        width="100%"
        frameBorder={0}
        allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
        sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
        loading="lazy"
        style={{ border: 0, borderRadius: 6, background: 'transparent', display: 'block' }}
      />
    </ClickOverlayWrapper>
  )
}
