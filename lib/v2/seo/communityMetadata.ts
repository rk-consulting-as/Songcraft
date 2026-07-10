import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/platformGrowth/seo'
import { absoluteAppUrl } from '@/lib/appUrl'
import { FALLBACK_OG_IMAGE } from '@/lib/mediaLibrary/resolveImages'
import { formatSessionDateTime } from '@/lib/v2/format'
import { V2_ROUTES } from '@/lib/v2/routes'
import type { V2Circle, V2PlaylistRoom, V2PublicHostProfile, V2Session } from '@/lib/v2/types'

const FALLBACK = absoluteAppUrl(FALLBACK_OG_IMAGE)

export function explorePageMetadata(): Metadata {
  return buildPublicMetadata({
    title: 'Explore ViaTone Community',
    description: 'Discover public listening circles, upcoming sessions, and playlist rooms. Join artists and curators for shared streaming events on ViaTone.',
    path: V2_ROUTES.explore,
    image: FALLBACK,
    keywords: ['music community', 'listening sessions', 'playlist rooms', 'independent artists'],
  })
}

export function circlePageMetadata(circle: V2Circle): Metadata {
  const desc = circle.description?.slice(0, 160) || `Join ${circle.name} on ViaTone Community — listening sessions, feedback, and playlist growth.`
  return buildPublicMetadata({
    title: `${circle.name} · ViaTone Community`,
    description: desc,
    path: V2_ROUTES.circle(circle.slug),
    image: circle.coverImageUrl || FALLBACK,
    keywords: [...circle.tags, 'music circle', 'listening community'],
  })
}

export function sessionPageMetadata(session: V2Session, description?: string): Metadata {
  const when = formatSessionDateTime(session.startsAt, session.timezone)
  const desc = description?.slice(0, 160)
    || `${session.title} — ${when}. Hosted by ${session.hostName}${session.circleName ? ` in ${session.circleName}` : ''} on ViaTone Community.`
  return buildPublicMetadata({
    title: `${session.title} · ViaTone Session`,
    description: desc,
    path: V2_ROUTES.session(session.slug || session.id),
    image: session.coverImageUrl || FALLBACK,
    keywords: [session.platform, 'listening session', session.circleName].filter(Boolean) as string[],
    type: 'website',
  })
}

export function playlistRoomPageMetadata(room: V2PlaylistRoom): Metadata {
  const desc = room.description?.slice(0, 160) || `${room.name} — a ViaTone Community playlist room for shared listening rounds.`
  return buildPublicMetadata({
    title: `${room.name} · ViaTone Playlist Room`,
    description: desc,
    path: V2_ROUTES.playlistRoom(room.slug),
    image: room.coverImageUrl || FALLBACK,
    keywords: [room.platform, 'playlist room', 'community listening'],
  })
}

export function hostProfileMetadata(host: V2PublicHostProfile): Metadata {
  const desc = host.bio?.slice(0, 160)
    || `${host.displayName} hosts listening sessions and circles on ViaTone Community.`
  return buildPublicMetadata({
    title: `${host.displayName} · ViaTone Host`,
    description: desc,
    path: V2_ROUTES.hostProfile(host.id),
    image: host.avatarUrl || FALLBACK,
    keywords: ['community host', 'music curator', 'listening sessions'],
    type: 'profile',
  })
}

export function sessionEventJsonLd(session: V2Session, description?: string) {
  const url = absoluteAppUrl(V2_ROUTES.session(session.slug || session.id))
  const start = session.startsAt
  const end = session.endsAt || session.startsAt
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: session.title,
    description: description || `${session.title} on ViaTone Community`,
    startDate: start,
    endDate: end,
    eventStatus: session.status === 'ended'
      ? 'https://schema.org/EventScheduled'
      : session.status === 'live'
        ? 'https://schema.org/EventScheduled'
        : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    location: {
      '@type': 'VirtualLocation',
      url,
    },
    organizer: {
      '@type': 'Person',
      name: session.hostName,
    },
    url,
  }
}

export function hostProfileJsonLd(host: V2PublicHostProfile) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: host.displayName,
      description: host.bio || undefined,
      image: host.avatarUrl || undefined,
      url: absoluteAppUrl(V2_ROUTES.hostProfile(host.id)),
    },
  }
}

export function circleCollectionJsonLd(circle: V2Circle) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: circle.name,
    description: circle.description || undefined,
    url: absoluteAppUrl(V2_ROUTES.circle(circle.slug)),
  }
}

export function exploreCollectionJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'ViaTone Community',
    description: 'Public circles, sessions, and playlist rooms on ViaTone.',
    url: absoluteAppUrl(V2_ROUTES.explore),
  }
}
