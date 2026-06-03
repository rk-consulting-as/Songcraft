'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  parseArtistIdFromPath,
  parseArtistIdFromSearch,
  parseSongIdFromPath,
} from '@/lib/navigation/routes'

export type NavArtist = {
  id: string
  name: string
  genre: string | null
}

export type NavSong = {
  id: string
  title: string
  artist_id: string | null
}

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
  currentArtistId: string | null
  currentArtist: NavArtist | null
  currentSongId: string | null
  currentSong: NavSong | null
  userProfile: NavUserProfile | null
  userRole: string | null
  studioPage: NavStudioPage | null
  unreadCount: number
  expandedArtistIds: Set<string>
  expandedSections: Set<string>
  toggleArtistExpanded: (artistId: string) => void
  toggleSectionExpanded: (sectionId: string) => void
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

export function NavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams?.toString() ? `?${searchParams.toString()}` : ''

  const [artists, setArtists] = useState<NavArtist[]>([])
  const [currentSong, setCurrentSong] = useState<NavSong | null>(null)
  const [userProfile, setUserProfile] = useState<NavUserProfile | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [studioPage, setStudioPage] = useState<NavStudioPage | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [pageHash, setPageHash] = useState('')
  const [expandedArtistIds, setExpandedArtistIds] = useState<Set<string>>(new Set())
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
      return
    }
    const { data } = await supabase
      .from('artists')
      .select('id, name, genre')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    setArtists((data || []) as NavArtist[])
  }, [])

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
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const { data } = await supabase
        .from('songs')
        .select('id, title, artist_id')
        .eq('id', songIdFromPath)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!cancelled) setCurrentSong(data as NavSong | null)
    })()
    return () => { cancelled = true }
  }, [songIdFromPath])

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
    currentArtistId,
    currentArtist,
    currentSongId: songIdFromPath,
    currentSong,
    userProfile,
    userRole,
    studioPage,
    unreadCount,
    expandedArtistIds,
    expandedSections,
    toggleArtistExpanded,
    toggleSectionExpanded,
    refreshArtists,
    pageHash,
  }), [
    artists,
    currentArtistId,
    currentArtist,
    songIdFromPath,
    currentSong,
    userProfile,
    userRole,
    studioPage,
    unreadCount,
    expandedArtistIds,
    expandedSections,
    toggleArtistExpanded,
    toggleSectionExpanded,
    refreshArtists,
    pageHash,
  ])

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  )
}
