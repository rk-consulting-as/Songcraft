'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { t, useLang, type Lang } from '@/lib/i18n'
import Avatar from '@/components/Avatar'
import NewGroupModal from '@/components/NewGroupModal'

type ConversationRow = {
  id: string
  type: 'direct' | 'support' | 'group'
  title: string | null
  updated_at: string
  last_read_at: string | null
  other: { id: string; display_name: string | null; avatar_url: string | null; referral_code: string } | null
  latest: { content: string; created_at: string; sender_id: string } | null
  unread_count: number
}

export default function MessagesPage() {
  const router = useRouter()
  const [lang, setLangState] = useState<Lang>('no')
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<string | null>(null)
  const [rows, setRows] = useState<ConversationRow[]>([])
  const [showNewGroup, setShowNewGroup] = useState(false)

  useEffect(() => { setLangState(useLang()); init() }, [])
  const tx = t[lang]

  const init = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    setMe(session.user.id)
    await loadConversations(session.user.id)
    setLoading(false)

    // Realtime: refresh whenever a new message lands in any of our conversations
    const channel = supabase.channel('messages-list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        loadConversations(session.user.id)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }

  const loadConversations = async (myId: string) => {
    const supabase = createClient()
    // Get my conversation memberships
    const { data: parts } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at, conversations(id, type, title, updated_at)')
      .eq('user_id', myId)
      .order('joined_at', { ascending: false })
    if (!parts || parts.length === 0) { setRows([]); return }

    const conversationIds = (parts as any[]).map(p => p.conversation_id)

    // Latest message per conversation (single query then group client-side)
    const { data: latestMsgs } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, content, created_at')
      .in('conversation_id', conversationIds)
      .eq('hidden', false)
      .order('created_at', { ascending: false })
    const latestByConv: Record<string, any> = {}
    for (const m of (latestMsgs as any[]) || []) {
      if (!latestByConv[m.conversation_id]) latestByConv[m.conversation_id] = m
    }

    // For direct conversations, find the OTHER participant
    const { data: allParticipants } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id')
      .in('conversation_id', conversationIds)
    const otherUserIds = (allParticipants as any[] || [])
      .filter(p => p.user_id !== myId)
      .map(p => p.user_id)

    const { data: profiles } = otherUserIds.length > 0
      ? await supabase.from('profiles').select('id, display_name, avatar_url, referral_code').in('id', otherUserIds)
      : { data: [] }
    const profMap: Record<string, any> = {}
    for (const p of (profiles as any[]) || []) profMap[p.id] = p

    const result: ConversationRow[] = (parts as any[]).map(p => {
      const conv = p.conversations
      const otherIds = (allParticipants as any[] || [])
        .filter(ap => ap.conversation_id === p.conversation_id && ap.user_id !== myId)
        .map(ap => ap.user_id)
      const other = otherIds.length === 1 ? profMap[otherIds[0]] : null
      const latest = latestByConv[p.conversation_id] || null

      // Unread count = messages in this conversation that arrived AFTER my last_read_at
      const lastReadAt = p.last_read_at ? new Date(p.last_read_at).getTime() : 0
      const unread = (latestMsgs as any[] || []).filter(m =>
        m.conversation_id === p.conversation_id &&
        m.sender_id !== myId &&
        new Date(m.created_at).getTime() > lastReadAt
      ).length

      return {
        id: p.conversation_id,
        type: conv?.type || 'direct',
        title: conv?.title || null,
        updated_at: conv?.updated_at || latest?.created_at || new Date().toISOString(),
        last_read_at: p.last_read_at || null,
        other: other || null,
        latest,
        unread_count: unread,
      }
    })

    // Sort by latest activity
    result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    setRows(result)
  }

  if (loading) return <div style={{ color: '#6a5a40', padding: 40 }}>{tx.loading}</div>

  const accent = '#d4a843'

  return (
    <div style={pageBg}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/dashboard" style={{ color: '#6a5a40', textDecoration: 'none', fontSize: 13 }}>← {tx.dashboard}</Link>
          <span style={{ color: '#3a3530' }}>|</span>
          <h1 style={{ margin: 0, fontSize: 18, color: accent, fontWeight: 'normal' }}>💬 {tx.messagesTitle}</h1>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: 32 }}>
        {rows.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
            <h3 style={{ color: '#e8e0d0', fontWeight: 'normal', margin: 0 }}>{tx.messagesEmptyTitle}</h3>
            <p style={{ color: '#8a7a60', fontSize: 14, marginTop: 8 }}>{tx.messagesEmptyDesc}</p>
            <Link href="/discover" style={{ display: 'inline-block', marginTop: 14, padding: '10px 22px', background: accent, color: '#0a0a0f', textDecoration: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14 }}>
              🌍 {tx.discoverNavLink}
            </Link>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {rows.map((row, i) => {
              const isSupport = row.type === 'support'
              const name = isSupport ? '🛟 Songcraft Support' : (row.other?.display_name || row.title || tx.referralsAnonymous)
              const preview = row.latest?.content || tx.messagesNoMessagesYet
              const isFromMe = row.latest?.sender_id === me
              return (
                <Link key={row.id} href={`/messages/${row.id}`} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 18px',
                  borderBottom: i < rows.length - 1 ? '1px solid rgba(180,140,80,0.08)' : 'none',
                  textDecoration: 'none',
                  background: row.unread_count > 0 ? 'rgba(212,168,67,0.05)' : 'transparent',
                }}>
                  {isSupport ? (
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(212,168,67,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: `1px solid ${accent}55` }}>🛟</div>
                  ) : (
                    <Avatar value={row.other?.avatar_url} name={row.other?.display_name} seed={row.other?.id || row.id} size={44} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <div style={{ color: '#e8e0d0', fontSize: 14, fontWeight: row.unread_count > 0 ? 700 : 500 }}>{name}</div>
                      <div style={{ color: '#6a5a40', fontSize: 11 }}>{timeAgo(row.updated_at, lang)}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 3 }}>
                      <div style={{ color: row.unread_count > 0 ? '#c8c0b0' : '#8a7a60', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {isFromMe && tx.messagesYouPrefix + ' '}{preview}
                      </div>
                      {row.unread_count > 0 && (
                        <span style={{ background: accent, color: '#0a0a0f', fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 10 }}>
                          {row.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowNewGroup(true)}
            style={{
              padding: '10px 20px',
              background: 'rgba(212,168,67,0.1)',
              border: '1px solid rgba(212,168,67,0.4)',
              borderRadius: 6,
              color: '#d4a843',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            👥 {tx.messagesNewGroup}
          </button>
          <button
            onClick={() => router.push('/support/new')}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: '1px solid rgba(180,140,80,0.3)',
              borderRadius: 6,
              color: '#a09080',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            🎫 {tx.messagesNewTicket}
          </button>
        </div>
      </div>

      <NewGroupModal open={showNewGroup} onClose={() => setShowNewGroup(false)} />
    </div>
  )
}

const pageBg: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)',
  color: '#e8e0d0',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
}
const headerStyle: React.CSSProperties = {
  borderBottom: '1px solid rgba(180,140,80,0.2)',
  padding: '20px 32px',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  flexWrap: 'wrap', gap: 10,
}

function timeAgo(iso: string, lang: 'no' | 'en'): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (m < 1)  return lang === 'no' ? 'nå' : 'now'
  if (m < 60) return lang === 'no' ? `${m}m` : `${m}m`
  if (h < 24) return lang === 'no' ? `${h}t` : `${h}h`
  if (d < 7)  return lang === 'no' ? `${d}d` : `${d}d`
  return new Date(iso).toLocaleDateString()
}
