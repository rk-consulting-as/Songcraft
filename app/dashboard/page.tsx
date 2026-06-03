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
import GrowthHubDashboardCard from '@/components/growth/GrowthHubDashboardCard'
import DashboardDiscoverHighlights from '@/components/DashboardDiscoverHighlights'
import ViewerAdSlot from '@/components/ads/ViewerAdSlot'
import DashboardCommandCenterHero from '@/components/dashboard/DashboardCommandCenterHero'
import DashboardTodayPanel from '@/components/dashboard/DashboardTodayPanel'
import DashboardQuickWins from '@/components/dashboard/DashboardQuickWins'
import DashboardArtistStrip from '@/components/dashboard/DashboardArtistStrip'
import DashboardActiveReleases from '@/components/dashboard/DashboardActiveReleases'
import DashboardCommunityPanel from '@/components/dashboard/DashboardCommunityPanel'
import DashboardGrowthOpportunities from '@/components/dashboard/DashboardGrowthOpportunities'
import DashboardDiscoverOpportunities from '@/components/dashboard/DashboardDiscoverOpportunities'
import DashboardInsights from '@/components/dashboard/DashboardInsights'
import DashboardQuickActionBar from '@/components/dashboard/DashboardQuickActionBar'
import { buildCommandCenter } from '@/lib/dashboard/buildCommandCenter'
import { enrichCommandCenterSnapshot } from '@/lib/dashboard/buildAdaptive'
import { fetchParticipationStreaks } from '@/lib/passiveParticipation/streaks'
import type { CommandCenterSnapshot, DashboardSongRow } from '@/lib/dashboard/types'
import { fetchPlaybookContext } from '@/lib/playbook/fetchContext'
import { computePlaybookEngine } from '@/lib/playbook/computeEngine'
import { fetchUserParticipationSummary } from '@/lib/playlistCommunities/participationSummary'

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
type ReleaseTask = {
  id: string
  song_id: string
  song_title: string
  artist_name: string
  title: string
  due_date: string
  status: 'todo' | 'doing' | 'done'
  notes?: string
}
type ReleaseReadinessSong = {
  id: string
  title: string
  artist_name: string
  score: number
  missing: string[]
}
type DistributionOverviewSong = {
  id: string
  title: string
  artist_name: string
  status: 'setup' | 'submitted' | 'live'
  score: number
  distributor?: string
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

function releaseTaskState(task: ReleaseTask, lang: Lang) {
  if (task.status === 'done') return { label: lang === 'no' ? 'Ferdig' : 'Done', color: '#7bc87b', bg: 'rgba(123,200,123,0.08)' }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(`${task.due_date}T00:00:00`)
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / 86400000)
  if (diffDays < 0) return { label: lang === 'no' ? 'Forsinket' : 'Overdue', color: '#e07070', bg: 'rgba(224,112,112,0.08)' }
  if (diffDays <= 7) return { label: lang === 'no' ? 'Snart' : 'Upcoming', color: '#d4a843', bg: 'rgba(212,168,67,0.08)' }
  return { label: lang === 'no' ? 'Planlagt' : 'Planned', color: '#8a7a60', bg: 'rgba(255,255,255,0.025)' }
}

function calculateReadiness(song: any, lang: Lang): ReleaseReadinessSong {
  const pc = song.publish_content || {}
  const artist = song.artists || {}
  const campaignAssets = ['spotify_pitch', 'tiktok_caption', 'instagram_caption', 'youtube_shorts_caption', 'facebook_post', 'press_bio', 'newsletter_announcement']
  const campaignAssetCount = campaignAssets.filter(key => !!pc[`campaign_${key}`]).length
  const epk = artist.page_settings?.epk || {}
  const labels = {
    lyrics: lang === 'no' ? 'Tekst' : 'Lyrics',
    suno: lang === 'no' ? 'Suno prompt' : 'Suno prompt',
    backstory: lang === 'no' ? 'Backstory' : 'Backstory',
    cover: lang === 'no' ? 'Cover' : 'Cover',
    canvas: lang === 'no' ? 'Canvas' : 'Canvas',
    media: lang === 'no' ? 'Spotify/lenke' : 'Spotify/link',
    public: lang === 'no' ? 'Offentlig side' : 'Public page',
    share: lang === 'no' ? 'QR/embed' : 'QR/embed',
    campaign: lang === 'no' ? 'Kampanjemateriell' : 'Campaign assets',
    timeline: lang === 'no' ? 'Tidslinje' : 'Timeline',
    epk: lang === 'no' ? 'EPK' : 'EPK',
  }
  const checks = [
    { label: labels.lyrics, points: 12, done: !!song.lyrics_text },
    { label: labels.suno, points: 8, done: !!song.suno_prompt },
    { label: labels.backstory, points: 10, done: !!song.backstory },
    { label: labels.cover, points: 10, done: !!song.cover_image_url || !!song.spotify_cover_url },
    { label: labels.canvas, points: 8, done: !!song.canvas_prompt || !!song.canvas_video_url },
    { label: labels.media, points: 10, done: !!song.spotify_url || (Array.isArray(song.media_links) && song.media_links.length > 0) },
    { label: labels.public, points: 8, done: !!artist.page_enabled && !!artist.page_slug },
    { label: labels.share, points: 8, done: true },
    { label: labels.campaign, points: 10, done: campaignAssetCount >= 4 },
    { label: labels.timeline, points: 8, done: Array.isArray(pc.campaign_timeline) && pc.campaign_timeline.length > 0 },
    { label: labels.epk, points: 8, done: !!(epk.short_bio || epk.long_bio || epk.release_highlight || epk.public_enabled) },
  ]
  return {
    id: song.id,
    title: song.title,
    artist_name: artist.name || '',
    score: checks.reduce((sum, check) => sum + (check.done ? check.points : 0), 0),
    missing: checks.filter(check => !check.done).map(check => check.label).slice(0, 4),
  }
}

function calculateDistribution(song: any): DistributionOverviewSong {
  const distribution = song.publish_content?.distribution || {}
  const artist = song.artists || {}
  const coverReady = !!song.cover_image_url || !!song.spotify_cover_url
  const audioReady = !!song.suno_audio_url || !!song.audio_url
  const checks = [
    !!artist.name,
    !!song.title,
    !!distribution.release_date,
    coverReady,
    distribution.audio_status === 'ready' || audioReady,
    distribution.explicit === 'yes' || distribution.explicit === 'no',
    !!artist.genre,
    !!distribution.language,
    !!(distribution.songwriter_credits || distribution.producer_credits),
    !!distribution.copyright_owner,
    !!distribution.publishing_owner,
  ]
  return {
    id: song.id,
    title: song.title,
    artist_name: artist.name || '',
    status: distribution.status === 'live' ? 'live' : distribution.status === 'submitted' ? 'submitted' : 'setup',
    score: Math.round((checks.filter(Boolean).length / checks.length) * 100),
    distributor: distribution.distributor || '',
  }
}

export default function Dashboard() {
  const router = useRouter()
  const [lang, setLangState] = useState<Lang>('en')
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
  const [onboardingStatus, setOnboardingStatus] = useState<{ show: boolean; skipped: boolean } | null>(null)

  // Activity feed snapshot for the dashboard widget
  const [feedEntries, setFeedEntries] = useState<ActivityEntry[]>([])
  const [feedFollowCount, setFeedFollowCount] = useState(0)

  // Top-streamed songs from this user's catalog (for the widget)
  const [topStreamedSongs, setTopStreamedSongs] = useState<any[]>([])
  const [upcomingReleaseTasks, setUpcomingReleaseTasks] = useState<ReleaseTask[]>([])
  const [almostReadySongs, setAlmostReadySongs] = useState<ReleaseReadinessSong[]>([])
  const [missingKeySongs, setMissingKeySongs] = useState<ReleaseReadinessSong[]>([])
  const [distributionSetupSongs, setDistributionSetupSongs] = useState<DistributionOverviewSong[]>([])
  const [distributionSubmittedSongs, setDistributionSubmittedSongs] = useState<DistributionOverviewSong[]>([])
  const [distributionLiveSongs, setDistributionLiveSongs] = useState<DistributionOverviewSong[]>([])
  const [commandSnapshot, setCommandSnapshot] = useState<CommandCenterSnapshot | null>(null)
  const [dashboardSongs, setDashboardSongs] = useState<DashboardSongRow[]>([])

  // Unread messages count for the nav badge
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => { setLangState(useLang()); checkAuth(); fetchArtists() }, [])
  useEffect(() => {
    if (loading) return
    const hash = window.location.hash.replace(/^#/, '')
    if (!hash) return
    const el = document.getElementById(hash)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [loading])
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

      try {
        const artistRows = (data || []) as any[]
        const setupComplete = artistRows.some(a => !!a.page_enabled && !!a.page_slug && ((a.songs?.[0]?.count ?? 0) > 0))
        const { data: progress } = await supabase
          .from('onboarding_progress')
          .select('skipped, completed')
          .eq('user_id', user.id)
          .maybeSingle()
        setOnboardingStatus({
          show: !setupComplete && !progress?.completed,
          skipped: !!progress?.skipped,
        })
      } catch {
        const artistRows = (data || []) as any[]
        const setupComplete = artistRows.some(a => !!a.page_enabled && !!a.page_slug && ((a.songs?.[0]?.count ?? 0) > 0))
        setOnboardingStatus({ show: !setupComplete, skipped: false })
      }

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

      // Pro dashboard overview: upcoming release campaign tasks across own songs.
      let releaseTasksForCmd: ReleaseTask[] = []
      if (currentPlan.id === 'pro') {
        try {
          const { data: campaignSongs } = await supabase
            .from('songs')
            .select('id, title, publish_content, artists(name)')
            .eq('user_id', user.id)
            .not('publish_content', 'is', null)
          const tasks: ReleaseTask[] = []
          for (const song of (campaignSongs as any[]) || []) {
            const timeline = Array.isArray(song.publish_content?.campaign_timeline) ? song.publish_content.campaign_timeline : []
            for (const task of timeline) {
              if (!task?.due_date || task.status === 'done') continue
              tasks.push({
                id: String(task.id || `${song.id}-${task.due_date}`),
                song_id: song.id,
                song_title: song.title,
                artist_name: song.artists?.name || '',
                title: String(task.title || ''),
                due_date: String(task.due_date),
                status: task.status === 'doing' ? 'doing' : 'todo',
                notes: task.notes || '',
              })
            }
          }
          tasks.sort((a, b) => a.due_date.localeCompare(b.due_date))
          releaseTasksForCmd = tasks.slice(0, 8)
          setUpcomingReleaseTasks(releaseTasksForCmd)
        } catch {}

        try {
          const { data: reviewSongs } = await supabase
            .from('songs')
            .select('id, title, lyrics_text, suno_prompt, backstory, cover_image_url, spotify_cover_url, canvas_prompt, canvas_video_url, spotify_url, media_links, publish_content, suno_audio_url, artists(name, genre, page_enabled, page_slug, page_settings)')
            .eq('user_id', user.id)
            .limit(100)
          const scored = ((reviewSongs as any[]) || []).map(song => calculateReadiness(song, lang))
          setAlmostReadySongs(scored.filter(song => song.score >= 75 && song.score < 100).sort((a, b) => b.score - a.score).slice(0, 5))
          setMissingKeySongs(scored.filter(song => song.score < 55).sort((a, b) => a.score - b.score).slice(0, 5))
          const distribution = ((reviewSongs as any[]) || []).map(calculateDistribution)
          setDistributionSetupSongs(distribution.filter(song => song.status === 'setup' && song.score < 85).sort((a, b) => a.score - b.score).slice(0, 5))
          setDistributionSubmittedSongs(distribution.filter(song => song.status === 'submitted').slice(0, 5))
          setDistributionLiveSongs(distribution.filter(song => song.status === 'live').slice(0, 5))
        } catch {}
      } else {
        setUpcomingReleaseTasks([])
        setAlmostReadySongs([])
        setMissingKeySongs([])
        setDistributionSetupSongs([])
        setDistributionSubmittedSongs([])
        setDistributionLiveSongs([])
      }

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

      // Command center snapshot (all plans)
      try {
        const artistRows = (data || []) as any[]
        const { data: allSongs } = await supabase
          .from('songs')
          .select('id, title, status, artist_id, lyrics_text, cover_image_url, spotify_cover_url, canvas_prompt, canvas_video_url, spotify_url, media_links, publish_content, suno_audio_url, internal_play_count, artists(name, page_enabled, page_slug, page_settings)')
          .eq('user_id', user.id)
          .limit(120)
        const songRows = (allSongs || []) as DashboardSongRow[]
        setDashboardSongs(songRows)

        const [
          participation,
          playbookCtx,
          storiesRes,
          ownedCampaigns,
          pendingMembersRes,
          newestSub,
          newestStoryRes,
          publishedStoriesRes,
          joinedCampaignsRes,
          publicCampaignsRes,
          streaks,
        ] = await Promise.all([
          fetchUserParticipationSummary(supabase, user.id).catch(() => null),
          fetchPlaybookContext(artistRows[0]?.id).catch(() => null),
          supabase.from('artist_stories').select('id, title, slug, artist_id, status').eq('user_id', user.id).in('status', ['draft', 'scheduled']).order('updated_at', { ascending: false }).limit(8),
          supabase.from('playlist_campaigns').select('id, title, artist_id, status').eq('user_id', user.id).in('status', ['open', 'active']).limit(20),
          supabase.from('playlist_campaigns').select('id').eq('user_id', user.id),
          supabase.from('newsletter_subscribers').select('email, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('artist_stories').select('id, title, slug, artist_id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('artist_stories').select('id, artist_id').eq('user_id', user.id).eq('status', 'published'),
          supabase.from('playlist_campaign_members').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'approved'),
          supabase.from('playlist_campaigns').select('id, title, genre, mood').eq('visibility', 'public').in('status', ['open', 'active']).eq('admin_hidden', false).limit(30),
          fetchParticipationStreaks(supabase, user.id).catch(() => null),
        ])

        let pendingMemberCount = 0
        const ownedIds = (pendingMembersRes.data || []).map((c: { id: string }) => c.id)
        if (ownedIds.length) {
          const { count } = await supabase
            .from('playlist_campaign_members')
            .select('id', { count: 'exact', head: true })
            .in('campaign_id', ownedIds)
            .eq('status', 'requested')
          pendingMemberCount = count || 0
        }

        const playbook = playbookCtx ? computePlaybookEngine(playbookCtx, lang, currentPlan.id) : null
        const topSongRow = [...songRows].sort((a, b) =>
          (b.internal_play_count || 0) - (a.internal_play_count || 0),
        )[0]
        const topArtistRow = [...artistRows].sort((a, b) => (b.songs?.[0]?.count ?? 0) - (a.songs?.[0]?.count ?? 0))[0]

        const publishedStories = (publishedStoriesRes.data || []) as { id: string; artist_id: string }[]
        const storyCountByArtist: Record<string, number> = {}
        for (const s of publishedStories) {
          storyCountByArtist[s.artist_id] = (storyCountByArtist[s.artist_id] || 0) + 1
        }
        const ownCampaignIds = (pendingMembersRes.data || []).map((c: { id: string }) => c.id)
        const artistPayload = artistRows.map((a: any) => ({
          id: a.id,
          name: a.name,
          genre: a.genre || '',
          avatar_url: a.avatar_url || null,
          spotify_image_url: a.spotify_image_url,
          page_enabled: a.page_enabled,
          page_slug: a.page_slug,
          page_settings: a.page_settings || null,
          spotify_url: a.spotify_url || null,
          song_count: a.songs?.[0]?.count ?? 0,
        }))
        const txMap = t[lang] as Record<string, string>
        const baseInput = {
          lang,
          artists: artistPayload,
          songs: songRows,
          participation,
          playbook,
          releaseTasks: releaseTasksForCmd,
          storyDrafts: (storiesRes.data || []) as { id: string; title: string; slug: string; artist_id: string; status: string }[],
          pendingMemberCount,
          campaignTitles: (ownedCampaigns.data || []) as { id: string; title: string; artist_id?: string }[],
          insights: {
            artistCount: artistRows.length,
            songCount: songRows.length,
            projectCount: artistRows.filter((a: any) => (a.songs?.[0]?.count ?? 0) > 0).length,
            topArtist: topArtistRow ? { id: topArtistRow.id, name: topArtistRow.name, avatar_url: topArtistRow.avatar_url } : null,
            topSong: topSongRow ? {
              id: topSongRow.id,
              title: topSongRow.title,
              cover_url: topSongRow.cover_image_url || topSongRow.spotify_cover_url || null,
              plays: topSongRow.internal_play_count || 0,
            } : null,
            newestSubscriber: newestSub.data ? { email: newestSub.data.email, created_at: newestSub.data.created_at } : null,
            newestStory: newestStoryRes.data ? {
              id: newestStoryRes.data.id,
              title: newestStoryRes.data.title,
              slug: newestStoryRes.data.slug,
              artist_id: newestStoryRes.data.artist_id,
            } : null,
          },
          tx: txMap,
        }
        const snapshot = buildCommandCenter(baseInput)
        const enriched = enrichCommandCenterSnapshot(snapshot, {
          ...baseInput,
          allActions: snapshot.allActions || [],
          displayName: userProfile?.display_name,
          publishedStoryCount: publishedStories.length,
          joinedCampaignCount: joinedCampaignsRes.count || 0,
          subscriberCount: playbookCtx?.subscriberCount ?? 0,
          storyCountByArtist,
          publicCampaigns: (publicCampaignsRes.data || []).map((c: { id: string; title: string; genre?: string }) => ({
            id: c.id,
            title: c.title,
            genre: c.genre,
          })),
          ownCampaignIds,
          streaks,
          proofStreakDays: participation?.weekApprovedCount,
        })
        setCommandSnapshot(enriched)
      } catch (e) {
        console.warn('[dashboard] command center build failed', e)
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
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 'normal', color: '#d4a843', letterSpacing: '2px' }}>VIATONE</h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#6a5a40', letterSpacing: '2px' }}>{tx.dashboard.toUpperCase()}</p>
          </div>
        </div>
        {/* Compact header: main nav + chat button + profile dropdown */}
        <div className="app-header-legacy-nav" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/discover" className="btn-outline" style={navLinkStyle}>🌍 {tx.discoverNavLink}</Link>
          <Link href="/charts" className="btn-outline" style={navLinkStyle} title={tx.analyticsLabelChartsHelp}>📈 {tx.analyticsLabelCharts}</Link>
          <Link href="/analytics" className="btn-outline" style={navLinkStyle} title={tx.analyticsLabelAccountHelp}>📊 {tx.analyticsLabelAccount}</Link>
          <Link href="/growth" className="btn-outline" style={navLinkStyle}>🌱 {tx.growthHubNavLink}</Link>
          <Link href="/playbook" className="btn-outline" style={navLinkStyle}>🧭 {tx.playbookNavLink}</Link>
          <Link href="/library" className="btn-outline" style={navLinkStyle}>🖼 {tx.mediaLibraryNavLink}</Link>
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

      <div className="page-pad dashboard-command-center-layout" style={{ padding: '32px 32px 100px', maxWidth: '1100px', margin: '0 auto' }}>
        {!loading && commandSnapshot && (
          <div className="dashboard-command-center">
            <DashboardCommandCenterHero
              snapshot={commandSnapshot}
              displayName={userProfile?.display_name}
              tx={tx as Record<string, string>}
              onCreateArtist={openCreate}
            />
            {commandSnapshot.todayActions && commandSnapshot.todayActions.length > 0 && (
              <DashboardTodayPanel actions={commandSnapshot.todayActions} tx={tx as Record<string, string>} />
            )}
            {commandSnapshot.quickWins && commandSnapshot.quickWins.length > 0 && (
              <DashboardQuickWins wins={commandSnapshot.quickWins} tx={tx as Record<string, string>} />
            )}
            <DashboardArtistStrip
              artists={commandSnapshot.artists}
              tx={tx as Record<string, string>}
              onCreateArtist={openCreate}
            />
            <DashboardActiveReleases
              releases={commandSnapshot.activeReleases}
              tx={tx as Record<string, string>}
              stage={commandSnapshot.stage}
              firstArtistId={artists[0]?.id}
            />
            <DashboardCommunityPanel
              snapshot={commandSnapshot}
              tx={tx as Record<string, string>}
              firstArtistId={artists[0]?.id}
            />
            <section className="dashboard-nav-section">
              <GrowthHubDashboardCard artistId={artists[0]?.id} />
            </section>
            <DashboardGrowthOpportunities opportunities={commandSnapshot.growthOpportunities} tx={tx as Record<string, string>} />
            {commandSnapshot.discoverOpportunities && commandSnapshot.discoverOpportunities.length > 0 && (
              <DashboardDiscoverOpportunities opportunities={commandSnapshot.discoverOpportunities} tx={tx as Record<string, string>} />
            )}
            <DashboardInsights insights={commandSnapshot.insights} snapshot={commandSnapshot} tx={tx as Record<string, string>} />
          </div>
        )}

        {/* Activity feed — directly below command center insights */}
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

        {planId === 'free' && <ViewerAdSlot placement="dashboard_card" planId={planId} />}

        <details className="dashboard-pro-details card workspace-card" style={{ marginBottom: 24, padding: 16 }}>
          <summary className="dashboard-pro-details__summary">{tx.cmdProDetails}</summary>
          <div className="dashboard-pro-details__body">
        {/* Top streamed songs widget */}
        <section className="dashboard-nav-section" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <h2 style={{ color: '#d4a843', fontSize: 13, fontWeight: 'normal', letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>
              ♪ {tx.dashboardSectionSongs}
            </h2>
            {topStreamedSongs.length > 0 && (
              <Link href="/charts" style={{ color: '#8a7a60', fontSize: 12, textDecoration: 'none' }}>
                {tx.analyticsLabelCharts} →
              </Link>
            )}
          </div>
          {topStreamedSongs.length > 0 ? (
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
          ) : (
            <div className="card" style={{ padding: 20 }}>
              <p style={{ color: '#8a7a60', fontSize: 13, margin: '0 0 12px' }}>{tx.dashboardSongsEmpty}</p>
              {artists[0] ? (
                <Link href={`/artist/${artists[0].id}#songs`} className="btn-gold" style={{ textDecoration: 'none' }}>{tx.openArtist} →</Link>
              ) : (
                <button type="button" className="btn-gold" onClick={openCreate}>{tx.newArtist}</button>
              )}
            </div>
          )}
        </section>

        {/* Release campaign timeline overview */}
        {planId === 'pro' && upcomingReleaseTasks.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <h2 style={{ color: '#d4a843', fontSize: 13, fontWeight: 'normal', letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>
                📣 {tx.dashboardReleaseTasks}
              </h2>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden', borderColor: 'rgba(212,168,67,0.22)' }}>
              {upcomingReleaseTasks.map((task, i) => {
                const state = releaseTaskState(task, lang)
                return (
                  <Link key={`${task.song_id}-${task.id}`} href={`/song/${task.song_id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderBottom: i < upcomingReleaseTasks.length - 1 ? '1px solid rgba(180,140,80,0.08)' : 'none', textDecoration: 'none', background: state.bg }}>
                    <div style={{ width: 86, flexShrink: 0 }}>
                      <div style={{ color: state.color, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>{state.label}</div>
                      <div style={{ color: '#8a7a60', fontSize: 11, marginTop: 2 }}>{new Date(`${task.due_date}T00:00:00`).toLocaleDateString(lang === 'no' ? 'nb-NO' : 'en-US', { day: '2-digit', month: 'short' })}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#e8e0d0', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                      <div style={{ color: '#8a7a60', fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.song_title}{task.artist_name ? ` · ${task.artist_name}` : ''}</div>
                    </div>
                    <span style={{ color: task.status === 'doing' ? '#d4a843' : '#6a5a40', fontSize: 11, textTransform: 'uppercase', flexShrink: 0 }}>
                      {task.status === 'doing' ? tx.timelineDoing : tx.timelineTodo}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
        {planId === 'free' && (
          <div style={{ marginBottom: 24 }}>
            <UpgradePrompt compact title={tx.dashboardReleaseTasksProTitle} description={tx.dashboardReleaseTasksProDesc} />
          </div>
        )}

        {/* Release readiness overview */}
        {planId === 'pro' && (almostReadySongs.length > 0 || missingKeySongs.length > 0) && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <h2 style={{ color: '#d4a843', fontSize: 13, fontWeight: 'normal', letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>
                ✅ {tx.dashboardReadinessTitle}
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              <div className="card" style={{ borderColor: 'rgba(123,200,123,0.22)' }}>
                <h3 style={{ color: '#7bc87b', fontWeight: 'normal', fontSize: 13, margin: '0 0 10px' }}>{tx.dashboardAlmostReady}</h3>
                {almostReadySongs.length === 0 ? (
                  <p style={{ color: '#6a5a40', fontSize: 12, margin: 0 }}>{tx.dashboardNoAlmostReady}</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {almostReadySongs.map(song => (
                      <Link key={song.id} href={`/song/${song.id}`} style={{ textDecoration: 'none', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', padding: '8px 10px', borderRadius: 6, background: 'rgba(123,200,123,0.07)', border: '1px solid rgba(123,200,123,0.18)' }}>
                        <span style={{ color: '#e8e0d0', fontSize: 13, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</span>
                        <span style={{ color: '#7bc87b', fontSize: 13, fontWeight: 700 }}>{song.score}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <div className="card" style={{ borderColor: 'rgba(224,112,112,0.22)' }}>
                <h3 style={{ color: '#e07070', fontWeight: 'normal', fontSize: 13, margin: '0 0 10px' }}>{tx.dashboardMissingKeyItems}</h3>
                {missingKeySongs.length === 0 ? (
                  <p style={{ color: '#6a5a40', fontSize: 12, margin: 0 }}>{tx.dashboardNoMissingKeyItems}</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {missingKeySongs.map(song => (
                      <Link key={song.id} href={`/song/${song.id}`} style={{ textDecoration: 'none', padding: '8px 10px', borderRadius: 6, background: 'rgba(224,112,112,0.06)', border: '1px solid rgba(224,112,112,0.16)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                          <span style={{ color: '#e8e0d0', fontSize: 13, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</span>
                          <span style={{ color: '#e07070', fontSize: 13, fontWeight: 700 }}>{song.score}</span>
                        </div>
                        <div style={{ color: '#8a7a60', fontSize: 11, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.missing.join(', ')}</div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {planId === 'free' && (
          <div style={{ marginBottom: 24 }}>
            <UpgradePrompt compact title={tx.dashboardReadinessProTitle} description={tx.dashboardReadinessProDesc} />
          </div>
        )}

        {/* Distribution preparation overview */}
        {planId === 'pro' && (distributionSetupSongs.length > 0 || distributionSubmittedSongs.length > 0 || distributionLiveSongs.length > 0) && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <h2 style={{ color: '#d4a843', fontSize: 13, fontWeight: 'normal', letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>
                📤 {tx.dashboardDistributionTitle}
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
              {[
                [tx.dashboardDistributionNeedsSetup, distributionSetupSongs, '#e07070'],
                [tx.dashboardDistributionSubmitted, distributionSubmittedSongs, '#d4a843'],
                [tx.dashboardDistributionLive, distributionLiveSongs, '#7bc87b'],
              ].map(([label, rows, color]) => (
                <div key={String(label)} className="card" style={{ borderColor: `${color}40` }}>
                  <h3 style={{ color: String(color), fontWeight: 'normal', fontSize: 13, margin: '0 0 10px' }}>{String(label)}</h3>
                  {(rows as DistributionOverviewSong[]).length === 0 ? (
                    <p style={{ color: '#6a5a40', fontSize: 12, margin: 0 }}>{tx.dashboardDistributionEmpty}</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(rows as DistributionOverviewSong[]).map(song => (
                        <Link key={song.id} href={`/song/${song.id}#distribution`} style={{ textDecoration: 'none', padding: '8px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.025)', border: `1px solid ${color}25` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                            <span style={{ color: '#e8e0d0', fontSize: 13, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</span>
                            <span style={{ color: String(color), fontSize: 13, fontWeight: 700 }}>{song.score}</span>
                          </div>
                          <div style={{ color: '#8a7a60', fontSize: 11, marginTop: 3 }}>{song.distributor || song.artist_name || '—'}</div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {planId === 'free' && (
          <div style={{ marginBottom: 24 }}>
            <UpgradePrompt compact title={tx.dashboardDistributionProTitle} description={tx.dashboardDistributionProDesc} />
          </div>
        )}

          </div>
        </details>

        <DashboardDiscoverHighlights />

        {onboardingStatus?.show && (
          <div className="card" style={{ marginBottom: 24, borderColor: 'rgba(212,168,67,0.35)', background: 'rgba(212,168,67,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: 16, margin: '0 0 6px' }}>
                  {tx.playbookDashboardTitle}
                </h2>
                <p style={{ color: '#a09080', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                  {tx.playbookDashboardDesc}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link href="/playbook" className="btn-gold" style={{ textDecoration: 'none' }}>{tx.playbookDashboardCta}</Link>
                <Link href="/onboarding" className="btn-outline" style={{ textDecoration: 'none' }}>{tx.playbookQuickSetup}</Link>
              </div>
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

        {/* Artist grid (full management) */}
        <details className="dashboard-artist-grid-details card workspace-card" style={{ marginBottom: 24, padding: 16 }}>
          <summary>{tx.yourArtists}</summary>
        <section className="dashboard-nav-section">
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
        </section>
        </details>

        <DashboardQuickActionBar
          tx={tx as Record<string, string>}
          firstArtistId={artists[0]?.id}
          onNewArtist={openCreate}
        />
      </div>
    </div>
  )
}
