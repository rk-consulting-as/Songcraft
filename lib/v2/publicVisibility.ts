import type { CircleVisibility, V2Circle, V2PlaylistRoom, V2Session } from '@/lib/v2/types'

/** Circles that may appear on public discovery surfaces. */
export function isPublicCircleVisibility(visibility: CircleVisibility | string | null | undefined): boolean {
  return visibility === 'public'
}

/** Sessions on public circles (or circle-less) are publicly readable. Default deny. */
export function isPublicSessionContext(
  session: Pick<V2Session, 'circleId'> | null | undefined,
  circleVisibility: CircleVisibility | string | null | undefined,
): boolean {
  if (!session) return false
  if (!session.circleId) return true
  return isPublicCircleVisibility(circleVisibility)
}

/** Playlist rooms linked to a public circle are publicly readable. */
export function isPublicPlaylistRoomContext(
  room: Pick<V2PlaylistRoom, 'circleId'> | null | undefined,
  circleVisibility: CircleVisibility | string | null | undefined,
): boolean {
  if (!room) return false
  if (!room.circleId) return false
  return isPublicCircleVisibility(circleVisibility)
}

export type PublicAccessLevel = 'public' | 'member' | 'restricted' | 'not_found'

export function resolveCirclePublicAccess(
  circle: V2Circle | null,
  opts: { isMember?: boolean; isOwner?: boolean; existsButHidden?: boolean },
): PublicAccessLevel {
  if (circle) {
    if (isPublicCircleVisibility(circle.visibility)) return 'public'
    if (opts.isMember || opts.isOwner) return 'member'
    return 'restricted'
  }
  if (opts.existsButHidden) return 'restricted'
  return 'not_found'
}

/** Approved public queue entries only — no submitter names on anonymous surfaces. */
export function filterPublicSessionQueue<T extends { status?: string }>(rows: T[]): T[] {
  return rows.filter(r => r.status === 'approved')
}

/** Circle songs safe for anonymous visitors — approved only. */
export function filterPublicCircleSongs<T extends { status?: string }>(rows: T[]): T[] {
  return rows.filter(r => r.status === 'approved')
}
