'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { t, useLang, setLang, type Lang } from '@/lib/i18n'
import { searchGenres, MUSIC_GENRES } from '@/lib/genres'
import { parseYoutube, parseInstagram, type SocialLinksMap } from '@/lib/socialLinks'
import Link from 'next/link'

type Artist = {
  id: string; name: string; genre: string; description: string
  song_structure: string; avatar_url: string; song_count?: number
  spotify_id?: string; spotify_verified?: boolean
  spotify_url?: string | null; spotify_image_url?: string | null
  spotify_followers?: number | null; spotify_popularity?: number | null
  spotify_genres?: string[] | null
  social_links?: SocialLinksMap | null
}
type SpotifyArtist = {
  id: string; name: string; followers: number; genres: string[]
  popularity: number; image: string | null; smallImage: string | null
  spotifyUrl: string | null
}
const emptyForm = {
  name: '', genre: '', description: '', song_structure: '',
  avatar_url: '',
  spotify_id: '', spotify_verified: false,
  spotify_url: '', spotify_image_url: '',
  spotify_followers: null as number | null,
  spotify_popularity: null as number | null,
  spotify_genres: [] as string[],
  social_links: {} as SocialLinksMap,
}

// Title-case a Spotify genre string (e.g. "swamp country rock" -> "Swamp Country Rock")
const titleCase = (s: string) =>
  s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

export default function Dashboard() {
  const router = useRouter()
  const [lang, setLangState] = useState<Lang>('no')
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null)
  const [form, setForm] = useState<any>(emptyForm)
  const [saving, setSaving] = useState(false)

  // Spotify search
  const [spotifyResults, setSpotifyResults] = useState<SpotifyArtist[]>([])
  const [spotifyLoading, setSpotifyLoading] = useState(false)
  const [selectedSpotify, setSelectedSpotify] = useState<SpotifyArtist | null>(null)
  const [spotifySearched, setSpotifySearched] = useState(false)
  const spotifyTimer = useRef<any>(null)

  // Genre autocomplete
  const [genreSuggestions, setGenreSuggestions] = useState<string[]>([])
  const [showGenreDropdown, setShowGenreDropdown] = useState(false)
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const genreRef = useRef<HTMLDivElement>(null)

  // Social links: raw input strings the user is editing (parsed result lives in form.social_links).
  const [socialInputs, setSocialInputs] = useState<{ youtube: string; instagram: string }>({ youtube: '', instagram: '' })

  useEffect(() => { setLangState(useLang()); checkAuth(); fetchArtists() }, [])
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (genreRef.current && !genreRef.current.contains(e.target as Node)) setShowGenreDropdown(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const tx = t[lang]

  const checkAuth = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) router.push('/login')
  }

  const fetchArtists = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('artists').select('*, songs(count)').order('created_at', { ascending: false })
    if (data) setArtists(data.map((a: any) => ({ ...a, song_count: a.songs?.[0]?.count ?? 0 })))
    setLoading(false)
  }

  // Spotify search with debounce
  const searchSpotify = useCallback(async (name: string) => {
    if (!name.trim() || name.length < 2) { setSpotifyResults([]); return }
    setSpotifyLoading(true)
    setSpotifySearched(false)
    try {
      const res = await fetch(`/api/spotify?q=${encodeURIComponent(name)}`)
      const data = await res.json()
      setSpotifyResults(data.artists || [])
      setSpotifySearched(true)
    } catch { setSpotifyResults([]) }
    setSpotifyLoading(false)
  }, [])

  const onNameChange = (val: string) => {
    setForm({ ...form, name: val })
    setSelectedSpotify(null)
    if (spotifyTimer.current) clearTimeout(spotifyTimer.current)
    spotifyTimer.current = setTimeout(() => searchSpotify(val), 600)
  }

  const selectSpotifyArtist = (artist: SpotifyArtist) => {
    setSelectedSpotify(artist)

    // Merge Spotify genres into the user's selected list (deduped, capped at 5).
    const formattedSpotifyGenres = artist.genres.map(titleCase)
    const mergedGenres = [...selectedGenres]
    for (const g of formattedSpotifyGenres) {
      if (!mergedGenres.includes(g) && mergedGenres.length < 5) mergedGenres.push(g)
    }
    setSelectedGenres(mergedGenres)

    setForm((f: any) => ({
      ...f,
      spotify_id: artist.id,
      spotify_verified: false,
      spotify_url: artist.spotifyUrl || '',
      spotify_image_url: artist.image || '',
      spotify_followers: artist.followers,
      spotify_popularity: artist.popularity,
      spotify_genres: artist.genres,
      // Use Spotify image as the primary avatar (user can change later)
      avatar_url: artist.image || f.avatar_url || '',
      genre: mergedGenres.join(', '),
    }))
    setSpotifyResults([])
  }

  const confirmSpotifyOwnership = (confirmed: boolean) => {
    if (confirmed) {
      setForm((f: any) => ({ ...f, spotify_verified: true }))
    } else {
      // Clear all Spotify-derived fields and the avatar (since it came from Spotify).
      setSelectedSpotify(null)
      setForm((f: any) => ({
        ...f,
        spotify_id: '',
        spotify_verified: false,
        spotify_url: '',
        spotify_image_url: '',
        spotify_followers: null,
        spotify_popularity: null,
        spotify_genres: [],
        avatar_url: f.spotify_image_url && f.avatar_url === f.spotify_image_url ? '' : f.avatar_url,
      }))
    }
  }

  // Genre autocomplete
  const onGenreInput = (val: string) => {
    const suggestions = searchGenres(val)
    setGenreSuggestions(suggestions)
    setShowGenreDropdown(suggestions.length > 0)
  }

  const addGenre = (genre: string) => {
    if (!selectedGenres.includes(genre) && selectedGenres.length < 5) {
      const updated = [...selectedGenres, genre]
      setSelectedGenres(updated)
      setForm((f: any) => ({ ...f, genre: updated.join(', ') }))
    }
    setShowGenreDropdown(false)
  }

  const removeGenre = (genre: string) => {
    const updated = selectedGenres.filter(g => g !== genre)
    setSelectedGenres(updated)
    setForm((f: any) => ({ ...f, genre: updated.join(', ') }))
  }

  // Social links: parse raw input on every change; clear that platform when input is empty/invalid.
  const onSocialChange = (platform: 'youtube' | 'instagram', val: string) => {
    setSocialInputs(s => ({ ...s, [platform]: val }))
    const parsed = !val.trim() ? null : platform === 'youtube' ? parseYoutube(val) : parseInstagram(val)
    setForm((f: any) => {
      const links: SocialLinksMap = { ...(f.social_links || {}) }
      if (parsed) links[platform] = parsed
      else delete links[platform]
      return { ...f, social_links: links }
    })
  }

  const openCreate = () => {
    setEditingArtist(null); setForm(emptyForm)
    setSelectedGenres([]); setSelectedSpotify(null)
    setSpotifyResults([]); setSpotifySearched(false)
    setSocialInputs({ youtube: '', instagram: '' })
    setShowForm(true)
  }

  const openEdit = (artist: Artist, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    setEditingArtist(artist)
    setForm({
      name: artist.name,
      genre: artist.genre || '',
      description: artist.description || '',
      song_structure: artist.song_structure || '',
      avatar_url: artist.avatar_url || '',
      spotify_id: artist.spotify_id || '',
      spotify_verified: artist.spotify_verified || false,
      spotify_url: artist.spotify_url || '',
      spotify_image_url: artist.spotify_image_url || '',
      spotify_followers: artist.spotify_followers ?? null,
      spotify_popularity: artist.spotify_popularity ?? null,
      spotify_genres: artist.spotify_genres || [],
      social_links: artist.social_links || {},
    })
    setSelectedGenres(artist.genre ? artist.genre.split(', ').filter(Boolean) : [])
    setSocialInputs({
      youtube: artist.social_links?.youtube?.url || '',
      instagram: artist.social_links?.instagram?.url || '',
    })
    // If the artist already has a confirmed Spotify link, pre-fill the preview card
    // so the user can open it / un-link without having to re-search.
    if (artist.spotify_id && artist.spotify_url) {
      setSelectedSpotify({
        id: artist.spotify_id,
        name: artist.name,
        followers: artist.spotify_followers ?? 0,
        genres: artist.spotify_genres || [],
        popularity: artist.spotify_popularity ?? 0,
        image: artist.spotify_image_url || null,
        smallImage: artist.spotify_image_url || null,
        spotifyUrl: artist.spotify_url || null,
      })
    } else {
      setSelectedSpotify(null)
    }
    setSpotifyResults([]); setSpotifySearched(false)
    setShowForm(true)
  }

  const saveArtist = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const payload = { ...form, genre: selectedGenres.join(', ') || form.genre }
    if (editingArtist) {
      const { data } = await supabase.from('artists').update(payload).eq('id', editingArtist.id).select().single()
      if (data) setArtists(artists.map(a => a.id === editingArtist.id ? { ...a, ...data } : a))
    } else {
      const { data } = await supabase.from('artists').insert({ ...payload, user_id: user?.id }).select().single()
      if (data) setArtists([{ ...data, song_count: 0 }, ...artists])
    }
    setShowForm(false); setForm(emptyForm); setSelectedGenres([])
    setSaving(false)
  }

  const deleteArtist = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (!confirm(tx.confirmDeleteArtist)) return
    const supabase = createClient()
    await supabase.from('artists').delete().eq('id', id)
    setArtists(artists.filter(a => a.id !== id))
    setShowForm(false)
  }

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)' }}>
      <div style={{ borderBottom: '1px solid rgba(180,140,80,0.2)', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px' }}>🎼</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 'normal', color: '#d4a843', letterSpacing: '2px' }}>SONGCRAFT</h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#6a5a40', letterSpacing: '2px' }}>{tx.dashboard.toUpperCase()}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link href="/settings" className="btn-outline" style={{ fontSize: '13px', textDecoration: 'none', padding: '10px 20px', display: 'inline-block' }}>⚙ {tx.settings}</Link>
          <button className="btn-outline" onClick={logout} style={{ fontSize: '13px' }}>{tx.logout}</button>
        </div>
      </div>

      <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
          {[
            { label: tx.artists, value: artists.length },
            { label: tx.totalSongs, value: artists.reduce((s, a) => s + (a.song_count || 0), 0) },
            { label: tx.activeProjects, value: artists.filter(a => (a.song_count || 0) > 0).length },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#d4a843' }}>{stat.value}</div>
              <div style={{ fontSize: '12px', color: '#6a5a40', letterSpacing: '1px', marginTop: '4px' }}>{stat.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#d4a843', fontWeight: 'normal', fontSize: '18px' }}>{tx.yourArtists}</h2>
          <button className="btn-gold" onClick={openCreate}>{tx.newArtist}</button>
        </div>

        {/* Artist form modal */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
            <div className="card" style={{ width: '100%', maxWidth: '620px', maxHeight: '92vh', overflowY: 'auto', borderColor: 'rgba(212,168,67,0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, color: '#d4a843', fontWeight: 'normal', fontSize: '18px' }}>
                  {editingArtist ? tx.editArtist : tx.createArtist}
                </h3>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#6a5a40', cursor: 'pointer', fontSize: '22px' }}>×</button>
              </div>

              {/* Artist name + Spotify search */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#8a7a60', fontSize: '11px', letterSpacing: '1px', marginBottom: '6px' }}>{tx.artistName.toUpperCase()} *</label>
                <input value={form.name} onChange={e => onNameChange(e.target.value)} placeholder={tx.artistNamePlaceholder} />

                {/* Spotify loading */}
                {spotifyLoading && (
                  <p style={{ color: '#6a5a40', fontSize: '12px', margin: '8px 0 0' }}>🔍 {lang === 'no' ? 'Søker på Spotify...' : 'Searching Spotify...'}</p>
                )}

                {/* Spotify results */}
                {spotifyResults.length > 0 && !selectedSpotify && (
                  <div style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(30,215,96,0.3)', borderRadius: '6px', marginTop: '8px', overflow: 'hidden' }}>
                    <p style={{ color: '#1ed760', fontSize: '11px', letterSpacing: '1px', padding: '10px 14px 6px', margin: 0 }}>
                      🎵 {lang === 'no' ? 'FUNDET PÅ SPOTIFY – KJENNER DU IGJEN ARTISTEN?' : 'FOUND ON SPOTIFY – DO YOU RECOGNISE THIS ARTIST?'}
                    </p>
                    {spotifyResults.map(a => (
                      <div key={a.id} onClick={() => selectSpotifyArtist(a)}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', cursor: 'pointer', borderTop: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,215,96,0.08)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        {a.smallImage
                          ? <img src={a.smallImage} alt={a.name} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          : <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(30,215,96,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '20px' }}>🎤</div>
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: '#e8e0d0', fontSize: '14px', fontWeight: '500' }}>{a.name}</div>
                          <div style={{ color: '#6a5a40', fontSize: '12px' }}>
                            {a.followers.toLocaleString()} {lang === 'no' ? 'følgere' : 'followers'}
                            {a.genres.length > 0 && ` · ${a.genres.slice(0, 2).join(', ')}`}
                          </div>
                        </div>
                        <div style={{ color: '#1ed760', fontSize: '12px', flexShrink: 0 }}>
                          {'★'.repeat(Math.round(a.popularity / 20))}
                        </div>
                      </div>
                    ))}
                    {spotifySearched && (
                      <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <button onClick={() => setSpotifyResults([])} style={{ background: 'none', border: 'none', color: '#5a4a30', fontSize: '12px', cursor: 'pointer' }}>
                          {lang === 'no' ? 'Ingen av disse – fortsett uten Spotify' : 'None of these – continue without Spotify'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Spotify artist preview */}
                {selectedSpotify && (
                  <div style={{ background: 'rgba(30,215,96,0.05)', border: '1px solid rgba(30,215,96,0.25)', borderRadius: '8px', padding: '14px', marginTop: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      {selectedSpotify.image
                        ? <img src={selectedSpotify.image} alt={selectedSpotify.name} style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover' }} />
                        : <div style={{ width: '64px', height: '64px', borderRadius: '8px', background: 'rgba(30,215,96,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🎤</div>
                      }
                      <div>
                        <div style={{ color: '#1ed760', fontSize: '15px', fontWeight: '500' }}>{selectedSpotify.name}</div>
                        <div style={{ color: '#6a5a40', fontSize: '12px', marginTop: '2px' }}>{selectedSpotify.followers.toLocaleString()} {lang === 'no' ? 'følgere' : 'followers'} · {selectedSpotify.popularity}/100</div>
                        {selectedSpotify.genres.length > 0 && <div style={{ color: '#5a7a5a', fontSize: '12px', marginTop: '2px' }}>{selectedSpotify.genres.slice(0, 4).join(' · ')}</div>}
                      </div>
                    </div>

                    {/* Ownership confirmation */}
                    {!form.spotify_verified ? (
                      <div>
                        <p style={{ color: '#8a7a60', fontSize: '13px', margin: '0 0 10px' }}>
                          {lang === 'no' ? 'Er dette din artist eller en samarbeidspartner?' : 'Is this your artist or a collaborator?'}
                        </p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => confirmSpotifyOwnership(true)} style={{ padding: '8px 16px', background: 'rgba(30,215,96,0.15)', border: '1px solid rgba(30,215,96,0.4)', color: '#1ed760', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                            ✓ {lang === 'no' ? 'Ja, dette er artisten min' : 'Yes, this is my artist'}
                          </button>
                          <button onClick={() => confirmSpotifyOwnership(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(180,140,80,0.2)', color: '#6a5a40', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                            {lang === 'no' ? 'Nei, feil artist' : 'No, wrong artist'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#1ed760', fontSize: '13px' }}>✓ {lang === 'no' ? 'Spotify-artist bekreftet' : 'Spotify artist confirmed'}</span>
                        <a href={selectedSpotify.spotifyUrl || '#'} target="_blank" rel="noopener noreferrer"
                          style={{ color: '#1ed760', fontSize: '12px', textDecoration: 'none', border: '1px solid rgba(30,215,96,0.3)', padding: '4px 10px', borderRadius: '4px' }}>
                          Åpne i Spotify ↗
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Genre with autocomplete */}
              <div style={{ marginBottom: '12px' }} ref={genreRef}>
                <label style={{ display: 'block', color: '#8a7a60', fontSize: '11px', letterSpacing: '1px', marginBottom: '6px' }}>{tx.genre.toUpperCase()}</label>

                {/* Selected genre tags */}
                {selectedGenres.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                    {selectedGenres.map(g => (
                      <span key={g} style={{ background: 'rgba(212,168,67,0.15)', border: '1px solid rgba(212,168,67,0.3)', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', color: '#d4a843', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {g}
                        <button onClick={() => removeGenre(g)} style={{ background: 'none', border: 'none', color: '#8a7a60', cursor: 'pointer', fontSize: '14px', padding: 0, lineHeight: 1 }}>×</button>
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ position: 'relative' }}>
                  <input
                    placeholder={selectedGenres.length > 0 ? (lang === 'no' ? 'Legg til flere...' : 'Add more...') : tx.genrePlaceholder}
                    onChange={e => onGenreInput(e.target.value)}
                    onFocus={() => genreSuggestions.length > 0 && setShowGenreDropdown(true)}
                    disabled={selectedGenres.length >= 5}
                  />
                  {showGenreDropdown && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1520', border: '1px solid rgba(212,168,67,0.3)', borderRadius: '6px', zIndex: 100, maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
                      {genreSuggestions.map(g => (
                        <div key={g} onClick={() => addGenre(g)}
                          style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '13px', color: '#c8c0b0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,168,67,0.1)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          {g}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p style={{ color: '#5a4a30', fontSize: '11px', margin: '4px 0 0' }}>
                  {lang === 'no' ? 'Søk og velg opptil 5 sjangere' : 'Search and select up to 5 genres'}
                </p>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', color: '#8a7a60', fontSize: '11px', letterSpacing: '1px', marginBottom: '6px' }}>{tx.description.toUpperCase()}</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={tx.descriptionPlaceholder} rows={3} />
              </div>

              {/* Social links */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#8a7a60', fontSize: '11px', letterSpacing: '1px', marginBottom: '8px' }}>
                  {lang === 'no' ? 'SOSIALE LENKER' : 'SOCIAL LINKS'}
                </label>

                {/* YouTube */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', background: '#ff0000', color: '#fff', fontSize: '14px', fontWeight: 'bold', flexShrink: 0 }}>▶</span>
                  <div style={{ flex: 1 }}>
                    <input
                      value={socialInputs.youtube}
                      onChange={e => onSocialChange('youtube', e.target.value)}
                      placeholder={lang === 'no' ? 'YouTube URL eller @kanal' : 'YouTube URL or @channel'}
                    />
                    {socialInputs.youtube.trim() && (
                      form.social_links?.youtube
                        ? <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#1ed760' }}>✓ {form.social_links.youtube.handle ? '@' + form.social_links.youtube.handle : form.social_links.youtube.url}</p>
                        : <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#c05050' }}>{lang === 'no' ? 'Sjekk URL — kunne ikke gjenkjennes' : 'Check URL — could not be parsed'}</p>
                    )}
                  </div>
                </div>

                {/* Instagram */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', color: '#fff', fontSize: '14px', fontWeight: 'bold', flexShrink: 0 }}>◎</span>
                  <div style={{ flex: 1 }}>
                    <input
                      value={socialInputs.instagram}
                      onChange={e => onSocialChange('instagram', e.target.value)}
                      placeholder={lang === 'no' ? 'Instagram URL eller @brukernavn' : 'Instagram URL or @handle'}
                    />
                    {socialInputs.instagram.trim() && (
                      form.social_links?.instagram
                        ? <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#1ed760' }}>✓ @{form.social_links.instagram.handle}</p>
                        : <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#c05050' }}>{lang === 'no' ? 'Sjekk URL — kunne ikke gjenkjennes' : 'Check URL — could not be parsed'}</p>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#8a7a60', fontSize: '11px', letterSpacing: '1px', marginBottom: '6px' }}>{tx.songStructure.toUpperCase()}</label>
                <textarea value={form.song_structure} onChange={e => setForm({ ...form, song_structure: e.target.value })} placeholder={tx.songStructurePlaceholder} rows={5} />
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#5a4a30' }}>💡 {tx.songStructureHint}</p>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-gold" onClick={saveArtist} disabled={saving || !form.name.trim()}>
                    {saving ? tx.saving : editingArtist ? tx.save : tx.createArtist}
                  </button>
                  <button className="btn-outline" onClick={() => setShowForm(false)}>{tx.cancel}</button>
                </div>
                {editingArtist && (
                  <button onClick={e => deleteArtist(editingArtist.id, e)} style={{ background: 'none', border: '1px solid rgba(200,80,80,0.3)', color: '#c05050', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                    {tx.deleteArtist}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Artist grid */}
        {loading ? (
          <p style={{ color: '#6a5a40' }}>{tx.loading}</p>
        ) : artists.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎤</div>
            <p style={{ color: '#8a7a60', marginBottom: '20px' }}>{tx.noArtists}</p>
            <button className="btn-gold" onClick={openCreate}>{tx.newArtist}</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {artists.map(artist => (
              <Link key={artist.id} href={`/artist/${artist.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ cursor: 'pointer', transition: 'border-color 0.2s', position: 'relative' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(212,168,67,0.5)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(180,140,80,0.2)')}>
                  <button onClick={e => openEdit(artist, e)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(180,140,80,0.2)', color: '#6a5a40', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#d4a843'}
                    onMouseLeave={e => e.currentTarget.style.color = '#6a5a40'}>✏️</button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                    {artist.avatar_url ? (
                      <img src={artist.avatar_url} alt={artist.name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(212,168,67,0.3)', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(212,168,67,0.15)', border: '1px solid rgba(212,168,67,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>🎤</div>
                    )}
                    <div>
                      <div style={{ color: '#e8e0d0', fontWeight: '500', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {artist.name}
                        {artist.spotify_verified && artist.spotify_url && (
                          <a
                            href={artist.spotify_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            title={lang === 'no' ? 'Åpne i Spotify' : 'Open in Spotify'}
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: '#1ed760', color: '#000', fontSize: '11px', textDecoration: 'none', fontWeight: 'bold' }}
                          >
                            ♪
                          </a>
                        )}
                        {artist.social_links?.youtube?.url && (
                          <a
                            href={artist.social_links.youtube.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            title={lang === 'no' ? 'Åpne på YouTube' : 'Open on YouTube'}
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: '#ff0000', color: '#fff', fontSize: '10px', textDecoration: 'none', fontWeight: 'bold' }}
                          >
                            ▶
                          </a>
                        )}
                        {artist.social_links?.instagram?.url && (
                          <a
                            href={artist.social_links.instagram.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            title={lang === 'no' ? 'Åpne på Instagram' : 'Open on Instagram'}
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', color: '#fff', fontSize: '11px', textDecoration: 'none', fontWeight: 'bold' }}
                          >
                            ◎
                          </a>
                        )}
                      </div>
                      {artist.genre && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                          {artist.genre.split(', ').slice(0, 3).map(g => (
                            <span key={g} style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.15)', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', color: '#8a7a60' }}>{g}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {artist.description && <p style={{ color: '#6a5a40', fontSize: '13px', margin: '0 0 10px', lineHeight: '1.5' }}>{artist.description.length > 80 ? artist.description.slice(0, 80) + '...' : artist.description}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#d4a843', fontSize: '12px' }}>{artist.song_count} {artist.song_count === 1 ? tx.song : tx.songs}</span>
                    <span style={{ color: '#6a5a40', fontSize: '12px' }}>{tx.openArtist}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
