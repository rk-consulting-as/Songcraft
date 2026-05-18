'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { t, useLang, type Lang } from '@/lib/i18n'

const CATEGORIES = [
  { key: 'technical', emoji: '🔧', labelKey: 'ticketCategoryTechnical' },
  { key: 'billing',   emoji: '💳', labelKey: 'ticketCategoryBilling' },
  { key: 'abuse',     emoji: '⚐', labelKey: 'ticketCategoryAbuse' },
  { key: 'feature',   emoji: '💡', labelKey: 'ticketCategoryFeature' },
  { key: 'other',     emoji: '💬', labelKey: 'ticketCategoryOther' },
] as const

const PRIORITIES = [
  { key: 'low',     color: '#8a7a60', labelKey: 'ticketPriorityLow' },
  { key: 'normal',  color: '#d4a843', labelKey: 'ticketPriorityNormal' },
  { key: 'high',    color: '#e0a050', labelKey: 'ticketPriorityHigh' },
  { key: 'urgent',  color: '#c05050', labelKey: 'ticketPriorityUrgent' },
] as const

export default function NewTicketPage() {
  const router = useRouter()
  const [lang, setLangState] = useState<Lang>('en')
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState<string>('technical')
  const [priority, setPriority] = useState<string>('normal')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => { setLangState(useLang()) }, [])
  const tx = t[lang]

  const submit = async () => {
    if (subject.trim().length < 3 || message.trim().length < 10) {
      setErrorMsg(tx.ticketErrTooShort)
      return
    }
    setSubmitting(true)
    setErrorMsg(null)
    const supabase = createClient()
    const { data, error } = await supabase.rpc('create_ticket', {
      subject: subject.trim(),
      category,
      priority,
      initial_message: message.trim(),
    })
    setSubmitting(false)
    if (error) { setErrorMsg(error.message); return }
    if (data && (data as any).error) { setErrorMsg((data as any).error); return }
    const convId = (data as any)?.conversation_id
    if (convId) router.push(`/messages/${convId}`)
  }

  const accent = '#d4a843'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)',
      color: '#e8e0d0',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        borderBottom: '1px solid rgba(180,140,80,0.2)',
        padding: '20px 32px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Link href="/messages" style={{ color: '#6a5a40', textDecoration: 'none', fontSize: 13 }}>← {tx.messagesTitle}</Link>
        <span style={{ color: '#3a3530' }}>|</span>
        <h1 style={{ margin: 0, fontSize: 18, color: accent, fontWeight: 'normal' }}>🎫 {tx.ticketNewTitle}</h1>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: 32 }}>
        <p style={{ color: '#8a7a60', fontSize: 14 }}>{tx.ticketNewDesc}</p>

        <div className="card" style={{ marginTop: 20 }}>
          <Label>{tx.ticketSubject}</Label>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder={tx.ticketSubjectPlaceholder}
            maxLength={120}
            style={{ width: '100%', boxSizing: 'border-box', fontSize: 14, padding: 10 }}
          />

          <Label style={{ marginTop: 16 }}>{tx.ticketCategory}</Label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORIES.map(c => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                style={chipBtn(category === c.key)}
              >
                {c.emoji} {tx[c.labelKey as keyof typeof tx] as string}
              </button>
            ))}
          </div>

          <Label style={{ marginTop: 16 }}>{tx.ticketPriority}</Label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PRIORITIES.map(p => (
              <button
                key={p.key}
                onClick={() => setPriority(p.key)}
                style={{
                  ...chipBtn(priority === p.key),
                  borderColor: priority === p.key ? p.color : 'rgba(180,140,80,0.2)',
                  color: priority === p.key ? p.color : '#a09080',
                  background: priority === p.key ? `${p.color}1a` : 'rgba(255,255,255,0.02)',
                }}
              >
                {tx[p.labelKey as keyof typeof tx] as string}
              </button>
            ))}
          </div>

          <Label style={{ marginTop: 16 }}>{tx.ticketMessage}</Label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={tx.ticketMessagePlaceholder}
            rows={6}
            maxLength={4000}
            style={{ width: '100%', boxSizing: 'border-box', fontSize: 14, padding: 10, resize: 'vertical' }}
          />
          <div style={{ color: '#5a4a30', fontSize: 11, textAlign: 'right', marginTop: 4 }}>
            {message.length} / 4000
          </div>

          {errorMsg && <div style={{ color: '#c05050', fontSize: 13, marginTop: 8 }}>{errorMsg}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
            <Link href="/messages" className="btn-outline" style={{ padding: '10px 18px', textDecoration: 'none' }}>{tx.cancel}</Link>
            <button
              className="btn-gold"
              onClick={submit}
              disabled={submitting || subject.trim().length < 3 || message.trim().length < 10}
              style={{ padding: '10px 22px' }}
            >
              {submitting ? '⏳ ' + tx.saving : '🎫 ' + tx.ticketSubmit}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <label style={{
      display: 'block',
      color: '#8a7a60',
      fontSize: 11,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 6,
      ...style,
    }}>{children}</label>
  )
}

function chipBtn(active: boolean): React.CSSProperties {
  return {
    padding: '6px 12px',
    fontSize: 12,
    borderRadius: 6,
    border: active ? '1px solid #d4a843' : '1px solid rgba(180,140,80,0.2)',
    background: active ? 'rgba(212,168,67,0.12)' : 'rgba(255,255,255,0.02)',
    color: active ? '#d4a843' : '#a09080',
    cursor: 'pointer',
    transition: 'all 0.15s',
  }
}
