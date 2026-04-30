'use client'
import { useState } from 'react'

type Props = {
  studioPageId: string
  accent: string
  texts: {
    title: string
    name: string
    email: string
    message: string
    submit: string
    sending: string
    success: string
    error: string
  }
}

export default function ContactForm({ studioPageId, accent, texts }: Props) {
  const [from_name, setName] = useState('')
  const [from_email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!from_name.trim() || !from_email.trim() || !message.trim()) return
    setStatus('sending')
    setError(null)
    try {
      const res = await fetch('/api/studio/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studio_page_id: studioPageId, from_name, from_email, message }),
      })
      const data = await res.json()
      if (data.error) {
        setStatus('error')
        setError(data.error)
      } else {
        setStatus('success')
        setName(''); setEmail(''); setMessage('')
      }
    } catch (e: any) {
      setStatus('error')
      setError(e?.message || 'Failed to send')
    }
  }

  if (status === 'success') {
    return (
      <div style={{ padding: 24, textAlign: 'center', background: `${accent}11`, border: `1px solid ${accent}55`, borderRadius: 8 }}>
        <p style={{ margin: 0, color: accent, fontSize: 15, fontWeight: 500 }}>✓ {texts.success}</p>
      </div>
    )
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#e8e0d0',
    fontSize: 14, outline: 'none', fontFamily: 'inherit', marginBottom: 12,
  }

  return (
    <form onSubmit={submit} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20, maxWidth: 560 }}>
      <h3 style={{ margin: '0 0 14px', color: accent, fontSize: 14, letterSpacing: 1, textTransform: 'uppercase' }}>{texts.title}</h3>
      <input
        type="text"
        value={from_name}
        onChange={e => setName(e.target.value)}
        placeholder={texts.name}
        required
        maxLength={120}
        style={inputStyle}
      />
      <input
        type="email"
        value={from_email}
        onChange={e => setEmail(e.target.value)}
        placeholder={texts.email}
        required
        maxLength={200}
        style={inputStyle}
      />
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder={texts.message}
        required
        rows={5}
        maxLength={4000}
        style={{ ...inputStyle, resize: 'vertical' }}
      />
      <button
        type="submit"
        disabled={status === 'sending' || !from_name.trim() || !from_email.trim() || !message.trim()}
        style={{
          width: '100%', padding: '12px 18px', background: accent, color: '#0a0a0f',
          border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer',
          opacity: status === 'sending' ? 0.6 : 1,
        }}
      >
        {status === 'sending' ? texts.sending : texts.submit}
      </button>
      {error && (
        <p style={{ color: '#c05050', fontSize: 12, margin: '10px 0 0' }}>{error}</p>
      )}
    </form>
  )
}
