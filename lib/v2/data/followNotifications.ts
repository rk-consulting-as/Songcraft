import type { SupabaseClient } from '@supabase/supabase-js'
import { v2ServiceClient } from '@/lib/v2/apiAuth'
import {
  buildFollowedCircleSessionScheduled,
  buildFollowedHostSessionLive,
  buildSavedPlaylistRoundCompleted,
  buildSavedSessionStartingSoon,
} from '@/lib/v2/communityNotifications'
import { createManyCommunityNotifications } from '@/lib/v2/data/communityNotifications'
import type { V2NotificationInput } from '@/lib/v2/types'

const DEDUPE_HOURS = 24

/** Skip if same kind + entity was notified to user within dedupe window. */
async function filterDeduped(
  service: SupabaseClient,
  inputs: V2NotificationInput[],
): Promise<V2NotificationInput[]> {
  if (!inputs.length) return []
  const since = new Date(Date.now() - DEDUPE_HOURS * 60 * 60 * 1000).toISOString()
  const out: V2NotificationInput[] = []

  for (const input of inputs) {
    if (!input.entityId) {
      out.push(input)
      continue
    }
    const { data } = await service
      .from('v2_community_notifications')
      .select('id')
      .eq('user_id', input.userId)
      .eq('kind', input.kind)
      .eq('entity_id', input.entityId)
      .gte('created_at', since)
      .limit(1)
    if (!data?.length) out.push(input)
  }
  return out
}

async function notifyUsers(
  inputs: V2NotificationInput[],
): Promise<void> {
  if (!inputs.length) return
  const service = v2ServiceClient()
  const filtered = await filterDeduped(service, inputs)
  await createManyCommunityNotifications(service, filtered)
}

export async function notifyCircleFollowersNewSession(params: {
  circleId: string
  circleName: string
  sessionId: string
  sessionTitle: string
  hostUserId: string
}): Promise<void> {
  const service = v2ServiceClient()
  const { data: circle } = await service.from('v2_circles').select('visibility').eq('id', params.circleId).maybeSingle()
  if (circle?.visibility !== 'public') return

  const { data: followers } = await service
    .from('v2_circle_follows')
    .select('user_id')
    .eq('circle_id', params.circleId)

  const inputs = (followers || [])
    .map(f => f.user_id as string)
    .filter(uid => uid && uid !== params.hostUserId)
    .map(uid => buildFollowedCircleSessionScheduled({
      userId: uid,
      circleName: params.circleName,
      sessionId: params.sessionId,
      sessionTitle: params.sessionTitle,
    }))

  await notifyUsers(inputs)
}

export async function notifyHostFollowersSessionLive(params: {
  hostUserId: string
  sessionId: string
  sessionTitle: string
}): Promise<void> {
  const service = v2ServiceClient()
  const { data: followers } = await service
    .from('v2_host_follows')
    .select('user_id')
    .eq('host_user_id', params.hostUserId)

  const inputs = (followers || [])
    .map(f => f.user_id as string)
    .filter(uid => uid && uid !== params.hostUserId)
    .map(uid => buildFollowedHostSessionLive({
      userId: uid,
      sessionId: params.sessionId,
      sessionTitle: params.sessionTitle,
      hostName: 'A host you follow',
    }))

  await notifyUsers(inputs)
}

export async function notifySavedSessionUsers(params: {
  sessionId: string
  sessionTitle: string
  kind: 'starting_soon' | 'live'
  hostUserId?: string
}): Promise<void> {
  const service = v2ServiceClient()
  const { data: saved } = await service
    .from('v2_saved_community_items')
    .select('user_id')
    .eq('entity_type', 'session')
    .eq('entity_id', params.sessionId)

  const inputs = (saved || [])
    .map(s => s.user_id as string)
    .filter(uid => uid && uid !== params.hostUserId)
    .map(uid => params.kind === 'live'
      ? buildFollowedHostSessionLive({ userId: uid, sessionId: params.sessionId, sessionTitle: params.sessionTitle, hostName: 'Saved session' })
      : buildSavedSessionStartingSoon({ userId: uid, sessionId: params.sessionId, sessionTitle: params.sessionTitle }))

  await notifyUsers(inputs)
}

/** On home load: notify users about saved sessions starting within 2 hours (deduped). */
export async function maybeNotifySavedSessionsStartingSoon(userId: string): Promise<void> {
  const service = v2ServiceClient()
  const soonMs = 2 * 60 * 60 * 1000
  const now = Date.now()

  const { data: saved } = await service
    .from('v2_saved_community_items')
    .select('entity_id')
    .eq('user_id', userId)
    .eq('entity_type', 'session')

  const sessionIds = (saved || []).map(s => s.entity_id as string).filter(Boolean)
  if (!sessionIds.length) return

  const { data: sessions } = await service
    .from('v2_sessions')
    .select('id, title, status, starts_at, v2_circles(visibility)')
    .in('id', sessionIds)
    .neq('status', 'ended')
    .neq('status', 'live')

  for (const s of sessions || []) {
    const circle = (s as { v2_circles?: { visibility?: string } | { visibility?: string }[] }).v2_circles
    const vis = Array.isArray(circle) ? circle[0]?.visibility : circle?.visibility
    if (vis && vis !== 'public') continue
    const t = new Date(s.starts_at as string).getTime()
    if (!t || t <= now || t - now > soonMs) continue
    await notifySavedSessionUsers({
      sessionId: s.id as string,
      sessionTitle: (s.title as string) || 'Session',
      kind: 'starting_soon',
    })
  }
}

export async function notifySavedPlaylistRoundCompleted(params: {
  roomId: string
  roomSlug: string
  roomName: string
  hostUserId: string
}): Promise<void> {
  const service = v2ServiceClient()
  const { data: saved } = await service
    .from('v2_saved_community_items')
    .select('user_id')
    .eq('entity_type', 'playlist_room')
    .eq('entity_id', params.roomId)

  const inputs = (saved || [])
    .map(s => s.user_id as string)
    .filter(uid => uid && uid !== params.hostUserId)
    .map(uid => buildSavedPlaylistRoundCompleted({
      userId: uid,
      roomSlug: params.roomSlug,
      roomName: params.roomName,
    }))

  await notifyUsers(inputs)
}
