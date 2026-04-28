'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { t, useLang, setLang, type Lang } from '@/lib/i18n'

export default function LoginPage() {
  const router = useRouter()
  const [lang, setLangState] = useState<Lang>('no')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => { setLangState(useLang()) }, [])
  const tx = t[lang]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(''); setMessage('')
    const supabase = createClient()
    if (isSignup) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage(tx.confirmEmail)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/dashboard')
    }
    setLoading(false)
  }

  const changeLang = (l: Lang) => { setLang(l) }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Lang switcher */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '24px' }}>
          {(['no', 'en'] as Lang[]).map(l => (
            <button key={l} onClick={() => changeLang(l)} style={{
              padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px',
              border: lang === l ? '1px solid #d4a843' : '1px solid rgba(180,140,80,0.2)',
              background: lang === l ? 'rgba(212,168,67,0.15)' : 'transparent',
              color: lang === l ? '#d4a843' : '#6a5a40',
            }}>
              {l === 'no' ? '🇳🇴 NO' : '🇬🇧 EN'}
            </button>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎼</div>
          <h1 style={{ color: '#d4a843', fontSize: '28px', fontWeight: 'normal', letterSpacing: '3px', margin: 0 }}>SONGCRAFT</h1>
          <p style={{ color: '#6a5a40', fontSize: '12px', letterSpacing: '3px', marginTop: '6px' }}>{tx.loginSubtitle}</p>
        </div>

        <div className="card">
          <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: '18px', marginTop: 0, marginBottom: '24px' }}>
            {isSignup ? tx.signup : tx.login}
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#8a7a60', fontSize: '12px', marginBottom: '6px', letterSpacing: '1px' }}>{tx.email.toUpperCase()}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={tx.emailPlaceholder} required />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: '#8a7a60', fontSize: '12px', marginBottom: '6px', letterSpacing: '1px' }}>{tx.password.toUpperCase()}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={tx.passwordPlaceholder} required minLength={6} />
            </div>
            {error && <p style={{ color: '#e07070', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}
            {message && <p style={{ color: '#70c870', fontSize: '13px', marginBottom: '16px' }}>{message}</p>}
            <button type="submit" className="btn-gold" style={{ width: '100%' }} disabled={loading}>
              {loading ? tx.loading : isSignup ? tx.signup : tx.login}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#6a5a40' }}>
            {isSignup ? tx.hasAccount : tx.newUser}{' '}
            <button onClick={() => setIsSignup(!isSignup)} style={{ background: 'none', border: 'none', color: '#d4a843', cursor: 'pointer', fontSize: '13px' }}>
              {isSignup ? tx.login : tx.signup}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
