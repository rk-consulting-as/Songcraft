'use client'

import dynamic from 'next/dynamic'

// Lazy-load EmbedPlayer with SSR disabled so it never participates in server rendering
// of the /u/[code] page. Any issue inside EmbedPlayer stays client-side.
const EmbedPlayer = dynamic(() => import('@/components/EmbedPlayer'), { ssr: false })

type Song = {
  id: string
  title: string
  cover_image_url?: string | null
  spotify_cover_url?: string | null
  suno_audio_url?: string | null
  spotify_url?: string | null
  suno_url?: string | null
  media_links?: any
  artists?: { name?: string | null } | null
}

export default function TopTracksList({ songs }: { songs: Song[] }) {
  if (!songs || songs.length === 0) return null

  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{
        color: '#d4a843',
        fontSize: 13,
        fontWeight: 'normal',
        letterSpacing: 1,
        textTransform: 'uppercase',
        margin: '0 0 12px',
      }}>Top tracks</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {songs.map(song => (
          <EmbedPlayer
            key={song.id}
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
            showCounter
            compact
          />
        ))}
      </div>
    </div>
  )
}
