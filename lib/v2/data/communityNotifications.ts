import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerSupabase } from '@/lib/supabase/server'
import { computeEarnedBadges, computeSupporterScore } from '@/lib/v2/badges'
import { buildSupporterBadgeEarned, notificationIcon, notificationTone } from '@/lib/v2/communityNotifications'
import { fetchUserParticipationCounts } from '@/lib/v2/data/supporters'
import type {
  V2CommunityNotificationRow,
  V2CommunityNotificationView,
  V2NotificationInput,
} from '@/lib/v2/types'

const TABLE = 'v2_community_notifications'

function toInsertRow(input: V2NotificationInput) {
  return {
    user_id: input.userId,
    kind: input.kind,
    title: input.title,
    body: input.body ?? null,
    cta_label: input.ctaLabel ?? null,
    cta_href: input.ctaHref ?? null,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
  }
}

/**
 * Create a single notification. Pass a service-role client when notifying
 * another user (RLS only allows self-inserts on the anon/auth client).
 * Failures are swallowed — notifications must never break a core action.
 */
export async function createCommunityNotification(
  sb: SupabaseClient,
  input: V2NotificationInput,
): Promise<void> {
  try {
    await sb.from(TABLE).insert(toInsertRow(input))
  } catch {
    // best-effort; ignore
  }
}

export async function createManyCommunityNotifications(
  sb: SupabaseClient,
  inputs: V2NotificationInput[],
): Promise<void> {
  if (!inputs.length) return
  try {
    await sb.from(TABLE).insert(inputs.map(toInsertRow))
  } catch {
    // best-effort; ignore
  }
}

function mapRow(row: Record<string, unknown>): V2CommunityNotificationRow {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    kind: String(row.kind),
    title: String(row.title),
    body: (row.body as string) ?? undefined,
    ctaLabel: (row.cta_label as string) ?? undefined,
    ctaHref: (row.cta_href as string) ?? undefined,
    entityType: (row.entity_type as string) ?? undefined,
    entityId: (row.entity_id as string) ?? undefined,
    metadata: (row.metadata as Record<string, unknown>) || {},
    isRead: Boolean(row.is_read),
    createdAt: String(row.created_at),
  }
}

/** Normalize a stored notification into a UI-ready view model. */
export function formatCommunityNotification(row: V2CommunityNotificationRow): V2CommunityNotificationView {
  return {
    id: row.id,
    kind: row.kind,
    icon: notificationIcon(row.kind),
    tone: notificationTone(row.kind),
    title: row.title,
    body: row.body,
    cta: row.ctaHref && row.ctaLabel ? { label: row.ctaLabel, href: row.ctaHref } : undefined,
    isRead: row.isRead,
    createdAt: row.createdAt,
  }
}

export async function fetchMyCommunityNotifications(
  limit = 20,
): Promise<{ notifications: V2CommunityNotificationView[]; unreadCount: number }> {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { notifications: [], unreadCount: 0 }

  const [{ data: rows }, { count }] = await Promise.all([
    supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from(TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false),
  ])

  return {
    notifications: (rows || []).map(r => formatCommunityNotification(mapRow(r as Record<string, unknown>))),
    unreadCount: count || 0,
  }
}

export async function markCommunityNotificationRead(sb: SupabaseClient, userId: string, id: string): Promise<void> {
  await sb.from(TABLE).update({ is_read: true }).eq('id', id).eq('user_id', userId)
}

export async function markAllCommunityNotificationsRead(sb: SupabaseClient, userId: string): Promise<void> {
  await sb.from(TABLE).update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
}

/**
 * Cron-free badge detection: recompute a user's earned badges and create a
 * notification for any badge that hasn't been announced yet. We track already
 * announced badges via prior supporter_badge_earned notifications' metadata.
 * Best-effort — safe to call after participation/feedback actions.
 */
export async function maybeNotifyNewBadges(sb: SupabaseClient, userId: string): Promise<void> {
  try {
    const counts = await fetchUserParticipationCounts(userId)
    const summary = { ...counts, score: computeSupporterScore(counts) }
    const earned = computeEarnedBadges(summary)
    if (!earned.length) return

    const { data: prior } = await sb
      .from(TABLE)
      .select('metadata')
      .eq('user_id', userId)
      .eq('kind', 'supporter_badge_earned')

    const announced = new Set(
      (prior || [])
        .map(r => (r.metadata as { badgeId?: string } | null)?.badgeId)
        .filter(Boolean) as string[],
    )

    const fresh = earned.filter(b => !announced.has(b.id))
    if (!fresh.length) return

    await createManyCommunityNotifications(
      sb,
      fresh.map(b => buildSupporterBadgeEarned({ userId, badgeId: b.id, badgeLabel: b.label })),
    )
  } catch {
    // best-effort; ignore
  }
}
