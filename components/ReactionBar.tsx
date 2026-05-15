'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const PRESET_EMOJI = ['👍', '❤️', '🔥', '🎵', '🥁', '🎤']

type ReactionRow = { emoji: string; user_id: string }

export default function ReactionBar({ songId }: { songId: string }) {
  const router = useRouter()
  const [meId, setMeId] = useState<string | null>(null)
  const [rows, setRows] = useState<ReactionRow[]>([])
  const [busyEmoji, setBusyEmoji] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id || null))
    load()
    // Realtime updates
    const channel = supabase.channel(`song-reactions-${songId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'song_reactions', filter: `song_id=eq.${songId}` }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId])

  const load = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('song_reactions')
      .select('emoji, user_id')
      .eq('song_id', songId)
    if (data) setRows(data as ReactionRow[])
  }

  const toggle = async (emoji: string) => {
    if (!meId) { router.push('/login'); return }
    setBusyEmoji(emoji)
    const supabase = createClient()
    const mine = rows.some(r => r.emoji === emoji && r.user_id === meId)
    if (mine) {
      await supabase.from('song_reactions').delete().eq('song_id', songId).eq('user_id', meId).eq('emoji', emoji)
      setRows(prev => prev.filter(r => !(r.emoji === emoji && r.user_id === meId)))
    } else {
      const { error } = await supabase.from('song_reactions').insert({ song_id: songId, user_id: meId, emoji })
      if (!error) setRows(prev => [...prev, { emoji, user_id: meId }])
    }
    setBusyEmoji(null)
  }

  const countByEmoji: Record<string, number> = {}
  const mineByEmoji: Record<string, boolean> = {}
  for (const r of rows) {
    countByEmoji[r.emoji] = (countByEmoji[r.emoji] || 0) + 1
    if (r.user_id === meId) mineByEmoji[r.emoji] = true
  }

  // Show all preset emojis + any custom ones that have at least one reaction
  const customEmojis = Array.from(new Set(rows.map(r => r.emoji))).filter(e => !PRESET_EMOJI.includes(e))
  const visibleEmojis = [...PRESET_EMOJI, ...customEmojis]

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {visibleEmojis.map(emoji => {
        const count = countByEmoji[emoji] || 0
        const isMine = mineByEmoji[emoji]
        return (
          <button
            key={emoji}
            onClick={() => toggle(emoji)}
            disabled={busyEmoji === emoji}
            style={{
              padding: '6px 12px',
              borderRadius: 18,
              border: isMine ? '1px solid #d4a843' : '1px solid rgba(180,140,80,0.2)',
              background: isMine ? 'rgba(212,168,67,0.15)' : 'rgba(255,255,255,0.03)',
              color: isMine ? '#d4a843' : '#a09080',
              cursor: 'pointer',
              fontSize: 14,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s',
            }}
          >
            <span>{emoji}</span>
            {count > 0 && <span style={{ fontSize: 11, fontWeight: 600 }}>{count}</span>}
          </button>
        )
      })}
    </div>
  )
}
