'use client'

import Link from 'next/link'
import V2CircleCard from '@/components/v2/V2CircleCard'
import V2SessionCard from '@/components/v2/V2SessionCard'
import V2SongCard from '@/components/v2/V2SongCard'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import V2StreamEngineBlock from '@/components/v2/V2StreamEngineBlock'
import { useV2Toast } from '@/components/v2/V2Toast'
import { V2_COMMUNITY_STATS } from '@/lib/v2/mockData'
import { V2_ROUTES } from '@/lib/v2/routes'
import type { CommunityPersonalization } from '@/lib/v2/data/personalization'
import type { V2Circle, V2Session, V2Song } from '@/lib/v2/types'

const HERO_IMG = 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1800&q=80'

type Props = {
  sessions: V2Session[]
  circles: V2Circle[]
  feedbackSongs: V2Song[]
  usingDemoData?: boolean
  personalization: CommunityPersonalization
}

export default function CommunityHomeClient({ sessions, circles, feedbackSongs, usingDemoData, personalization }: Props) {
  const { showToast } = useV2Toast()

  const upcoming = sessions.filter(s => s.status !== 'ended')
  const featured = circles.filter(c => c.featured)
  const { myCircles, mySubmissions, recommendedCircles, feedbackReceivedCount, userId, liveSessions, recentCompletedSessions, recentRoomActivity, myParticipationSummary } = personalization

  return (
    <>
      {usingDemoData && (
        <p className="v2-meta" style={{ marginBottom: 12 }}>
          Previewing demo community data — run migrations to seed live circles and sessions.
        </p>
      )}

      {userId && myCircles.length > 0 && (
        <section className="v2-section" style={{ marginTop: 0 }}>
          <V2SectionHeader title="My circles" lead="Rooms you have joined." action={<Link href={V2_ROUTES.circles} className="v2-btn secondary sm">All circles</Link>} />
          <div className="v2-grid cols-4">
            {myCircles.slice(0, 4).map(circle => (
              <V2CircleCard key={circle.id} circle={circle} />
            ))}
          </div>
        </section>
      )}

      <section
        className="v2-hero v2-hero--image"
        style={{ ['--v2-hero-img' as string]: `url('${HERO_IMG}')` }}
      >
        <div className="v2-hero-inner">
          <div className="v2-eyebrow">
            <span className="v2-pulse" />
            {V2_COMMUNITY_STATS.membersStreamingNow} members streaming now · {upcoming.length || V2_COMMUNITY_STATS.sessionsTonight} sessions upcoming
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
            <Link href={V2_ROUTES.sessions} className="v2-btn hot">Join a session</Link>
            <Link href={V2_ROUTES.circles} className="v2-btn secondary">Explore Circles</Link>
          </div>
        </div>
        <div className="v2-hero-stats">
          <div className="v2-stat"><strong>{mySubmissions.length || V2_COMMUNITY_STATS.songsSubmitted}</strong><span>songs submitted</span></div>
          <div className="v2-stat"><strong>{feedbackReceivedCount || '—'}</strong><span>feedback received</span></div>
          <div className="v2-stat"><strong>{myCircles.length}</strong><span>circles joined</span></div>
        </div>
      </section>

      <section className="v2-section">
        <V2SectionHeader
          title={personalization.joinedSessions.length ? 'Sessions I joined' : 'Upcoming sessions'}
          lead="Live and planned listening events — stream together, react and give feedback."
          action={<Link href={V2_ROUTES.sessions} className="v2-btn secondary sm">All sessions</Link>}
        />
        <div className="v2-grid cols-2">
          {upcoming.slice(0, 2).map(session => (
            <V2SessionCard key={session.id} session={session} onJoin={() => showToast(`Joined ${session.title}`)} />
          ))}
        </div>
      </section>

      {liveSessions.length > 0 && (
        <section className="v2-section">
          <V2SectionHeader title="Live now" lead="Stream Engine beta — join a listening room." action={<Link href={V2_ROUTES.sessions} className="v2-btn secondary sm">All sessions</Link>} />
          <div className="v2-grid cols-2">
            {liveSessions.map(session => (
              <V2SessionCard key={session.id} session={session} />
            ))}
          </div>
        </section>
      )}

      {userId && (
        <section className="v2-section">
          <V2SectionHeader title="My participation" lead="Your community listening activity." />
          <div className="v2-grid cols-3">
            <div className="v2-stat"><strong>{myParticipationSummary.sessionsJoined}</strong><span>sessions joined</span></div>
            <div className="v2-stat"><strong>{myParticipationSummary.sessionsListened}</strong><span>sessions listened</span></div>
            <div className="v2-stat"><strong>{myParticipationSummary.playlistSubmissions}</strong><span>playlist submits</span></div>
          </div>
        </section>
      )}

      {recentCompletedSessions.length > 0 && (
        <section className="v2-section">
          <V2SectionHeader title="Recent session recaps" lead="Completed listening rooms — powered by Stream Engine beta." />
          <div className="v2-grid cols-2">
            {recentCompletedSessions.map(recap => (
              <article key={recap.sessionId} className="v2-card v2-recap">
                <h4 style={{ margin: '0 0 8px' }}>{recap.title}</h4>
                <p className="v2-meta">{recap.songsPlayed.length} songs · {recap.participantCount} participants · {recap.feedbackCount} feedback</p>
                <Link href={V2_ROUTES.session(recap.sessionId)} className="v2-btn secondary sm" style={{ marginTop: 12 }}>View recap</Link>
              </article>
            ))}
          </div>
        </section>
      )}

      {recentRoomActivity.length > 0 && (
        <section className="v2-section">
          <V2SectionHeader title="Playlist room activity" action={<Link href={V2_ROUTES.playlists} className="v2-btn secondary sm">All rooms</Link>} />
          <div className="v2-card">
            {recentRoomActivity.map(room => (
              <div key={room.roomSlug} className="v2-track">
                <span className="num">♫</span>
                <div><b>{room.roomName}</b><span>{room.lastPlayedTitle ? `Last: ${room.lastPlayedTitle}` : 'No plays yet'} · {room.roundStatus}</span></div>
                <Link href={V2_ROUTES.playlistRoom(room.roomSlug)} className="v2-btn sm secondary">Open</Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {userId && mySubmissions.length > 0 && (
        <section className="v2-section">
          <V2SectionHeader title="My submissions" lead="Tracks you sent to circles, sessions and playlist rooms." />
          <div className="v2-card">
            {mySubmissions.map(s => (
              <div key={s.id} className="v2-track">
                <span className="num">♪</span>
                <div><b>{s.title}</b><span>{s.targetLabel} · {s.targetType}</span></div>
                <span className="v2-tag">{s.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="v2-section">
        <V2SectionHeader
          title={recommendedCircles.length ? 'Recommended for you' : 'Featured Circles'}
          lead="Based on your artist genres and community activity."
          action={
            <button type="button" className="v2-btn secondary sm" onClick={() => showToast('Create Circle — Host Pro')}>
              Create Circle
            </button>
          }
        />
        <div className="v2-grid cols-4">
          {(recommendedCircles.length ? recommendedCircles : featured).slice(0, 4).map(circle => (
            <V2CircleCard key={circle.id} circle={circle} onJoin={() => showToast(`Joined ${circle.name}`)} />
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
          />
          <p className="v2-meta" style={{ marginBottom: 16 }}>
            Open a session or circle page to submit — host approval required before queue.
          </p>
          <div className="v2-hero-actions">
            <Link href={V2_ROUTES.sessions} className="v2-btn hot">Browse sessions</Link>
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
