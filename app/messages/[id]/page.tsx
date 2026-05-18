'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { t, useLang, type Lang } from '@/lib/i18n'
import Avatar from '@/components/Avatar'

type Attachment = {
  url: string
  name: string
  size: number
  mime: string
  type: 'image' | 'audio' | 'document'
}

type Message = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  hidden: boolean
  attachments?: Attachment[] | null
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
  const [lang, setLangState] = useState<Lang>('en')
  const [me, setMe] = useState<string | null>(null)
  const [conv, setConv] = useState<{
    type: string
    title: string | null
    subject?: string | null
    ticket_status?: string | null
    ticket_priority?: string | null
    ticket_category?: string | null
    assigned_to?: string | null
  } | null>(null)
  const [myRole, setMyRole] = useState<string | null>(null)
  const [updatingTicket, setUpdatingTicket] = useState(false)
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
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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
    const [convRes, partsRes, msgsRes, profRes] = await Promise.all([
      supabase.from('conversations').select('type, title, subject, ticket_status, ticket_priority, ticket_category, assigned_to').eq('id', convId).maybeSingle(),
      supabase.from('conversation_participants').select('user_id').eq('conversation_id', convId),
      supabase.from('messages').select('*').eq('conversation_id', convId).eq('hidden', false).order('created_at', { ascending: true }),
      supabase.from('profiles').select('role').eq('id', myId).maybeSingle(),
    ])
    if (convRes.data) setConv(convRes.data as any)
    if (profRes.data) setMyRole((profRes.data as any).role)

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
    if ((!composer.trim() && pendingAttachments.length === 0) || sending) return
    setSending(true)
    setErrorMsg(null)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSending(false); return }

    const res = await fetch('/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        conversation_id: convId,
        content: composer.trim(),
        attachments: pendingAttachments,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setErrorMsg(json?.error === 'blocked' ? tx.messagesErrBlocked : (json?.message || tx.messagesErrSend))
    } else {
      if (json.message) {
        setMessages(prev => prev.some(x => x.id === json.message.id) ? prev : [...prev, json.message])
      }
      setComposer('')
      setPendingAttachments([])
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }))
    }
    setSending(false)
  }

  const uploadFile = async (file: File) => {
    setUploading(true)
    setErrorMsg(null)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setUploading(false); return }
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/messages/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: form,
    })
    const json = await res.json()
    setUploading(false)
    if (!res.ok) {
      setErrorMsg(json?.message || json?.error || 'Upload failed')
      return
    }
    setPendingAttachments(prev => [...prev, json as Attachment])
  }

  const removePending = (idx: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== idx))
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

  const updateTicket = async (changes: { status?: string; priority?: string }) => {
    setUpdatingTicket(true)
    const supabase = createClient()
    const { data, error } = await supabase.rpc('update_ticket_status', {
      conv_id: convId,
      new_status: changes.status || conv?.ticket_status || 'open',
      new_priority: changes.priority || null,
      new_assignee: null,
    })
    setUpdatingTicket(false)
    if (error) { setErrorMsg(error.message); return }
    if (data && (data as any).error) { setErrorMsg((data as any).error); return }
    // Optimistically update local state
    setConv(prev => prev ? {
      ...prev,
      ticket_status: changes.status || prev.ticket_status,
      ticket_priority: changes.priority || prev.ticket_priority,
    } : prev)
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

      {/* Ticket status bar (only for support conversations) */}
      {isSupport && conv && (
        <div style={{
          background: 'rgba(212,168,67,0.06)',
          borderBottom: '1px solid rgba(212,168,67,0.2)',
          padding: '10px 24px',
        }}>
          <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: '#8a7a60', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>{tx.ticketStatusLabel}:</span>
              {myRole === 'admin' || myRole === 'super_admin' ? (
                <select
                  value={conv.ticket_status || 'open'}
                  onChange={e => updateTicket({ status: e.target.value })}
                  disabled={updatingTicket}
                  style={{ fontSize: 12, padding: '4px 8px' }}
                >
                  <option value="open">🟢 {tx.ticketStatus_open}</option>
                  <option value="in_progress">🟡 {tx.ticketStatus_in_progress}</option>
                  <option value="resolved">⚪ {tx.ticketStatus_resolved}</option>
                  <option value="closed">⚫ {tx.ticketStatus_closed}</option>
                </select>
              ) : (
                <span style={{ color: '#d4a843', fontSize: 12 }}>
                  {(conv.ticket_status === 'open' && '🟢 ') || (conv.ticket_status === 'in_progress' && '🟡 ') || (conv.ticket_status === 'resolved' && '⚪ ') || (conv.ticket_status === 'closed' && '⚫ ')}
                  {tx[`ticketStatus_${conv.ticket_status || 'open'}` as keyof typeof tx] as string}
                </span>
              )}

              <span style={{ color: '#3a3530' }}>·</span>

              <span style={{ color: '#8a7a60', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>{tx.ticketPriorityLabel}:</span>
              {myRole === 'admin' || myRole === 'super_admin' ? (
                <select
                  value={conv.ticket_priority || 'normal'}
                  onChange={e => updateTicket({ priority: e.target.value })}
                  disabled={updatingTicket}
                  style={{ fontSize: 12, padding: '4px 8px' }}
                >
                  <option value="low">{tx.ticketPriorityLow}</option>
                  <option value="normal">{tx.ticketPriorityNormal}</option>
                  <option value="high">{tx.ticketPriorityHigh}</option>
                  <option value="urgent">{tx.ticketPriorityUrgent}</option>
                </select>
              ) : (
                <span style={{ color: '#d4a843', fontSize: 12 }}>{tx[`ticketPriority${(conv.ticket_priority || 'normal').charAt(0).toUpperCase() + (conv.ticket_priority || 'normal').slice(1)}` as keyof typeof tx] as string}</span>
              )}

              {conv.ticket_category && (
                <>
                  <span style={{ color: '#3a3530' }}>·</span>
                  <span style={{ color: '#a09080', fontSize: 11 }}>📁 {conv.ticket_category}</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
                  {m.content && (
                    <div style={{ color: '#e8e0d0', fontSize: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.content}</div>
                  )}
                  {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: m.content ? 8 : 0 }}>
                      {m.attachments.map((att, ai) => (
                        <AttachmentView key={ai} att={att} onOpen={() => setLightboxUrl(att.url)} />
                      ))}
                    </div>
                  )}
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
            <div style={{ width: '100%' }}>
              {pendingAttachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {pendingAttachments.map((a, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: 'rgba(212,168,67,0.08)',
                      border: '1px solid rgba(212,168,67,0.3)',
                      borderRadius: 6,
                      padding: '4px 10px',
                      fontSize: 12,
                      color: '#d4a843',
                    }}>
                      <span>{a.type === 'image' ? '🖼️' : a.type === 'audio' ? '🎵' : '📎'} {a.name}</span>
                      <button onClick={() => removePending(i)} style={{ background: 'none', border: 'none', color: '#c05050', cursor: 'pointer', fontSize: 14, padding: 0 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  title={tx.messagesAttachTip}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(180,140,80,0.25)',
                    color: uploading ? '#5a4a30' : '#a09080',
                    borderRadius: 6,
                    padding: '10px 12px',
                    cursor: uploading ? 'wait' : 'pointer',
                    fontSize: 16,
                  }}
                >
                  {uploading ? '⏳' : '📎'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) uploadFile(f)
                    e.target.value = ''
                  }}
                />
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
                <button className="btn-gold" onClick={send} disabled={sending || (!composer.trim() && pendingAttachments.length === 0)} style={{ padding: '10px 18px' }}>
                  {sending ? '⏳' : '➤'} {tx.messagesSend}
                </button>
              </div>
            </div>
          )}
        </div>
        {errorMsg && <div style={{ maxWidth: 800, margin: '8px auto 0', color: errorMsg === tx.messagesReportSubmitted ? '#7bc87b' : '#c05050', fontSize: 12, textAlign: 'center' }}>{errorMsg}</div>}
      </div>

      {/* Image lightbox */}
      {lightboxUrl && (
        <div onClick={() => setLightboxUrl(null)} style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', padding: 20,
        }}>
          <img src={lightboxUrl} alt="" style={{ maxWidth: '95%', maxHeight: '95%', borderRadius: 6, boxShadow: '0 12px 60px rgba(0,0,0,0.8)' }} />
        </div>
      )}

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

function AttachmentView({ att, onOpen }: { att: Attachment; onOpen: () => void }) {
  if (att.type === 'image') {
    return (
      <img
        src={att.url}
        alt={att.name}
        onClick={onOpen}
        style={{ maxWidth: 280, maxHeight: 240, borderRadius: 6, cursor: 'pointer', objectFit: 'cover' }}
      />
    )
  }
  if (att.type === 'audio') {
    return (
      <div>
        <audio controls src={att.url} style={{ maxWidth: 280, display: 'block' }} />
        <div style={{ color: '#6a5a40', fontSize: 10, marginTop: 2 }}>{att.name}</div>
      </div>
    )
  }
  // Document
  return (
    <a
      href={att.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        background: 'rgba(180,140,80,0.08)',
        border: '1px solid rgba(180,140,80,0.25)',
        borderRadius: 6,
        color: '#e8e0d0',
        textDecoration: 'none',
        fontSize: 12,
      }}
    >
      📎 {att.name}{att.size ? ` · ${Math.round(att.size / 1024)} KB` : ''}
    </a>
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
