'use client'

import Link from 'next/link'
import V2CircleCard from '@/components/v2/V2CircleCard'
import V2SessionCard from '@/components/v2/V2SessionCard'
import V2SongCard from '@/components/v2/V2SongCard'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import V2StreamEngineBlock from '@/components/v2/V2StreamEngineBlock'
import { useV2Toast } from '@/components/v2/V2Toast'
import {
  V2_CIRCLES,
  V2_COMMUNITY_STATS,
  V2_SESSIONS,
  V2_SONGS,
} from '@/lib/v2/mockData'
import { V2_ROUTES } from '@/lib/v2/routes'

const HERO_IMG = 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1800&q=80'

export default function CommunityHomePage() {
  const { showToast } = useV2Toast()

  const sessions = V2_SESSIONS.filter(s => s.status !== 'ended')
  const feedbackSongs = V2_SONGS.filter(s => s.needsFeedback)

  return (
    <>
      <section
        className="v2-hero v2-hero--image"
        style={{ ['--v2-hero-img' as string]: `url('${HERO_IMG}')` }}
      >
        <div className="v2-hero-inner">
          <div className="v2-eyebrow">
            <span className="v2-pulse" />
            {V2_COMMUNITY_STATS.membersStreamingNow} members streaming now · {V2_COMMUNITY_STATS.sessionsTonight} sessions tonight
          </div>
          <h2>
            <span className="v2-gradient-text">Build your sound.</span>
            <br />
            Get heard together.
          </h2>
          <p>
            ViaTone 2.0 brings independent artists, AI creators, playlist streamers and curators into one community built around Circles, Sessions and shared playlist growth.
          </p>
          <div className="v2-hero-actions">
            <Link href={V2_ROUTES.sessions} className="v2-btn hot">Join tonight&apos;s session</Link>
            <Link href={V2_ROUTES.circles} className="v2-btn secondary">Explore Circles</Link>
          </div>
        </div>
        <div className="v2-hero-stats">
          <div className="v2-stat"><strong>{V2_COMMUNITY_STATS.songsSubmitted}</strong><span>songs submitted</span></div>
          <div className="v2-stat"><strong>{V2_COMMUNITY_STATS.communityListeningHours}h</strong><span>community listening</span></div>
          <div className="v2-stat"><strong>{V2_COMMUNITY_STATS.feedbackCompletionPercent}%</strong><span>feedback completion</span></div>
        </div>
      </section>

      <section className="v2-section">
        <V2SectionHeader
          title="Upcoming sessions"
          lead="Live and planned listening events — stream together, react and give feedback."
          action={<Link href={V2_ROUTES.sessions} className="v2-btn secondary sm">All sessions</Link>}
        />
        <div className="v2-grid cols-2">
          {sessions.slice(0, 2).map(session => (
            <V2SessionCard
              key={session.id}
              session={session}
              onJoin={() => showToast(`Joined ${session.title}`)}
            />
          ))}
        </div>
      </section>

      <section className="v2-section">
        <V2SectionHeader
          title="Featured Circles"
          lead="Activity-based music rooms with sessions, playlists and clear expectations."
          action={
            <button type="button" className="v2-btn secondary sm" onClick={() => showToast('Create Circle — Host Pro')}>
              Create Circle
            </button>
          }
        />
        <div className="v2-grid cols-4">
          {V2_CIRCLES.filter(c => c.featured).map(circle => (
            <V2CircleCard
              key={circle.id}
              circle={circle}
              onJoin={() => showToast(`Joined ${circle.name}`)}
            />
          ))}
        </div>
      </section>

      {feedbackSongs.length > 0 && (
        <section className="v2-section">
          <V2SectionHeader title="Songs needing feedback" lead="Help creators improve before their next session." />
          <div className="v2-grid cols-3">
            {feedbackSongs.map(song => (
              <V2SongCard key={song.id} song={song} />
            ))}
          </div>
        </section>
      )}

      <section id="submit" className="v2-section">
        <div className="v2-card">
          <V2SectionHeader
            title="Submit song to a Session"
            lead="Add your track once, link platforms, and use it across Circles and Sessions."
            action={
              <div className="v2-tagrow">
                <span className="v2-tag">Spotify</span>
                <span className="v2-tag">YouTube</span>
                <span className="v2-tag">Tidal</span>
              </div>
            }
          />
          <p className="v2-meta" style={{ marginBottom: 16 }}>
            {/* TODO: wire to songs table + session_submissions */}
            MVP form — connects to Supabase in Phase 2.
          </p>
          <div className="v2-hero-actions">
            <button type="button" className="v2-btn hot" onClick={() => showToast('Song submitted to Dark Country Circle')}>
              Submit to session
            </button>
            <Link href={V2_ROUTES.songs} className="v2-btn secondary">Manage songs</Link>
          </div>
        </div>
      </section>

      <section className="v2-section">
        <V2StreamEngineBlock />
      </section>
    </>
  )
}
