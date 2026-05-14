'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { t, useLang, type Lang } from '@/lib/i18n'
import Avatar from '@/components/Avatar'

type Message = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  hidden: boolean
  created_at: string
}

type ConvParticipant = {
  id: string
  display_name: string | null
  avatar_url: string | null
  referral_code: string
  role: string
}

export default function ConversationPage() {
  const params = useParams()
  const router = useRouter()
  const convId = String(params.id || '')
  const [lang, setLangState] = useState<Lang>('no')
  const [me, setMe] = useState<string | null>(null)
  const [conv, setConv] = useState<{ type: string; title: string | null } | null>(null)
  const [otherParticipants, setOtherParticipants] = useState<ConvParticipant[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [composer, setComposer] = useState('')
  const [blocked, setBlocked] = useState(false)            // either I blocked them, or they blocked me
  const [iBlockedThem, setIBlockedThem] = useState(false)  // specifically my block on the other
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => { setLangState(useLang()); init() }, [convId])
  const tx = t[lang]

  const init = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    setMe(session.user.id)

    // Confirm we're a participant
    const { data: myPart } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', convId)
      .eq('user_id', session.user.id)
      .maybeSingle()
    if (!myPart) { router.push('/messages'); return }

    await loadAll(session.user.id)
    setLoading(false)
    markRead()

    // Realtime subscription on new messages in this conversation
    const channel = supabase.channel(`conv-${convId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
        (payload) => {
          const m = payload.new as Message
          setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m])
          markRead()
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }

  const loadAll = async (myId: string) => {
    const supabase = createClient()
    const [convRes, partsRes, msgsRes] = await Promise.all([
      supabase.from('conversations').select('type, title').eq('id', convId).maybeSingle(),
      supabase.from('conversation_participants').select('user_id').eq('conversation_id', convId),
      supabase.from('messages').select('*').eq('conversation_id', convId).eq('hidden', false).order('created_at', { ascending: true }),
    ])
    if (convRes.data) setConv({ type: (convRes.data as any).type, title: (convRes.data as any).title })

    const otherIds = ((partsRes.data as any[]) || []).map(p => p.user_id).filter(id => id !== myId)
    if (otherIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, referral_code, role')
        .in('id', otherIds)
      setOtherParticipants((profs as ConvParticipant[]) || [])

      // Block status: am I blocked or have I blocked any of them?
      const { data: blocks } = await supabase
        .from('user_blocks')
        .select('blocker_id, blocked_id')
        .or(`and(blocker_id.eq.${myId},blocked_id.in.(${otherIds.join(',')})),and(blocked_id.eq.${myId},blocker_id.in.(${otherIds.join(',')}))`)
      if (blocks && blocks.length > 0) {
        setBlocked(true)
        setIBlockedThem((blocks as any[]).some(b => b.blocker_id === myId))
      }
    }

    if (msgsRes.data) setMessages(msgsRes.data as Message[])
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }))
  }

  const markRead = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/messages/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ conversation_id: convId }),
    })
  }

  const send = async () => {
    if (!composer.trim() || sending) return
    setSending(true)
    setErrorMsg(null)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSending(false); return }

    const res = await fetch('/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ conversation_id: convId, content: composer.trim() }),
    })
    const json = await res.json()
    if (!res.ok) {
      setErrorMsg(json?.error === 'blocked' ? tx.messagesErrBlocked : (json?.message || tx.messagesErrSend))
    } else {
      // Optimistic insert (realtime will also deliver, but we de-dup via id)
      if (json.message) {
        setMessages(prev => prev.some(x => x.id === json.message.id) ? prev : [...prev, json.message])
      }
      setComposer('')
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }))
    }
    setSending(false)
  }

  const toggleBlock = async () => {
    if (!me || otherParticipants.length === 0) return
    const target = otherParticipants[0]
    const supabase = createClient()
    if (iBlockedThem) {
      await supabase.from('user_blocks').delete().eq('blocker_id', me).eq('blocked_id', target.id)
      setIBlockedThem(false); setBlocked(false)
    } else {
      if (!confirm(tx.messagesConfirmBlock.replace('{name}', target.display_name || target.referral_code))) return
      await supabase.from('user_blocks').insert({ blocker_id: me, blocked_id: target.id })
      setIBlockedThem(true); setBlocked(true)
    }
  }

  const submitReport = async () => {
    if (!reportingMessageId || !reportReason.trim() || !me) return
    const supabase = createClient()
    const { error } = await supabase.from('message_reports').insert({
      message_id: reportingMessageId,
      reporter_id: me,
      reason: reportReason.trim(),
    })
    if (error) {
      setErrorMsg(`${tx.messagesErrReport}: ${error.message}`)
    } else {
      setReportingMessageId(null); setReportReason('')
      setErrorMsg(tx.messagesReportSubmitted)
      setTimeout(() => setErrorMsg(null), 2500)
    }
  }

  if (loading) return <div style={{ color: '#6a5a40', padding: 40 }}>{tx.loading}</div>

  const accent = '#d4a843'
  const other = otherParticipants[0]
  const isSupport = conv?.type === 'support'
  const displayName = isSupport ? '🛟 Songcraft Support' : (other?.display_name || other?.referral_code || conv?.title || '—')

  return (
    <div style={pageBg}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/messages" style={{ color: '#6a5a40', textDecoration: 'none', fontSize: 13 }}>← {tx.messagesTitle}</Link>
          <span style={{ color: '#3a3530' }}>|</span>
          {isSupport ? (
            <span style={{ fontSize: 26 }}>🛟</span>
          ) : (
            <Avatar value={other?.avatar_url} name={other?.display_name} seed={other?.id || convId} size={32} />
          )}
          <div>
            <div style={{ color: '#e8e0d0', fontSize: 15, fontWeight: 600 }}>{displayName}</div>
            {!isSupport && other?.referral_code && (
              <Link href={`/u/${other.referral_code}`} style={{ color: '#6a5a40', fontSize: 11, textDecoration: 'none' }}>
                @{other.referral_code}
              </Link>
            )}
          </div>
        </div>
        {!isSupport && other && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={toggleBlock}
              style={{
                padding: '6px 12px',
                background: iBlockedThem ? 'rgba(192,80,80,0.12)' : 'transparent',
                border: `1px solid ${iBlockedThem ? '#c05050' : 'rgba(180,140,80,0.25)'}`,
                color: iBlockedThem ? '#c05050' : '#8a7a60',
                borderRadius: 4,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {iBlockedThem ? '✓ ' + tx.messagesBlocked : '🚫 ' + tx.messagesBlock}
            </button>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '16px 24px 100px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 ? (
          <div style={{ color: '#6a5a40', textAlign: 'center', padding: 40 }}>{tx.messagesEmptyConv}</div>
        ) : (
          messages.map(m => {
            const isMe = m.sender_id === me
            const senderProfile = isMe ? null : otherParticipants.find(p => p.id === m.sender_id)
            return (
              <div key={m.id} style={{
                display: 'flex',
                justifyContent: isMe ? 'flex-end' : 'flex-start',
                gap: 8,
                alignItems: 'flex-end',
              }}>
                {!isMe && (
                  <Avatar value={senderProfile?.avatar_url} name={senderProfile?.display_name} seed={m.sender_id} size={28} />
                )}
                <div style={{
                  maxWidth: '75%',
                  background: isMe ? 'rgba(212,168,67,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isMe ? 'rgba(212,168,67,0.35)' : 'rgba(180,140,80,0.15)'}`,
                  borderRadius: 12,
                  padding: '8px 12px',
                  position: 'relative',
                }}>
                  <div style={{ color: '#e8e0d0', fontSize: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.content}</div>
                  <div style={{ color: '#5a4a30', fontSize: 10, marginTop: 4, textAlign: isMe ? 'right' : 'left' }}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {!isMe && (
                      <button
                        onClick={() => setReportingMessageId(m.id)}
                        title={tx.messagesReportTip}
                        style={{ marginLeft: 8, background: 'none', border: 'none', color: '#5a4a30', cursor: 'pointer', fontSize: 10 }}
                      >⚐</button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Sticky composer */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        padding: 16,
        background: 'rgba(10,10,15,0.92)',
        borderTop: '1px solid rgba(180,140,80,0.2)',
        backdropFilter: 'blur(6px)',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          {blocked && !iBlockedThem ? (
            <div style={{ color: '#c05050', fontSize: 13, padding: 10, width: '100%', textAlign: 'center' }}>
              🚫 {tx.messagesBlockedByOther}
            </div>
          ) : iBlockedThem ? (
            <div style={{ color: '#c05050', fontSize: 13, padding: 10, width: '100%', textAlign: 'center' }}>
              🚫 {tx.messagesYouBlocked}
            </div>
          ) : (
            <>
              <textarea
                value={composer}
                onChange={e => setComposer(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
                }}
                placeholder={tx.messagesComposerPlaceholder}
                rows={1}
                maxLength={4000}
                style={{ flex: 1, resize: 'none', fontSize: 14, padding: 10, boxSizing: 'border-box' }}
              />
              <button className="btn-gold" onClick={send} disabled={sending || !composer.trim()} style={{ padding: '10px 18px' }}>
                {sending ? '⏳' : '➤'} {tx.messagesSend}
              </button>
            </>
          )}
        </div>
        {errorMsg && <div style={{ maxWidth: 800, margin: '8px auto 0', color: errorMsg === tx.messagesReportSubmitted ? '#7bc87b' : '#c05050', fontSize: 12, textAlign: 'center' }}>{errorMsg}</div>}
      </div>

      {/* Report modal */}
      {reportingMessageId && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card" style={{ maxWidth: 420, width: '100%', borderColor: 'rgba(192,80,80,0.4)' }}>
            <h3 style={{ margin: 0, color: '#e07070', fontSize: 16, fontWeight: 'normal' }}>⚐ {tx.messagesReportTitle}</h3>
            <p style={{ color: '#8a7a60', fontSize: 13, marginTop: 8 }}>{tx.messagesReportDesc}</p>
            <textarea
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
              placeholder={tx.messagesReportPlaceholder}
              rows={3}
              maxLength={500}
              style={{ width: '100%', fontSize: 13, padding: 10, marginTop: 10, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button className="btn-outline" onClick={() => { setReportingMessageId(null); setReportReason('') }}>{tx.cancel}</button>
              <button className="btn-gold" onClick={submitReport} disabled={!reportReason.trim()}>{tx.messagesSubmitReport}</button>
            </div>
          </div>
        </div>
      )}
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
  padding: '14px 24px',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  flexWrap: 'wrap', gap: 10,
  position: 'sticky', top: 0, zIndex: 10,
  background: 'rgba(10,10,15,0.92)',
  backdropFilter: 'blur(6px)',
}
