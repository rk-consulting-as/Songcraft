'use client'

import Link from 'next/link'
import { useState } from 'react'
import V2EmptyState from '@/components/v2/V2EmptyState'
import { V2FollowCircleButton, V2FollowHostButton, V2SavePlaylistRoomButton, V2SaveSessionButton } from '@/components/v2/V2CommunityFollowSaveButtons'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import V2SessionAgendaCard from '@/components/v2/V2SessionAgendaCard'
import { V2_ROUTES } from '@/lib/v2/routes'
import type { V2FollowSaveLibrary } from '@/lib/v2/data/followsSaves'

type Tab = 'following' | 'sessions' | 'rooms' | 'rsvps'

type Props = V2FollowSaveLibrary

export default function V2CommunitySavedClient(props: Props) {
  const [tab, setTab] = useState<Tab>('following')

  return (
    <>
      <V2SectionHeader title="My Community" lead="Circles and hosts you follow, plus saved sessions and rooms." />

      <div className="v2-calendar-tabs" role="tablist">
        {([
          ['following', 'Following'],
          ['sessions', 'Saved Sessions'],
          ['rooms', 'Saved Rooms'],
          ['rsvps', 'My RSVPs'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`v2-btn sm${tab === id ? ' hot' : ' secondary'}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'following' && (
        <div className="v2-section" style={{ marginTop: 0 }}>
          {props.followedCircles.length === 0 && props.followedHosts.length === 0 ? (
            <V2EmptyState icon="○" title="Not following yet" description="Follow circles and hosts from explore or public pages." actionLabel="Explore" actionHref={V2_ROUTES.explore} />
          ) : (
            <>
              {props.followedCircles.map(c => (
                <div key={c.id} className="v2-track">
                  <span className="num">○</span>
                  <div><b><Link href={V2_ROUTES.circle(c.slug)}>{c.name}</Link></b><span>{c.followerCount || 0} followers</span></div>
                  <V2FollowCircleButton slug={c.slug} returnPath={V2_ROUTES.saved} initialFollowing isLoggedIn compact />
                </div>
              ))}
              {props.followedHosts.map(h => (
                <div key={h.id} className="v2-track">
                  <span className="num">★</span>
                  <div><b><Link href={V2_ROUTES.hostProfile(h.id)}>{h.displayName}</Link></b><span>{h.followerCount} followers</span></div>
                  <V2FollowHostButton hostUserId={h.id} returnPath={V2_ROUTES.saved} initialFollowing isLoggedIn compact />
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {tab === 'sessions' && (
        <div className="v2-section" style={{ marginTop: 0 }}>
          {props.savedSessions.length === 0 ? (
            <V2EmptyState icon="◎" title="No saved sessions" description="Save sessions to track them here." actionLabel="Browse sessions" actionHref={V2_ROUTES.sessions} />
          ) : (
            props.savedSessions.map(s => (
              <div key={s.id} className="v2-saved-row">
                <V2SessionAgendaCard session={s} compact />
                <V2SaveSessionButton sessionId={s.id} returnPath={V2_ROUTES.saved} initialSaved isLoggedIn compact />
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'rooms' && (
        <div className="v2-section" style={{ marginTop: 0 }}>
          {props.savedRooms.length === 0 ? (
            <V2EmptyState icon="♫" title="No saved rooms" description="Save playlist rooms to return to them quickly." actionLabel="Browse playlists" actionHref={V2_ROUTES.playlists} />
          ) : (
            props.savedRooms.map(room => (
              <div key={room.id} className="v2-track">
                <span className="num">♫</span>
                <div><b><Link href={V2_ROUTES.playlistRoom(room.slug)}>{room.name}</Link></b><span>{room.platform}</span></div>
                <V2SavePlaylistRoomButton slug={room.slug} returnPath={V2_ROUTES.saved} initialSaved isLoggedIn compact />
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'rsvps' && (
        <div className="v2-section" style={{ marginTop: 0 }}>
          {props.myRsvpSessions.length === 0 ? (
            <V2EmptyState icon="◷" title="No RSVPs yet" description="Mark Going or Interested on upcoming sessions." actionLabel="View calendar" actionHref={V2_ROUTES.calendar} />
          ) : (
            props.myRsvpSessions.map(s => <V2SessionAgendaCard key={s.id} session={s} compact />)
          )}
        </div>
      )}
    </>
  )
}
