'use client'
import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { t, useLang, type Lang } from '@/lib/i18n'
import { type AIProvider, getStoredProvider, setStoredProvider } from '@/lib/aiProvider'
import AIProviderPicker from '@/components/AIProviderPicker'
import ZoomableImage from '@/components/ZoomableImage'
import Link from 'next/link'
import QRCodeCard from '@/components/QRCodeCard'
import ArtistWorkspaceAnalytics from '@/components/ArtistWorkspaceAnalytics'
import WorkspaceEmptyState from '@/components/WorkspaceEmptyState'
import UpgradePrompt from '@/components/UpgradePrompt'
import FanHubPanel from '@/components/FanHubPanel'
import MobileQuickActions from '@/components/MobileQuickActions'
import { getUserPlan } from '@/lib/subscription'
import { AI_OUTPUT_LANGUAGES, aiOutputLanguageDirective, aiOutputLanguageName, normalizeAIOutputLang, type AIOutputLang } from '@/lib/aiOutputLanguage'
import EpkSongSelector from '@/components/EpkSongSelector'
import EpkSelectedSongsList from '@/components/EpkSelectedSongsList'
import { resolveEpkSongsFromCatalog } from '@/lib/epkSongs'
import { clientPublicUrl } from '@/lib/appUrl'
import ArtistWorkspaceNav from '@/components/ArtistWorkspaceNav'
import ArtistWorkspaceOverview from '@/components/ArtistWorkspaceOverview'
import ArtistCampaignsSummary from '@/components/ArtistCampaignsSummary'
import ArtistWorkspaceGrowth from '@/components/ArtistWorkspaceGrowth'
import ArtistFeaturedReleasePicker from '@/components/ArtistFeaturedReleasePicker'
import ArtistSettingsPanel from '@/components/ArtistSettingsPanel'
import SongPublicPageActions from '@/components/SongPublicPageActions'
import { tabFromHash, type ArtistWorkspaceTab } from '@/lib/artistWorkspaceTabs'

import type { SocialLinksMap } from '@/lib/socialLinks'

type Song = {
  id: string; title: string; status: string; created_at: string; lyrics_instructions: string
  backstory?: string | null
  publish_content?: any
  album_id?: string | null
  position?: number | null
  cover_image_url?: string | null
  spotify_track_id?: string | null
  spotify_url?: string | null
  spotify_popularity?: number | null
  spotify_release_date?: string | null
  spotify_album?: string | null
  spotify_cover_url?: string | null
  suno_url?: string | null
  media_links?: { platform: string; url: string; label?: string }[] | null
  featured_on_studio_page?: boolean
  public_hidden?: boolean | null
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
  page_enabled?: boolean
  page_slug?: string | null
  page_settings?: any
  admin_hidden?: boolean | null
}

type EpkContent = {
  short_bio: string
  long_bio: string
  release_highlight: string
  tagline: string
  contact_info: string
  social_links: Record<string, string>
  selected_song_ids: string[]
  public_enabled: boolean
}

type Subscriber = {
  id: string
  email: string
  name?: string | null
  source_page?: string | null
  source?: string | null
  favorite_song?: string | null
  confirmed: boolean
  created_at: string
}

type ArtistEvent = {
  id: string
  artist_id: string
  user_id: string
  title: string
  date: string
  venue?: string | null
  city?: string | null
  country?: string | null
  ticket_url?: string | null
  status: 'scheduled' | 'sold_out' | 'cancelled' | 'past' | 'hidden'
}

type AnalyticsEvent = {
  id: string
  artist_id?: string | null
  song_id?: string | null
  event_type: 'artist_page_view' | 'song_page_view' | 'newsletter_signup' | 'embed_view' | 'embed_click'
  source?: string | null
  referrer?: string | null
  created_at: string
  metadata?: any
  songs?: { title?: string | null } | null
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
  const [lang, setLangState] = useState<Lang>('en')
  const [aiOutputLang, setAiOutputLang] = useState<AIOutputLang>('en')
  const [artist, setArtist] = useState<Artist | null>(null)
  const [planId, setPlanId] = useState<'free' | 'pro'>('free')
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
  const [albumForm, setAlbumForm] = useState<{ title: string; description: string; cover_url: string; release_date: string; cover_prompt: string }>(
    { title: '', description: '', cover_url: '', release_date: '', cover_prompt: '' }
  )
  const [savingAlbum, setSavingAlbum] = useState(false)
  const [albumPromptLoading, setAlbumPromptLoading] = useState(false)
  const [albumImageLoading, setAlbumImageLoading] = useState(false)
  const [albumImageError, setAlbumImageError] = useState<string | null>(null)
  const [albumCoverUploading, setAlbumCoverUploading] = useState(false)
  const albumCoverFileRef = useRef<HTMLInputElement | null>(null)
  // Spotify album fetch (within album modal)
  const [albumSpotifyUrl, setAlbumSpotifyUrl] = useState('')
  const [albumSpotifyLoading, setAlbumSpotifyLoading] = useState(false)
  const [albumSpotifyError, setAlbumSpotifyError] = useState<string | null>(null)

  // Spotify import
  const [showImport, setShowImport] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [spotifyTracks, setSpotifyTracks] = useState<SpotifyTrack[]>([])
  const [importError, setImportError] = useState<string | null>(null)
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set())

  // Fan growth
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [events, setEvents] = useState<ArtistEvent[]>([])
  const [showEventForm, setShowEventForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ArtistEvent | null>(null)
  const [savingEvent, setSavingEvent] = useState(false)
  const [eventForm, setEventForm] = useState({
    title: '',
    date: '',
    venue: '',
    city: '',
    country: '',
    ticket_url: '',
    status: 'scheduled' as ArtistEvent['status'],
  })
  const [analyticsRange, setAnalyticsRange] = useState<'7d' | '30d' | 'all'>('30d')
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEvent[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [epkGenerating, setEpkGenerating] = useState(false)

  // Spotify import via URL (single track)
  const [urlInput, setUrlInput] = useState('')
  const [urlLoading, setUrlLoading] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [urlPreview, setUrlPreview] = useState<(SpotifyTrack & { artists?: { id: string; name: string }[] }) | null>(null)
  const [urlImporting, setUrlImporting] = useState(false)

  // Filtering + search for the song list
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [albumFilter, setAlbumFilter] = useState<string>('all')
  const [songSearch, setSongSearch] = useState('')

  // Drag & drop reorder
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  useEffect(() => { setLangState(useLang()); setAiProvider(getStoredProvider()); fetchData() }, [artistId])
  useEffect(() => {
    if (artist?.id) fetchAnalytics()
  }, [artist?.id, analyticsRange])
  const tx = t[lang]

  const defaultEpk: EpkContent = {
    short_bio: '',
    long_bio: '',
    release_highlight: '',
    tagline: '',
    contact_info: '',
    social_links: {},
    selected_song_ids: [],
    public_enabled: false,
  }

  const epk: EpkContent = {
    ...defaultEpk,
    ...((artist?.page_settings || {}).epk || {}),
    social_links: {
      ...Object.fromEntries(
        Object.entries(artist?.social_links || {})
          .map(([key, value]: any) => [key, value?.url || ''])
          .filter(([, value]) => !!value)
      ),
      ...(((artist?.page_settings || {}).epk || {}).social_links || {}),
    },
    selected_song_ids: Array.isArray((artist?.page_settings || {}).epk?.selected_song_ids)
      ? (artist?.page_settings || {}).epk.selected_song_ids
      : songs.slice(0, 3).map(s => s.id),
  }
  const newsletterSignupEvents = analyticsEvents.filter(e => e.event_type === 'newsletter_signup')
  const newsletterSources = Array.from(
    newsletterSignupEvents.reduce((map, event) => {
      const source = event.source || 'unknown'
      map.set(source, (map.get(source) || 0) + 1)
      return map
    }, new Map<string, number>())
  ).sort((a, b) => b[1] - a[1])

  const fetchData = async () => {
    const supabase = createClient()
    // Explicit owner check — defence in depth on top of RLS.
    // Admins viewing another user's artist via direct URL should be blocked here.
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const currentPlan = await getUserPlan(supabase, user.id)
    setPlanId(currentPlan.id)
    const { data: profilePrefs } = await supabase.from('profiles').select('preferred_ai_output_lang, preferred_song_lang').eq('id', user.id).maybeSingle()
    setAiOutputLang(normalizeAIOutputLang((profilePrefs as any)?.preferred_ai_output_lang || ((profilePrefs as any)?.preferred_song_lang === 'no' ? 'no' : 'en')))
    const { data: a } = await supabase
      .from('artists')
      .select('*')
      .eq('id', artistId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!a) {
      // Not your artist (or doesn't exist) — bounce to dashboard.
      setLoading(false)
      router.push('/dashboard')
      return
    }
    setArtist(a)
    // Order by manual position first (NULLS LAST), then by creation date as fallback.
    const { data: s } = await supabase
      .from('songs')
      .select('*')
      .eq('artist_id', artistId)
      .order('position', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
    if (s) setSongs(s)
    const { data: al } = await supabase.from('albums').select('*').eq('artist_id', artistId).order('release_date', { ascending: false, nullsFirst: false })
    if (al) setAlbums(al)
    const { data: subs } = await supabase
      .from('newsletter_subscribers')
      .select('id, email, name, source_page, source, favorite_song, confirmed, created_at')
      .eq('user_id', user.id)
      .eq('artist_id', artistId)
      .order('created_at', { ascending: false })
    if (subs) setSubscribers(subs as Subscriber[])
    const { data: ev } = await supabase
      .from('artist_events')
      .select('*')
      .eq('user_id', user.id)
      .eq('artist_id', artistId)
      .order('date', { ascending: true })
    if (ev) setEvents(ev as ArtistEvent[])
    setLoading(false)
  }

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setAnalyticsLoading(false); return }

    let query = supabase
      .from('analytics_events')
      .select('id, artist_id, song_id, event_type, source, referrer, created_at, metadata, songs(title)')
      .eq('artist_id', artistId)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (analyticsRange !== 'all') {
      const days = analyticsRange === '7d' ? 7 : 30
      query = query.gte('created_at', new Date(Date.now() - days * 86400000).toISOString())
    }

    const { data, error } = await query
    if (!error && data) setAnalyticsEvents(data as AnalyticsEvent[])
    setAnalyticsLoading(false)
  }

  // Albums CRUD
  const openAlbumCreate = () => {
    setEditingAlbum(null)
    setAlbumForm({ title: '', description: '', cover_url: '', release_date: '', cover_prompt: '' })
    setAlbumImageError(null)
    setAlbumSpotifyUrl(''); setAlbumSpotifyError(null)
    setShowAlbumForm(true)
  }
  const openAlbumEdit = (al: Album) => {
    setEditingAlbum(al)
    setAlbumForm({
      title: al.title || '',
      description: al.description || '',
      cover_url: al.cover_url || '',
      release_date: al.release_date || '',
      cover_prompt: '',
    })
    setAlbumImageError(null)
    setAlbumSpotifyUrl(''); setAlbumSpotifyError(null)
    setShowAlbumForm(true)
  }

  // Generate AI cover prompt for the album (using current AI provider).
  const generateAlbumCoverPrompt = async () => {
    if (!albumForm.title.trim()) return
    setAlbumPromptLoading(true)
    try {
      const albumSongs = songs.filter(s => editingAlbum && s.album_id === editingAlbum.id)
      const songTitles = albumSongs.length ? albumSongs.map(s => '- ' + s.title).join('\n') : ''
      const userContent = [
        `Album title: ${albumForm.title}`,
        artist?.genre ? `Genre: ${artist.genre}` : '',
        artist?.description ? `Artist description: ${artist.description}` : '',
        albumForm.description ? `Album description: ${albumForm.description}` : '',
        songTitles ? `Songs in this album:\n${songTitles}` : '',
      ].filter(Boolean).join('\n\n')

      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          provider: aiProvider,
          system: `${aiOutputLanguageDirective(aiOutputLang)}\nYou are an expert in AI image generation (Midjourney, DALL-E, Stable Diffusion). Create a detailed ALBUM cover image prompt for the given album. Include subject, style, colors, mood, lighting, composition. Format: Subject → Style → Colors → Mood → Technical. Album covers are 1:1 square. Max 150 words.`,
          messages: [{ role: 'user', content: userContent }],
        }),
      })
      const data = await res.json()
      if (data.text) setAlbumForm(f => ({ ...f, cover_prompt: data.text }))
    } catch (e: any) {
      setAlbumImageError(e?.message || 'Prompt generation failed')
    }
    setAlbumPromptLoading(false)
  }

  // Upload an image file from disk to Supabase Storage (covers bucket) and set cover_url.
  const uploadAlbumCoverFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setAlbumImageError(lang === 'no' ? 'Filen er ikke et bilde' : 'File is not an image')
      return
    }
    setAlbumCoverUploading(true)
    setAlbumImageError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const ext = (file.name.split('.').pop() || 'png').toLowerCase()
      const path = `albums/${user?.id || 'anon'}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('covers').upload(path, file, {
        upsert: true,
        contentType: file.type,
      })
      if (upErr) {
        setAlbumImageError(upErr.message)
      } else {
        const { data: urlData } = supabase.storage.from('covers').getPublicUrl(path)
        setAlbumForm(f => ({ ...f, cover_url: urlData.publicUrl }))
      }
    } catch (e: any) {
      setAlbumImageError(e?.message || 'Upload failed')
    }
    setAlbumCoverUploading(false)
  }

  // Fetch a Spotify album by URL and prefill cover/title/release_date in the album form.
  const fetchSpotifyAlbum = async () => {
    if (!albumSpotifyUrl.trim()) return
    setAlbumSpotifyLoading(true)
    setAlbumSpotifyError(null)
    try {
      const res = await fetch(`/api/spotify/album-by-url?url=${encodeURIComponent(albumSpotifyUrl.trim())}`)
      const data = await res.json()
      if (data.error || !data.album) {
        setAlbumSpotifyError(data.error || 'No album returned')
      } else {
        const a = data.album
        setAlbumForm(f => ({
          ...f,
          title: a.title || f.title,
          cover_url: a.coverUrl || f.cover_url,
          release_date: a.releaseDate ? (
            /^\d{4}-\d{2}-\d{2}$/.test(a.releaseDate) ? a.releaseDate :
            /^\d{4}-\d{2}$/.test(a.releaseDate) ? a.releaseDate + '-01' :
            /^\d{4}$/.test(a.releaseDate) ? a.releaseDate + '-01-01' :
            f.release_date
          ) : f.release_date,
        }))
        setAlbumSpotifyUrl('')
      }
    } catch (e: any) {
      setAlbumSpotifyError(e?.message || 'Failed to fetch')
    }
    setAlbumSpotifyLoading(false)
  }

  // Generate album cover image from current prompt and upload to Supabase Storage.
  const generateAlbumCoverImage = async () => {
    if (!albumForm.cover_prompt.trim()) return
    setAlbumImageLoading(true)
    setAlbumImageError(null)
    try {
      const res = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: albumForm.cover_prompt, size: '1024x1024', quality: 'medium' }),
      })
      const data = await res.json()
      if (data.error) {
        setAlbumImageError(data.error)
        setAlbumImageLoading(false)
        return
      }
      const b64: string = data.b64
      const mime: string = data.mime || 'image/png'
      const binStr = atob(b64)
      const bytes = new Uint8Array(binStr.length)
      for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i)
      const blob = new Blob([bytes], { type: mime })
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const path = `albums/${user?.id || 'anon'}/${Date.now()}.png`
      const { error: upErr } = await supabase.storage.from('covers').upload(path, blob, { upsert: true, contentType: mime })
      if (upErr) {
        setAlbumImageError(upErr.message)
        setAlbumImageLoading(false)
        return
      }
      const { data: urlData } = supabase.storage.from('covers').getPublicUrl(path)
      setAlbumForm(f => ({ ...f, cover_url: urlData.publicUrl }))
    } catch (e: any) {
      setAlbumImageError(e?.message || 'Image generation failed')
    }
    setAlbumImageLoading(false)
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

  const openEventCreate = () => {
    setEditingEvent(null)
    setEventForm({ title: '', date: '', venue: '', city: '', country: '', ticket_url: '', status: 'scheduled' })
    setShowEventForm(true)
  }

  const openEventEdit = (event: ArtistEvent) => {
    setEditingEvent(event)
    setEventForm({
      title: event.title || '',
      date: event.date || '',
      venue: event.venue || '',
      city: event.city || '',
      country: event.country || '',
      ticket_url: event.ticket_url || '',
      status: event.status || 'scheduled',
    })
    setShowEventForm(true)
  }

  const saveEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.date) return
    setSavingEvent(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSavingEvent(false); return }
    const payload = {
      artist_id: artistId,
      user_id: user.id,
      title: eventForm.title.trim(),
      date: eventForm.date,
      venue: eventForm.venue.trim() || null,
      city: eventForm.city.trim() || null,
      country: eventForm.country.trim() || null,
      ticket_url: eventForm.ticket_url.trim() || null,
      status: eventForm.status,
    }
    if (editingEvent) {
      const { data, error } = await supabase
        .from('artist_events')
        .update(payload)
        .eq('id', editingEvent.id)
        .eq('user_id', user.id)
        .select()
        .single()
      if (error) alert(error.message)
      if (data) setEvents(events.map(e => e.id === editingEvent.id ? data as ArtistEvent : e))
    } else {
      const { data, error } = await supabase
        .from('artist_events')
        .insert(payload)
        .select()
        .single()
      if (error) alert(error.message)
      if (data) setEvents([...events, data as ArtistEvent].sort((a, b) => a.date.localeCompare(b.date)))
    }
    setShowEventForm(false)
    setSavingEvent(false)
  }

  const deleteEvent = async (event: ArtistEvent) => {
    if (!confirm(tx.eventDeleteConfirm)) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase
      .from('artist_events')
      .delete()
      .eq('id', event.id)
      .eq('user_id', user.id)
    if (error) alert(error.message)
    else {
      setEvents(events.filter(e => e.id !== event.id))
      setShowEventForm(false)
    }
  }

  // Toggle whether a song is featured on the user's studio page (mini playlist under the artist).
  const toggleFeaturedOnStudio = async (songId: string, next: boolean) => {
    // Optimistic update
    setSongs(songs.map(s => s.id === songId ? { ...s, featured_on_studio_page: next } : s))
    const supabase = createClient()
    const { error } = await supabase.from('songs').update({ featured_on_studio_page: next }).eq('id', songId)
    if (error) {
      // Revert on failure
      setSongs(songs.map(s => s.id === songId ? { ...s, featured_on_studio_page: !next } : s))
      alert(error.message)
    }
  }

  // Apply filters + search to get the visible song list. Reorder operates on UNFILTERED list,
  // so we look up indices via song id.
  const visibleSongs = songs.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    if (albumFilter === 'none' && s.album_id) return false
    if (albumFilter !== 'all' && albumFilter !== 'none' && s.album_id !== albumFilter) return false
    if (songSearch.trim()) {
      const q = songSearch.toLowerCase()
      const hay = `${s.title} ${s.lyrics_instructions || ''} ${s.spotify_album || ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  const publicPageViews = analyticsEvents.filter(e => e.event_type === 'artist_page_view' || e.event_type === 'song_page_view')
  const newsletterConversions = analyticsEvents.filter(e => e.event_type === 'newsletter_signup').length

  // Reorder: persist new positions to Supabase, optimistically update local state.
  const persistOrder = async (ordered: Song[]) => {
    setSongs(ordered)
    const supabase = createClient()
    // Update each song's position. Renumber from 1.
    await Promise.all(
      ordered.map((s, i) => supabase.from('songs').update({ position: i + 1 }).eq('id', s.id))
    )
  }

  const moveSong = (songId: string, dir: -1 | 1) => {
    const idx = songs.findIndex(s => s.id === songId)
    if (idx < 0) return
    const target = idx + dir
    if (target < 0 || target >= songs.length) return
    const next = [...songs]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    persistOrder(next)
  }

  const onDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIndex !== index) setDragOverIndex(index)
  }
  const onDragLeave = () => setDragOverIndex(null)
  const onDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null); setDragOverIndex(null); return
    }
    const next = [...songs]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(dropIndex, 0, moved)
    persistOrder(next)
    setDragIndex(null); setDragOverIndex(null)
  }
  const onDragEnd = () => { setDragIndex(null); setDragOverIndex(null) }

  const buildArtistContext = () => {
    if (!artist || !useProfile) return ''
    const parts = []
    if (artist.name) parts.push(`Artist: ${artist.name}`)
    if (artist.genre) parts.push(`Genre: ${artist.genre}`)
    if (artist.description) parts.push(`Description: ${artist.description}`)
    if (artist.song_structure) parts.push(`Song structure/profile: ${artist.song_structure}`)
    return parts.join('\n')
  }

  const saveEpk = async (updates: Partial<EpkContent>) => {
    if (!artist) return
    const nextEpk = { ...epk, ...updates }
    const nextSettings = { ...(artist.page_settings || {}), epk: nextEpk }
    setArtist({ ...artist, page_settings: nextSettings })
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from('artists')
      .update({ page_settings: nextSettings })
      .eq('id', artist.id)
      .eq('user_id', user.id)
  }

  const copyEpk = (value: string) => navigator.clipboard.writeText(value)

  const copyFullEpk = () => {
    const selectedSongs = songs.filter(s => epk.selected_song_ids.includes(s.id))
    const social = Object.entries(epk.social_links || {})
      .filter(([, url]) => !!url)
      .map(([platform, url]) => `${platform}: ${url}`)
      .join('\n')
    const text = [
      `${artist?.name || ''}`,
      epk.tagline,
      `${tx.epkShortBio}\n${epk.short_bio}`,
      `${tx.epkLongBio}\n${epk.long_bio}`,
      `${tx.epkReleaseHighlight}\n${epk.release_highlight}`,
      selectedSongs.length ? `${tx.epkSelectedSongs}\n${selectedSongs.map(s => `- ${s.title}`).join('\n')}` : '',
      epk.contact_info ? `${tx.epkContactInfo}\n${epk.contact_info}` : '',
      social ? `${tx.epkSocialLinks}\n${social}` : '',
      artist?.page_slug ? `${tx.publicPage}\n${window.location.origin}/p/${artist.page_slug}` : '',
    ].filter(Boolean).join('\n\n')
    copyEpk(text)
  }

  const updateEpkSocialLink = (platform: string, url: string) => {
    saveEpk({ social_links: { ...(epk.social_links || {}), [platform]: url } })
  }

  const toggleEpkSong = (songId: string, checked: boolean) => {
    let next = [...(epk.selected_song_ids || [])]
    if (checked) {
      if (!next.includes(songId)) next.push(songId)
    } else {
      next = next.filter(id => id !== songId)
    }
    saveEpk({ selected_song_ids: next })
  }

  const clearEpkSelectedSongs = () => saveEpk({ selected_song_ids: [] })

  const epkPreviewSongs = useMemo(
    () => resolveEpkSongsFromCatalog(songs, epk.selected_song_ids || [], 4),
    [songs, epk.selected_song_ids]
  )

  const [workspaceTab, setWorkspaceTab] = useState<ArtistWorkspaceTab>('overview')

  useEffect(() => {
    document.body.classList.add('artist-workspace-page')
    const fromHash = tabFromHash(window.location.hash)
    if (fromHash) setWorkspaceTab(fromHash)
    return () => document.body.classList.remove('artist-workspace-page')
  }, [])

  const changeWorkspaceTab = (tab: ArtistWorkspaceTab) => {
    setWorkspaceTab(tab)
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${tab}`)
    }
  }

  const generateEpk = async () => {
    if (!artist) return
    setEpkGenerating(true)
    const selected = songs.filter(s => epk.selected_song_ids.includes(s.id)).slice(0, 8)
    const songContext = selected.length ? selected : songs.slice(0, 6)
    const social = Object.entries(artist.social_links || {})
      .map(([platform, value]: any) => `${platform}: ${value?.url || ''}`)
      .filter(line => !line.endsWith(': '))
      .join('\n')
    const publicPage = artist.page_enabled && artist.page_slug ? `/p/${artist.page_slug}` : ''
    const context = [
      `Artist: ${artist.name}`,
      artist.genre ? `Genre: ${artist.genre}` : '',
      artist.description ? `Description:\n${artist.description}` : '',
      artist.song_structure ? `Artist profile:\n${artist.song_structure}` : '',
      publicPage ? `Public artist page: ${publicPage}` : '',
      social ? `Social links:\n${social}` : '',
      songContext.length ? `Songs:\n${songContext.map(s => [
        `Title: ${s.title}`,
        s.lyrics_instructions ? `Concept: ${s.lyrics_instructions}` : '',
        s.backstory ? `Backstory: ${s.backstory}` : '',
        s.spotify_url ? `Spotify: ${s.spotify_url}` : '',
      ].filter(Boolean).join('\n')).join('\n\n')}` : '',
    ].filter(Boolean).join('\n\n')

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          provider: aiProvider,
          messages: [{ role: 'user', content: context }],
          system: [
            `You write professional Electronic Press Kits for musicians. Write the output in: ${aiOutputLanguageName(aiOutputLang)}.`,
            'Return ONLY valid JSON with keys: short_bio, long_bio, release_highlight, tagline.',
            'short_bio: 2-3 sentences. long_bio: 3-5 paragraphs. release_highlight: concise latest-release section. tagline: one quotable press line.',
            'Do not invent awards, labels, contact addresses, streaming numbers, or facts not present in the source.',
          ].join('\n'),
        }),
      })
      const data = await res.json()
      const clean = String(data.text || '').replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      await saveEpk({
        short_bio: parsed.short_bio || epk.short_bio,
        long_bio: parsed.long_bio || epk.long_bio,
        release_highlight: parsed.release_highlight || epk.release_highlight,
        tagline: parsed.tagline || epk.tagline,
        selected_song_ids: epk.selected_song_ids.length ? epk.selected_song_ids : songContext.map(s => s.id),
      })
    } catch (e) {
      console.warn('EPK generation failed', e)
    }
    setEpkGenerating(false)
  }

  const generateBatch = async () => {
    if (!prompt.trim()) return
    setGenerating(true)
    setGeneratedSongs([])
    const artistContext = buildArtistContext()
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        provider: aiProvider,
        messages: [{ role: 'user', content: `${artistContext ? artistContext + '\n\n' : ''}User request: ${prompt}\n\nNumber of songs: ${count}` }],
        system: `${aiOutputLanguageDirective(aiOutputLang)}\nYou are a creative music producer and songwriter. The user describes a theme or concept for multiple songs. Your task: Create EXACTLY ${count} song proposals with title and instructions for a songwriter.\n\nRespond ONLY with valid JSON, no text around it:\n[\n  {\n    "title": "Song title here",\n    "instructions": "Detailed instructions for the songwriter: theme, mood, verse structure, specific images/metaphors, chorus idea, tone and style. At least 3-4 sentences.${artist?.song_structure && useProfile ? ' Follow the song structure profile provided.' : ''}"\n  }\n]`,
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

  // Fetch a single Spotify track from a pasted URL/URI/ID and show a preview.
  const fetchUrlPreview = async () => {
    if (!urlInput.trim()) return
    setUrlLoading(true)
    setUrlError(null)
    setUrlPreview(null)
    try {
      const res = await fetch(`/api/spotify/track-by-url?url=${encodeURIComponent(urlInput.trim())}`)
      const data = await res.json()
      if (data.error || !data.track) {
        setUrlError(data.error || 'No track returned')
      } else {
        setUrlPreview(data.track)
      }
    } catch (e: any) {
      setUrlError(e?.message || 'Failed to fetch')
    }
    setUrlLoading(false)
  }

  // Import the previewed track as a 'released' song under the current artist.
  const importUrlTrack = async () => {
    if (!urlPreview) return
    if (isAlreadyImported(urlPreview.id)) {
      setUrlError(tx.importAlreadyImported)
      return
    }
    setUrlImporting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const row = {
      artist_id: artistId,
      user_id: user?.id,
      title: urlPreview.title,
      lyrics_instructions: '',
      status: 'released',
      spotify_track_id: urlPreview.id,
      spotify_url: urlPreview.spotifyUrl,
      spotify_popularity: urlPreview.popularity,
      spotify_release_date: normalizeReleaseDate(urlPreview.releaseDate),
      spotify_album: urlPreview.album || null,
      spotify_cover_url: urlPreview.coverUrl,
    }
    const { data, error } = await supabase.from('songs').insert(row).select().single()
    if (error) {
      setUrlError(error.message)
    } else if (data) {
      setSongs([data, ...songs])
      setUrlInput('')
      setUrlPreview(null)
    }
    setUrlImporting(false)
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
  const epkIsEmpty = !epk.tagline && !epk.short_bio && !epk.long_bio && !epk.release_highlight && (epk.selected_song_ids?.length || 0) === 0

  return (
    <div className="artist-workspace" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)' }}>
      <div className="artist-workspace-sticky">
      <div className="app-header artist-workspace-header" data-header="page" style={{ padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/dashboard" style={{ color: '#6a5a40', textDecoration: 'none', fontSize: '13px' }}>← {tx.dashboard}</Link>
          <Link href={`/playbook?artist=${artistId}`} style={{ color: '#6a5a40', textDecoration: 'none', fontSize: '13px' }}>🧭 {tx.playbookNavLink}</Link>
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
              {artist?.page_enabled && artist?.page_slug && (
                <a
                  href={`/p/${artist.page_slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={lang === 'no' ? 'Åpne offentlig artistside' : 'Open public artist page'}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, color: '#d4a843', fontSize: 11, textDecoration: 'none', fontWeight: 500, padding: '2px 8px', borderRadius: 12, background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.3)' }}
                >
                  🌐 /p/{artist.page_slug} ↗
                </a>
              )}
            </div>
          </div>
        </div>
        {workspaceTab === 'songs' && (
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
        )}
      </div>

      <ArtistWorkspaceNav active={workspaceTab} onChange={changeWorkspaceTab} />
      </div>

      <div className="artist-workspace-body">
        {workspaceTab === 'overview' && artist && (
          <>
            <MobileQuickActions
              title={tx.mobileQuickActions}
              actions={[
                { label: tx.mobileCreateSong, icon: '+', onClick: () => { changeWorkspaceTab('songs'); setShowGenerator(true); setGeneratedSongs([]) } },
                { label: tx.mobileOpenPublicPage, icon: '↗', href: artist?.page_enabled && artist?.page_slug ? `/p/${artist.page_slug}` : undefined, disabled: !artist?.page_enabled || !artist?.page_slug },
                { label: tx.mobileCopyShareLink, icon: '⧉', onClick: () => {
                  if (artist?.page_slug) navigator.clipboard.writeText(`${window.location.origin}/p/${artist.page_slug}`)
                }, disabled: !artist?.page_slug },
              ]}
            />
            <ArtistWorkspaceOverview
              artist={artist}
              songs={songs}
              subscriberCount={subscribers.length}
              publicPageViews={publicPageViews.length}
              newsletterSignups={newsletterConversions}
              onOpenTab={tab => changeWorkspaceTab(tab as ArtistWorkspaceTab)}
            />
          </>
        )}

        {workspaceTab === 'songs' && (
          <>
        {showGenerator && (
          <div className="card" style={{ marginBottom: '32px', borderColor: 'rgba(212,168,67,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#d4a843', fontWeight: 'normal', fontSize: '18px' }}>{tx.aiGenerator}</h2>
              <button className="btn-outline" style={{ fontSize: '12px', padding: '4px 12px' }} onClick={() => { setShowGenerator(false); setGeneratedSongs([]) }}>{tx.close}</button>
            </div>
            {planId === 'free' && (
              <UpgradePrompt compact title={tx.upgradeAiTitle} description={tx.upgradeAiDesc} />
            )}

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
              <select
                value={aiOutputLang}
                onChange={e => setAiOutputLang(normalizeAIOutputLang(e.target.value))}
                disabled={generating}
                title={tx.aiOutputLangHint}
                style={{ width: 'auto', minWidth: 145, padding: '6px 9px', fontSize: 12 }}
              >
                {AI_OUTPUT_LANGUAGES.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
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

            {/* Single track via URL/ID */}
            <div style={{ background: 'rgba(30,215,96,0.04)', border: '1px solid rgba(30,215,96,0.2)', borderRadius: 6, padding: 12, marginBottom: 18 }}>
              <p style={{ margin: '0 0 8px', color: '#1ed760', fontSize: 11, letterSpacing: 1 }}>
                {tx.importByUrlLabel}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') fetchUrlPreview() }}
                  placeholder={tx.importByUrlPlaceholder}
                  style={{ flex: '1 1 220px', minWidth: 0 }}
                />
                <button
                  type="button"
                  onClick={fetchUrlPreview}
                  disabled={urlLoading || !urlInput.trim()}
                  style={{ background: 'rgba(30,215,96,0.15)', border: '1px solid rgba(30,215,96,0.4)', color: '#1ed760', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}
                >
                  {urlLoading ? '...' : tx.importByUrlFetch}
                </button>
              </div>
              {urlError && (
                <div style={{ background: 'rgba(200,80,80,0.08)', border: '1px solid rgba(200,80,80,0.3)', color: '#c05050', padding: '6px 10px', borderRadius: 4, fontSize: 12, marginTop: 8 }}>
                  {urlError}
                </div>
              )}
              {urlPreview && (
                <div style={{ marginTop: 12, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(30,215,96,0.25)', borderRadius: 6, padding: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {urlPreview.coverUrl ? (
                    <img src={urlPreview.coverUrl} alt={urlPreview.title} style={{ width: 56, height: 56, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 56, height: 56, borderRadius: 4, background: 'rgba(30,215,96,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🎵</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#e8e0d0', fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{urlPreview.title}</div>
                    <div style={{ color: '#6a5a40', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(urlPreview.artists || []).map(a => a.name).join(', ')}
                      {urlPreview.album ? ' · ' + urlPreview.album : ''}
                      {urlPreview.releaseDate ? ' · ' + urlPreview.releaseDate.slice(0, 4) : ''}
                    </div>
                    {/* Warn if the linked artist's spotify_id isn't in the track's artists */}
                    {artist?.spotify_id && urlPreview.artists && !urlPreview.artists.some(a => a.id === artist.spotify_id) && (
                      <div style={{ color: '#e0a050', fontSize: 11, marginTop: 4 }}>
                        ⚠ {tx.importByUrlArtistMismatch}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={importUrlTrack}
                    disabled={urlImporting || isAlreadyImported(urlPreview.id)}
                    style={{ background: '#1ed760', borderColor: '#1ed760', border: 'none', color: '#000', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0 }}
                  >
                    {isAlreadyImported(urlPreview.id) ? '✓ ' + tx.importAlreadyImported : urlImporting ? tx.importing : tx.importByUrlImport}
                  </button>
                </div>
              )}
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
                    <ZoomableImage
                      src={al.cover_url}
                      alt={al.title}
                      caption={al.title}
                      style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: '4px', marginBottom: '10px' }}
                    />
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
          <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
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

                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <input
                    type="file"
                    ref={albumCoverFileRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) uploadAlbumCoverFile(f)
                      // reset so selecting the same file again still triggers onChange
                      if (e.target) e.target.value = ''
                    }}
                  />
                  <button
                    type="button"
                    className="btn-outline"
                    style={{ padding: '6px 14px', fontSize: 12 }}
                    onClick={() => albumCoverFileRef.current?.click()}
                    disabled={albumCoverUploading}
                  >
                    {albumCoverUploading ? tx.saving : '📁 ' + tx.albumCoverUpload}
                  </button>
                  {albumForm.cover_url && (
                    <button
                      type="button"
                      className="btn-outline"
                      style={{ padding: '6px 14px', fontSize: 12, color: '#c05050', borderColor: 'rgba(200,80,80,0.25)' }}
                      onClick={() => setAlbumForm(f => ({ ...f, cover_url: '' }))}
                    >
                      {tx.albumCoverRemove}
                    </button>
                  )}
                </div>

                {/* Spotify album fetch */}
                <div style={{ marginTop: 10, background: 'rgba(30,215,96,0.04)', border: '1px solid rgba(30,215,96,0.2)', borderRadius: 6, padding: 10 }}>
                  <p style={{ margin: '0 0 6px', color: '#1ed760', fontSize: 10, letterSpacing: 1 }}>
                    {tx.albumCoverFromSpotify}
                  </p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <input
                      value={albumSpotifyUrl}
                      onChange={e => setAlbumSpotifyUrl(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); fetchSpotifyAlbum() } }}
                      placeholder={tx.albumCoverFromSpotifyPlaceholder}
                      style={{ flex: '1 1 200px', minWidth: 0, padding: '6px 10px', fontSize: 12 }}
                    />
                    <button
                      type="button"
                      onClick={fetchSpotifyAlbum}
                      disabled={albumSpotifyLoading || !albumSpotifyUrl.trim()}
                      style={{ background: 'rgba(30,215,96,0.15)', border: '1px solid rgba(30,215,96,0.4)', color: '#1ed760', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                    >
                      {albumSpotifyLoading ? '...' : tx.albumCoverFromSpotifyFetch}
                    </button>
                  </div>
                  {albumSpotifyError && (
                    <div style={{ background: 'rgba(200,80,80,0.08)', border: '1px solid rgba(200,80,80,0.3)', color: '#c05050', padding: '5px 8px', borderRadius: 4, fontSize: 11, marginTop: 6 }}>
                      {albumSpotifyError}
                    </div>
                  )}
                </div>

                {albumForm.cover_url && (
                  <div style={{ marginTop: 10 }}>
                    <ZoomableImage
                      src={albumForm.cover_url}
                      alt={albumForm.title || 'cover'}
                      caption={albumForm.title || undefined}
                      style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '4px', display: 'block' }}
                    />
                  </div>
                )}
              </div>

              {/* AI cover generation for the album */}
              <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '6px', background: 'rgba(160,100,200,0.06)', border: '1px solid rgba(160,100,200,0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ color: '#c07bd0', fontSize: 11, letterSpacing: 1 }}>{tx.albumCoverAi.toUpperCase()}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#5a4a30', fontSize: 10 }}>AI:</span>
                    <AIProviderPicker value={aiProvider} onChange={pickProvider} disabled={albumPromptLoading || albumImageLoading} />
                    <select
                      value={aiOutputLang}
                      onChange={e => setAiOutputLang(normalizeAIOutputLang(e.target.value))}
                      disabled={albumPromptLoading || albumImageLoading}
                      style={{ width: 'auto', minWidth: 130, padding: '5px 8px', fontSize: 11 }}
                    >
                      {AI_OUTPUT_LANGUAGES.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <textarea
                  value={albumForm.cover_prompt}
                  onChange={e => setAlbumForm({ ...albumForm, cover_prompt: e.target.value })}
                  placeholder={tx.albumCoverPromptPlaceholder}
                  rows={4}
                  style={{ marginBottom: 8 }}
                />

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={generateAlbumCoverPrompt}
                    disabled={albumPromptLoading || !albumForm.title.trim()}
                    style={{ background: 'rgba(212,168,67,0.12)', border: '1px solid rgba(212,168,67,0.3)', color: '#d4a843', padding: '7px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                  >
                    {albumPromptLoading ? tx.generating : tx.albumCoverPromptGenerate}
                  </button>
                  <button
                    type="button"
                    onClick={generateAlbumCoverImage}
                    disabled={albumImageLoading || !albumForm.cover_prompt.trim()}
                    style={{ background: 'linear-gradient(135deg, #c07bd0, #9060c0)', border: '1px solid #9060c0', color: '#fff', padding: '7px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}
                  >
                    {albumImageLoading ? tx.coverImageGenerating : (albumForm.cover_url ? tx.coverImageRegenerate : tx.coverImageGenerate)}
                  </button>
                </div>

                {albumImageError && (
                  <div style={{ background: 'rgba(200,80,80,0.08)', border: '1px solid rgba(200,80,80,0.3)', color: '#c05050', padding: '6px 10px', borderRadius: 4, fontSize: 12, marginTop: 8 }}>
                    {albumImageError}
                  </div>
                )}
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ margin: 0, color: '#d4a843', fontWeight: 'normal', fontSize: '16px' }}>
            {tx.songsCount} ({visibleSongs.length}{visibleSongs.length !== songs.length ? ` / ${songs.length}` : ''})
          </h2>
        </div>

        {/* Filters + search */}
        {songs.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 14 }}>
            {/* Status chips */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {[
                { v: 'all', label: tx.filterAll },
                { v: 'draft', label: tx.draft, color: STATUS_COLORS.draft },
                { v: 'in_progress', label: tx.inProgress, color: STATUS_COLORS.in_progress },
                { v: 'complete', label: tx.complete, color: STATUS_COLORS.complete },
                { v: 'released', label: tx.released, color: STATUS_COLORS.released },
              ].map(opt => {
                const active = statusFilter === opt.v
                return (
                  <button
                    key={opt.v}
                    onClick={() => setStatusFilter(opt.v)}
                    style={{
                      padding: '5px 12px', borderRadius: 14, fontSize: 11, cursor: 'pointer',
                      border: `1px solid ${active ? (opt.color || '#d4a843') : 'rgba(180,140,80,0.2)'}`,
                      background: active ? `${opt.color || '#d4a843'}22` : 'transparent',
                      color: active ? (opt.color || '#d4a843') : '#6a5a40',
                      letterSpacing: 0.5,
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
            {/* Album filter */}
            {albums.length > 0 && (
              <select
                value={albumFilter}
                onChange={e => setAlbumFilter(e.target.value)}
                style={{ width: 'auto', padding: '5px 10px', fontSize: 12 }}
              >
                <option value="all">{tx.filterAllAlbums}</option>
                <option value="none">{tx.filterSinglesOnly}</option>
                {albums.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
            )}
            {/* Search */}
            <input
              value={songSearch}
              onChange={e => setSongSearch(e.target.value)}
              placeholder={tx.filterSearchPlaceholder}
              style={{ flex: '1 1 180px', minWidth: 0, maxWidth: 280, padding: '6px 12px', fontSize: 13 }}
            />
            {(statusFilter !== 'all' || albumFilter !== 'all' || songSearch) && (
              <button
                onClick={() => { setStatusFilter('all'); setAlbumFilter('all'); setSongSearch('') }}
                style={{ background: 'none', border: 'none', color: '#6a5a40', fontSize: 12, cursor: 'pointer' }}
              >
                {tx.filterClear}
              </button>
            )}
          </div>
        )}

        {visibleSongs.length === 0 && !showGenerator ? (
          <div className="card workspace-card">
            {songs.length === 0 ? (
              <WorkspaceEmptyState
                icon="🎵"
                title={tx.noSongs}
                description={tx.workspaceEmptyNoSongsDesc}
                action={<button type="button" className="btn-gold" onClick={() => setShowGenerator(true)}>{tx.generateWithAI}</button>}
              />
            ) : (
              <WorkspaceEmptyState icon="🔍" title={tx.filterNoMatch} />
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {visibleSongs.map((song) => {
              // Use the song's index in the FULL list (not the filtered list) for reordering.
              const i = songs.findIndex(s => s.id === song.id)
              const reorderEnabled = statusFilter === 'all' && albumFilter === 'all' && !songSearch
              const isFirst = i === 0
              const isLast = i === songs.length - 1
              const isReleased = song.status === 'released'
              // Prefer Spotify album cover for imported tracks; fall back to user's own cover image.
              const thumbUrl = song.spotify_cover_url || song.cover_image_url || null
              const thumbCaption = song.spotify_album
                ? `${song.title} — ${song.spotify_album}`
                : song.title
              const isDragOver = dragOverIndex === i && dragIndex !== null && dragIndex !== i
              const songPublicProps = {
                songId: song.id,
                artistPageEnabled: !!artist?.page_enabled,
                artistAdminHidden: !!artist?.admin_hidden,
                songPublicHidden: !!song.public_hidden,
              }
              return (
                <div key={song.id} className="song-row card"
                  onDragOver={reorderEnabled ? (e => onDragOver(e, i)) : undefined}
                  onDragLeave={reorderEnabled ? onDragLeave : undefined}
                  onDrop={reorderEnabled ? (e => onDrop(e, i)) : undefined}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '16px 20px', transition: 'border-color 0.2s, transform 0.15s',
                    borderColor: isDragOver ? '#d4a843' : isReleased ? 'rgba(30,215,96,0.2)' : undefined,
                    transform: isDragOver ? 'scale(1.01)' : undefined,
                    opacity: dragIndex === i ? 0.5 : 1,
                    gap: 10,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = isReleased ? 'rgba(30,215,96,0.5)' : 'rgba(212,168,67,0.5)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = isReleased ? 'rgba(30,215,96,0.2)' : 'rgba(180,140,80,0.2)')}>
                  {/* Drag handle (desktop) + up/down buttons (everywhere). Reorder disabled when filtering. */}
                  {reorderEnabled && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0, color: '#6a5a40' }}>
                      <span
                        draggable
                        onDragStart={e => onDragStart(e, i)}
                        onDragEnd={onDragEnd}
                        title={tx.dragToReorder}
                        style={{ cursor: 'grab', userSelect: 'none', fontSize: 14, lineHeight: 1, padding: '0 4px' }}
                      >⋮⋮</span>
                      <div style={{ display: 'flex', gap: 1 }}>
                        <button
                          onClick={() => moveSong(song.id, -1)}
                          disabled={isFirst}
                          title={tx.moveUp}
                          style={{ background: 'none', border: 'none', color: isFirst ? '#3a3530' : '#6a5a40', cursor: isFirst ? 'default' : 'pointer', fontSize: 14, padding: '0 4px', lineHeight: 1 }}
                        >▲</button>
                        <button
                          onClick={() => moveSong(song.id, 1)}
                          disabled={isLast}
                          title={tx.moveDown}
                          style={{ background: 'none', border: 'none', color: isLast ? '#3a3530' : '#6a5a40', cursor: isLast ? 'default' : 'pointer', fontSize: 14, padding: '0 4px', lineHeight: 1 }}
                        >▼</button>
                      </div>
                    </div>
                  )}
                  {/* Left side IS the navigation target. Right side cluster is sibling, NOT a link. */}
                  <Link href={`/song/${song.id}`} className="song-row-left" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0, color: 'inherit', cursor: 'pointer' }}>
                    {thumbUrl ? (
                      <ZoomableImage
                        src={thumbUrl}
                        alt={song.title}
                        caption={thumbCaption}
                        style={{ width: '44px', height: '44px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }}
                      />
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
                        {/* Media-link icons (YouTube, Apple Music, SoundCloud, etc.) */}
                        {(song.media_links || []).map((ml, idx) => {
                          const p = (ml.platform || '').toLowerCase()
                          // Skip Spotify here — already shown above from spotify_url.
                          if (p === 'spotify' || !ml.url) return null
                          let bg = '#3a3530', color = '#fff', icon = '🔗', label = ml.platform
                          if (p === 'youtube')        { bg = '#ff0000'; icon = '▶' }
                          else if (p === 'tiktok')    { bg = '#000';    icon = '♪'; color = '#fff' }
                          else if (p === 'instagram') { bg = 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)'; icon = '◎' }
                          else if (p === 'facebook')  { bg = '#1877f2'; icon = 'f' }
                          else if (p === 'apple music' || p === 'apple-music' || p === 'apple_music') { bg = '#fa233b'; icon = '' }
                          else if (p === 'soundcloud'){ bg = '#ff5500'; icon = '☁' }
                          return (
                            <a
                              key={`${p}-${idx}`}
                              href={ml.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => { e.preventDefault(); e.stopPropagation(); window.open(ml.url, '_blank') }}
                              title={lang === 'no' ? `Åpne på ${label}` : `Open on ${label}`}
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', background: bg, color, fontSize: 10, textDecoration: 'none', fontWeight: 'bold', flexShrink: 0 }}
                            >
                              {icon}
                            </a>
                          )
                        })}
                        {/* Suno indicator if a Suno track is linked to this song */}
                        {song.suno_url && (
                          <a
                            href={song.suno_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => { e.preventDefault(); e.stopPropagation(); window.open(song.suno_url!, '_blank') }}
                            title={lang === 'no' ? 'Åpne på Suno' : 'Open on Suno'}
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', background: '#7bc87b', color: '#000', fontSize: 10, textDecoration: 'none', fontWeight: 'bold', flexShrink: 0 }}
                          >
                            ♫
                          </a>
                        )}
                      </div>
                      <div className="song-public-actions--mobile">
                        <SongPublicPageActions {...songPublicProps} layout="compact" />
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
                      {/* Stream counters */}
                      {((song as any).internal_play_count > 0 || (song as any).embed_click_count > 0) && (
                        <div style={{ color: '#6a5a40', fontSize: 11, marginTop: 4, display: 'flex', gap: 10 }}>
                          {(song as any).internal_play_count > 0 && (
                            <span>▶ {((song as any).internal_play_count).toLocaleString()}</span>
                          )}
                          {(song as any).embed_click_count > 0 && (
                            <span>🔗 {((song as any).embed_click_count).toLocaleString()}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="song-row-right" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <div className="song-public-actions--desktop">
                      <SongPublicPageActions {...songPublicProps} layout="compact" />
                    </div>
                    {/* Star toggle — feature this song under the artist on the studio page. */}
                    <button
                      type="button"
                      onClick={() => toggleFeaturedOnStudio(song.id, !song.featured_on_studio_page)}
                      title={song.featured_on_studio_page ? tx.studioFeaturedRemove : tx.studioFeaturedAdd}
                      aria-pressed={!!song.featured_on_studio_page}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: song.featured_on_studio_page ? '#d4a843' : '#3a3530',
                        fontSize: 18, padding: '0 4px', lineHeight: 1,
                      }}
                    >
                      {song.featured_on_studio_page ? '★' : '☆'}
                    </button>
                    {/* Album picker — separate from Link, so taps go straight to the dropdown. */}
                    <select
                      value={song.album_id || ''}
                      onChange={e => assignSongAlbum(song.id, e.target.value || null)}
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
                  </div>
                </div>
              )
            })}
          </div>
        )}

          </>
        )}

        {workspaceTab === 'campaigns' && <ArtistCampaignsSummary songs={songs} />}

        {workspaceTab === 'analytics' && artist?.id && (
          <ArtistWorkspaceAnalytics
            artistId={artist.id}
            planId={planId}
            analyticsRange={analyticsRange}
            onRangeChange={setAnalyticsRange}
            analyticsLoading={analyticsLoading}
            analyticsEvents={analyticsEvents}
            songs={songs.map(s => ({ id: s.id, title: s.title }))}
          />
        )}

        {workspaceTab === 'epk' && (
        <div className="card workspace-card" style={{ borderColor: 'rgba(112,144,208,0.28)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <h2 style={{ color: '#7090d0', fontWeight: 'normal', fontSize: 16, letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>
                {tx.epkTitle}
              </h2>
              <p style={{ color: '#8a7a60', fontSize: 12, margin: '4px 0 0', lineHeight: 1.5 }}>{tx.epkDesc}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn-gold" onClick={generateEpk} disabled={epkGenerating} style={{ padding: '7px 14px', fontSize: 12 }}>
                {epkGenerating ? tx.generating : tx.epkGenerate}
              </button>
              <button className="btn-outline" onClick={copyFullEpk} style={{ padding: '7px 14px', fontSize: 12 }}>
                📋 {tx.epkCopyAll}
              </button>
              {artist?.page_slug && (
                <a href={`/epk/${artist.page_slug}`} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ padding: '7px 14px', fontSize: 12, textDecoration: 'none' }}>
                  {tx.epkPreview}
                </a>
              )}
            </div>
          </div>

          {planId === 'free' && (
            <UpgradePrompt compact title={tx.epkProTitle} description={tx.epkProDesc} />
          )}

          {epkIsEmpty && (
            <div style={{ marginBottom: 16 }}>
              <WorkspaceEmptyState
                icon="📰"
                title={tx.workspaceEmptyNoEpk}
                description={tx.workspaceEmptyNoEpkDesc}
                action={
                  <button type="button" className="btn-gold" onClick={generateEpk} disabled={epkGenerating}>
                    {epkGenerating ? tx.generating : tx.epkGenerate}
                  </button>
                }
              />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 16 }}>
            {[
              ['tagline', tx.epkTagline, 2],
              ['short_bio', tx.epkShortBio, 4],
              ['long_bio', tx.epkLongBio, 9],
              ['release_highlight', tx.epkReleaseHighlight, 5],
              ['contact_info', tx.epkContactInfo, 3],
            ].map(([key, label, rows]) => (
              <div key={String(key)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ color: '#a8b8e8', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</label>
                  {!!(epk as any)[key as string] && (
                    <button className="btn-outline" onClick={() => copyEpk((epk as any)[key as string])} style={{ padding: '3px 9px', fontSize: 11 }}>
                      📋
                    </button>
                  )}
                </div>
                <textarea
                  value={(epk as any)[key as string] || ''}
                  onChange={e => saveEpk({ [key as string]: e.target.value } as Partial<EpkContent>)}
                  rows={Number(rows)}
                  placeholder={tx.epkFieldPlaceholder}
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 16 }}>
            <div className="card" style={{ borderColor: 'rgba(112,144,208,0.18)' }}>
              <h3 style={{ color: '#7090d0', fontWeight: 'normal', fontSize: 14, margin: '0 0 10px' }}>{tx.epkSelectedSongs}</h3>
              <EpkSongSelector
                songs={songs}
                selectedIds={epk.selected_song_ids || []}
                onToggle={toggleEpkSong}
                onClearSelected={clearEpkSelectedSongs}
              />
              {epkPreviewSongs.missingIds.length > 0 && (
                <p style={{ color: '#c08060', fontSize: 12, margin: '12px 0 0', lineHeight: 1.5 }}>{tx.epkMissingSongs}</p>
              )}
            </div>

            <div className="card" style={{ borderColor: 'rgba(112,144,208,0.18)' }}>
              <h3 style={{ color: '#7090d0', fontWeight: 'normal', fontSize: 14, margin: '0 0 10px' }}>{tx.epkSocialLinks}</h3>
              {['spotify', 'youtube', 'instagram', 'tiktok', 'website'].map(platform => (
                <div key={platform} style={{ marginBottom: 8 }}>
                  <label style={{ display: 'block', color: '#8a7a60', fontSize: 11, textTransform: 'uppercase', marginBottom: 4 }}>{platform}</label>
                  <input value={epk.social_links?.[platform] || ''} onChange={e => updateEpkSocialLink(platform, e.target.value)} placeholder="https://..." />
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(112,144,208,0.14)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
              <h3 style={{ color: '#a8b8e8', fontWeight: 'normal', fontSize: 14, margin: 0 }}>{tx.epkPreviewTitle}</h3>
              {artist?.page_slug && (
                <span style={{ color: '#6a5a40', fontSize: 12, wordBreak: 'break-all' }}>
                  {clientPublicUrl(`/epk/${artist.page_slug}`)}
                </span>
              )}
            </div>
            <h1 style={{ color: '#e8e0d0', margin: '0 0 6px', fontSize: 26 }}>{artist?.name}</h1>
            {epk.tagline && <p style={{ color: '#d4a843', fontSize: 16, margin: '0 0 12px' }}>"{epk.tagline}"</p>}
            {epk.short_bio && <p style={{ color: '#c8c0b0', fontSize: 14, lineHeight: 1.6 }}>{epk.short_bio}</p>}
            {epk.release_highlight && <p style={{ color: '#8a7a60', fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>{epk.release_highlight}</p>}
            {epkPreviewSongs.songs.length > 0 && (
              <EpkSelectedSongsList songs={epkPreviewSongs.songs} variant="dark" heading={tx.epkSelectedSongs} />
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: planId === 'pro' ? '#c8c0b0' : '#6a5a40', fontSize: 13, cursor: planId === 'pro' ? 'pointer' : 'not-allowed' }}>
              <input
                type="checkbox"
                checked={!!epk.public_enabled}
                disabled={planId !== 'pro'}
                onChange={e => saveEpk({ public_enabled: e.target.checked })}
                style={{ accentColor: '#7090d0' }}
              />
              {tx.epkPublishPublic}
            </label>
            {artist?.page_slug && planId === 'pro' && epk.public_enabled && (
              <a href={`/epk/${artist.page_slug}`} target="_blank" rel="noopener noreferrer" style={{ color: '#d4a843', fontSize: 13, wordBreak: 'break-all' }}>
                {clientPublicUrl(`/epk/${artist.page_slug}`)}
              </a>
            )}
          </div>
        </div>
        )}

        {workspaceTab === 'growth' && artist && (
          <div className="workspace-section">
            <ArtistWorkspaceGrowth artistId={artist.id} />
          </div>
        )}

        {workspaceTab === 'fanhub' && artist && (
          <div className="workspace-section">
            {subscribers.length === 0 && (
              <div className="card workspace-card">
                <WorkspaceEmptyState
                  icon="✉"
                  title={tx.workspaceEmptyNoSubscribers}
                  description={tx.workspaceEmptyNoSubscribersDesc}
                  action={
                    <button type="button" className="btn-outline" onClick={() => changeWorkspaceTab('public')}>
                      {tx.workspaceTabPublic}
                    </button>
                  }
                />
              </div>
            )}
            <FanHubPanel
              artist={artist}
              songs={songs}
              subscribers={subscribers}
              newsletterSources={newsletterSources}
              planId={planId}
              aiProvider={aiProvider}
            />
          </div>
        )}

        {workspaceTab === 'events' && (
        <div className="card workspace-card" style={{ borderColor: 'rgba(212,168,67,0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: 16, letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>
              {tx.eventsTitle}
            </h2>
            <button type="button" onClick={openEventCreate} className="btn-outline" style={{ padding: '6px 14px', fontSize: 12 }}>
              {tx.eventNew}
            </button>
          </div>

          {showEventForm && (
            <div style={{ background: 'rgba(212,168,67,0.04)', border: '1px solid rgba(212,168,67,0.18)', borderRadius: 6, padding: 14, marginBottom: 16 }}>
              <h3 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: 14, margin: '0 0 12px' }}>
                {editingEvent ? tx.eventEdit : tx.eventNew}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 160px', gap: 10, marginBottom: 10 }}>
                <input value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} placeholder={tx.eventTitlePlaceholder} />
                <input type="date" value={eventForm.date} onChange={e => setEventForm({ ...eventForm, date: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                <input value={eventForm.venue} onChange={e => setEventForm({ ...eventForm, venue: e.target.value })} placeholder={tx.eventVenuePlaceholder} />
                <input value={eventForm.city} onChange={e => setEventForm({ ...eventForm, city: e.target.value })} placeholder={tx.eventCity} />
                <input value={eventForm.country} onChange={e => setEventForm({ ...eventForm, country: e.target.value })} placeholder={tx.eventCountry} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 170px', gap: 10, marginBottom: 12 }}>
                <input value={eventForm.ticket_url} onChange={e => setEventForm({ ...eventForm, ticket_url: e.target.value })} placeholder="https://..." />
                <select value={eventForm.status} onChange={e => setEventForm({ ...eventForm, status: e.target.value as ArtistEvent['status'] })}>
                  <option value="scheduled">{tx.eventStatusScheduled}</option>
                  <option value="sold_out">{tx.eventStatusSoldOut}</option>
                  <option value="cancelled">{tx.eventStatusCancelled}</option>
                  <option value="past">{tx.eventStatusPast}</option>
                  <option value="hidden">{tx.eventStatusHidden}</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-gold" onClick={saveEvent} disabled={savingEvent || !eventForm.title.trim() || !eventForm.date}>
                    {savingEvent ? tx.saving : tx.save}
                  </button>
                  <button className="btn-outline" onClick={() => setShowEventForm(false)}>{tx.cancel}</button>
                </div>
                {editingEvent && (
                  <button onClick={() => deleteEvent(editingEvent)} style={{ background: 'none', border: '1px solid rgba(200,80,80,0.3)', color: '#c05050', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                    {tx.delete}
                  </button>
                )}
              </div>
            </div>
          )}

          {events.length === 0 && !showEventForm ? (
            <WorkspaceEmptyState
              icon="📅"
              title={tx.eventsEmpty}
              description={tx.workspaceEmptyNoEventsDesc}
              action={
                <button type="button" className="btn-gold" onClick={openEventCreate}>
                  {tx.eventNew}
                </button>
              }
            />
          ) : events.length === 0 ? null : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {events.map(event => {
                const location = [event.venue, event.city, event.country].filter(Boolean).join(' · ')
                const statusMap: Record<string, string> = {
                  scheduled: tx.eventStatusScheduled,
                  sold_out: tx.eventStatusSoldOut,
                  cancelled: tx.eventStatusCancelled,
                  past: tx.eventStatusPast,
                  hidden: tx.eventStatusHidden,
                }
                return (
                  <button key={event.id} type="button" onClick={() => openEventEdit(event)} style={{ textAlign: 'left', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(180,140,80,0.12)', borderRadius: 6, padding: '12px 14px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ color: '#e8e0d0', fontSize: 14, fontWeight: 500 }}>{event.title}</div>
                        {location && <div style={{ color: '#8a7a60', fontSize: 12, marginTop: 3 }}>{location}</div>}
                      </div>
                      <div style={{ color: '#6a5a40', fontSize: 12, textAlign: 'right' }}>
                        <div>{event.date}</div>
                        <div>{statusMap[event.status] || event.status}</div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
        )}

        {workspaceTab === 'public' && (
          <div className="workspace-section">
            {artist?.page_enabled && artist?.page_slug ? (
              <>
                <div className="card workspace-card">
                  <h2 className="workspace-section-title">{tx.publicPage}</h2>
                  <p style={{ color: '#8a7a60', fontSize: 13, margin: '0 0 12px', wordBreak: 'break-all' }}>
                    {clientPublicUrl(`/p/${artist.page_slug}`)}
                  </p>
                  <a href={`/p/${artist.page_slug}`} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ textDecoration: 'none', display: 'inline-block' }}>
                    {tx.workspaceActionPublicPage} ↗
                  </a>
                </div>
                <QRCodeCard path={`/p/${artist.page_slug}`} title={tx.qrArtistHint} />
                <ArtistFeaturedReleasePicker
                  artistId={artist.id}
                  pageSettings={artist.page_settings}
                  songs={songs}
                  albums={albums}
                  onSaved={settings => setArtist({ ...artist, page_settings: settings })}
                />
                {planId === 'free' && (
                  <UpgradePrompt compact title={tx.upgradeQrTitle} description={tx.upgradeQrDesc} />
                )}
              </>
            ) : (
              <div className="card workspace-card">
                <p style={{ color: '#8a7a60', fontSize: 13, margin: 0, lineHeight: 1.55 }}>{tx.publicPageSlugRequired}</p>
                <button type="button" className="btn-outline" style={{ marginTop: 12 }} onClick={() => changeWorkspaceTab('settings')}>
                  {tx.workspaceTabSettings}
                </button>
              </div>
            )}
          </div>
        )}

        {workspaceTab === 'settings' && artist && (
          <ArtistSettingsPanel artist={artist} planId={planId} onSaved={setArtist} />
        )}
      </div>
    </div>
  )
}
