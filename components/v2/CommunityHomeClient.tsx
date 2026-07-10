'use client'

import Link from 'next/link'
import { useState } from 'react'
import V2CircleCard from '@/components/v2/V2CircleCard'
import V2CommunityBenefits from '@/components/v2/V2CommunityBenefits'
import V2CommunityFollowsBlock from '@/components/v2/V2CommunityFollowsBlock'
import V2CommunityDigest from '@/components/v2/V2CommunityDigest'
import V2CommunityHowItWorks from '@/components/v2/V2CommunityHowItWorks'
import V2CommunityNextActions from '@/components/v2/V2CommunityNextActions'
import V2CommunityNotificationCenter from '@/components/v2/V2CommunityNotificationCenter'
import V2CommunityStartHere from '@/components/v2/V2CommunityStartHere'
import V2CommunityWelcome from '@/components/v2/V2CommunityWelcome'
import V2CommunityWelcomeModal from '@/components/v2/V2CommunityWelcomeModal'
import V2EmptyState from '@/components/v2/V2EmptyState'
import V2GuidedFirstActions from '@/components/v2/V2GuidedFirstActions'
import V2HomeScheduleBlock from '@/components/v2/V2HomeScheduleBlock'
import V2SessionCard from '@/components/v2/V2SessionCard'
import V2SessionRecapCard from '@/components/v2/V2SessionRecapCard'
import V2SongCard from '@/components/v2/V2SongCard'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import V2StreamEngineBlock from '@/components/v2/V2StreamEngineBlock'
import V2SupporterBadges, { V2SupporterScoreGrid } from '@/components/v2/V2SupporterBadges'
import { useV2Toast } from '@/components/v2/V2Toast'
import { V2_COMMUNITY_STATS } from '@/lib/v2/mockData'
import { V2_ROUTES } from '@/lib/v2/routes'
import type { CommunityPersonalization } from '@/lib/v2/data/personalization'
import type {
  V2Circle,
  V2CalendarSession,
  V2CommunityNotificationView,
  V2CommunityReminder,
  V2Session,
  V2Song,
  V2WeeklyDigest,
} from '@/lib/v2/types'

type HomeSchedule = {
  liveNow: V2CalendarSession[]
  startingSoon: V2CalendarSession[]
  thisWeek: V2CalendarSession[]
  myRsvps: V2CalendarSession[]
  hostingSoon: V2CalendarSession[]
}

const HERO_IMG = 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1800&q=80'

type Props = {
  sessions: V2Session[]
  circles: V2Circle[]
  feedbackSongs: V2Song[]
  usingDemoData?: boolean
  personalization: CommunityPersonalization
  notifications: V2CommunityNotificationView[]
  unreadCount: number
  reminders: V2CommunityReminder[]
  weeklyDigest: V2WeeklyDigest
  homeSchedule?: HomeSchedule
}

export default function CommunityHomeClient({
  sessions,
  circles,
  feedbackSongs,
  usingDemoData,
  personalization,
  notifications,
  unreadCount,
  reminders,
  weeklyDigest,
  homeSchedule,
}: Props) {
  const { showToast } = useV2Toast()

  const upcoming = sessions.filter(s => s.status !== 'ended')
  const featured = circles.filter(c => c.featured)
  const {
    myCircles,
    joinedSessions,
    mySubmissions,
    recommendedCircles,
    feedbackReceivedCount,
    userId,
    liveSessions,
    recentCompletedSessions,
    recentRoomActivity,
    myParticipationSummary,
    supporterScore,
    badges,
    suggestedAction,
    activityEvidenceAvailable,
    hostCta,
    catalogSnapshot,
    followedActivity,
    savedSessions,
    savedRooms,
  } = personalization

  const firstCircleSlug = myCircles[0]?.slug || recommendedCircles[0]?.slug || featured[0]?.slug
  const firstSessionId = joinedSessions[0]?.id || upcoming[0]?.id || liveSessions[0]?.id

  const [howItWorksOpen, setHowItWorksOpen] = useState(false)

  const activityScore =
    myCircles.length +
    myParticipationSummary.sessionsJoined +
    myParticipationSummary.sessionsListened +
    mySubmissions.length
  const lowActivity = !!userId && activityScore < 3

  const scrollToStart = () => {
    if (typeof document === 'undefined') return
    const el = document.getElementById('v2-start-here') || document.getElementById('v2-welcome-title')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      {userId && <V2CommunityWelcomeModal onHowItWorks={() => setHowItWorksOpen(true)} />}
      <V2CommunityHowItWorks open={howItWorksOpen} onClose={() => setHowItWorksOpen(false)} />

      <V2CommunityWelcome
        onHowItWorks={() => setHowItWorksOpen(true)}
        onStartHere={scrollToStart}
      />

      {usingDemoData && (
        <p className="v2-meta" style={{ marginBottom: 12 }}>
          Previewing demo community data — run migrations to seed live circles and sessions.
        </p>
      )}

      {lowActivity && <V2CommunityStartHere />}

      {lowActivity && (
        <V2GuidedFirstActions
          artistCount={catalogSnapshot.artistCount}
          songCount={catalogSnapshot.songCount}
          circlesJoined={myCircles.length}
          submissionsCount={mySubmissions.length}
          sessionsJoined={myParticipationSummary.sessionsJoined}
          firstCircleSlug={firstCircleSlug}
          firstSessionId={firstSessionId}
        />
      )}

      {userId && hostCta && (
        <section className="v2-section" style={{ marginTop: 0 }}>
          <div className="v2-card v2-host-cta">
            {hostCta === 'dashboard' ? (
              <>
                <h4 style={{ margin: '0 0 8px' }}>Your host dashboard</h4>
                <p className="v2-meta">Manage sessions, submissions, playlist rooms and participation.</p>
                <Link href={V2_ROUTES.host} className="v2-btn hot sm">Open Host Dashboard</Link>
              </>
            ) : (
              <>
                <h4 style={{ margin: '0 0 8px' }}>Become a Host</h4>
                <p className="v2-meta">Run circles, sessions and playlist rooms with Host Pro curator tools.</p>
                <Link href={V2_ROUTES.host} className="v2-btn hot sm">Explore hosting</Link>
              </>
            )}
          </div>
        </section>
      )}

      {userId && (!lowActivity || notifications.length > 0 || reminders.length > 0) && (
        <section className="v2-section" style={{ marginTop: 0 }}>
          <div className="v2-activity-grid">
            <V2CommunityNotificationCenter
              initialNotifications={notifications}
              initialUnread={unreadCount}
              maxCollapsed={5}
            />
            <V2CommunityNextActions reminders={reminders} />
          </div>
        </section>
      )}

      {userId && !lowActivity && (
        <section className="v2-section" style={{ marginTop: 0 }}>
          <V2CommunityDigest digest={weeklyDigest} />
        </section>
      )}

      {homeSchedule && (
        <V2HomeScheduleBlock
          liveNow={homeSchedule.liveNow}
          startingSoon={homeSchedule.startingSoon}
          thisWeek={homeSchedule.thisWeek}
          myRsvps={homeSchedule.myRsvps}
          hostingSoon={homeSchedule.hostingSoon}
          lowActivity={lowActivity}
        />
      )}

      {userId && followedActivity && (
        <V2CommunityFollowsBlock
          circleSessions={followedActivity.circleSessions}
          hostSessions={followedActivity.hostSessions}
          followedCircles={followedActivity.followedCircles}
          savedSessions={savedSessions || []}
          savedRooms={savedRooms || []}
        />
      )}

      {userId && myCircles.length > 0 ? (
        <section className="v2-section" style={{ marginTop: 0 }}>
          <V2SectionHeader title="My circles" lead="Rooms you have joined." action={<Link href={V2_ROUTES.circles} className="v2-btn secondary sm">All circles</Link>} />
          <div className="v2-grid cols-4">
            {myCircles.slice(0, 4).map(circle => (
              <V2CircleCard key={circle.id} circle={circle} />
            ))}
          </div>
        </section>
      ) : userId ? (
        <section className="v2-section" style={{ marginTop: 0 }}>
          <V2EmptyState
            icon="○"
            title="No circles joined yet"
            description="Join a circle to submit songs, see sessions and connect with listeners in your genre."
            actionLabel="Browse circles"
            actionHref={V2_ROUTES.circles}
          />
        </section>
      ) : null}

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
          title={joinedSessions.length ? 'Sessions I joined' : 'Upcoming sessions'}
          lead="Live and planned listening events — stream together, react and give feedback."
          action={
            <div className="v2-hero-actions">
              <Link href={V2_ROUTES.calendar} className="v2-btn secondary sm">View Calendar</Link>
              <Link href={V2_ROUTES.sessions} className="v2-btn secondary sm">All sessions</Link>
            </div>
          }
        />
        {upcoming.length > 0 ? (
          <div className="v2-grid cols-2">
            {(joinedSessions.length ? joinedSessions.filter(s => s.status !== 'ended') : upcoming).slice(0, 2).map(session => (
              <V2SessionCard key={session.id} session={session} onJoin={() => showToast(`Joined ${session.title}`)} />
            ))}
          </div>
        ) : userId ? (
          <V2EmptyState
            icon="◎"
            title="No sessions joined yet"
            description="Pick an upcoming listening session, join the room, and confirm when you listened."
            actionLabel="Find a session"
            actionHref={V2_ROUTES.sessions}
          />
        ) : (
          <p className="v2-meta">Log in to join sessions and track your participation.</p>
        )}
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
          <V2SectionHeader
            title="My supporter score"
            lead="Participation, listening activity, support and feedback — not verified streams."
            action={<Link href={V2_ROUTES.participation} className="v2-btn secondary sm">Full history</Link>}
          />
          <div className="v2-card">
            <V2SupporterScoreGrid summary={supporterScore} compact />
            <div style={{ marginTop: 16 }}>
              <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>Active badges</h4>
              <V2SupporterBadges badges={badges} compact />
            </div>
            {activityEvidenceAvailable && (
              <p className="v2-meta v2-evidence-hint" style={{ marginTop: 12, marginBottom: 0 }}>
                Activity evidence available from Last.fm or playlist campaigns — optional bridge, not merged yet.
              </p>
            )}
            {suggestedAction && (
              <div className="v2-suggested-action" style={{ marginTop: 16 }}>
                <p className="v2-meta" style={{ margin: '0 0 8px' }}>{suggestedAction.reason}</p>
                <Link href={suggestedAction.href} className="v2-btn hot sm">{suggestedAction.label}</Link>
              </div>
            )}
          </div>
        </section>
      )}

      {userId && (
        <section className="v2-section">
          <V2SectionHeader title="My participation" lead="Quick summary of your community listening activity." />
          <div className="v2-grid cols-3">
            <div className="v2-stat"><strong>{myParticipationSummary.sessionsJoined}</strong><span>sessions joined</span></div>
            <div className="v2-stat"><strong>{myParticipationSummary.sessionsListened}</strong><span>listening confirmed</span></div>
            <div className="v2-stat"><strong>{myParticipationSummary.playlistSubmissions}</strong><span>playlist submits</span></div>
          </div>
        </section>
      )}

      {recentCompletedSessions.length > 0 && (
        <section className="v2-section">
          <V2SectionHeader title="Recent session recaps" lead="Completed listening rooms — powered by Stream Engine beta." />
          <div className="v2-grid cols-2">
            {recentCompletedSessions.map(recap => (
              <V2SessionRecapCard key={recap.sessionId} recap={recap} compact />
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

      {userId && mySubmissions.length > 0 ? (
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
      ) : userId ? (
        <section className="v2-section">
          <V2EmptyState
            icon="♪"
            title="No songs submitted yet"
            description="Add a song in Legacy Studio, join a circle, then submit it for feedback or a session queue."
            actionLabel="Open Legacy Studio"
            actionHref={V2_ROUTES.legacyStudio}
          />
        </section>
      ) : null}

      {userId && feedbackReceivedCount === 0 && (
        <section className="v2-section">
          <V2EmptyState
            icon="💬"
            title="No feedback received yet"
            description="Submit songs to circles and sessions — listeners can leave ratings and notes on your tracks."
            actionLabel="Browse songs"
            actionHref={V2_ROUTES.songs}
          />
        </section>
      )}

      <section className="v2-section">
        <V2SectionHeader
          title={recommendedCircles.length ? 'Recommended for you' : 'Featured Circles'}
          lead="Based on your artist genres and community activity."
          action={
            <Link href={V2_ROUTES.host} className="v2-btn secondary sm">Create Circle</Link>
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

      <V2CommunityBenefits />

      <section className="v2-section">
        <V2StreamEngineBlock />
      </section>
    </>
  )
}
