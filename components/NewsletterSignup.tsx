'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { t, useLang, type Lang } from '@/lib/i18n'

export default function NewsletterSignup({
  artistId,
  sourcePage,
  accent = '#d4a843',
  compact = false,
}: {
  artistId: string
  sourcePage: string
  accent?: string
  compact?: boolean
}) {
  const [lang] = useState<Lang>(() => useLang())
  const tx = t[lang]
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || saving) return
    setSaving(true)
    setMessage(null)

    const supabase = createClient()
    const { error } = await supabase.from('newsletter_subscribers').insert({
      artist_id: artistId,
      email: email.trim(),
      name: name.trim() || null,
      source_page: sourcePage,
      confirmed: false,
    })

    if (error) {
      const duplicate = error.code === '23505' || /duplicate|unique/i.test(error.message || '')
      setMessage({ kind: 'err', text: duplicate ? tx.newsletterAlreadySignedUp : tx.newsletterError })
    } else {
      setEmail('')
      setName('')
      setMessage({ kind: 'ok', text: tx.newsletterSuccess })
    }
    setSaving(false)
  }

  return (
    <form
      onSubmit={submit}
      style={{
        background: compact ? 'rgba(255,255,255,0.03)' : 'linear-gradient(135deg, rgba(212,168,67,0.10), rgba(255,255,255,0.03))',
        border: `1px solid ${accent}33`,
        borderRadius: 10,
        padding: compact ? 14 : 18,
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ color: accent, fontSize: compact ? 13 : 15, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 500, margin: '0 0 6px' }}>
          {tx.newsletterTitle}
        </h2>
        <p style={{ color: '#8a7a60', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
          {tx.newsletterDesc}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1.3fr auto', gap: 8 }}>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={tx.newsletterNamePlaceholder}
          aria-label={tx.newsletterNamePlaceholder}
          style={inputStyle}
        />
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={tx.newsletterEmailPlaceholder}
          aria-label={tx.newsletterEmailPlaceholder}
          style={inputStyle}
        />
        <button
          type="submit"
          disabled={saving || !email.trim()}
          style={{
            background: accent,
            border: 'none',
            color: '#0a0a0f',
            padding: '10px 16px',
            borderRadius: 6,
            cursor: saving || !email.trim() ? 'not-allowed' : 'pointer',
            fontSize: 13,
            fontWeight: 700,
            opacity: saving || !email.trim() ? 0.65 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {saving ? tx.saving : tx.newsletterCta}
        </button>
      </div>

      {message && (
        <p style={{ margin: '10px 0 0', color: message.kind === 'ok' ? '#7bc87b' : '#c05050', fontSize: 12 }}>
          {message.text}
        </p>
      )}
    </form>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'rgba(0,0,0,0.25)',
  border: '1px solid rgba(180,140,80,0.22)',
  color: '#e8e0d0',
  borderRadius: 6,
  padding: '10px 12px',
  fontSize: 13,
  outline: 'none',
}
