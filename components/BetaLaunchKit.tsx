'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { t, useLang, type Lang } from '@/lib/i18n'

const CHECK_KEY = 'songcraft_beta_checklist_v1'

type BetaStatus = {
  beta_mode: { enabled?: boolean; message?: string; show_checklist?: boolean }
  known_issues: { enabled?: boolean; items?: string[] }
}

export default function BetaLaunchKit() {
  const pathname = usePathname()
  const [lang, setLang] = useState<Lang>('en')
  const tx = t[lang]
  const [mounted, setMounted] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [status, setStatus] = useState<BetaStatus | null>(null)
  const [openChecklist, setOpenChecklist] = useState(false)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState<'feedback' | 'bug' | 'idea' | 'billing' | 'ux'>('feedback')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const hidden = !pathname ||
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/embed') ||
    pathname.startsWith('/p/') ||
    pathname.startsWith('/s/') ||
    pathname.startsWith('/epk/')

  useEffect(() => {
    setMounted(true)
    setLang(useLang())
    try {
      setChecked(JSON.parse(localStorage.getItem(CHECK_KEY) || '{}'))
    } catch {}

    fetch('/api/beta/status')
      .then(res => res.json())
      .then(setStatus)
      .catch(() => {})

    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      setIsAdmin(['admin', 'super_admin'].includes((profile as any)?.role))
    }).catch(() => {})
  }, [])

  const checklist = useMemo(() => [
    { id: 'artist', label: tx.betaChecklistArtist, href: '/dashboard' },
    { id: 'song', label: tx.betaChecklistSong, href: '/dashboard' },
    { id: 'lyrics', label: tx.betaChecklistLyrics, href: '/dashboard#songs' },
    { id: 'campaign', label: tx.betaChecklistCampaign, href: '/dashboard#campaign' },
    { id: 'public_page', label: tx.betaChecklistPublicPage, href: '/dashboard#artists' },
    { id: 'qr_embed', label: tx.betaChecklistQrEmbed, href: '/dashboard#songs' },
    { id: 'newsletter', label: tx.betaChecklistNewsletter, href: '/dashboard#artists' },
    { id: 'billing', label: tx.betaChecklistBilling, href: '/settings/billing' },
  ], [tx])

  const setItem = (id: string, value: boolean) => {
    const next = { ...checked, [id]: value }
    setChecked(next)
    localStorage.setItem(CHECK_KEY, JSON.stringify(next))
  }

  const pageLabel = pathname || '/'

  const sendFeedback = async () => {
    if (!message.trim() || sending) return
    setSending(true)
    setSendError(null)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        page: pathname || '/',
        type: feedbackType,
        message,
        metadata: {
          viewport_width: typeof window !== 'undefined' ? window.innerWidth : null,
          community: (pathname || '').startsWith('/community'),
          ref: typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('ref') : null,
        },
      }),
    })
    setSending(false)
    if (res.ok) {
      setMessage('')
      setSent(true)
      setTimeout(() => { setSent(false); setFeedbackOpen(false) }, 1600)
    } else {
      const err = await res.json().catch(() => ({}))
      setSendError((err as { error?: string }).error || 'Failed to send')
    }
  }

  if (!mounted || hidden) return null

  return (
    <>
      {isAdmin && status?.beta_mode?.enabled && (
        <div className="beta-banner">
          <div>
            <strong>{tx.betaBannerTitle}</strong>
            <span>{tx.betaBannerDesc}</span>
          </div>
          {status.beta_mode.show_checklist !== false && (
            <button type="button" onClick={() => setOpenChecklist(v => !v)}>
              {tx.betaChecklistTitle}
            </button>
          )}
        </div>
      )}

      {status?.known_issues?.enabled && !!status.known_issues.items?.length && (
        <div className="known-issues-notice">
          <strong>{tx.knownIssuesTitle}</strong>
          <span>{status.known_issues.items.slice(0, 2).join(' · ')}</span>
        </div>
      )}

      {isAdmin && openChecklist && (
        <div className="beta-checklist-panel card">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
            <h3 style={{ color: '#d4a843', margin: 0, fontWeight: 'normal' }}>{tx.betaChecklistTitle}</h3>
            <button type="button" className="btn-outline" onClick={() => setOpenChecklist(false)} style={{ padding: '3px 9px', fontSize: 12 }}>{tx.close}</button>
          </div>
          {checklist.map(item => (
            <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, color: checked[item.id] ? '#c8e0c8' : '#c8c0b0', fontSize: 13, marginBottom: 8 }}>
              <input type="checkbox" checked={!!checked[item.id]} onChange={e => setItem(item.id, e.target.checked)} style={{ accentColor: '#d4a843', width: 16 }} />
              <Link href={item.href} style={{ color: checked[item.id] ? '#7bc87b' : '#d4a843', textDecoration: 'none' }}>{item.label}</Link>
            </label>
          ))}
        </div>
      )}

      <button type="button" className="feedback-fab" onClick={() => setFeedbackOpen(true)}>
        {tx.feedbackButton}
      </button>

      {feedbackOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
          <div className="card" style={{ maxWidth: 480, width: '100%', borderColor: 'rgba(212,168,67,0.36)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
              <div>
                <h3 style={{ color: '#d4a843', margin: 0, fontWeight: 'normal' }}>{tx.feedbackTitle}</h3>
                <p style={{ color: '#8a7a60', fontSize: 12, margin: '5px 0 0' }}>{tx.feedbackDesc}</p>
              </div>
              <button type="button" onClick={() => setFeedbackOpen(false)} style={{ background: 'none', border: 'none', color: '#6a5a40', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>
            <p style={{ color: '#6a5a40', fontSize: 11, margin: '0 0 10px' }}>
              {tx.feedbackPageContext}: <code style={{ color: '#8a7a60' }}>{pageLabel}</code>
            </p>
            <select value={feedbackType} onChange={e => setFeedbackType(e.target.value as any)} style={{ marginBottom: 10 }}>
              <option value="feedback">{tx.feedbackTypeFeedback}</option>
              <option value="bug">{tx.feedbackTypeBug}</option>
              <option value="idea">{tx.feedbackTypeIdea}</option>
              <option value="billing">{tx.feedbackTypeBilling}</option>
              <option value="ux">{tx.feedbackTypeUx}</option>
            </select>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6} placeholder={tx.feedbackPlaceholder} />
            <p style={{ color: '#5a4a30', fontSize: 11, margin: '8px 0 0', fontStyle: 'italic' }}>{tx.feedbackScreenshotPlaceholder}</p>
            {sendError && <p style={{ color: '#c05050', fontSize: 12, marginTop: 8 }}>{sendError}</p>}
            <button className="btn-gold" onClick={sendFeedback} disabled={sending || message.trim().length < 3} style={{ marginTop: 12 }}>
              {sent ? tx.feedbackSent : sending ? tx.saving : tx.feedbackSend}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
