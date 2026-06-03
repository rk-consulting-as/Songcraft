'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { NavArtistMeta, NavSongMeta } from '@/lib/navigation/badges'
import {
  parseArtistIdFromPath,
  parseArtistIdFromSearch,
  parseSongIdFromPath,
} from '@/lib/navigation/routes'

export type NavArtist = NavArtistMeta

export type NavSong = NavSongMeta

export type NavUserProfile = {
  id: string
  display_name: string | null
  avatar_url: string | null
  referral_code?: string | null
}

export type NavStudioPage = {
  slug: string | null
  enabled: boolean
}

type NavigationContextValue = {
  artists: NavArtist[]
  songs: NavSong[]
  currentArtistId: string | null
  currentArtist: NavArtist | null
  currentSongId: string | null
  currentSong: NavSong | null
  userProfile: NavUserProfile | null
  userRole: string | null
  studioPage: NavStudioPage | null
  unreadCount: number
  loadError: boolean
  expandedArtistIds: Set<string>
  expandedSections: Set<string>
  expandedSongIds: Set<string>
  toggleArtistExpanded: (artistId: string) => void
  toggleSectionExpanded: (sectionId: string) => void
  toggleSongExpanded: (songId: string) => void
  refreshArtists: () => Promise<void>
  pageHash: string
}

const NavigationContext = createContext<NavigationContextValue | null>(null)

export function useNavigationContext() {
  return useContext(NavigationContext)
}

function resolveCurrentArtistId(pathname: string | null, search: string, songArtistId: string | null): string | null {
  return parseArtistIdFromPath(pathname) || parseArtistIdFromSearch(search) || songArtistId
}

export function NavigationProvider({
  children,
  onLoadError,
}: {
  children: ReactNode
  onLoadError?: () => void
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams?.toString() ? `?${searchParams.toString()}` : ''

  const [artists, setArtists] = useState<NavArtist[]>([])
  const [songs, setSongs] = useState<NavSong[]>([])
  const [currentSong, setCurrentSong] = useState<NavSong | null>(null)
  const [userProfile, setUserProfile] = useState<NavUserProfile | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [studioPage, setStudioPage] = useState<NavStudioPage | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loadError, setLoadError] = useState(false)
  const [pageHash, setPageHash] = useState('')
  const [expandedArtistIds, setExpandedArtistIds] = useState<Set<string>>(new Set())
  const [expandedSongIds, setExpandedSongIds] = useState<Set<string>>(new Set())
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(['growth', 'analytics', 'assets', 'settings'])
  )

  const songIdFromPath = parseSongIdFromPath(pathname)
  const currentArtistId = resolveCurrentArtistId(pathname, search, currentSong?.artist_id ?? null)
  const currentArtist = artists.find(a => a.id === currentArtistId) ?? null

  useEffect(() => {
    const syncHash = () => setPageHash(window.location.hash.replace(/^#/, ''))
    syncHash()
    window.addEventListener('hashchange', syncHash)
    return () => window.removeEventListener('hashchange', syncHash)
  }, [pathname])

  const refreshArtists = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setArtists([])
      setSongs([])
      return
    }
    try {
      const [{ data: artistRows, error: artistErr }, { data: songRows, error: songErr }] = await Promise.all([
        supabase
          .from('artists')
          .select('id, name, genre, page_enabled, page_slug, page_settings, spotify_url, spotify_id, social_links')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('songs')
          .select('id, title, artist_id, status, public_hidden, cover_image_url, spotify_cover_url, lyrics_text, publish_content, media_links, spotify_url')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ])
      if (artistErr || songErr) throw artistErr || songErr
      setArtists((artistRows || []) as NavArtist[])
      setSongs((songRows || []) as NavSong[])
      setLoadError(false)
    } catch {
      setLoadError(true)
      onLoadError?.()
    }
  }, [onLoadError])

  useEffect(() => {
    void refreshArtists()
  }, [refreshArtists, pathname])

  useEffect(() => {
    if (!currentArtistId) return
    setExpandedArtistIds(prev => {
      if (prev.has(currentArtistId)) return prev
      const next = new Set(prev)
      next.add(currentArtistId)
      return next
    })
  }, [currentArtistId])

  useEffect(() => {
    if (!songIdFromPath) {
      setCurrentSong(null)
      return
    }
    const fromList = songs.find(s => s.id === songIdFromPath)
    if (fromList) {
      setCurrentSong(fromList)
      setExpandedSongIds(prev => {
        if (prev.has(songIdFromPath)) return prev
        const next = new Set(prev)
        next.add(songIdFromPath)
        return next
      })
      if (fromList.artist_id) {
        setExpandedArtistIds(prev => {
          if (prev.has(fromList.artist_id!)) return prev
          const next = new Set(prev)
          next.add(fromList.artist_id!)
          return next
        })
      }
      return
    }

    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const { data } = await supabase
        .from('songs')
        .select('id, title, artist_id, status, public_hidden, cover_image_url, spotify_cover_url, lyrics_text, publish_content, media_links, spotify_url')
        .eq('id', songIdFromPath)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!cancelled && data) {
        setCurrentSong(data as NavSong)
        setExpandedSongIds(prev => new Set(prev).add(songIdFromPath))
        if (data.artist_id) {
          setExpandedArtistIds(prev => new Set(prev).add(data.artist_id))
        }
      }
    })()
    return () => { cancelled = true }
  }, [songIdFromPath, songs])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      let prof: { id: string; role?: string; display_name: string | null; avatar_url?: string | null; referral_code?: string | null } | null = null
      const r1 = await supabase.from('profiles').select('id, role, display_name, avatar_url, referral_code').eq('id', user.id).maybeSingle()
      if (r1.error && /avatar_url|referral_code/i.test(r1.error.message || '')) {
        const r2 = await supabase.from('profiles').select('id, role, display_name').eq('id', user.id).maybeSingle()
        prof = r2.data
      } else {
        prof = r1.data
      }

      const { data: studio } = await supabase.from('studio_pages').select('slug, enabled').eq('user_id', user.id).maybeSingle()

      let unread = 0
      try {
        const { data: parts } = await supabase
          .from('conversation_participants')
          .select('conversation_id, last_read_at')
          .eq('user_id', user.id)
        if (parts?.length) {
          const readMap: Record<string, string> = {}
          for (const p of parts) readMap[p.conversation_id] = p.last_read_at || '1970-01-01T00:00:00Z'
          const convIds = parts.map(p => p.conversation_id)
          const { data: msgs } = await supabase
            .from('messages')
            .select('conversation_id, sender_id, created_at')
            .in('conversation_id', convIds)
            .eq('hidden', false)
            .neq('sender_id', user.id)
          for (const m of msgs || []) {
            if (new Date(m.created_at) > new Date(readMap[m.conversation_id])) unread++
          }
        }
      } catch { /* messages optional */ }

      if (cancelled) return
      if (prof) {
        setUserProfile({
          id: prof.id,
          display_name: prof.display_name,
          avatar_url: prof.avatar_url ?? null,
          referral_code: prof.referral_code ?? null,
        })
        setUserRole(prof.role ?? null)
      }
      setStudioPage(studio as NavStudioPage | null)
      setUnreadCount(unread)
    })()
    return () => { cancelled = true }
  }, [pathname])

  const toggleArtistExpanded = useCallback((artistId: string) => {
    setExpandedArtistIds(prev => {
      const next = new Set(prev)
      if (next.has(artistId)) next.delete(artistId)
      else next.add(artistId)
      return next
    })
  }, [])

  const toggleSongExpanded = useCallback((songId: string) => {
    setExpandedSongIds(prev => {
      const next = new Set(prev)
      if (next.has(songId)) next.delete(songId)
      else next.add(songId)
      return next
    })
  }, [])

  const toggleSectionExpanded = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }, [])

  const value = useMemo<NavigationContextValue>(() => ({
    artists,
    songs,
    currentArtistId,
    currentArtist,
    currentSongId: songIdFromPath,
    currentSong: currentSong || (songIdFromPath ? songs.find(s => s.id === songIdFromPath) ?? null : null),
    userProfile,
    userRole,
    studioPage,
    unreadCount,
    loadError,
    expandedArtistIds,
    expandedSections,
    expandedSongIds,
    toggleArtistExpanded,
    toggleSectionExpanded,
    toggleSongExpanded,
    refreshArtists,
    pageHash,
  }), [
    artists,
    songs,
    currentArtistId,
    currentArtist,
    songIdFromPath,
    currentSong,
    userProfile,
    userRole,
    studioPage,
    unreadCount,
    loadError,
    expandedArtistIds,
    expandedSections,
    expandedSongIds,
    toggleArtistExpanded,
    toggleSectionExpanded,
    toggleSongExpanded,
    refreshArtists,
    pageHash,
  ])

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  )
}
