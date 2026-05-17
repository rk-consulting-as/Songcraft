'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { t, useLang, setLang, type Lang } from '@/lib/i18n'

const REF_STORAGE_KEY = 'songcraft_referral_code'

export default function LoginPage() {
  const router = useRouter()
  const [lang, setLangState] = useState<Lang>('no')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [refCode, setRefCode] = useState<string | null>(null)

  useEffect(() => {
    setLangState(useLang())
    let urlRef: string | null = null
    if (typeof window !== 'undefined') {
      try { urlRef = new URLSearchParams(window.location.search).get('ref') } catch {}
    }
    if (urlRef) {
      const cleaned = urlRef.trim().toUpperCase().slice(0, 32)
      if (cleaned.length >= 4) {
        try { localStorage.setItem(REF_STORAGE_KEY, cleaned) } catch {}
        setRefCode(cleaned)
        setIsSignup(true)
      }
    } else {
      try {
        const stored = localStorage.getItem(REF_STORAGE_KEY)
        if (stored) setRefCode(stored)
      } catch {}
    }
  }, [])

  const tx = t[lang]

  const attributeReferralIfNeeded = async () => {
    if (!refCode) return
    const supabase = createClient()
    try {
      const { error: rpcErr } = await supabase.rpc('attribute_referral', { ref_code: refCode })
      if (rpcErr) console.warn('attribute_referral failed:', rpcErr.message)
      else { try { localStorage.removeItem(REF_STORAGE_KEY) } catch {} }
    } catch (e) { console.warn('attribute_referral threw:', e) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(''); setMessage('')
    const supabase = createClient()
    if (isSignup) {
      const signUpOptions: any = {}
      if (refCode) signUpOptions.data = { referral_code: refCode }
      const { data, error } = await supabase.auth.signUp({ email, password, options: signUpOptions })
      if (error) setError(error.message)
      else {
        try { localStorage.removeItem(REF_STORAGE_KEY) } catch {}
        if (data?.session) router.push('/onboarding')
        else setMessage(tx.confirmEmail)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else {
        await attributeReferralIfNeeded()
        router.push('/onboarding')
      }
    }
    setLoading(false)
  }

  const changeLang = (l: Lang) => { setLang(l) }
  const clearReferral = () => {
    try { localStorage.removeItem(REF_STORAGE_KEY) } catch {}
    setRefCode(null)
  }

  const accent = '#d4a843'

  // Marketing bullets shown on the left
  const features: Array<{ emoji: string; titleKey: keyof typeof tx; descKey: keyof typeof tx }> = [
    { emoji: '🎵', titleKey: 'loginFeatLyricsTitle', descKey: 'loginFeatLyricsDesc' },
    { emoji: '🚀', titleKey: 'loginFeatDistroTitle', descKey: 'loginFeatDistroDesc' },
    { emoji: '🌍', titleKey: 'loginFeatCommunityTitle', descKey: 'loginFeatCommunityDesc' },
    { emoji: '🏆', titleKey: 'loginFeatPointsTitle', descKey: 'loginFeatPointsDesc' },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)',
      color: '#e8e0d0',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top bar with logo + lang + back to home */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '18px 28px', borderBottom: '1px solid rgba(180,140,80,0.15)',
      }}>
        <Link href="/" style={{ color: accent, textDecoration: 'none', fontSize: 14, letterSpacing: 3, fontWeight: 300 }}>
          🎼 SONGCRAFT
        </Link>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['no', 'en'] as Lang[]).map(l => (
            <button key={l} onClick={() => changeLang(l)} style={{
              padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 11,
              border: lang === l ? `1px solid ${accent}` : '1px solid rgba(180,140,80,0.2)',
              background: lang === l ? 'rgba(212,168,67,0.15)' : 'transparent',
              color: lang === l ? accent : '#6a5a40',
            }}>
              {l === 'no' ? '🇳🇴 NO' : '🇬🇧 EN'}
            </button>
          ))}
        </div>
      </div>

      {/* Split content */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(360px, 460px)',
        gap: 40,
        padding: '40px 32px',
        maxWidth: 1200,
        margin: '0 auto',
        width: '100%',
        alignItems: 'center',
      }} className="login-split">
        {/* LEFT — marketing */}
        <div style={{ minWidth: 0 }}>
          <h1 style={{
            fontSize: 'clamp(28px, 4vw, 44px)',
            fontWeight: 700,
            color: '#e8e0d0',
            letterSpacing: '-0.01em',
            lineHeight: 1.15,
            margin: 0,
          }}>
            {tx.loginHeroTitle}
          </h1>
          <p style={{
            color: '#a09080',
            fontSize: 16,
            lineHeight: 1.55,
            marginTop: 16,
            maxWidth: 480,
          }}>
            {tx.loginHeroSubtitle}
          </p>

          <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {features.map((f, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(180,140,80,0.15)',
                borderRadius: 8,
              }}>
                <div style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{f.emoji}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: '#e8e0d0', fontSize: 14, fontWeight: 600 }}>{tx[f.titleKey] as string}</div>
                  <div style={{ color: '#8a7a60', fontSize: 12, marginTop: 2, lineHeight: 1.5 }}>{tx[f.descKey] as string}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, display: 'flex', gap: 16, flexWrap: 'wrap', color: '#6a5a40', fontSize: 12 }}>
            <Link href="/discover" style={{ color: accent, textDecoration: 'none' }}>🌍 {tx.loginExploreCreators} →</Link>
            <Link href="/charts" style={{ color: accent, textDecoration: 'none' }}>📈 {tx.loginExploreCharts} →</Link>
          </div>
        </div>

        {/* RIGHT — form */}
        <div style={{ minWidth: 0 }}>
          {refCode && (
            <div style={{
              marginBottom: 14,
              padding: '12px 14px',
              border: '1px solid rgba(212,168,67,0.3)',
              background: 'rgba(212,168,67,0.08)',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ color: accent, fontSize: 13, marginBottom: 2 }}>🤝 {tx.loginReferredByTitle}</div>
                <div style={{ color: '#8a7a60', fontSize: 11 }}>
                  {tx.loginReferredByDesc} <code style={{ color: '#e8c050' }}>{refCode}</code>
                </div>
              </div>
              <button
                onClick={clearReferral}
                style={{ background: 'transparent', border: '1px solid rgba(180,140,80,0.3)', color: '#6a5a40', padding: '4px 8px', fontSize: 11, borderRadius: 4, cursor: 'pointer' }}
                title={tx.loginClearReferral}
              >✕</button>
            </div>
          )}

          <div className="card" style={{
            padding: 28,
            borderColor: 'rgba(212,168,67,0.25)',
          }}>
            <h2 style={{ color: accent, fontWeight: 'normal', fontSize: 20, marginTop: 0, marginBottom: 4 }}>
              {isSignup ? tx.signup : tx.login}
            </h2>
            <p style={{ color: '#8a7a60', fontSize: 12, marginTop: 0, marginBottom: 18 }}>
              {isSignup ? tx.loginSignupSubtitle : tx.loginLoginSubtitle}
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={fieldLabel}>{tx.email.toUpperCase()}</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={tx.emailPlaceholder} required />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={fieldLabel}>{tx.password.toUpperCase()}</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={tx.passwordPlaceholder} required minLength={6} />
              </div>
              {error && <p style={{ color: '#e07070', fontSize: 13, marginBottom: 12 }}>{error}</p>}
              {message && <p style={{ color: '#70c870', fontSize: 13, marginBottom: 12 }}>{message}</p>}
              <button type="submit" className="btn-gold" style={{ width: '100%', padding: '12px', fontSize: 14, fontWeight: 700 }} disabled={loading}>
                {loading ? tx.loading : isSignup ? `🚀 ${tx.signup}` : tx.login}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: 16, marginBottom: 0, fontSize: 13, color: '#6a5a40' }}>
              {isSignup ? tx.hasAccount : tx.newUser}{' '}
              <button onClick={() => setIsSignup(!isSignup)} style={{ background: 'none', border: 'none', color: accent, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                {isSignup ? tx.login : tx.signup}
              </button>
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 800px) {
          .login-split {
            grid-template-columns: 1fr !important;
            padding: 24px 18px !important;
          }
        }
      `}</style>
    </div>
  )
}

const fieldLabel: React.CSSProperties = {
  display: 'block',
  color: '#8a7a60',
  fontSize: 11,
  marginBottom: 6,
  letterSpacing: 1,
}
