import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due'])
const AI_COST_PER_CALL: Record<string, number> = { anthropic: 0.04, openai: 0.02 }

function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } })
}

async function requireAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  const sb = serviceClient()
  const { data: { user }, error } = await sb.auth.getUser(token)
  if (error || !user) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  const { data: profile } = await sb.from('profiles').select('id, role').eq('id', user.id).maybeSingle()
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) }
  }
  return { sb, actor: profile as { id: string; role: 'admin' | 'super_admin' } }
}

async function safeCount(query: PromiseLike<{ count: number | null }>) {
  try {
    const res = await query
    return res.count || 0
  } catch {
    return 0
  }
}

function monthKey(value: string) {
  return value.slice(0, 7)
}

function activeManualOverride(overrides: any[], userId: string) {
  const now = Date.now()
  return overrides
    .filter((override: any) => override.user_id === userId && override.plan_key === 'pro' && !override.revoked_at)
    .sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at)))
    .find((override: any) => !override.expires_at || new Date(override.expires_at).getTime() > now) || null
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error
  const { sb } = auth

  const now = Date.now()
  const since7 = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
  const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)

  const [
    totalUsers,
    active7,
    active30,
    songsPublished,
    publicViews,
    newsletterSubscribers,
    aiGenerations,
    subscriptionsRes,
    aiUsageRes,
    analyticsRes,
    subscribersRes,
    artistsRes,
    songsRes,
    settingsRes,
    auditRes,
    subEventsRes,
    plansRes,
    feedbackRes,
    profilesRes,
    manualOverridesRes,
  ] = await Promise.all([
    safeCount(sb.from('profiles').select('id', { count: 'exact', head: true })),
    safeCount(sb.from('profiles').select('id', { count: 'exact', head: true }).gte('updated_at', since7)),
    safeCount(sb.from('profiles').select('id', { count: 'exact', head: true }).gte('updated_at', since30)),
    safeCount(sb.from('songs').select('id', { count: 'exact', head: true }).eq('status', 'released')),
    safeCount(sb.from('analytics_events').select('id', { count: 'exact', head: true }).in('event_type', ['artist_page_view', 'song_page_view']).gte('created_at', since30)),
    safeCount(sb.from('newsletter_subscribers').select('id', { count: 'exact', head: true })),
    safeCount(sb.from('ai_usage_events').select('id', { count: 'exact', head: true }).eq('status', 'success').gte('created_at', monthStart.toISOString())),
    sb.from('subscriptions').select('*').order('updated_at', { ascending: false }),
    sb.from('ai_usage_events').select('id, user_id, provider, model, status, feature_key, created_at').order('created_at', { ascending: false }).limit(1000),
    sb.from('analytics_events').select('event_type, source, song_id, artist_id, created_at').gte('created_at', since30).limit(2500),
    sb.from('newsletter_subscribers').select('id, artist_id, user_id, source, source_page, created_at, artists(name)').order('created_at', { ascending: false }).limit(1000),
    sb.from('artists').select('id, user_id, name, page_slug, page_enabled, admin_hidden, created_at').order('created_at', { ascending: false }).limit(500),
    sb.from('songs').select('id, user_id, artist_id, title, status, public_hidden, created_at').order('created_at', { ascending: false }).limit(500),
    sb.from('admin_platform_settings').select('*').order('key'),
    sb.from('admin_audit_log').select('*').order('created_at', { ascending: false }).limit(80),
    sb.from('subscription_events').select('*').order('created_at', { ascending: false }).limit(80),
    sb.from('plans').select('id, name, stripe_price_id'),
    sb.from('beta_feedback').select('id, user_id, page, type, message, status, created_at, profiles(display_name, referral_code)').order('created_at', { ascending: false }).limit(100),
    sb.from('profiles').select('id, display_name, referral_code, role, disabled, admin_notes, feature_overrides, created_at, updated_at').order('created_at', { ascending: false }).limit(500),
    sb.from('manual_plan_overrides').select('id, user_id, plan_key, expires_at, granted_by, reason, created_at, revoked_at, revoked_by').order('created_at', { ascending: false }).limit(500),
  ])

  const subscriptions = subscriptionsRes.data || []
  const aiUsage = aiUsageRes.data || []
  const analytics = analyticsRes.data || []
  const subscribers = subscribersRes.data || []
  const artists = artistsRes.data || []
  const songs = songsRes.data || []
  const manualOverrides = manualOverridesRes.data || []

  const proSubscribers = subscriptions.filter((s: any) => s.plan_id === 'pro' && ACTIVE_STATUSES.has(s.status)).length
  const proPrice = Number(process.env.SONGCRAFT_PRO_MONTHLY_PRICE || 19)
  const mrrEstimate = proSubscribers * proPrice
  const embedsCreated = new Set(analytics.filter((e: any) => e.event_type === 'embed_view' && e.song_id).map((e: any) => e.song_id)).size

  const usageByProvider = Object.values(aiUsage.reduce((acc: any, event: any) => {
    const key = `${event.provider || 'unknown'} / ${event.model || 'unknown'}`
    acc[key] ||= { key, provider: event.provider || 'unknown', model: event.model || 'unknown', total: 0, failed: 0, estimated_cost: 0 }
    acc[key].total += 1
    if (event.status === 'error') acc[key].failed += 1
    acc[key].estimated_cost += AI_COST_PER_CALL[event.provider || ''] || 0.01
    return acc
  }, {})).sort((a: any, b: any) => b.total - a.total)

  const topAiUsers = Object.values(aiUsage.reduce((acc: any, event: any) => {
    const key = event.user_id || 'unknown'
    acc[key] ||= { user_id: key, total: 0, failed: 0 }
    acc[key].total += 1
    if (event.status === 'error') acc[key].failed += 1
    return acc
  }, {})).sort((a: any, b: any) => b.total - a.total).slice(0, 10)

  const monthlyTrends = Object.values(aiUsage.reduce((acc: any, event: any) => {
    const key = monthKey(event.created_at)
    acc[key] ||= { month: key, ai: 0, failed: 0 }
    acc[key].ai += 1
    if (event.status === 'error') acc[key].failed += 1
    return acc
  }, {})).sort((a: any, b: any) => a.month.localeCompare(b.month))

  const newsletterSources = Object.values(subscribers.reduce((acc: any, sub: any) => {
    const key = sub.source || 'unknown'
    acc[key] ||= { source: key, total: 0 }
    acc[key].total += 1
    return acc
  }, {})).sort((a: any, b: any) => b.total - a.total)

  const topFanArtists = Object.values(subscribers.reduce((acc: any, sub: any) => {
    const key = sub.artist_id || 'unknown'
    acc[key] ||= { artist_id: key, artist_name: sub.artists?.name || 'Unknown', total: 0 }
    acc[key].total += 1
    return acc
  }, {})).sort((a: any, b: any) => b.total - a.total).slice(0, 10)

  const userIds = Array.from(new Set([
    ...subscriptions.map((s: any) => s.user_id),
    ...topAiUsers.map((u: any) => u.user_id),
    ...artists.map((a: any) => a.user_id),
  ].filter(Boolean)))
  const profileRows = profilesRes.data || []
  const missingUserIds = userIds.filter((id: string) => !profileRows.some((p: any) => p.id === id))
  const { data: missingProfiles } = missingUserIds.length
    ? await sb.from('profiles').select('id, display_name, referral_code, role, disabled, admin_notes, feature_overrides, created_at, updated_at').in('id', missingUserIds)
    : { data: [] as any[] }
  const profiles = [...profileRows, ...(missingProfiles || [])]
  const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]))

  const users = (profiles || []).map((p: any) => ({
    ...p,
    subscription: subscriptions.find((s: any) => s.user_id === p.id) || null,
    manual_plan_override: activeManualOverride(manualOverrides, p.id),
    ai_usage: aiUsage.filter((e: any) => e.user_id === p.id).length,
    ai_failed: aiUsage.filter((e: any) => e.user_id === p.id && e.status === 'error').length,
    artists: artists.filter((a: any) => a.user_id === p.id).length,
    songs: songs.filter((s: any) => s.user_id === p.id).length,
  })).sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at)))

  return NextResponse.json({
    overview: {
      total_users: totalUsers,
      active_7d: active7,
      active_30d: active30,
      pro_subscribers: proSubscribers,
      mrr_estimate: mrrEstimate,
      ai_generations_month: aiGenerations,
      public_page_views_30d: publicViews,
      newsletter_subscribers: newsletterSubscribers,
      embeds_created_30d: embedsCreated,
      songs_published: songsPublished,
    },
    users,
    ai: {
      usage_by_provider: usageByProvider,
      top_users: topAiUsers.map((u: any) => ({ ...u, profile: profileMap[u.user_id] || null })),
      failed_calls: aiUsage.filter((e: any) => e.status === 'error').slice(0, 50),
      monthly_trends: monthlyTrends,
      estimated_cost: usageByProvider.reduce((sum: number, row: any) => sum + row.estimated_cost, 0),
    },
    subscriptions,
    manual_plan_overrides: manualOverrides,
    subscription_events: subEventsRes.data || [],
    settings: settingsRes.data || [],
    plans: plansRes.data || [],
    newsletter: { sources: newsletterSources, top_artists: topFanArtists, recent: subscribers.slice(0, 50) },
    moderation: {
      hidden_artists: artists.filter((a: any) => a.admin_hidden || !a.page_enabled).slice(0, 30),
      hidden_songs: songs.filter((s: any) => s.public_hidden).slice(0, 30),
      reported_placeholder: [],
    },
    audit_log: auditRes.data || [],
    feedback: feedbackRes.data || [],
    sanity: {
      supabase_connected: totalUsers >= 0,
      supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabase_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabase_service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      stripe_configured: !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET,
      resend_configured: !!process.env.RESEND_API_KEY && (!!process.env.RESEND_FROM_EMAIL || !!process.env.RESEND_FROM),
      anthropic_configured: !!process.env.ANTHROPIC_API_KEY,
      openai_configured: !!process.env.OPENAI_API_KEY,
      app_version: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
      build_id: process.env.NEXT_PUBLIC_BUILD_ID || process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
    },
    stripe: {
      configured: !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET,
      webhook_secret_configured: !!process.env.STRIPE_WEBHOOK_SECRET,
    },
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error
  const { sb, actor } = auth
  const body = await req.json().catch(() => ({}))
  const action = String(body.action || '')
  const targetUserId = body.user_id ? String(body.user_id) : null
  const metadata: Record<string, any> = {}

  try {
    if (action === 'set_plan') {
      if (!targetUserId) return NextResponse.json({ error: 'missing_user' }, { status: 400 })
      const plan = body.plan === 'pro' ? 'pro' : 'free'
      if (plan === 'pro') {
        await sb.from('manual_plan_overrides').update({
          revoked_at: new Date().toISOString(),
          revoked_by: actor.id,
        }).eq('user_id', targetUserId).eq('plan_key', 'pro').is('revoked_at', null)
        await sb.from('manual_plan_overrides').insert({
          user_id: targetUserId,
          plan_key: 'pro',
          granted_by: actor.id,
          reason: 'Legacy admin set_plan action',
        })
      } else {
        await sb.from('manual_plan_overrides').update({
          revoked_at: new Date().toISOString(),
          revoked_by: actor.id,
        }).eq('user_id', targetUserId).eq('plan_key', 'pro').is('revoked_at', null)
      }
      metadata.plan = plan
    } else if (action === 'disable_user') {
      if (!targetUserId) return NextResponse.json({ error: 'missing_user' }, { status: 400 })
      const disabled = !!body.disabled
      await sb.from('profiles').update({
        disabled,
        disabled_at: disabled ? new Date().toISOString() : null,
        disabled_reason: disabled ? String(body.reason || '').slice(0, 500) : null,
        updated_at: new Date().toISOString(),
      }).eq('id', targetUserId)
      metadata.disabled = disabled
    } else if (action === 'update_user_admin') {
      if (!targetUserId) return NextResponse.json({ error: 'missing_user' }, { status: 400 })
      const updates: Record<string, any> = { updated_at: new Date().toISOString() }
      if ('admin_notes' in body) updates.admin_notes = String(body.admin_notes || '').slice(0, 5000)
      if ('feature_overrides' in body && typeof body.feature_overrides === 'object') updates.feature_overrides = body.feature_overrides
      await sb.from('profiles').update(updates).eq('id', targetUserId)
      metadata.updated = Object.keys(updates)
    } else if (action === 'update_setting') {
      const key = String(body.key || '')
      if (!key) return NextResponse.json({ error: 'missing_key' }, { status: 400 })
      await sb.from('admin_platform_settings').upsert({
        key,
        value: body.value && typeof body.value === 'object' ? body.value : {},
        description: body.description || null,
        updated_by: actor.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' })
      metadata.key = key
    } else if (action === 'hide_artist') {
      await sb.from('artists').update({
        page_enabled: false,
        admin_hidden: true,
        admin_hidden_at: new Date().toISOString(),
        admin_hidden_reason: String(body.reason || '').slice(0, 500),
      }).eq('id', String(body.artist_id || ''))
      metadata.artist_id = body.artist_id
    } else if (action === 'hide_song') {
      await sb.from('songs').update({
        public_hidden: true,
        public_hidden_at: new Date().toISOString(),
        public_hidden_reason: String(body.reason || '').slice(0, 500),
      }).eq('id', String(body.song_id || ''))
      metadata.song_id = body.song_id
    } else if (action === 'hide_epk') {
      const artistId = String(body.artist_id || '')
      const { data: artist } = await sb.from('artists').select('page_settings').eq('id', artistId).maybeSingle()
      const pageSettings = artist?.page_settings || {}
      await sb.from('artists').update({
        page_settings: {
          ...pageSettings,
          epk: { ...(pageSettings.epk || {}), public_enabled: false },
        },
        admin_hidden_reason: String(body.reason || '').slice(0, 500),
      }).eq('id', artistId)
      metadata.artist_id = artistId
    } else if (action === 'refresh_subscription') {
      if (!targetUserId) return NextResponse.json({ error: 'missing_user' }, { status: 400 })
      await sb.from('subscription_events').insert({
        user_id: targetUserId,
        event_type: 'manual_refresh_requested',
        status: 'queued',
        metadata: { actor_id: actor.id },
      })
    } else if (action === 'update_feedback_status') {
      const feedbackId = String(body.feedback_id || '')
      const nextStatus = ['new', 'reviewed', 'resolved', 'dismissed'].includes(body.status) ? body.status : 'reviewed'
      await sb.from('beta_feedback').update({
        status: nextStatus,
        reviewed_by: actor.id,
        reviewed_at: new Date().toISOString(),
      }).eq('id', feedbackId)
      metadata.feedback_id = feedbackId
      metadata.status = nextStatus
    } else {
      return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
    }

    await sb.from('admin_audit_log').insert({
      actor_id: actor.id,
      target_user_id: targetUserId,
      target_type: body.target_type || null,
      target_id: body.target_id ? String(body.target_id) : null,
      action,
      metadata,
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'admin_action_failed' }, { status: 500 })
  }
}
