import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import V2CircleCard from '@/components/v2/V2CircleCard'
import V2CommunityAnalyticsTracker from '@/components/v2/V2CommunityAnalyticsTracker'
import { V2FollowHostButton } from '@/components/v2/V2CommunityFollowSaveButtons'
import V2JsonLd from '@/components/v2/V2JsonLd'
import V2PostAuthCommunityAction from '@/components/v2/V2PostAuthCommunityAction'
import V2PublicAuthCta from '@/components/v2/V2PublicAuthCta'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import V2SessionAgendaCard from '@/components/v2/V2SessionAgendaCard'
import V2ShareButton from '@/components/v2/V2ShareButton'
import { getHostFollowState } from '@/lib/v2/data/followsSaves'
import { fetchPublicHostProfile } from '@/lib/v2/data/publicDiscovery'
import { hostProfileJsonLd, hostProfileMetadata } from '@/lib/v2/seo/communityMetadata'
import { V2_ROUTES } from '@/lib/v2/routes'
import { createServerSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Props = { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const host = await fetchPublicHostProfile(params.id)
  if (!host) return { title: 'Host not found' }
  return hostProfileMetadata(host)
}

export default async function PublicHostProfilePage({ params }: Props) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  const host = await fetchPublicHostProfile(params.id)
  if (!host) notFound()

  const returnPath = V2_ROUTES.hostProfile(host.id)
  const followState = await getHostFollowState(user?.id ?? null, host.id)

  return (
    <>
      <V2JsonLd data={hostProfileJsonLd(host)} />
      <V2CommunityAnalyticsTracker entityType="host" entityId={host.id} />
      {user && <V2PostAuthCommunityAction isLoggedIn hostUserId={host.id} />}
      <div className="v2-detail-hero v2-host-public">
        <div className="v2-host-public__avatar">
          {host.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={host.avatarUrl} alt="" width={80} height={80} />
          ) : (
            <span className="v2-host-public__initial">{host.displayName.slice(0, 1)}</span>
          )}
        </div>
        <div className="v2-eyebrow">Community host · <span className="v2-tag hot">Host</span></div>
        <h1>{host.displayName}</h1>
        {host.bio && <p className="v2-meta" style={{ fontSize: 16, maxWidth: 560 }}>{host.bio}</p>}
        <div className="v2-hero-stats" style={{ marginTop: 16 }}>
          <div className="v2-stat"><strong>{host.hostedCircleCount}</strong><span>circles</span></div>
          <div className="v2-stat"><strong>{host.completedSessionCount}</strong><span>sessions completed</span></div>
          <div className="v2-stat"><strong>{host.upcomingSessions.length}</strong><span>upcoming</span></div>
          <div className="v2-stat"><strong>{followState.followerCount}</strong><span>followers</span></div>
        </div>
        <div className="v2-hero-actions v2-hero-cta-row" style={{ marginTop: 16 }}>
          <V2FollowHostButton
            hostUserId={host.id}
            returnPath={returnPath}
            initialFollowing={followState.following}
            followerCount={followState.followerCount}
            isLoggedIn={!!user}
          />
          <V2ShareButton
            path={returnPath}
            title={host.displayName}
            inviteMessage={`Check out ${host.displayName}'s listening events on ViaTone.`}
            compact
          />
        </div>
      </div>

      <section className="v2-section" style={{ marginTop: 0 }}>
        <V2PublicAuthCta returnPath={returnPath} title="Join to participate" primaryLabel="Sign in to RSVP" />
      </section>

      {host.upcomingSessions.length > 0 && (
        <section className="v2-section">
          <V2SectionHeader title="Upcoming sessions" />
          {host.upcomingSessions.map(s => <V2SessionAgendaCard key={s.id} session={s} compact />)}
        </section>
      )}

      {host.hostedCircles.length > 0 && (
        <section className="v2-section">
          <V2SectionHeader title="Public circles" />
          <div className="v2-grid cols-3">
            {host.hostedCircles.map(c => <V2CircleCard key={c.id} circle={c} />)}
          </div>
        </section>
      )}

      {host.playlistRooms.length > 0 && (
        <section className="v2-section">
          <V2SectionHeader title="Playlist rooms" />
          <div className="v2-grid cols-2">
            {host.playlistRooms.map(room => (
              <Link key={room.id} href={V2_ROUTES.playlistRoom(room.slug)} className="v2-card">
                <h4 style={{ margin: '0 0 4px' }}>{room.name}</h4>
                <p className="v2-meta">{room.platform} · {room.trackCount} tracks</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
