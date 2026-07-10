'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import V2CircleCard from '@/components/v2/V2CircleCard'
import V2CommunityBenefits from '@/components/v2/V2CommunityBenefits'
import V2CommunityHowItWorks from '@/components/v2/V2CommunityHowItWorks'
import V2CommunityWelcome from '@/components/v2/V2CommunityWelcome'
import V2EmptyState from '@/components/v2/V2EmptyState'
import V2PublicAuthCta from '@/components/v2/V2PublicAuthCta'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import V2SessionAgendaCard from '@/components/v2/V2SessionAgendaCard'
import { buildSignupUrl } from '@/lib/v2/authReturn'
import { V2_ROUTES } from '@/lib/v2/routes'
import type { V2Circle, V2PlaylistRoom, V2PublicExploreData, V2Session } from '@/lib/v2/types'

type Props = V2PublicExploreData & {
  initialFilters: {
    genre?: string
    platform?: string
    status?: string
    type?: string
  }
  discoverySummary?: {
    topCircles: { slug: string; name: string; followerCount: number }[]
    topHosts: { id: string; name: string; followerCount: number }[]
    topSessions: { id: string; title: string; saveCount: number }[]
  }
}

export default function V2PublicExploreClient({
  featuredCircles,
  upcomingSessions,
  liveSessions,
  playlistRooms,
  genres,
  platforms,
  initialFilters,
  discoverySummary,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [howOpen, setHowOpen] = useState(false)
  const [genre, setGenre] = useState(initialFilters.genre || '')
  const [platform, setPlatform] = useState(initialFilters.platform || '')
  const [status, setStatus] = useState(initialFilters.status || 'all')
  const [type, setType] = useState(initialFilters.type || 'all')

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams()
    if (genre) params.set('genre', genre)
    if (platform) params.set('platform', platform)
    if (status && status !== 'all') params.set('status', status)
    if (type && type !== 'all') params.set('type', type)
    const q = params.toString()
    router.push(q ? `${V2_ROUTES.explore}?${q}` : V2_ROUTES.explore)
  }, [genre, platform, status, type, router])

  const sessions = [...liveSessions, ...upcomingSessions.filter(s => !liveSessions.some(l => l.id === s.id))]
  const showCircles = type === 'all' || type === 'circle'
  const showSessions = type === 'all' || type === 'session'
  const showRooms = type === 'all' || type === 'playlist_room'

  return (
    <>
      <V2CommunityHowItWorks open={howOpen} onClose={() => setHowOpen(false)} />
      <V2CommunityWelcome
        onHowItWorks={() => setHowOpen(true)}
        onStartHere={() => {
          document.getElementById('v2-explore-discover')?.scrollIntoView({ behavior: 'smooth' })
        }}
      />

      <section className="v2-section" style={{ marginTop: 0 }}>
        <V2PublicAuthCta
          returnPath={searchParams.toString() ? `${V2_ROUTES.explore}?${searchParams.toString()}` : V2_ROUTES.explore}
          title="Join ViaTone Community"
          description="Create a free account to join circles, RSVP to sessions, submit songs, and grow with listeners."
          primaryLabel="Sign in"
          secondaryLabel="Sign up free"
        />
      </section>

      <V2CommunityBenefits />

      {discoverySummary && (discoverySummary.topCircles.length > 0 || discoverySummary.topHosts.length > 0) && (
        <section className="v2-section">
          <V2SectionHeader title="Community highlights" lead="Popular circles and hosts — aggregate counts only." />
          <div className="v2-grid cols-2">
            {discoverySummary.topCircles.length > 0 && (
              <div className="v2-card">
                <h4 style={{ margin: '0 0 12px' }}>Top circles</h4>
                {discoverySummary.topCircles.map(c => (
                  <div key={c.slug} className="v2-track">
                    <span className="num">○</span>
                    <div><b><Link href={V2_ROUTES.circle(c.slug)}>{c.name}</Link></b><span>{c.followerCount} followers</span></div>
                  </div>
                ))}
              </div>
            )}
            {discoverySummary.topHosts.length > 0 && (
              <div className="v2-card">
                <h4 style={{ margin: '0 0 12px' }}>Top hosts</h4>
                {discoverySummary.topHosts.map(h => (
                  <div key={h.id} className="v2-track">
                    <span className="num">★</span>
                    <div><b><Link href={V2_ROUTES.hostProfile(h.id)}>{h.name}</Link></b><span>{h.followerCount} followers</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section id="v2-explore-discover" className="v2-section v2-explore-filters">
        <V2SectionHeader
          title="Discover"
          lead="Public circles, sessions, and playlist rooms — filter by genre, platform, or type."
        />
        <div className="v2-explore-filters__row">
          <select className="v2-input" value={type} onChange={e => setType(e.target.value)} aria-label="Content type">
            <option value="all">All types</option>
            <option value="circle">Circles</option>
            <option value="session">Sessions</option>
            <option value="playlist_room">Playlist rooms</option>
          </select>
          <select className="v2-input" value={genre} onChange={e => setGenre(e.target.value)} aria-label="Genre">
            <option value="">All genres</option>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select className="v2-input" value={platform} onChange={e => setPlatform(e.target.value)} aria-label="Platform">
            <option value="">All platforms</option>
            {platforms.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {showSessions && (
            <select className="v2-input" value={status} onChange={e => setStatus(e.target.value)} aria-label="Session status">
              <option value="all">Any status</option>
              <option value="live">Live</option>
              <option value="upcoming">Upcoming</option>
              <option value="ended">Completed</option>
            </select>
          )}
          <button type="button" className="v2-btn hot sm" onClick={applyFilters}>Apply</button>
        </div>
      </section>

      {showSessions && liveSessions.length > 0 && (
        <section className="v2-section" style={{ marginTop: 0 }}>
          <V2SectionHeader title="Live now" lead="Listening events happening right now." />
          {liveSessions.map(s => <V2SessionAgendaCard key={s.id} session={s} compact />)}
        </section>
      )}

      {showSessions && (
        <section className="v2-section" style={{ marginTop: 0 }}>
          <V2SectionHeader title="Upcoming sessions" action={<Link href={V2_ROUTES.sessions} className="v2-btn secondary sm">All sessions</Link>} />
          {sessions.filter(s => s.status !== 'live').length === 0 ? (
            <V2EmptyState icon="◎" title="No public sessions match" description="Try different filters or check back soon." actionLabel="Browse circles" actionHref={V2_ROUTES.circles} />
          ) : (
            sessions.filter(s => s.status !== 'live').slice(0, 8).map(s => <V2SessionAgendaCard key={s.id} session={s} compact />)
          )}
        </section>
      )}

      {showCircles && (
        <section className="v2-section">
          <V2SectionHeader title="Featured circles" action={<Link href={V2_ROUTES.circles} className="v2-btn secondary sm">All circles</Link>} />
          {featuredCircles.length === 0 ? (
            <V2EmptyState icon="○" title="No public circles yet" description="Hosts are setting up listening communities. Sign up to be first in the room." actionLabel="Sign up" actionHref={buildSignupUrl(V2_ROUTES.explore)} />
          ) : (
            <div className="v2-grid cols-3">
              {featuredCircles.slice(0, 6).map(c => <V2CircleCard key={c.id} circle={c} />)}
            </div>
          )}
        </section>
      )}

      {showRooms && (
        <section className="v2-section">
          <V2SectionHeader title="Playlist rooms" action={<Link href={V2_ROUTES.playlists} className="v2-btn secondary sm">All rooms</Link>} />
          {playlistRooms.length === 0 ? (
            <p className="v2-meta">No public playlist rooms yet.</p>
          ) : (
            <div className="v2-grid cols-2">
              {playlistRooms.map(room => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          )}
        </section>
      )}
    </>
  )
}

function RoomCard({ room }: { room: V2PlaylistRoom }) {
  return (
    <Link href={V2_ROUTES.playlistRoom(room.slug)} className="v2-card v2-agenda-card" style={{ textDecoration: 'none', color: 'inherit' }}>
      <div>
        <h4 style={{ margin: '0 0 4px' }}>{room.name}</h4>
        <p className="v2-meta">{room.platform} · {room.trackCount} tracks{room.circleSlug ? ` · ${room.circleSlug}` : ''}</p>
      </div>
    </Link>
  )
}
