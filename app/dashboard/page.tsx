'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { t, useLang, setLang, type Lang } from '@/lib/i18n'
import { searchGenres, MUSIC_GENRES } from '@/lib/genres'
import { parseYoutube, parseInstagram, type SocialLinksMap } from '@/lib/socialLinks'
import Link from 'next/link'
import Avatar from '@/components/Avatar'
import ActivityList, { type ActivityEntry } from '@/components/ActivityList'
import ProfileMenu from '@/components/ProfileMenu'
import UpgradePrompt from '@/components/UpgradePrompt'
import { getUserPlan } from '@/lib/subscription'

type Artist = {
  id: string; name: string; genre: string; description: string
  song_structure: string; avatar_url: string; song_count?: number
  spotify_id?: string; spotify_verified?: boolean
  spotify_url?: string | null; spotify_image_url?: string | null
  spotify_followers?: number | null; spotify_popularity?: number | null
  spotify_genres?: string[] | null
  social_links?: SocialLinksMap | null
  page_enabled?: boolean
  page_template?: string
  page_slug?: string | null
  page_settings?: any
  favicon_url?: string | null
}
type SpotifyArtist = {
  id: string; name: string; followers: number; genres: string[]
  popularity: number; image: string | null; smallImage: string | null
  spotifyUrl: string | null
}
const DEFAULT_PAGE_SETTINGS = {
  sections: { hero: true, spotify: true, youtube: true, albums: true, songs: true, bio: true, social: true, events: true, newsletter: true },
  accent_color: '#d4a843',
  youtube_videos: [] as string[],
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
  page_enabled: false,
  page_slug: '',
  page_template: 'default',
  page_settings: DEFAULT_PAGE_SETTINGS as any,
  favicon_url: '',
}

/** URL-safe slug from arbitrary text. */
const navLinkStyle: React.CSSProperties = {
  fontSize: '13px',
  textDecoration: 'none',
  padding: '8px 14px',
  display: 'inline-block',
}

function slugify(s: string): string {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
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
  const [faviconUploading, setFaviconUploading] = useState(false)
  const faviconFileRef = useRef<HTMLInputElement | null>(null)

  const uploadArtistFavicon = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setFaviconUploading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    const path = `favicons/${user?.id || 'anon'}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('covers').upload(path, file, { upsert: true, contentType: file.type })
    if (!error) {
      const { data } = supabase.storage.from('covers').getPublicUrl(path)
      setForm((f: any) => ({ ...f, favicon_url: data.publicUrl }))
    } else {
      alert(error.message)
    }
    setFaviconUploading(false)
  }

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

  // Global search across artists + songs
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{
    artists: Artist[]
    songs: { id: string; title: string; status: string; artist_id: string; artists?: { name?: string } | null }[]
  }>({ artists: [], songs: [] })
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef<any>(null)

  // Studio page status — used to decide whether the dashboard link goes to live page or editor.
  const [studioPage, setStudioPage] = useState<{ slug: string | null; enabled: boolean } | null>(null)

  // Profile snapshot — used for showing referral / admin links in header.
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<{ id: string; display_name: string | null; avatar_url: string | null } | null>(null)
  const [planId, setPlanId] = useState<'free' | 'pro'>('free')

  // Activity feed snapshot for the dashboard widget
  const [feedEntries, setFeedEntries] = useState<ActivityEntry[]>([])
  const [feedFollowCount, setFeedFollowCount] = useState(0)

  // Top-streamed songs from this user's catalog (for the widget)
  const [topStreamedSongs, setTopStreamedSongs] = useState<any[]>([])

  // Unread messages count for the nav badge
  const [unreadCount, setUnreadCount] = useState(0)

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
    // Get the user FIRST so we can explicitly scope the artists query to them.
    // Defence in depth: RLS already gates this, but admin/super_admin would otherwise
    // see every user's artists. The dashboard is always "your" artists — admins use
    // the /admin page when they need to see cross-tenant data.
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase.from('artists').select('*, songs(count)').eq('user_id', user.id).order('created_at', { ascending: false })
    if (data) setArtists(data.map((a: any) => ({ ...a, song_count: a.songs?.[0]?.count ?? 0 })))
    // Also load studio page status for the header link.
    if (user) {
      const { data: sp } = await supabase.from('studio_pages').select('slug, enabled').eq('user_id', user.id).maybeSingle()
      if (sp) setStudioPage({ slug: sp.slug, enabled: !!sp.enabled })
      // Fetch role + identity from profile for header avatar + admin link.
      // Defensive: if avatar_url column doesn't exist yet (migration not applied),
      // fall back to a query that only selects guaranteed-existing columns.
      let prof: any = null
      const r1 = await supabase.from('profiles').select('id, role, display_name, avatar_url').eq('id', user.id).maybeSingle()
      if (r1.error && /avatar_url/i.test(r1.error.message || '')) {
        // Column doesn't exist yet — retry without it so the header still renders.
        const r2 = await supabase.from('profiles').select('id, role, display_name').eq('id', user.id).maybeSingle()
        prof = r2.data
      } else {
        prof = r1.data
      }
      if (prof?.role) setUserRole(prof.role as string)
      if (prof) setUserProfile({ id: prof.id, display_name: prof.display_name ?? null, avatar_url: prof.avatar_url ?? null })
      const currentPlan = await getUserPlan(supabase, user.id)
      setPlanId(currentPlan.id)

      // Fetch unread message count for nav badge
      try {
        const { data: parts } = await supabase
          .from('conversation_participants')
          .select('conversation_id, last_read_at')
          .eq('user_id', user.id)
        if (parts && parts.length > 0) {
          const convIds = (parts as any[]).map(p => p.conversation_id)
          const readMap: Record<string, string> = {}
          for (const p of parts as any[]) readMap[p.conversation_id] = p.last_read_at || '1970-01-01T00:00:00Z'
          const { data: msgs } = await supabase
            .from('messages')
            .select('conversation_id, sender_id, created_at')
            .in('conversation_id', convIds)
            .eq('hidden', false)
            .neq('sender_id', user.id)
          let unread = 0
          for (const m of (msgs as any[]) || []) {
            if (new Date(m.created_at) > new Date(readMap[m.conversation_id])) unread++
          }
          setUnreadCount(unread)
        }
      } catch {}

      // Fetch top-streamed of own songs
      try {
        const { data: streamed } = await supabase
          .from('songs')
          .select('id, title, artist_id, internal_play_count, embed_click_count, cover_image_url, spotify_cover_url, artists(name)')
          .eq('user_id', user.id)
          .order('internal_play_count', { ascending: false })
          .order('embed_click_count', { ascending: false })
          .limit(5)
        if (streamed) {
          setTopStreamedSongs((streamed as any[]).filter(s => (s.internal_play_count || 0) > 0 || (s.embed_click_count || 0) > 0))
        }
      } catch {}

      // Fetch recent activity from people the user follows (top 5)
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
      const actorIds = (follows || []).map((f: any) => f.following_id)
      setFeedFollowCount(actorIds.length)
      if (actorIds.length > 0) {
        const { data: feed } = await supabase
          .from('activity_feed')
          .select('id, actor_id, kind, subject_id, subject_type, subject_label, metadata, created_at')
          .in('actor_id', actorIds)
          .eq('visible', true)
          .order('created_at', { ascending: false })
          .limit(5)
        if (feed && feed.length > 0) {
          const uniqueIds = Array.from(new Set((feed as any[]).map(f => f.actor_id)))
          const { data: actors } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url, referral_code')
            .in('id', uniqueIds)
          const actorMap: Record<string, any> = {}
          for (const a of (actors as any[]) || []) actorMap[a.id] = a
          setFeedEntries((feed as any[]).map(f => ({
            ...f,
            actor_name: actorMap[f.actor_id]?.display_name || null,
            actor_avatar: actorMap[f.actor_id]?.avatar_url || null,
            actor_code: actorMap[f.actor_id]?.referral_code || null,
          })))
        }
      }
    }
    setLoading(false)
  }

  // Global search (debounced).
  const runSearch = async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setSearchResults({ artists: [], songs: [] })
      setSearching(false)
      return
    }
    setSearching(true)
    const supabase = createClient()
    const term = `%${q.trim()}%`
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSearching(false); return }
    // Explicit user_id scope — admin/super_admin should not see other users' content
    // in their own dashboard search.
    const [artistsRes, songsRes] = await Promise.all([
      supabase.from('artists').select('*').eq('user_id', user.id).or(`name.ilike.${term},genre.ilike.${term}`).limit(10),
      supabase.from('songs').select('id,title,status,artist_id,artists(name)').eq('user_id', user.id).or(`title.ilike.${term},lyrics_instructions.ilike.${term},spotify_album.ilike.${term}`).limit(20),
    ])
    setSearchResults({
      artists: (artistsRes.data || []) as Artist[],
      songs: (songsRes.data || []) as any,
    })
    setSearching(false)
  }

  const onSearchChange = (val: string) => {
    setSearchQuery(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => runSearch(val), 300)
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

  // Collision-warning state — populated when another user has already verified this Spotify artist
  const [claimCollision, setClaimCollision] = useState<{
    artist_id: string
    artist_name: string
    claimant_name: string
    claimed_at: string
    is_self: boolean
  } | null>(null)
  const [claimCheckLoading, setClaimCheckLoading] = useState(false)

  const confirmSpotifyOwnership = async (confirmed: boolean) => {
    if (confirmed) {
      // Before flipping spotify_verified=true, check whether someone else already owns this Spotify id.
      const spotifyId = form.spotify_id
      if (spotifyId) {
        setClaimCheckLoading(true)
        const supabase = createClient()
        const { data: existing, error } = await supabase.rpc('check_spotify_claim', { spotify_id_to_check: spotifyId })
        setClaimCheckLoading(false)
        if (error) {
          // RPC might not exist yet (migration pending). Proceed without blocking — DB unique
          // index will still catch real duplicates with a clear error on save.
          console.warn('check_spotify_claim RPC failed:', error.message)
        } else if (existing && !existing.is_self) {
          // Block — another user has verified this artist. Show the conflict modal.
          setClaimCollision(existing as any)
          return
        }
      }
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
      page_enabled: artist.page_enabled || false,
      page_slug: artist.page_slug || '',
      page_template: (artist as any).page_template || 'default',
      page_settings: { ...DEFAULT_PAGE_SETTINGS, ...(artist.page_settings || {}), sections: { ...DEFAULT_PAGE_SETTINGS.sections, ...((artist.page_settings as any)?.sections || {}) } },
      favicon_url: artist.favicon_url || '',
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
    // If publishing, the slug becomes required.
    if (form.page_enabled && !(form.page_slug || '').trim()) {
      alert(tx.publicPageSlugRequired)
      return
    }
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const payload: any = {
      ...form,
      genre: selectedGenres.join(', ') || form.genre,
      // Empty string -> null for the slug column (unique constraint allows multiple nulls).
      page_slug: form.page_enabled ? (form.page_slug || '').trim() || null : null,
    }
    let res: { data: any; error: any }
    if (editingArtist) {
      res = await supabase.from('artists').update(payload).eq('id', editingArtist.id).select().single()
      if (res.data) setArtists(artists.map(a => a.id === editingArtist.id ? { ...a, ...res.data } : a))
    } else {
      res = await supabase.from('artists').insert({ ...payload, user_id: user?.id }).select().single()
      if (res.data) setArtists([{ ...res.data, song_count: 0 }, ...artists])
    }
    if (res.error) {
      // Common case: slug already taken (unique violation, code 23505).
      if (res.error.code === '23505' && /page_slug/.test(res.error.message || '')) {
        alert(tx.publicPageSlugTaken)
      } else {
        alert(res.error.message || 'Save failed')
      }
      setSaving(false)
      return
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
    router.push('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)' }}>
      <div className="app-header" data-header="page" style={{ borderBottom: '1px solid rgba(180,140,80,0.2)', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px' }}>🎼</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 'normal', color: '#d4a843', letterSpacing: '2px' }}>SONGCRAFT</h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#6a5a40', letterSpacing: '2px' }}>{tx.dashboard.toUpperCase()}</p>
          </div>
        </div>
        {/* Compact header: main nav + chat button + profile dropdown */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/discover" className="btn-outline" style={navLinkStyle}>🌍 {tx.discoverNavLink}</Link>
          <Link href="/charts" className="btn-outline" style={navLinkStyle}>📈 {tx.chartsNavLink}</Link>
          <Link href="/analytics" className="btn-outline" style={navLinkStyle}>📊 {tx.analyticsNavLink}</Link>
          <button
            onClick={() => { try { window.dispatchEvent(new CustomEvent('songcraft:open-chat')) } catch {} }}
            className="btn-outline"
            style={{ ...navLinkStyle, display: 'inline-flex', alignItems: 'center', gap: 6, position: 'relative', cursor: 'pointer', background: 'transparent' }}
          >
            💬 {tx.messagesNavLink}
            {unreadCount > 0 && (
              <span style={{ background: '#d4a843', color: '#0a0a0f', fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 10, marginLeft: 2 }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          <ProfileMenu
            profile={userProfile}
            role={userRole}
            studio={studioPage}
            unreadCount={unreadCount}
            texts={{
              viewProfile: tx.profileViewMine,
              studioView: tx.studioPageNavView,
              studioSetup: tx.studioPageNavSetup,
              feed: tx.feedNavLink,
              analytics: tx.analyticsNavLink,
              referrals: tx.referralsNavLink,
              settings: tx.settings,
              admin: tx.adminNavLink,
              logout: tx.logout,
              guest: tx.profileGuest,
            }}
          />
        </div>
      </div>

      <div className="page-pad" style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>
        {/* Stats */}
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
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

        {/* Top streamed songs widget */}
        {topStreamedSongs.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <h2 style={{ color: '#d4a843', fontSize: 13, fontWeight: 'normal', letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>
                📈 {tx.dashboardTopStreamed}
              </h2>
              <Link href="/charts" style={{ color: '#8a7a60', fontSize: 12, textDecoration: 'none' }}>
                {tx.dashboardViewAllActivity} →
              </Link>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {topStreamedSongs.map((song, i) => (
                <Link key={song.id} href={`/song/${song.id}`} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderBottom: i < topStreamedSongs.length - 1 ? '1px solid rgba(180,140,80,0.08)' : 'none',
                  textDecoration: 'none',
                  transition: 'background 0.2s',
                }}>
                  <div style={{ width: 22, textAlign: 'center', color: i < 3 ? '#d4a843' : '#5a4a30', fontSize: 14, fontWeight: 700 }}>
                    {i + 1}
                  </div>
                  {(song.cover_image_url || song.spotify_cover_url) && (
                    <img
                      src={song.cover_image_url || song.spotify_cover_url}
                      alt=""
                      style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#e8e0d0', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</div>
                    <div style={{ color: '#8a7a60', fontSize: 11, marginTop: 1 }}>{song.artists?.name}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, color: '#6a5a40', fontSize: 12, flexShrink: 0 }}>
                    {song.internal_play_count > 0 && <span>▶ {song.internal_play_count.toLocaleString()}</span>}
                    {song.embed_click_count > 0 && <span>🔗 {song.embed_click_count.toLocaleString()}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Activity feed widget */}
        {feedEntries.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <h2 style={{ color: '#d4a843', fontSize: 13, fontWeight: 'normal', letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>
                📰 {tx.dashboardActivity}
              </h2>
              <Link href="/feed" style={{ color: '#8a7a60', fontSize: 12, textDecoration: 'none' }}>
                {tx.dashboardViewAllActivity} →
              </Link>
            </div>
            <ActivityList entries={feedEntries} lang={lang} compact />
          </div>
        )}
        {feedEntries.length === 0 && feedFollowCount === 0 && userProfile && (
          <div style={{ marginBottom: 24 }}>
            <div className="card" style={{ textAlign: 'center', padding: '20px 18px', borderColor: 'rgba(212,168,67,0.15)' }}>
              <div style={{ fontSize: 26, marginBottom: 6 }}>🌍</div>
              <p style={{ color: '#a09080', fontSize: 13, margin: '0 0 10px' }}>{tx.dashboardEmptyFeed}</p>
              <Link href="/discover" style={{
                display: 'inline-block',
                padding: '8px 16px',
                background: 'rgba(212,168,67,0.12)',
                border: '1px solid rgba(212,168,67,0.4)',
                color: '#d4a843',
                textDecoration: 'none',
                borderRadius: 4,
                fontSize: 13,
              }}>🌍 {tx.dashboardDiscoverCreators}</Link>
            </div>
          </div>
        )}

        {/* Global search */}
        <div style={{ marginBottom: 24, position: 'relative' }}>
          <input
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={tx.searchPlaceholder}
            style={{ paddingLeft: 40, fontSize: 14 }}
          />
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6a5a40', fontSize: 16, pointerEvents: 'none' }}>🔍</span>
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setSearchResults({ artists: [], songs: [] }) }}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6a5a40', cursor: 'pointer', fontSize: 18, padding: 4 }}
              title={tx.searchClear}
            >×</button>
          )}
        </div>

        {/* Search results — replaces the artist grid when active */}
        {searchQuery.trim().length >= 2 ? (
          <div style={{ marginBottom: 28 }}>
            {searching && <p style={{ color: '#6a5a40', fontSize: 13 }}>{tx.searching}</p>}
            {!searching && searchResults.artists.length === 0 && searchResults.songs.length === 0 && (
              <p style={{ color: '#6a5a40', fontSize: 13 }}>{tx.searchNoResults}</p>
            )}
            {searchResults.artists.length > 0 && (
              <div style={{ marginBottom: 22 }}>
                <p style={{ color: '#8a7a60', fontSize: 11, letterSpacing: 1, marginBottom: 10 }}>
                  {tx.searchArtistsLabel} ({searchResults.artists.length})
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                  {searchResults.artists.map(a => (
                    <Link key={a.id} href={`/artist/${a.id}`} style={{ textDecoration: 'none' }}>
                      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, cursor: 'pointer' }}>
                        {a.avatar_url ? (
                          <img src={a.avatar_url} alt={a.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(212,168,67,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🎤</div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: '#e8e0d0', fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                          {a.genre && <div style={{ color: '#6a5a40', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.genre}</div>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {searchResults.songs.length > 0 && (
              <div>
                <p style={{ color: '#8a7a60', fontSize: 11, letterSpacing: 1, marginBottom: 10 }}>
                  {tx.searchSongsLabel} ({searchResults.songs.length})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {searchResults.songs.map(s => (
                    <Link key={s.id} href={`/song/${s.id}`} style={{ textDecoration: 'none' }}>
                      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', cursor: 'pointer', gap: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: '#e8e0d0', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                          {s.artists?.name && (
                            <div style={{ color: '#6a5a40', fontSize: 11 }}>{s.artists.name}</div>
                          )}
                        </div>
                        <span style={{ fontSize: 10, letterSpacing: 1, color: '#8a7a60', border: '1px solid rgba(180,140,80,0.2)', padding: '2px 8px', borderRadius: 12, flexShrink: 0 }}>
                          {{ draft: tx.draft, in_progress: tx.inProgress, complete: tx.complete, released: tx.released }[s.status] || s.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#d4a843', fontWeight: 'normal', fontSize: '18px' }}>{tx.yourArtists}</h2>
          <button className="btn-gold" onClick={openCreate}>{tx.newArtist}</button>
        </div>

        {/* Spotify claim collision modal */}
        {claimCollision && (
          <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="card" style={{ width: '100%', maxWidth: 520, borderColor: 'rgba(192,80,80,0.5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 36 }}>⚠️</div>
                <h3 style={{ margin: 0, color: '#e07070', fontWeight: 'normal', fontSize: 18 }}>
                  {tx.spotifyClaimConflictTitle}
                </h3>
              </div>
              <p style={{ color: '#c8c0b0', fontSize: 14, lineHeight: 1.5 }}>
                {tx.spotifyClaimConflictBody.replace('{name}', claimCollision.artist_name).replace('{claimant}', claimCollision.claimant_name)}
              </p>
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(180,140,80,0.15)',
                borderRadius: 6,
                padding: 12,
                margin: '14px 0',
                fontSize: 13,
                color: '#a09080',
              }}>
                <div><strong style={{ color: '#e8e0d0' }}>{tx.spotifyClaimArtist}:</strong> {claimCollision.artist_name}</div>
                <div><strong style={{ color: '#e8e0d0' }}>{tx.spotifyClaimedBy}:</strong> {claimCollision.claimant_name}</div>
                <div><strong style={{ color: '#e8e0d0' }}>{tx.spotifyClaimedAt}:</strong> {new Date(claimCollision.claimed_at).toLocaleDateString()}</div>
              </div>
              <p style={{ color: '#8a7a60', fontSize: 12, lineHeight: 1.4 }}>
                {tx.spotifyClaimTransferHint}
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                <button className="btn-outline" onClick={() => setClaimCollision(null)}>
                  {tx.close}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Artist form modal */}
        {showForm && (
          <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
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
                {!editingArtist && planId === 'free' && artists.length >= 1 && (
                  <UpgradePrompt compact title={tx.upgradeArtistLimitTitle} description={tx.upgradeArtistLimitDesc} />
                )}

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
                          <button onClick={() => confirmSpotifyOwnership(true)} disabled={claimCheckLoading} style={{ padding: '8px 16px', background: 'rgba(30,215,96,0.15)', border: '1px solid rgba(30,215,96,0.4)', color: '#1ed760', borderRadius: '4px', cursor: claimCheckLoading ? 'wait' : 'pointer', fontSize: '13px', opacity: claimCheckLoading ? 0.6 : 1 }}>
                            {claimCheckLoading ? '⏳ ' + (lang === 'no' ? 'Sjekker...' : 'Checking...') : '✓ ' + (lang === 'no' ? 'Ja, dette er artisten min' : 'Yes, this is my artist')}
                          </button>
                          <button onClick={() => confirmSpotifyOwnership(false)} disabled={claimCheckLoading} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(180,140,80,0.2)', color: '#6a5a40', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
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

              {/* Public artist page */}
              <div style={{ marginBottom: 20, padding: 14, borderRadius: 6, background: 'rgba(212,168,67,0.04)', border: '1px solid rgba(212,168,67,0.2)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: form.page_enabled ? 14 : 0 }}>
                  <input type="checkbox" checked={!!form.page_enabled}
                    onChange={e => {
                      const enabled = e.target.checked
                      setForm((f: any) => ({
                        ...f,
                        page_enabled: enabled,
                        // Auto-suggest a slug from the artist name when first enabled.
                        page_slug: enabled && !f.page_slug ? slugify(f.name || '') : f.page_slug,
                      }))
                    }}
                    style={{ width: 16, height: 16, accentColor: '#d4a843', cursor: 'pointer' }} />
                  <div>
                    <span style={{ color: form.page_enabled ? '#d4a843' : '#8a7a60', fontSize: 13, fontWeight: 500 }}>
                      🌐 {tx.publicPageLabel}
                    </span>
                    <span style={{ color: '#5a4a30', fontSize: 12, marginLeft: 8 }}>
                      — {tx.publicPageHint}
                    </span>
                  </div>
                </label>

                {form.page_enabled && (
                  <>
                    {/* Template picker */}
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', color: '#8a7a60', fontSize: 10, letterSpacing: 1, marginBottom: 6 }}>
                        {tx.publicPageTemplate}
                      </label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {[
                          { key: 'default',   label: tx.templateDefault,   emoji: '🪟', hint: tx.templateDefaultHint },
                          { key: 'minimal',   label: tx.templateMinimal,   emoji: '◇',  hint: tx.templateMinimalHint },
                          { key: 'cinematic', label: tx.templateCinematic, emoji: '🎬', hint: tx.templateCinematicHint },
                        ].map(t => {
                          const active = (form.page_template || 'default') === t.key
                          return (
                            <button
                              key={t.key}
                              type="button"
                              onClick={() => setForm({ ...form, page_template: t.key })}
                              style={{
                                padding: '8px 12px',
                                borderRadius: 6,
                                border: active ? '1px solid #d4a843' : '1px solid rgba(180,140,80,0.2)',
                                background: active ? 'rgba(212,168,67,0.12)' : 'rgba(255,255,255,0.02)',
                                color: active ? '#d4a843' : '#a09080',
                                cursor: 'pointer',
                                fontSize: 12,
                                textAlign: 'left',
                                minWidth: 130,
                              }}
                            >
                              <div style={{ fontSize: 16, marginBottom: 2 }}>{t.emoji} {t.label}</div>
                              <div style={{ fontSize: 10, color: active ? '#d4a843' : '#6a5a40', opacity: 0.8 }}>{t.hint}</div>
                            </button>
                          )
                        })}
                      </div>
                      {planId === 'free' && (
                        <UpgradePrompt compact title={tx.upgradeSoftTitle} description={tx.billingFeatureAdvancedTemplates} />
                      )}
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', color: '#8a7a60', fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>{tx.publicPageSlug}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#5a4a30', fontSize: 12 }}>/p/</span>
                        <input
                          value={form.page_slug}
                          onChange={e => setForm({ ...form, page_slug: slugify(e.target.value) })}
                          placeholder={slugify(form.name) || 'mitt-artistnavn'}
                          style={{ flex: 1, padding: '6px 10px', fontSize: 13 }}
                        />
                      </div>
                      {form.page_slug && (
                        <p style={{ color: '#6a5a40', fontSize: 11, margin: '4px 0 0' }}>
                          {tx.publicPagePreview}{' '}
                          <a href={`/p/${form.page_slug}`} target="_blank" rel="noopener noreferrer" style={{ color: '#d4a843' }}>
                            /p/{form.page_slug} ↗
                          </a>
                        </p>
                      )}
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', color: '#8a7a60', fontSize: 10, letterSpacing: 1, marginBottom: 6 }}>{tx.publicPageSections}</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {([
                          ['hero', tx.publicSectionHero],
                          ['social', tx.publicSectionSocial],
                          ['bio', tx.publicSectionBio],
                          ['spotify', tx.publicSectionSpotify],
                          ['youtube', tx.publicSectionYoutube],
                          ['albums', tx.publicSectionAlbums],
                          ['songs', tx.publicSectionSongs],
                          ['events', tx.publicSectionEvents],
                          ['newsletter', tx.publicSectionNewsletter],
                        ] as const).map(([key, label]) => {
                          const active = form.page_settings?.sections?.[key] !== false
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() =>
                                setForm((f: any) => ({
                                  ...f,
                                  page_settings: {
                                    ...f.page_settings,
                                    sections: { ...(f.page_settings?.sections || {}), [key]: !active },
                                  },
                                }))
                              }
                              style={{
                                padding: '4px 12px', borderRadius: 14, fontSize: 11, cursor: 'pointer',
                                border: `1px solid ${active ? 'rgba(212,168,67,0.5)' : 'rgba(180,140,80,0.2)'}`,
                                background: active ? 'rgba(212,168,67,0.15)' : 'transparent',
                                color: active ? '#d4a843' : '#5a4a30',
                              }}
                            >
                              {active ? '✓' : '○'} {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', color: '#8a7a60', fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>{tx.publicPageYoutubeVideos}</label>
                      <textarea
                        value={(form.page_settings?.youtube_videos || []).join('\n')}
                        onChange={e =>
                          setForm((f: any) => ({
                            ...f,
                            page_settings: {
                              ...f.page_settings,
                              youtube_videos: e.target.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean),
                            },
                          }))
                        }
                        placeholder={tx.publicPageYoutubeVideosPlaceholder}
                        rows={3}
                        style={{ fontSize: 12 }}
                      />
                      <p style={{ color: '#5a4a30', fontSize: 11, margin: '4px 0 0' }}>{tx.publicPageYoutubeVideosHint}</p>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <label style={{ display: 'block', color: '#8a7a60', fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>{tx.publicPageFavicon}</label>
                      <input
                        value={form.favicon_url || ''}
                        onChange={e => setForm({ ...form, favicon_url: e.target.value })}
                        placeholder="https://..."
                        style={{ fontSize: 12 }}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          ref={faviconFileRef}
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml,image/x-icon,image/vnd.microsoft.icon"
                          style={{ display: 'none' }}
                          onChange={e => { const f = e.target.files?.[0]; if (f) uploadArtistFavicon(f); if (e.target) e.target.value = '' }}
                        />
                        <button
                          type="button"
                          onClick={() => faviconFileRef.current?.click()}
                          disabled={faviconUploading}
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(180,140,80,0.25)', color: '#8a7a60', padding: '5px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                        >
                          {faviconUploading ? tx.saving : '📁 ' + tx.publicPageFaviconUpload}
                        </button>
                        {form.favicon_url && (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={form.favicon_url} alt="" style={{ width: 16, height: 16, objectFit: 'cover', borderRadius: 2, border: '1px solid rgba(180,140,80,0.3)' }} title="16×16" />
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={form.favicon_url} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, border: '1px solid rgba(180,140,80,0.3)' }} title="32×32" />
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, favicon_url: '' })}
                              style={{ background: 'none', border: '1px solid rgba(200,80,80,0.25)', color: '#c05050', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}
                            >
                              {tx.publicPageFaviconRemove}
                            </button>
                          </>
                        )}
                      </div>
                      <p style={{ color: '#5a4a30', fontSize: 11, margin: '4px 0 0' }}>{tx.publicPageFaviconHint}</p>
                    </div>
                  </>
                )}
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
