import type { SupabaseClient } from '@supabase/supabase-js'
import { formatDateYmd } from '@/lib/playlistCommunities/participationBoard'
import type { ParticipationStreaks } from './types'

function weekKey(d: Date): string {
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff))
  return formatDateYmd(monday)
}

function dayDiff(a: string, b: string): number {
  const da = new Date(`${a}T12:00:00Z`).getTime()
  const db = new Date(`${b}T12:00:00Z`).getTime()
  return Math.round((db - da) / 86400000)
}

export async function fetchParticipationStreaks(
  sb: SupabaseClient,
  userId: string
): Promise<ParticipationStreaks> {
  const { data } = await sb
    .from('user_participation_streaks')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) {
    return {
      dailyCurrent: 0,
      dailyBest: 0,
      weeklyCurrent: 0,
      weeklyBest: 0,
      lastParticipationDate: null,
    }
  }

  return {
    dailyCurrent: data.daily_current ?? 0,
    dailyBest: data.daily_best ?? 0,
    weeklyCurrent: data.weekly_current ?? 0,
    weeklyBest: data.weekly_best ?? 0,
    lastParticipationDate: data.last_participation_date,
  }
}

export async function recordParticipationDay(
  sb: SupabaseClient,
  userId: string,
  activityDate: string
): Promise<ParticipationStreaks> {
  const today = activityDate.slice(0, 10)
  const wk = weekKey(new Date(`${today}T12:00:00Z`))

  const { data: existing } = await sb
    .from('user_participation_streaks')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  let dailyCurrent = 1
  let weeklyCurrent = 1
  let dailyBest = 1
  let weeklyBest = 1

  if (existing) {
    const last = existing.last_participation_date as string | null
    const lastWk = existing.last_week_key as string | null
    const gap = last ? dayDiff(last, today) : 999

    if (gap === 0) {
      dailyCurrent = existing.daily_current ?? 1
      weeklyCurrent = existing.weekly_current ?? 1
    } else if (gap === 1) {
      dailyCurrent = (existing.daily_current ?? 0) + 1
    } else {
      dailyCurrent = 1
    }

    if (lastWk === wk && gap > 0 && gap <= 7) {
      weeklyCurrent = (existing.weekly_current ?? 0) + 1
    } else if (lastWk === wk && gap === 0) {
      weeklyCurrent = existing.weekly_current ?? 1
    } else if (lastWk === wk) {
      weeklyCurrent = existing.weekly_current ?? 1
    } else {
      weeklyCurrent = 1
    }

    dailyBest = Math.max(existing.daily_best ?? 0, dailyCurrent)
    weeklyBest = Math.max(existing.weekly_best ?? 0, weeklyCurrent)
  }

  await sb.from('user_participation_streaks').upsert({
    user_id: userId,
    daily_current: dailyCurrent,
    daily_best: dailyBest,
    weekly_current: weeklyCurrent,
    weekly_best: weeklyBest,
    last_participation_date: today,
    last_week_key: wk,
    updated_at: new Date().toISOString(),
  })

  return {
    dailyCurrent,
    dailyBest,
    weeklyCurrent,
    weeklyBest,
    lastParticipationDate: today,
  }
}
