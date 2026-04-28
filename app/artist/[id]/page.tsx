'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { t, useLang, type Lang } from '@/lib/i18n'
import { type AIProvider, getStoredProvider, setStoredProvider } from '@/lib/aiProvider'
import AIProviderPicker from '@/components/AIProviderPicker'
import Link from 'next/link'

import type { SocialLinksMap } from '@/lib/socialLinks'

type Song = {
  id: string; title: string; status: string; created_at: string; lyrics_instructions: string
  album_id?: string | null
  spotify_track_id?: string | null
  spotify_url?: string | null
  spotify_popularity?: number | null
  spotify_release_date?: string | null
  spotify_album?: string | null
  spotify_cover_url?: string | null
}
type Album = {
  id: string
  artist_id: string
  user_id: string
  title: string
  description?: string | null
  cover_url?: string | null
  release_date?: string | null
}
type Artist = {
  id: string; name: string; genre: string; description: string; song_structure: string
  avatar_url?: string | null
  spotify_id?: string | null
  spotify_url?: string | null; spotify_verified?: boolean
  social_links?: SocialLinksMap | null
}

type SpotifyTrack = {
  id: string
  title: string
  album?: string
  releaseDate?: string
  durationMs?: number
  popularity: number
  coverUrl: string | null
  spotifyUrl: string | null
  explicit: boolean
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#8a7a60',
  in_progress: '#d4a843',
  complete: '#7bc87b',
  released: '#1ed760',
}

export default function ArtistPage() {
  const params = useParams()
  const router = useRouter()
  const artistId = params.id as string
  const [lang, setLangState] = useState<Lang>('no')
  const [artist, setArtist] = useState<Artist | null>(null)
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [showGenerator, setShowGenerator] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [count, setCount] = useState(3)
  const [generating, setGenerating] = useState(false)
  const [generatedSongs, setGeneratedSongs] = useState<{ title: string; instructions: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [useProfile, setUseProfile] = useState(true)

  // AI provider
  const [aiProvider, setAiProvider] = useState<AIProvider>('anthropic')
  const pickProvider = (p: AIProvider) => { setAiProvider(p); setStoredProvider(p) }

  // Albums
  const [albums, setAlbums] = useState<Album[]>([])
  const [showAlbumForm, setShowAlbumForm] = useState(false)
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null)
  const [albumForm, setAlbumForm] = useState<{ title: string; description: string; cover_url: string; release_date: string }>(
    { title: '', description: '', cover_url: '', release_date: '' }
  )
  const [savingAlbum, setSavingAlbum] = useState(false)

  // Spotify import
  const [showImport, setShowImport] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [spotifyTracks, setSpotifyTracks] = useState<SpotifyTrack[]>([])
  const [importError, setImportError] = useState<string | null>(null)
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set())

  useEffect(() => { setLangState(useLang()); setAiProvider(getStoredProvider()); fetchData() }, [artistId])
  const tx = t[lang]

  const fetchData = async () => {
    const supabase = createClient()
    const { data: a } = await supabase.from('artists').select('*').eq('id', artistId).single()
    if (a) setArtist(a)
    const { data: s } = await supabase.from('songs').select('*').eq('artist_id', artistId).order('created_at', { ascending: false })
    if (s) setSongs(s)
    const { data: al } = await supabase.from('albums').select('*').eq('artist_id', artistId).order('release_date', { ascending: false, nullsFirst: false })
    if (al) setAlbums(al)
    setLoading(false)
  }

  // Albums CRUD
  const openAlbumCreate = () => {
    setEditingAlbum(null)
    setAlbumForm({ title: '', description: '', cover_url: '', release_date: '' })
    setShowAlbumForm(true)
  }
  const openAlbumEdit = (al: Album) => {
    setEditingAlbum(al)
    setAlbumForm({
      title: al.title || '',
      description: al.description || '',
      cover_url: al.cover_url || '',
      release_date: al.release_date || '',
    })
    setShowAlbumForm(true)
  }
  const saveAlbum = async () => {
    if (!albumForm.title.trim()) return
    setSavingAlbum(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const payload: any = {
      title: albumForm.title.trim(),
      description: albumForm.description.trim() || null,
      cover_url: albumForm.cover_url.trim() || null,
      release_date: albumForm.release_date || null,
    }
    if (editingAlbum) {
      const { data } = await supabase.from('albums').update(payload).eq('id', editingAlbum.id).select().single()
      if (data) setAlbums(albums.map(a => a.id === editingAlbum.id ? data : a))
    } else {
      const { data } = await supabase.from('albums').insert({ ...payload, artist_id: artistId, user_id: user?.id }).select().single()
      if (data) setAlbums([data, ...albums])
    }
    setShowAlbumForm(false)
    setSavingAlbum(false)
  }
  const deleteAlbum = async (al: Album) => {
    if (!confirm(lang === 'no' ? `Slette albumet "${al.title}"? Sangene blir ikke slettet — de blir bare singles.` : `Delete album "${al.title}"? The songs are not deleted — they become singles.`)) return
    const supabase = createClient()
    await supabase.from('albums').delete().eq('id', al.id)
    setAlbums(albums.filter(a => a.id !== al.id))
    // Local songs view: clear album_id on songs that pointed to this album.
    setSongs(songs.map(s => s.album_id === al.id ? { ...s, album_id: null } : s))
    setShowAlbumForm(false)
  }

  // Assign / unassign album for a song.
  const assignSongAlbum = async (songId: string, albumId: string | null) => {
    const supabase = createClient()
    const { data } = await supabase.from('songs').update({ album_id: albumId }).eq('id', songId).select().single()
    if (data) setSongs(songs.map(s => s.id === songId ? { ...s, album_id: data.album_id } : s))
  }

  const buildArtistContext = () => {
    if (!artist || !useProfile) return ''
    const parts = []
    if (artist.name) parts.push(`Artist: ${artist.name}`)
    if (artist.genre) parts.push(`Genre: ${artist.genre}`)
    if (artist.description) parts.push(`Description: ${artist.description}`)
    if (artist.song_structure) parts.push(`Song structure/profile: ${artist.song_structure}`)
    return parts.join('\n')
  }

  const generateBatch = async () => {
    if (!prompt.trim()) return
    setGenerating(true)
    setGeneratedSongs([])
    const artistContext = buildArtistContext()
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: aiProvider,
        messages: [{ role: 'user', content: `${artistContext ? artistContext + '\n\n' : ''}User request: ${prompt}\n\nNumber of songs: ${count}` }],
        system: `You are a creative music producer and songwriter. The user describes a theme or concept for multiple songs. Your task: Create EXACTLY ${count} song proposals with title and instructions for a songwriter.\n\nRespond ONLY with valid JSON, no text around it:\n[\n  {\n    "title": "Song title here",\n    "instructions": "Detailed instructions for the songwriter: theme, mood, verse structure, specific images/metaphors, chorus idea, tone and style. At least 3-4 sentences.${artist?.song_structure && useProfile ? ' Follow the song structure profile provided.' : ''}"\n  }\n]`,
      }),
    })
    const data = await res.json()
    try {
      const clean = data.text.replace(/```json|```/g, '').trim()
      setGeneratedSongs(JSON.parse(clean))
    } catch (e) { console.error('Parse error', e) }
    setGenerating(false)
  }

  const updateGenerated = (i: number, field: 'title' | 'instructions', value: string) => {
    const updated = [...generatedSongs]
    updated[i] = { ...updated[i], [field]: value }
    setGeneratedSongs(updated)
  }

  const saveAll = async () => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('songs').insert(
      generatedSongs.map(s => ({ artist_id: artistId, user_id: user?.id, title: s.title, lyrics_instructions: s.instructions, status: 'draft' }))
    ).select()
    if (data) { setSongs([...data, ...songs]); setShowGenerator(false); setGeneratedSongs([]); setPrompt('') }
    setSaving(false)
  }

  const deleteSong = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (!confirm(lang === 'no' ? 'Slette denne låten?' : 'Delete this song?')) return
    const supabase = createClient()
    await supabase.from('songs').delete().eq('id', id)
    setSongs(songs.filter(s => s.id !== id))
  }

  // Spotify import
  const [importSource, setImportSource] = useState<string | null>(null)

  const openImport = async () => {
    if (!artist?.spotify_id) return
    setShowImport(true)
    setImportLoading(true)
    setImportError(null)
    setImportSource(null)
    setSpotifyTracks([])
    setSelectedTrackIds(new Set())
    try {
      const params = new URLSearchParams({
        artistId: artist.spotify_id,
        artistName: artist.name || '',
      })
      const res = await fetch(`/api/spotify/tracks?${params.toString()}`)
      const data = await res.json()
      if (data.error) {
        setImportError(data.error)
      } else {
        const tracks = (data.tracks || []) as SpotifyTrack[]
        setSpotifyTracks(tracks)
        setImportSource(data.source || null)
        // Pre-select tracks that are NOT already imported.
        const alreadyImported = new Set(songs.map(s => s.spotify_track_id).filter(Boolean) as string[])
        setSelectedTrackIds(new Set(tracks.filter(t => !alreadyImported.has(t.id)).map(t => t.id)))
      }
    } catch (e: any) {
      setImportError(e?.message || 'Failed to fetch tracks')
    }
    setImportLoading(false)
  }

  const toggleTrack = (id: string) => {
    setSelectedTrackIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const isAlreadyImported = (trackId: string) => songs.some(s => s.spotify_track_id === trackId)

  // Normalize Spotify's release_date (which can be YYYY, YYYY-MM, or YYYY-MM-DD) to YYYY-MM-DD for the date column.
  const normalizeReleaseDate = (raw?: string): string | null => {
    if (!raw) return null
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
    if (/^\d{4}-\d{2}$/.test(raw)) return raw + '-01'
    if (/^\d{4}$/.test(raw)) return raw + '-01-01'
    return null
  }

  const importSelected = async () => {
    if (selectedTrackIds.size === 0) return
    setImporting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const toImport = spotifyTracks.filter(t => selectedTrackIds.has(t.id) && !isAlreadyImported(t.id))
    const rows = toImport.map(t => ({
      artist_id: artistId,
      user_id: user?.id,
      title: t.title,
      lyrics_instructions: '',
      status: 'released',
      spotify_track_id: t.id,
      spotify_url: t.spotifyUrl,
      spotify_popularity: t.popularity,
      spotify_release_date: normalizeReleaseDate(t.releaseDate),
      spotify_album: t.album || null,
      spotify_cover_url: t.coverUrl,
    }))
    const { data, error } = await supabase.from('songs').insert(rows).select()
    if (error) {
      setImportError(error.message)
    } else if (data) {
      setSongs([...data, ...songs])
      setShowImport(false)
    }
    setImporting(false)
  }

  if (loading) return <div style={{ color: '#6a5a40', padding: '40px' }}>{tx.loading}</div>

  const statusLabel = (s: string) => ({ draft: tx.draft, in_progress: tx.inProgress, complete: tx.complete, released: tx.released }[s] || s)

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)' }}>
      <div style={{ borderBottom: '1px solid rgba(180,140,80,0.2)', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/dashboard" style={{ color: '#6a5a40', textDecoration: 'none', fontSize: '13px' }}>← {tx.dashboard}</Link>
          <span style={{ color: '#3a3530' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {artist?.avatar_url ? (
              <img src={artist.avatar_url} alt={artist.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(212,168,67,0.3)' }} />
            ) : (
              <span style={{ fontSize: '24px' }}>🎤</span>
            )}
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'normal', color: '#d4a843', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {artist?.name}
                {artist?.spotify_verified && artist?.spotify_url && (
                  <a
                    href={artist.spotify_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={lang === 'no' ? 'Åpne i Spotify' : 'Open in Spotify'}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', background: '#1ed760', color: '#000', fontSize: '12px', textDecoration: 'none', fontWeight: 'bold' }}
                  >
                    ♪
                  </a>
                )}
                {artist?.social_links?.youtube?.url && (
                  <a
                    href={artist.social_links.youtube.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={lang === 'no' ? 'Åpne på YouTube' : 'Open on YouTube'}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', background: '#ff0000', color: '#fff', fontSize: '11px', textDecoration: 'none', fontWeight: 'bold' }}
                  >
                    ▶
                  </a>
                )}
                {artist?.social_links?.instagram?.url && (
                  <a
                    href={artist.social_links.instagram.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={lang === 'no' ? 'Åpne på Instagram' : 'Open on Instagram'}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', color: '#fff', fontSize: '12px', textDecoration: 'none', fontWeight: 'bold' }}
                  >
                    ◎
                  </a>
                )}
              </h1>
              {artist?.genre && <p style={{ margin: 0, fontSize: '11px', color: '#6a5a40', letterSpacing: '1px' }}>{artist.genre.toUpperCase()}</p>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {artist?.spotify_id && (
            <button
              onClick={openImport}
              style={{ background: 'rgba(30,215,96,0.12)', border: '1px solid rgba(30,215,96,0.4)', color: '#1ed760', padding: '10px 18px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
            >
              {tx.importFromSpotify}
            </button>
          )}
          <button className="btn-gold" onClick={() => { setShowGenerator(true); setGeneratedSongs([]) }}>{tx.generateWithAI}</button>
        </div>
      </div>

      <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
        {showGenerator && (
          <div className="card" style={{ marginBottom: '32px', borderColor: 'rgba(212,168,67,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#d4a843', fontWeight: 'normal', fontSize: '18px' }}>{tx.aiGenerator}</h2>
              <button className="btn-outline" style={{ fontSize: '12px', padding: '4px 12px' }} onClick={() => { setShowGenerator(false); setGeneratedSongs([]) }}>{tx.close}</button>
            </div>

            {/* Artist profile toggle */}
            {(artist?.genre || artist?.description || artist?.song_structure) && (
              <div style={{ background: useProfile ? 'rgba(212,168,67,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${useProfile ? 'rgba(212,168,67,0.25)' : 'rgba(180,140,80,0.1)'}`, borderRadius: '6px', padding: '12px 16px', marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={useProfile} onChange={e => setUseProfile(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#d4a843', cursor: 'pointer' }} />
                  <div>
                    <span style={{ color: useProfile ? '#d4a843' : '#6a5a40', fontSize: '13px', fontWeight: '500' }}>{tx.useArtistProfile}</span>
                    <span style={{ color: '#5a4a30', fontSize: '12px', marginLeft: '8px' }}>— {tx.useArtistProfileHint}</span>
                  </div>
                </label>
                {useProfile && artist?.song_structure && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(212,168,67,0.1)', color: '#5a4a30', fontSize: '12px', lineHeight: '1.5' }}>
                    🎸 {artist.song_structure.length > 120 ? artist.song_structure.slice(0, 120) + '...' : artist.song_structure}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#8a7a60', fontSize: '11px', letterSpacing: '1px', marginBottom: '8px' }}>{tx.describeTheme}</label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={tx.themePlaceholder} rows={4} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#8a7a60', fontSize: '11px', letterSpacing: '1px', marginBottom: '10px' }}>{tx.numberOfSongs}</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[1, 2, 3, 4, 5, 6, 8, 10].map(n => (
                  <button key={n} onClick={() => setCount(n)} style={{
                    width: '42px', height: '42px', borderRadius: '4px', cursor: 'pointer',
                    border: count === n ? '1px solid #d4a843' : '1px solid rgba(180,140,80,0.2)',
                    background: count === n ? 'rgba(212,168,67,0.15)' : 'transparent',
                    color: count === n ? '#d4a843' : '#6a5a40',
                    fontSize: '14px', fontWeight: count === n ? 'bold' : 'normal',
                  }}>{n}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: generatedSongs.length > 0 ? '28px' : '0' }}>
              <button className="btn-gold" onClick={generateBatch} disabled={generating || !prompt.trim()}>
                {generating ? tx.planningText.replace('{n}', String(count)) : tx.generateProposals.replace('{n}', String(count))}
              </button>
              <AIProviderPicker value={aiProvider} onChange={pickProvider} disabled={generating} />
            </div>

            {generating && (
              <div style={{ marginTop: '20px' }}>
                {Array.from({ length: count }).map((_, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(180,140,80,0.1)', borderRadius: '6px', padding: '16px', marginBottom: '10px', opacity: 0.4 }}>
                    <div style={{ height: '14px', background: 'rgba(212,168,67,0.15)', borderRadius: '3px', width: '40%', marginBottom: '10px' }} />
                    <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', width: '90%', marginBottom: '6px' }} />
                    <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', width: '70%' }} />
                  </div>
                ))}
              </div>
            )}

            {generatedSongs.length > 0 && (
              <div>
                <p style={{ color: '#8a7a60', fontSize: '12px', letterSpacing: '1px', marginBottom: '14px' }}>{tx.proposalsLabel}</p>
                {generatedSongs.map((s, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(212,168,67,0.2)', borderRadius: '8px', padding: '18px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <span style={{ color: '#d4a843', fontSize: '13px', fontWeight: 'bold', minWidth: '24px' }}>#{i + 1}</span>
                      <input value={s.title} onChange={e => updateGenerated(i, 'title', e.target.value)} style={{ fontSize: '15px', flex: 1 }} />
                    </div>
                    <textarea value={s.instructions} onChange={e => updateGenerated(i, 'instructions', e.target.value)} rows={4} style={{ fontSize: '13px', color: '#a09080' }} />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-gold" onClick={saveAll} disabled={saving}>
                    {saving ? tx.saving : tx.saveAll.replace('{n}', String(generatedSongs.length))}
                  </button>
                  <button className="btn-outline" onClick={generateBatch} disabled={generating}>{tx.regenerate}</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Spotify import card */}
        {showImport && (
          <div className="card" style={{ marginBottom: '32px', borderColor: 'rgba(30,215,96,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h2 style={{ margin: 0, color: '#1ed760', fontWeight: 'normal', fontSize: '18px' }}>{tx.importTitle}</h2>
                <p style={{ margin: '4px 0 0', color: '#6a5a40', fontSize: '12px' }}>{tx.importSubtitle}</p>
              </div>
              <button className="btn-outline" style={{ fontSize: '12px', padding: '4px 12px' }} onClick={() => setShowImport(false)}>{tx.close}</button>
            </div>

            {importLoading && <p style={{ color: '#6a5a40', fontSize: '13px' }}>🔍 {tx.importLoading}</p>}

            {importError && (
              <div style={{ background: 'rgba(200,80,80,0.08)', border: '1px solid rgba(200,80,80,0.3)', color: '#c05050', padding: '10px 14px', borderRadius: '4px', fontSize: '13px', marginBottom: '12px' }}>
                {importError}
              </div>
            )}

            {!importLoading && spotifyTracks.length === 0 && !importError && (
              <p style={{ color: '#6a5a40', fontSize: '13px' }}>{tx.importNoTracks}</p>
            )}

            {spotifyTracks.length > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <button
                    onClick={() => {
                      const importable = spotifyTracks.filter(t => !isAlreadyImported(t.id))
                      if (selectedTrackIds.size === importable.length) setSelectedTrackIds(new Set())
                      else setSelectedTrackIds(new Set(importable.map(t => t.id)))
                    }}
                    style={{ background: 'none', border: 'none', color: '#8a7a60', fontSize: '12px', cursor: 'pointer' }}
                  >
                    {selectedTrackIds.size === spotifyTracks.filter(t => !isAlreadyImported(t.id)).length ? tx.importDeselectAll : tx.importSelectAll}
                  </button>
                  <span style={{ color: '#5a4a30', fontSize: '11px' }}>💡 {tx.importPopularityHint}</span>
                </div>

                {importSource === 'search-fallback' && (
                  <p style={{ color: '#8a7a60', fontSize: '11px', margin: '0 0 10px', fontStyle: 'italic' }}>
                    {lang === 'no'
                      ? 'ℹ️ Top-tracks-API ikke tilgjengelig — viser tracks via søk, sortert etter popularity.'
                      : 'ℹ️ Top-tracks API not available — showing tracks via search, sorted by popularity.'}
                  </p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                  {spotifyTracks.map(track => {
                    const already = isAlreadyImported(track.id)
                    const checked = selectedTrackIds.has(track.id)
                    return (
                      <div
                        key={track.id}
                        onClick={() => !already && toggleTrack(track.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '10px 12px', borderRadius: '6px',
                          background: already ? 'rgba(255,255,255,0.02)' : checked ? 'rgba(30,215,96,0.08)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${already ? 'rgba(180,140,80,0.1)' : checked ? 'rgba(30,215,96,0.3)' : 'rgba(180,140,80,0.15)'}`,
                          cursor: already ? 'default' : 'pointer',
                          opacity: already ? 0.55 : 1,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={already}
                          onChange={() => toggleTrack(track.id)}
                          onClick={e => e.stopPropagation()}
                          style={{ width: '16px', height: '16px', accentColor: '#1ed760', cursor: already ? 'default' : 'pointer', flexShrink: 0 }}
                        />
                        {track.coverUrl ? (
                          <img src={track.coverUrl} alt="" style={{ width: '44px', height: '44px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: '44px', height: '44px', borderRadius: '4px', background: 'rgba(30,215,96,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>🎵</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: '#e8e0d0', fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {track.title}
                            {track.explicit && <span style={{ marginLeft: 6, fontSize: 9, padding: '1px 4px', background: '#3a3530', color: '#a09080', borderRadius: 2 }}>E</span>}
                          </div>
                          <div style={{ color: '#6a5a40', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {track.album}{track.releaseDate ? ' · ' + track.releaseDate.slice(0, 4) : ''}
                            {already && <span style={{ marginLeft: 8, color: '#5a7a5a' }}>✓ {tx.importAlreadyImported}</span>}
                          </div>
                        </div>
                        {/* Popularity bar */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0, width: '70px' }}>
                          <div style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${track.popularity}%`, height: '100%', background: '#1ed760' }} />
                          </div>
                          <span style={{ color: '#5a7a5a', fontSize: '10px' }}>{track.popularity}/100</span>
                        </div>
                        {track.spotifyUrl && (
                          <a
                            href={track.spotifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            title={lang === 'no' ? 'Åpne i Spotify' : 'Open in Spotify'}
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', background: '#1ed760', color: '#000', fontSize: '12px', textDecoration: 'none', fontWeight: 'bold', flexShrink: 0 }}
                          >
                            ♪
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn-gold"
                    onClick={importSelected}
                    disabled={importing || selectedTrackIds.size === 0}
                    style={{ background: '#1ed760', borderColor: '#1ed760', color: '#000' }}
                  >
                    {importing ? tx.importing : tx.importSelected.replace('{n}', String(selectedTrackIds.size))}
                  </button>
                  <button className="btn-outline" onClick={() => setShowImport(false)}>{tx.cancel}</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Albums section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', marginTop: '8px' }}>
          <h2 style={{ margin: 0, color: '#d4a843', fontWeight: 'normal', fontSize: '16px' }}>
            {tx.albums} ({albums.length})
          </h2>
          <button
            onClick={openAlbumCreate}
            style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.25)', color: '#d4a843', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
          >
            {tx.newAlbum}
          </button>
        </div>

        {albums.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '28px' }}>
            {albums.map(al => {
              const albumSongs = songs.filter(s => s.album_id === al.id)
              return (
                <div key={al.id} className="card" style={{ padding: '12px', cursor: 'pointer', position: 'relative' }} onClick={() => openAlbumEdit(al)}>
                  {al.cover_url ? (
                    <img src={al.cover_url} alt={al.title} style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: '4px', marginBottom: '10px' }} />
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: '4px', background: 'rgba(212,168,67,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', marginBottom: '10px' }}>💿</div>
                  )}
                  <div style={{ color: '#e8e0d0', fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{al.title}</div>
                  <div style={{ color: '#6a5a40', fontSize: '11px', marginTop: '2px' }}>
                    {albumSongs.length} {albumSongs.length === 1 ? tx.song : tx.songs}
                    {al.release_date ? ' · ' + al.release_date.slice(0, 4) : ''}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p style={{ color: '#5a4a30', fontSize: '12px', marginBottom: '24px' }}>{tx.noAlbums}</p>
        )}

        {/* Album form modal */}
        {showAlbumForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
            <div className="card" style={{ width: '100%', maxWidth: '520px', maxHeight: '92vh', overflowY: 'auto', borderColor: 'rgba(212,168,67,0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, color: '#d4a843', fontWeight: 'normal', fontSize: '18px' }}>
                  {editingAlbum ? tx.editAlbum : tx.newAlbum}
                </h3>
                <button onClick={() => setShowAlbumForm(false)} style={{ background: 'none', border: 'none', color: '#6a5a40', cursor: 'pointer', fontSize: '22px' }}>×</button>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', color: '#8a7a60', fontSize: '11px', letterSpacing: '1px', marginBottom: '6px' }}>{tx.albumTitle.toUpperCase()} *</label>
                <input value={albumForm.title} onChange={e => setAlbumForm({ ...albumForm, title: e.target.value })} placeholder={tx.albumTitlePlaceholder} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', color: '#8a7a60', fontSize: '11px', letterSpacing: '1px', marginBottom: '6px' }}>{tx.albumReleaseDate.toUpperCase()}</label>
                <input type="date" value={albumForm.release_date} onChange={e => setAlbumForm({ ...albumForm, release_date: e.target.value })} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', color: '#8a7a60', fontSize: '11px', letterSpacing: '1px', marginBottom: '6px' }}>{tx.albumCoverUrl.toUpperCase()}</label>
                <input value={albumForm.cover_url} onChange={e => setAlbumForm({ ...albumForm, cover_url: e.target.value })} placeholder="https://..." />
                {albumForm.cover_url && <img src={albumForm.cover_url} alt="" style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '4px', marginTop: '8px' }} />}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#8a7a60', fontSize: '11px', letterSpacing: '1px', marginBottom: '6px' }}>{tx.albumDescription.toUpperCase()}</label>
                <textarea value={albumForm.description} onChange={e => setAlbumForm({ ...albumForm, description: e.target.value })} placeholder={tx.albumDescriptionPlaceholder} rows={3} />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-gold" onClick={saveAlbum} disabled={savingAlbum || !albumForm.title.trim()}>
                    {savingAlbum ? tx.saving : tx.save}
                  </button>
                  <button className="btn-outline" onClick={() => setShowAlbumForm(false)}>{tx.cancel}</button>
                </div>
                {editingAlbum && (
                  <button onClick={() => deleteAlbum(editingAlbum)} style={{ background: 'none', border: '1px solid rgba(200,80,80,0.3)', color: '#c05050', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                    {tx.deleteAlbum}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, color: '#d4a843', fontWeight: 'normal', fontSize: '16px' }}>{tx.songsCount} ({songs.length})</h2>
        </div>

        {songs.length === 0 && !showGenerator ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎵</div>
            <p style={{ color: '#8a7a60', marginBottom: '20px' }}>{tx.noSongs}</p>
            <button className="btn-gold" onClick={() => setShowGenerator(true)}>{tx.generateWithAI}</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {songs.map((song, i) => {
              const isReleased = song.status === 'released'
              return (
                <Link key={song.id} href={`/song/${song.id}`} style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '16px 20px', transition: 'border-color 0.2s', borderColor: isReleased ? 'rgba(30,215,96,0.2)' : undefined }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = isReleased ? 'rgba(30,215,96,0.5)' : 'rgba(212,168,67,0.5)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = isReleased ? 'rgba(30,215,96,0.2)' : 'rgba(180,140,80,0.2)')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                      {song.spotify_cover_url ? (
                        <img src={song.spotify_cover_url} alt="" style={{ width: '44px', height: '44px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <span style={{ color: '#3a3530', fontSize: '13px', minWidth: '28px', textAlign: 'center' }}>#{i + 1}</span>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#e8e0d0', fontSize: '15px', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</span>
                          {isReleased && song.spotify_url && (
                            <a
                              href={song.spotify_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => { e.preventDefault(); e.stopPropagation(); window.open(song.spotify_url!, '_blank') }}
                              title={lang === 'no' ? 'Åpne i Spotify' : 'Open in Spotify'}
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', borderRadius: '50%', background: '#1ed760', color: '#000', fontSize: '10px', textDecoration: 'none', fontWeight: 'bold', flexShrink: 0 }}
                            >
                              ♪
                            </a>
                          )}
                        </div>
                        {isReleased ? (
                          <div style={{ color: '#5a7a5a', fontSize: '12px', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {song.spotify_album}
                            {song.spotify_release_date ? ' · ' + song.spotify_release_date.slice(0, 4) : ''}
                          </div>
                        ) : song.lyrics_instructions ? (
                          <div style={{ color: '#5a4a30', fontSize: '12px', lineHeight: '1.4' }}>
                            {song.lyrics_instructions.length > 100 ? song.lyrics_instructions.slice(0, 100) + '...' : song.lyrics_instructions}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                      {/* Album picker */}
                      <select
                        value={song.album_id || ''}
                        onClick={e => e.stopPropagation()}
                        onChange={e => { e.stopPropagation(); assignSongAlbum(song.id, e.target.value || null) }}
                        title={tx.assignToAlbum}
                        style={{ width: 'auto', padding: '4px 8px', fontSize: 11, maxWidth: 140 }}
                      >
                        <option value="">{tx.singleNoAlbum}</option>
                        {albums.map(al => (
                          <option key={al.id} value={al.id}>{al.title}</option>
                        ))}
                      </select>
                      {isReleased && typeof song.spotify_popularity === 'number' && (
                        <div title={`${tx.spotifyPopularity}: ${song.spotify_popularity}/100`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                          <div style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${song.spotify_popularity}%`, height: '100%', background: '#1ed760' }} />
                          </div>
                          <span style={{ color: '#5a7a5a', fontSize: '10px' }}>{song.spotify_popularity}/100</span>
                        </div>
                      )}
                      <span style={{ fontSize: '11px', letterSpacing: '1px', color: STATUS_COLORS[song.status] || '#8a7a60', border: `1px solid ${STATUS_COLORS[song.status] || '#8a7a60'}40`, padding: '3px 10px', borderRadius: '20px' }}>
                        {statusLabel(song.status)}
                      </span>
                      <button onClick={e => deleteSong(song.id, e)} style={{ background: 'none', border: 'none', color: '#3a3530', cursor: 'pointer', fontSize: '18px', padding: '4px 8px' }}>×</button>
                      <span style={{ color: '#6a5a40', fontSize: '13px' }}>→</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
