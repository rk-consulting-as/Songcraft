'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Avatar from '@/components/Avatar'

/**
 * Persistent chat side panel. Stays open while the user navigates the app so
 * dialogues are not lost when switching pages.
 *
 * Two views:
 *   - 'list':  all conversations with unread badges
 *   - 'conv':  active conversation thread + composer + back button
 *
 * State persists in localStorage:
 *   songcraft_chat_open   ('1' | '0')
 *   songcraft_chat_side   ('left' | 'right')
 *
 * Custom events the rest of the app can dispatch:
 *   - 'songcraft:open-chat'    → opens dock (detail: { conversationId? })
 *   - 'songcraft:close-chat'   → closes dock
 */

type ConversationRow = {
  id: string
  type: 'direct' | 'support' | 'group'
  title: string | null
  updated_at: string
  last_read_at: string | null
  other: { id: string; display_name: string | null; avatar_url: string | null } | null
  latest: { content: string; created_at: string; sender_id: string } | null
  unread_count: number
}

type Message = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  attachments?: any[] | null
  created_at: string
}

const OPEN_KEY = 'songcraft_chat_open'
const SIDE_KEY = 'songcraft_chat_side'

export default function ChatDock() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [me, setMe] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [side, setSide] = useState<'left' | 'right'>('right')
  const [view, setView] = useState<'list' | 'conv'>('list')
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [rows, setRows] = useState<ConversationRow[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [composer, setComposer] = useState('')
  const [sending, setSending] = useState(false)
  const [otherProfile, setOtherProfile] = useState<{ display_name: string | null; avatar_url: string | null; referral_code: string } | null>(null)
  const [convMeta, setConvMeta] = useState<{ type: string; title: string | null } | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  // ---- Mount + read localStorage + auth ----
  useEffect(() => {
    setMounted(true)
    try {
      if (localStorage.getItem(OPEN_KEY) === '1') setOpen(true)
      const s = localStorage.getItem(SIDE_KEY)
      if (s === 'left' || s === 'right') setSide(s)
    } catch {}

    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user
      if (user) { setAuthed(true); setMe(user.id) }
    })

    const { data: authSub } = supabase.auth.onAuthStateChange((_, session) => {
      const user = session?.user
      setAuthed(!!user)
      setMe(user?.id || null)
    })

    return () => { authSub.subscription.unsubscribe() }
  }, [])

  // ---- Persist open + side ----
  useEffect(() => {
    if (!mounted) return
    try { localStorage.setItem(OPEN_KEY, open ? '1' : '0') } catch {}
  }, [open, mounted])
  useEffect(() => {
    if (!mounted) return
    try { localStorage.setItem(SIDE_KEY, side) } catch {}
  }, [side, mounted])

  // ---- Listen for global open/close events ----
  useEffect(() => {
    const handleOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail || {}
      setOpen(true)
      if (detail.conversationId) {
        setActiveConvId(detail.conversationId)
        setView('conv')
      } else {
        setView('list')
      }
    }
    const handleClose = () => setOpen(false)
    window.addEventListener('songcraft:open-chat', handleOpen)
    window.addEventListener('songcraft:close-chat', handleClose)
    return () => {
      window.removeEventListener('songcraft:open-chat', handleOpen)
      window.removeEventListener('songcraft:close-chat', handleClose)
    }
  }, [])

  // ---- Load conversation list ----
  const loadList = useCallback(async () => {
    if (!me) return
    const supabase = createClient()
    const { data: parts } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at, conversations(id, type, title, updated_at)')
      .eq('user_id', me)
    if (!parts || parts.length === 0) { setRows([]); return }
    const convIds = (parts as any[]).map(p => p.conversation_id)

    const { data: latestMsgs } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, content, created_at')
      .in('conversation_id', convIds)
      .eq('hidden', false)
      .order('created_at', { ascending: false })
    const latestByConv: Record<string, any> = {}
    for (const m of (latestMsgs as any[]) || []) {
      if (!latestByConv[m.conversation_id]) latestByConv[m.conversation_id] = m
    }

    const { data: allPart } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id')
      .in('conversation_id', convIds)
    const otherIds = Array.from(new Set(
      (allPart as any[] || []).filter(p => p.user_id !== me).map(p => p.user_id)
    ))
    const { data: profs } = otherIds.length > 0
      ? await supabase.from('profiles').select('id, display_name, avatar_url').in('id', otherIds)
      : { data: [] }
    const profMap: Record<string, any> = {}
    for (const p of (profs as any[]) || []) profMap[p.id] = p

    const result: ConversationRow[] = (parts as any[]).map(p => {
      const conv = p.conversations
      const others = (allPart as any[] || [])
        .filter(ap => ap.conversation_id === p.conversation_id && ap.user_id !== me)
        .map(ap => ap.user_id)
      const other = others.length === 1 ? profMap[others[0]] : null
      const latest = latestByConv[p.conversation_id] || null
      const lastReadAt = p.last_read_at ? new Date(p.last_read_at).getTime() : 0
      const unread = (latestMsgs as any[] || []).filter(m =>
        m.conversation_id === p.conversation_id
        && m.sender_id !== me
        && new Date(m.created_at).getTime() > lastReadAt
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
    result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    setRows(result)
  }, [me])

  // ---- Load active conversation thread + subscribe to realtime ----
  const loadConv = useCallback(async (convId: string) => {
    if (!me) return
    const supabase = createClient()
    const [convRes, partsRes, msgsRes] = await Promise.all([
      supabase.from('conversations').select('type, title').eq('id', convId).maybeSingle(),
      supabase.from('conversation_participants').select('user_id').eq('conversation_id', convId),
      supabase.from('messages').select('*').eq('conversation_id', convId).eq('hidden', false).order('created_at', { ascending: true }),
    ])
    if (convRes.data) setConvMeta({ type: (convRes.data as any).type, title: (convRes.data as any).title })
    const others = ((partsRes.data as any[]) || []).map(p => p.user_id).filter(u => u !== me)
    if (others.length === 1) {
      const { data: profile } = await supabase.from('profiles').select('display_name, avatar_url, referral_code').eq('id', others[0]).maybeSingle()
      setOtherProfile(profile as any || null)
    } else {
      setOtherProfile(null)
    }
    setMessages((msgsRes.data as Message[]) || [])
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }))

    // Mark as read
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ conversation_id: convId }),
      }).catch(() => {})
    }
  }, [me])

  // Load list whenever dock opens or list view becomes active
  useEffect(() => {
    if (open && view === 'list' && me) loadList()
  }, [open, view, me, loadList])

  // Load conversation when activeConvId changes
  useEffect(() => {
    if (open && view === 'conv' && activeConvId && me) loadConv(activeConvId)
  }, [open, view, activeConvId, me, loadConv])

  // Realtime subscription on messages — always active while dock is open
  useEffect(() => {
    if (!open || !me) return
    const supabase = createClient()
    const channel = supabase.channel('chat-dock')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const m = payload.new as Message
          // If it's for the active conversation, append to messages
          if (m.conversation_id === activeConvId) {
            setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m])
            // Auto-mark read
            supabase.auth.getSession().then(({ data }) => {
              if (data.session) {
                fetch('/api/messages/mark-read', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
                  body: JSON.stringify({ conversation_id: activeConvId }),
                }).catch(() => {})
              }
            })
          }
          // Refresh list to update unread counts + latest preview
          if (view === 'list') loadList()
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [open, me, activeConvId, view, loadList])

  const send = async () => {
    if (!activeConvId || !composer.trim() || sending) return
    setSending(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSending(false); return }
    const res = await fetch('/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ conversation_id: activeConvId, content: composer.trim() }),
    })
    const json = await res.json()
    if (res.ok && json.message) {
      setMessages(prev => prev.some(x => x.id === json.message.id) ? prev : [...prev, json.message])
      setComposer('')
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }))
    }
    setSending(false)
  }

  // Hide on login + /messages routes (where we'd have duplicate UI)
  if (!mounted || !authed) return null
  if (pathname?.startsWith('/login')) return null
  if (pathname?.startsWith('/messages')) return null
  if (pathname?.startsWith('/support')) return null

  const accent = '#d4a843'
  const widthPx = 380
  const totalUnread = rows.reduce((s, r) => s + r.unread_count, 0)

  return (
    <>
      {/* Floating open button (only when closed) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Open chat"
          style={{
            position: 'fixed',
            bottom: 24,
            [side]: 24,
            zIndex: 90,
            width: 56, height: 56,
            borderRadius: '50%',
            background: accent,
            border: 'none',
            color: '#0a0a0f',
            fontSize: 22,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          } as any}
        >
          💬
          {totalUnread > 0 && (
            <span style={{
              position: 'absolute',
              top: -4,
              right: -4,
              background: '#c05050',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 10,
              minWidth: 18,
              textAlign: 'center',
              border: '2px solid #0a0a0f',
            }}>{totalUnread > 99 ? '99+' : totalUnread}</span>
          )}
        </button>
      )}

      {/* The dock */}
      {open && (
        <div style={{
          position: 'fixed',
          top: 0,
          [side]: 0,
          bottom: 0,
          width: widthPx,
          maxWidth: '94vw',
          zIndex: 95,
          background: 'rgba(10,10,15,0.96)',
          backdropFilter: 'blur(8px)',
          color: '#e8e0d0',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: side === 'right' ? '1px solid rgba(180,140,80,0.25)' : 'none',
          borderRight: side === 'left' ? '1px solid rgba(180,140,80,0.25)' : 'none',
          boxShadow: side === 'right' ? '-8px 0 32px rgba(0,0,0,0.5)' : '8px 0 32px rgba(0,0,0,0.5)',
        } as any}>
          {/* Header */}
          <div style={{
            padding: '12px 14px',
            borderBottom: '1px solid rgba(180,140,80,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}>
            {view === 'conv' ? (
              <button
                onClick={() => { setView('list'); setActiveConvId(null) }}
                style={{ background: 'none', border: 'none', color: '#a09080', cursor: 'pointer', fontSize: 14, padding: 4 }}
              >← All</button>
            ) : (
              <h2 style={{ margin: 0, color: accent, fontSize: 14, fontWeight: 600, letterSpacing: 1 }}>💬 MESSAGES</h2>
            )}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {view === 'conv' && activeConvId && (
                <Link
                  href={`/messages/${activeConvId}`}
                  title="Open full view"
                  style={{ color: '#6a5a40', textDecoration: 'none', padding: 4, fontSize: 14 }}
                >⛶</Link>
              )}
              <button
                onClick={() => setSide(side === 'right' ? 'left' : 'right')}
                title="Switch side"
                style={{ background: 'none', border: 'none', color: '#6a5a40', cursor: 'pointer', padding: 4, fontSize: 14 }}
              >{side === 'right' ? '⇤' : '⇥'}</button>
              <button
                onClick={() => setOpen(false)}
                title="Close"
                style={{ background: 'none', border: 'none', color: '#6a5a40', cursor: 'pointer', padding: 4, fontSize: 18 }}
              >×</button>
            </div>
          </div>

          {/* Content */}
          {view === 'list' && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {rows.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: '#6a5a40', fontSize: 13 }}>
                  No conversations yet.
                  <div style={{ marginTop: 10 }}>
                    <Link href="/discover" style={{ color: accent, fontSize: 12, textDecoration: 'none' }}>
                      🌍 Find creators →
                    </Link>
                  </div>
                </div>
              ) : (
                rows.map(row => {
                  const isSupport = row.type === 'support'
                  const isGroup = row.type === 'group'
                  const name = isSupport ? '🛟 Support' : (isGroup ? row.title || 'Group' : (row.other?.display_name || row.title || 'Anonymous'))
                  return (
                    <button
                      key={row.id}
                      onClick={() => { setActiveConvId(row.id); setView('conv') }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        background: row.unread_count > 0 ? 'rgba(212,168,67,0.07)' : 'transparent',
                        border: 'none',
                        borderBottom: '1px solid rgba(180,140,80,0.08)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: '#e8e0d0',
                      }}
                    >
                      {isSupport ? (
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(212,168,67,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🛟</div>
                      ) : isGroup ? (
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(180,140,80,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>👥</div>
                      ) : (
                        <Avatar value={row.other?.avatar_url} name={row.other?.display_name} seed={row.other?.id || row.id} size={36} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                          <div style={{ fontSize: 13, fontWeight: row.unread_count > 0 ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                          <div style={{ color: '#5a4a30', fontSize: 10 }}>{timeAgo(row.updated_at)}</div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginTop: 2 }}>
                          <div style={{ color: row.unread_count > 0 ? '#c8c0b0' : '#8a7a60', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row.latest?.content || 'No messages yet'}
                          </div>
                          {row.unread_count > 0 && (
                            <span style={{ background: accent, color: '#0a0a0f', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8, flexShrink: 0 }}>
                              {row.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          )}

          {view === 'conv' && (
            <>
              {/* Conversation header info */}
              {(otherProfile || convMeta) && (
                <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(180,140,80,0.15)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  {convMeta?.type === 'support' ? (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(212,168,67,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🛟</div>
                  ) : convMeta?.type === 'group' ? (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(180,140,80,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>👥</div>
                  ) : (
                    <Avatar value={otherProfile?.avatar_url} name={otherProfile?.display_name} seed={activeConvId || ''} size={28} />
                  )}
                  <div style={{ color: '#e8e0d0', fontSize: 13, fontWeight: 600 }}>
                    {convMeta?.type === 'support' ? 'Songcraft Support' : convMeta?.title || otherProfile?.display_name || 'Conversation'}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {messages.length === 0 ? (
                  <div style={{ color: '#6a5a40', fontSize: 12, textAlign: 'center', padding: 20 }}>No messages yet.</div>
                ) : (
                  messages.map(m => {
                    const isMe = m.sender_id === me
                    return (
                      <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '80%',
                          background: isMe ? 'rgba(212,168,67,0.15)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${isMe ? 'rgba(212,168,67,0.35)' : 'rgba(180,140,80,0.15)'}`,
                          borderRadius: 10,
                          padding: '6px 10px',
                          fontSize: 13,
                          color: '#e8e0d0',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}>
                          {m.content}
                          {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                            <div style={{ marginTop: 4, fontSize: 11, color: '#a09080' }}>
                              📎 {m.attachments.length} attachment{m.attachments.length > 1 ? 's' : ''}{' '}
                              <Link href={`/messages/${m.conversation_id}`} style={{ color: '#d4a843' }}>(open)</Link>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Composer */}
              <div style={{ padding: 10, borderTop: '1px solid rgba(180,140,80,0.2)' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <textarea
                    value={composer}
                    onChange={e => setComposer(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                    placeholder="Type a message..."
                    rows={1}
                    maxLength={4000}
                    style={{ flex: 1, resize: 'none', fontSize: 13, padding: 8, boxSizing: 'border-box' }}
                  />
                  <button
                    onClick={send}
                    disabled={sending || !composer.trim()}
                    style={{ background: accent, color: '#0a0a0f', border: 'none', padding: '0 14px', borderRadius: 6, cursor: sending ? 'wait' : 'pointer', fontSize: 14, fontWeight: 700 }}
                  >➤</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (m < 1)  return 'now'
  if (m < 60) return `${m}m`
  if (h < 24) return `${h}h`
  if (d < 7)  return `${d}d`
  return new Date(iso).toLocaleDateString()
}
