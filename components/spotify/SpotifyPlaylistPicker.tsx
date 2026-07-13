'use client'

import { useEffect, useState } from 'react'
import { useV2Toast } from '@/components/v2/V2Toast'
import { v2ApiFetch } from '@/lib/v2/apiClient'

export type SpotifyPickerPlaylist = {
  id: string
  title: string
  spotifyUrl: string
  imageUrl: string | null
  ownerName: string | null
  trackCount: number
  collaborative: boolean
  public: boolean
  ownerId?: string
}

type Props = {
  onSelect: (playlist: SpotifyPickerPlaylist) => void
  mySpotifyUserId?: string
}

export default function SpotifyPlaylistPicker({ onSelect, mySpotifyUserId }: Props) {
  const { showToast } = useV2Toast()
  const [search, setSearch] = useState('')
  const [playlists, setPlaylists] = useState<SpotifyPickerPlaylist[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const q = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ''
        const res = await v2ApiFetch<{ playlists: SpotifyPickerPlaylist[] }>(`/api/v2/integrations/spotify/playlists${q}`)
        if (!cancelled) setPlaylists(res.playlists)
      } catch (e) {
        if (!cancelled) {
          setPlaylists([])
          showToast(e instanceof Error ? e.message : 'Could not load playlists')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    const t = setTimeout(load, 300)
    return () => { cancelled = true; clearTimeout(t) }
  }, [search, showToast])

  const ownership = (p: SpotifyPickerPlaylist) => {
    if (mySpotifyUserId && p.ownerId === mySpotifyUserId) return 'Owned by you'
    if (p.collaborative) return 'Collaborative'
    if (!p.public) return 'Private / read-only sync may fail'
    return 'Followed playlist'
  }

  return (
    <div className="v2-spotify-picker">
      <input
        className="v2-input"
        placeholder="Search your Spotify playlists"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', marginBottom: 8 }}
      />
      {loading && <p className="v2-meta">Loading playlists…</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
        {playlists.map(p => (
          <button
            key={p.id}
            type="button"
            className="v2-card"
            style={{ textAlign: 'left', cursor: 'pointer' }}
            onClick={() => onSelect(p)}
          >
            <div className="v2-tagrow">
              <span className="v2-tag">{ownership(p)}</span>
              <span className="v2-tag">{p.trackCount} tracks</span>
            </div>
            <b>{p.title}</b>
            {p.ownerName && <span className="v2-meta"> · {p.ownerName}</span>}
          </button>
        ))}
        {!loading && playlists.length === 0 && (
          <p className="v2-meta">No playlists found. Connect Spotify or try another search.</p>
        )}
      </div>
    </div>
  )
}
