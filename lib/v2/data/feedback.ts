import { createServerSupabase } from '@/lib/supabase/server'
import type { V2SongFeedback } from '@/lib/v2/types'

export async function fetchSongFeedback(songId: string): Promise<V2SongFeedback[]> {
  const supabase = createServerSupabase()
  const { data: rows } = await supabase
    .from('v2_song_feedback')
    .select('id, song_id, from_user_id, rating, body, reaction, created_at, circle_id, session_id')
    .eq('song_id', songId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!rows?.length) return []

  const userIds = Array.from(new Set(rows.map(r => r.from_user_id)))
  const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', userIds)
  const nameById = Object.fromEntries((profiles || []).map(p => [p.id, p.display_name || 'Member']))

  return rows.map(r => ({
    id: r.id,
    songId: r.song_id,
    fromUserId: r.from_user_id,
    fromUserName: nameById[r.from_user_id] || 'Member',
    rating: r.rating ?? undefined,
    body: r.body ?? undefined,
    reaction: r.reaction as V2SongFeedback['reaction'],
    createdAt: r.created_at,
    circleId: r.circle_id ?? undefined,
    sessionId: r.session_id ?? undefined,
  }))
}
